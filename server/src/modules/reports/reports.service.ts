import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { toFixed2 } from '../../lib/money';
import { today as todayDate, daysBetween } from '../../lib/dates';
import type { OverdueQuery, ReportFilters, TrendQuery } from './reports.schema';

// All figures are SQL aggregates (one round trip per widget), so the dashboard stays fast with thousands of rows.
// Metric definitions: docs/06-research-notes.md §4.

type Scope = { planId?: number; customerId?: number };

/** Optional plan/customer filter for queries that alias subscriptions as `s`. */
function scopeSql({ planId, customerId }: Scope) {
  const parts: Prisma.Sql[] = [];
  if (planId) parts.push(Prisma.sql`s.plan_id = ${planId}`);
  if (customerId) parts.push(Prisma.sql`s.customer_id = ${customerId}`);
  return parts.length ? Prisma.sql`AND ${Prisma.join(parts, ' AND ')}` : Prisma.empty;
}

/** Recurring amount normalised to one month (MRR): yearly / 12, weekly x 52 / 12, daily x 365 / 12 */
const MONTHLY_FACTOR = Prisma.sql`(CASE p.billing_period
  WHEN 'DAILY' THEN 365.0 / 12 WHEN 'WEEKLY' THEN 52.0 / 12 WHEN 'MONTHLY' THEN 1.0 ELSE 1.0 / 12 END) / p.billing_interval`;

const num = (v: bigint | number | null) => Number(v ?? 0);
const money = (v: Prisma.Decimal | null) => toFixed2(v ?? 0);

function defaultRange(f: ReportFilters) {
  const t = todayDate();
  const from = f.from ?? new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 1));
  return { from, to: f.to ?? t, today: t };
}

export async function summary(f: ReportFilters) {
  const { from, to, today } = defaultRange(f);
  const scope = scopeSql(f);

  const [subs] = await prisma.$queryRaw<
    { active: bigint; paused: bigint; new_subs: bigint; closed: bigint; mrr: Prisma.Decimal | null }[]
  >`
    SELECT
      COUNT(*) FILTER (WHERE s.state = 'ACTIVE') AS active,
      COUNT(*) FILTER (WHERE s.state = 'PAUSED') AS paused,
      COUNT(*) FILTER (WHERE s.state IN ('CONFIRMED', 'ACTIVE', 'PAUSED', 'CLOSED')
                         AND s.start_date BETWEEN ${from}::date AND ${to}::date) AS new_subs,
      COUNT(*) FILTER (WHERE s.closed_at::date BETWEEN ${from}::date AND ${to}::date) AS closed,
      SUM(s.amount_untaxed * ${MONTHLY_FACTOR}) FILTER (WHERE s.state = 'ACTIVE') AS mrr
    FROM subscriptions s JOIN recurring_plans p ON p.id = s.plan_id
    WHERE TRUE ${scope}`;

  const [inv] = await prisma.$queryRaw<
    {
      invoiced: Prisma.Decimal | null;
      outstanding: Prisma.Decimal | null;
      overdue: Prisma.Decimal | null;
      overdue_count: bigint;
      open_count: bigint;
    }[]
  >`
    SELECT
      SUM(i.amount_total) FILTER (WHERE i.state IN ('CONFIRMED', 'PAID')
                                    AND i.invoice_date BETWEEN ${from}::date AND ${to}::date) AS invoiced,
      SUM(i.amount_due) FILTER (WHERE i.state = 'CONFIRMED') AS outstanding,
      SUM(i.amount_due) FILTER (WHERE i.state = 'CONFIRMED' AND i.due_date < ${today}::date) AS overdue,
      COUNT(*) FILTER (WHERE i.state = 'CONFIRMED' AND i.amount_due > 0 AND i.due_date < ${today}::date) AS overdue_count,
      COUNT(*) FILTER (WHERE i.state = 'CONFIRMED' AND i.amount_due > 0) AS open_count
    FROM invoices i JOIN subscriptions s ON s.id = i.subscription_id
    WHERE TRUE ${scope}`;

  const [pay] = await prisma.$queryRaw<{ collected: Prisma.Decimal | null; payments: bigint }[]>`
    SELECT SUM(pay.amount) AS collected, COUNT(*) AS payments
    FROM payments pay
      JOIN invoices i ON i.id = pay.invoice_id
      JOIN subscriptions s ON s.id = i.subscription_id
    WHERE pay.date BETWEEN ${from}::date AND ${to}::date ${scope}`;

  const mrr = subs.mrr ?? new Prisma.Decimal(0);
  return {
    range: { from, to },
    activeSubscriptions: num(subs.active),
    pausedSubscriptions: num(subs.paused),
    newSubscriptions: num(subs.new_subs),
    closedSubscriptions: num(subs.closed),
    mrr: toFixed2(mrr),
    arr: toFixed2(mrr.times(12)),
    invoicedAmount: money(inv.invoiced),
    collectedAmount: money(pay.collected),
    paymentsCount: num(pay.payments),
    outstandingAmount: money(inv.outstanding),
    openInvoices: num(inv.open_count),
    overdueAmount: money(inv.overdue),
    overdueCount: num(inv.overdue_count),
  };
}

