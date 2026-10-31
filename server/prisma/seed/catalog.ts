import type { PrismaClient } from '@prisma/client';

export async function seedCatalog(prisma: PrismaClient) {
  if (await prisma.product.count()) {
    console.log('  catalog: already seeded, skipped');
    return;
  }
  const gst18 = await prisma.tax.findUniqueOrThrow({ where: { name: 'GST 18%' } });

  const brand = await prisma.productAttribute.create({
    data: {
      name: 'Brand',
      values: {
        create: [
          { name: 'Odoo', extraPrice: 560 },
          { name: 'Generic', extraPrice: 0 },
        ],
      },
    },
    include: { values: true },
  });
  const odoo = brand.values.find((v) => v.name === 'Odoo')!;

  const products = [
    {
      name: 'Brightloop CRM',
      salesPrice: 1200,
      costPrice: 400,
      notes: 'Customer relationship management suite',
    },
    { name: 'Brightloop HR', salesPrice: 900, costPrice: 300, notes: 'People and payroll' },
    { name: 'Extra Storage 100GB', salesPrice: 199, costPrice: 50, notes: 'Add-on' },
    { name: 'Priority Support', salesPrice: 499, costPrice: 150, notes: 'Add-on: 4h response time' },
  ];
  for (const p of products) {
    const product = await prisma.product.create({
      data: { ...p, type: 'SERVICE', taxes: { connect: [{ id: gst18.id }] } },
    });
    await prisma.productVariant.create({ data: { productId: product.id, isDefault: true } });
    if (p.name === 'Brightloop CRM') {
      await prisma.productVariant.create({
        data: { productId: product.id, sku: 'CRM-ODOO', values: { connect: [{ id: odoo.id }] } },
      });
    }
  }

  const plans = [
    {
      name: 'Starter Monthly',
      price: 999,
      billingPeriod: 'MONTHLY' as const,
      minQuantity: 1,
      pausable: true,
      closable: true,
      renewable: true,
    },
    {
      name: 'Business Yearly',
      price: 9999,
      billingPeriod: 'YEARLY' as const,
      minQuantity: 5,
      autoClose: true,
      closable: false,
      renewable: true,
    },
    {
      name: 'Weekly Trial',
      price: 99,
      billingPeriod: 'WEEKLY' as const,
      minQuantity: 1,
      autoClose: true,
      closable: true,
      renewable: false,
    },
  ];
  for (const p of plans) {
    await prisma.recurringPlan.create({ data: { ...p, taxes: { connect: [{ id: gst18.id }] } } });
  }
  console.log('  catalog: attribute Brand, 4 products (+ Odoo variant), 3 plans');
}
