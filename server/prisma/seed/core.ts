import bcrypt from 'bcryptjs';
import 'dotenv/config';
import type { PrismaClient } from '@prisma/client';

const hash = (pw: string) => bcrypt.hash(pw, 12);

export async function seedCore(prisma: PrismaClient) {
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? 'admin@billcycle.local').toLowerCase();
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'Admin',
      role: 'ADMIN',
      passwordHash: await hash(process.env.SEED_ADMIN_PASSWORD ?? 'Admin@12345'),
    },
  });

  await prisma.user.upsert({
    where: { email: 'staff@billcycle.local' },
    update: {},
    create: {
      email: 'staff@billcycle.local',
      name: 'Priya (Sales)',
      role: 'INTERNAL',
      passwordHash: await hash('Staff@12345'),
      createdById: admin.id,
    },
  });

  for (const t of [
    { name: 'GST 18%', type: 'PERCENT' as const, rate: 18 },
    { name: 'GST 5%', type: 'PERCENT' as const, rate: 5 },
  ]) {
    await prisma.tax.upsert({ where: { name: t.name }, update: {}, create: t });
  }

  for (const t of [
    { name: 'Immediate', dueDays: 0 },
    { name: 'Net 15', dueDays: 15 },
    { name: 'Net 30', dueDays: 30 },
  ]) {
    await prisma.paymentTerm.upsert({ where: { name: t.name }, update: {}, create: t });
  }

  for (const name of ['Cash', 'Bank Transfer', 'Card', 'UPI', 'Cheque']) {
    await prisma.paymentMethod.upsert({ where: { name }, update: {}, create: { name } });
  }

  const customers = [
    {
      name: 'Asha Mehta',
      email: 'customer1@billcycle.local',
      companyName: 'Mehta Retail',
      city: 'Ahmedabad',
    },
    { name: 'Rahul Verma', email: 'customer2@billcycle.local', companyName: 'Verma Logistics', city: 'Pune' },
    { name: 'Neha Iyer', email: 'customer3@billcycle.local', companyName: 'Iyer Foods', city: 'Chennai' },
  ];
  const portalHash = await hash('Customer@123');
  for (const c of customers) {
    const existing = await prisma.user.findUnique({ where: { email: c.email } });
    if (existing) continue;
    const customer = await prisma.customer.create({ data: { ...c, country: 'India' } });
    await prisma.user.create({
      data: {
        email: c.email,
        name: c.name,
        role: 'PORTAL',
        passwordHash: portalHash,
        customerId: customer.id,
      },
    });
  }
  console.log('  core: users, taxes, payment terms, payment methods, customers');
}
