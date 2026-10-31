import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../../lib/prisma';
import { D } from '../../lib/money';
import { consumeUsage, releaseUsage } from './discount-engine';

// Needs the docker-compose Postgres with seed data (two invoices); skipped when the database isn't reachable.
const dbUp = await prisma.$queryRaw`SELECT 1`.then(
  () => true,
  () => false,
);
const invoices = dbUp ? await prisma.invoice.findMany({ take: 2, orderBy: { id: 'asc' }, select: { id: true, subscriptionId: true } }) : [];

describe.skipIf(invoices.length < 2)('consumeUsage / releaseUsage (database)', () => {
  const ruleIds: number[] = [];

  const makeRule = async (usageLimit: number | null) => {
    const r = await prisma.discountRule.create({
      data: {
        name: `TEST engine ${Date.now()}`,
        type: 'PERCENT',
        value: 10,
        scope: 'SUBSCRIPTION',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        usageLimit,
      },
    });
    ruleIds.push(r.id);
    return r.id;
  };

  afterAll(async () => {
    await prisma.discountUsage.deleteMany({ where: { discountId: { in: ruleIds } } });
    await prisma.discountRule.deleteMany({ where: { id: { in: ruleIds } } });
    await prisma.$disconnect();
  });

  it('limit 1 consumed twice in parallel → exactly one succeeds', async () => {
    const ruleId = await makeRule(1);
    const results = await Promise.all(
      invoices.map((inv) =>
        prisma.$transaction((tx) =>
          consumeUsage(tx, ruleId, { invoiceId: inv.id, subscriptionId: inv.subscriptionId, amount: D(10) }),
        ),
      ),
    );
    expect(results.filter(Boolean)).toHaveLength(1);
    const rule = await prisma.discountRule.findUniqueOrThrow({ where: { id: ruleId } });
    expect(rule.timesUsed).toBe(1);
    expect(await prisma.discountUsage.count({ where: { discountId: ruleId } })).toBe(1);
  });

  it('releaseUsage gives the use back and deletes the usage row', async () => {
    const ruleId = await makeRule(5);
    const [inv] = invoices;
    await prisma.$transaction((tx) => consumeUsage(tx, ruleId, { invoiceId: inv.id, subscriptionId: inv.subscriptionId, amount: D(25) }));
    expect((await prisma.discountRule.findUniqueOrThrow({ where: { id: ruleId } })).timesUsed).toBe(1);

    await prisma.$transaction((tx) => releaseUsage(tx, inv.id));
    expect((await prisma.discountRule.findUniqueOrThrow({ where: { id: ruleId } })).timesUsed).toBe(0);
    expect(await prisma.discountUsage.count({ where: { discountId: ruleId } })).toBe(0);
  });

  it('a deactivated rule cannot be consumed', async () => {
    const ruleId = await makeRule(null);
    await prisma.discountRule.update({ where: { id: ruleId }, data: { isActive: false } });
    const [inv] = invoices;
    const ok = await prisma.$transaction((tx) =>
      consumeUsage(tx, ruleId, { invoiceId: inv.id, subscriptionId: inv.subscriptionId, amount: D(1) }),
    );
    expect(ok).toBe(false);
  });
});