export async function revenueTrend(q: TrendQuery) {
  const today = todayDate();
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - (q.months - 1), 1));
  const scope = scopeSql(q);
  const rows = await prisma.$queryRaw<
    { month: string; invoiced: Prisma.Decimal | null; collected: Prisma.Decimal | null }[]
  >`
    WITH months AS (
      SELECT generate_series(${start}::date, date_trunc('month', ${today}::date), interval '1 month')::date AS m
    ),
    inv AS (
      SELECT date_trunc('month', i.invoice_date)::date AS m, SUM(i.amount_total) AS total
      FROM invoices i JOIN subscriptions s ON s.id = i.subscription_id
      WHERE i.state IN ('CONFIRMED', 'PAID') AND i.invoice_date >= ${start}::date ${scope}
      GROUP BY 1
    ),
    col AS (
      SELECT date_trunc('month', pay.date)::date AS m, SUM(pay.amount) AS total
      FROM payments pay JOIN invoices i ON i.id = pay.invoice_id JOIN subscriptions s ON s.id = i.subscription_id
      WHERE pay.date >= ${start}::date ${scope}
      GROUP BY 1
    )
    SELECT to_char(months.m, 'YYYY-MM') AS month, inv.total AS invoiced, col.total AS collected
    FROM months LEFT JOIN inv ON inv.m = months.m LEFT JOIN col ON col.m = months.m
    ORDER BY months.m`;
  return rows.map((r) => ({ month: r.month, invoiced: money(r.invoiced), collected: money(r.collected) }));
}

export async function overdue(q: OverdueQuery) {
  const today = todayDate();
  const scope = scopeSql(q);
  const where: Prisma.InvoiceWhereInput = {
    state: 'CONFIRMED',
    amountDue: { gt: 0 },
    dueDate: { lt: today },
    ...(q.customerId ? { customerId: q.customerId } : {}),
    ...(q.planId ? { subscription: { planId: q.planId } } : {}),
  };
  const [rows, [buckets]] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { dueDate: 'asc' },
      take: q.limit,
      select: {
        id: true,
        number: true,
        dueDate: true,
        amountTotal: true,
        amountDue: true,
        customer: { select: { id: true, name: true } },
        subscription: { select: { id: true, number: true } },
      },
    }),
    prisma.$queryRaw<Record<'d1_30' | 'd31_60' | 'd61_90' | 'd90_plus', Prisma.Decimal | null>[]>`
      SELECT
        SUM(i.amount_due) FILTER (WHERE ${today}::date - i.due_date BETWEEN 1 AND 30) AS d1_30,
        SUM(i.amount_due) FILTER (WHERE ${today}::date - i.due_date BETWEEN 31 AND 60) AS d31_60,
        SUM(i.amount_due) FILTER (WHERE ${today}::date - i.due_date BETWEEN 61 AND 90) AS d61_90,
        SUM(i.amount_due) FILTER (WHERE ${today}::date - i.due_date > 90) AS d90_plus
      FROM invoices i JOIN subscriptions s ON s.id = i.subscription_id
      WHERE i.state = 'CONFIRMED' AND i.amount_due > 0 AND i.due_date < ${today}::date ${scope}`,
  ]);
  return {
    rows: rows.map((r) => ({
      ...r,
      amountTotal: toFixed2(r.amountTotal),
      amountDue: toFixed2(r.amountDue),
      daysOverdue: daysBetween(r.dueDate, today),
    })),
    buckets: {
      d1_30: money(buckets.d1_30),
      d31_60: money(buckets.d31_60),
      d61_90: money(buckets.d61_90),
      d90_plus: money(buckets.d90_plus),
    },
  };
}

export async function byPlan(scope: Scope) {
  const customer = scope.customerId ? Prisma.sql`AND s.customer_id = ${scope.customerId}` : Prisma.empty;
  const rows = await prisma.$queryRaw<
    { plan_id: number; plan: string; billing_period: string; active: bigint; mrr: Prisma.Decimal | null }[]
  >`
    SELECT p.id AS plan_id, p.name AS plan, p.billing_period::text AS billing_period,
      COUNT(s.id) FILTER (WHERE s.state = 'ACTIVE') AS active,
      SUM(s.amount_untaxed * ${MONTHLY_FACTOR}) FILTER (WHERE s.state = 'ACTIVE') AS mrr
    FROM recurring_plans p LEFT JOIN subscriptions s ON s.plan_id = p.id ${customer}
    GROUP BY p.id
    ORDER BY mrr DESC NULLS LAST, p.name`;
  return rows.map((r) => ({
    planId: r.plan_id,
    plan: r.plan,
    billingPeriod: r.billing_period,
    active: num(r.active),
    mrr: money(r.mrr),
  }));
}
