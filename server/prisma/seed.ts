import { PrismaClient } from '@prisma/client';
import { seedCore } from './seed/core';
import { seedCatalog } from './seed/catalog';

// One function per area so each owner can add their own seed file without conflicts.
const prisma = new PrismaClient();

async function main() {
  await seedCore(prisma);
  await seedCatalog(prisma);
  console.log('Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
