import { PrismaClient } from '@prisma/client';
import { seedCore } from './seed/core';
import { seedCatalog } from './seed/catalog';
import { seedDemo } from './seed/demo';

// One function per area so each owner can add their own seed file without conflicts.
const prisma = new PrismaClient();

async function main() {
  await seedCore(prisma);
  await seedCatalog(prisma);
  await seedDemo(prisma);
  console.log('Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
