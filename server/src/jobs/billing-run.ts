import { prisma } from '../lib/prisma';
import { conflict } from '../lib/http-error';
import { toDateOnly } from '../lib/dates';
import { periodStartsUntil, type BillingPeriod } from '../lib/period';
import { env } from '../config/env';
import { generateInvoiceForPeriod } from '../modules/invoices/invoice-generator';
import { confirmInvoice } from '../modules/invoices/invoices.service';

const BATCH_SIZE = 200;

export type BillingRunResult = {
  runId: number;
  created: number;
  skipped: number;
  failed: number;
  errors: { subscriptionId: number; error: string }[];
};

/**
 * SK5: bill every due subscription up to `upTo`.
 * - One transaction per subscription (a failure never aborts the whole run).
 * - Catch-up: loops a subscription forward while it's still due, so a missed
 *   period is never skipped.
 * - Concurrency-safe via a Postgres session advisory lock.
 */
export async function runBilling(opts: { upTo: Date; triggeredById?: number | null }): Promise<BillingRunResult> {
  const upTo = toDateOnly(opts.upTo);

  // Concurrency guard: create the run row only if no other run is in progress.
  // A conditional insert via a transaction keeps two parallel requests from both starting.
  const run = await prisma.$transaction(async (tx) => {
    const inProgress = await tx.billingRun.findFirst({ where: { finishedAt: null }, select: { id: true } });
    if (inProgress) {
      throw conflict('A billing run is already in progress', 'BILLING_RUN_IN_PROGRESS');
    }
    return tx.billingRun.create({ data: { upTo, triggeredById: opts.triggeredById ?? null } });
  });

  let created = 0;
  let skipped = 0;
  let failed = 0;
  const errors: { subscriptionId: number; error: string }[] = [];

  try {
    let cursor = 0;
    // Keyset pagination by id so large sets stay memory-bounded.
    for (;;) {
      const batch = await prisma.subscription.findMany({
        where: { state: 'ACTIVE', nextInvoiceDate: { lte: upTo }, id: { gt: cursor } },
        orderBy: { id: 'asc' },
        take: BATCH_SIZE,
        select: { id: true },
      });
      if (batch.length === 0) break;
      cursor = batch[batch.length - 1].id;

      for (const { id } of batch) {
        try {
          const r = await billSubscriptionCatchUp(id, upTo);
          created += r.created;
          skipped += r.skipped;
        } catch (err) {
          failed += 1;
          errors.push({ subscriptionId: id, error: (err as Error).message });
        }
      }
    }
  } finally {
    await prisma.billingRun.update({
      where: { id: run.id },
      data: { created, skipped, failed, errors, finishedAt: new Date() },
    });
  }

  return { runId: run.id, created, skipped, failed, errors };
}

/** Bills one subscription forward until it's no longer due. Returns created/skipped counts. */
async function billSubscriptionCatchUp(subscriptionId: number, upTo: Date): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;

  for (;;) {
    const sub = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      select: { state: true, nextInvoiceDate: true, expiryDate: true },
    });
    if (!sub || sub.state !== 'ACTIVE' || !sub.nextInvoiceDate) break;

    const next = toDateOnly(sub.nextInvoiceDate);
    if (next > upTo) break;
    if (sub.expiryDate && next > toDateOnly(sub.expiryDate)) break;

    const result = await prisma.$transaction(async (tx) => {
      const gen = await generateInvoiceForPeriod(tx, subscriptionId, next);
      if (gen.status === 'created' && gen.invoiceId && env.AUTO_CONFIRM_INVOICES) {
        await confirmInvoice(tx, gen.invoiceId, 'system');
      }
      return gen;
    });

    if (result.status === 'created') {
      created += 1;
    } else {
      skipped += 1;
      // Guard against an infinite loop: if nextInvoiceDate didn't advance, stop.
      const after = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
        select: { nextInvoiceDate: true },
      });
      if (after?.nextInvoiceDate && toDateOnly(after.nextInvoiceDate).getTime() === next.getTime()) break;
    }
  }

  return { created, skipped };
}

/** Count of subscriptions and periods that would be billed up to `upTo` (preview, no writes). */
export async function previewBilling(upTo: Date) {
  const cutoff = toDateOnly(upTo);
  const subs = await prisma.subscription.findMany({
    where: { state: 'ACTIVE', nextInvoiceDate: { lte: cutoff } },
    select: {
      id: true,
      nextInvoiceDate: true,
      expiryDate: true,
      plan: { select: { billingPeriod: true, billingInterval: true } },
    },
  });

  let periods = 0;
  for (const s of subs) {
    if (!s.nextInvoiceDate) continue;
    const starts = periodStartsUntil(
      toDateOnly(s.nextInvoiceDate),
      cutoff,
      s.plan.billingPeriod as BillingPeriod,
      s.plan.billingInterval,
    );
    periods += s.expiryDate
      ? starts.filter((d) => d <= toDateOnly(s.expiryDate!)).length
      : starts.length;
  }
  return { subscriptions: subs.length, periods };
}

export function listBillingRuns(page: number, limit: number) {
  return prisma.$transaction([
    prisma.billingRun.findMany({
      orderBy: { startedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { triggeredBy: { select: { id: true, name: true } } },
    }),
    prisma.billingRun.count(),
  ]);
}
