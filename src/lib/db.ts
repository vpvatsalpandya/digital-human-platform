import 'server-only';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma client with tenant scoping (ADR-005). `forTenant(id)` returns a client whose
 * queries run inside a transaction that sets `app.tenant_id`, which the RLS policies read.
 * The database is optional in development: pages that need it degrade to seed data.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'] });
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export function forTenant(tenantId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          return prisma.$transaction(async (tx) => {
            await tx.$executeRawUnsafe(`SELECT set_config('app.tenant_id', '${tenantId.replace(/'/g, '')}', true)`);
            return query(args);
          });
        },
      },
    },
  });
}

export const hasDatabase = Boolean(process.env.DATABASE_URL);
