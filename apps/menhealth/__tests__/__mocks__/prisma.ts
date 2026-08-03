// Vitest stub for @/lib/db/prisma.
// Provides a minimal mock of the Prisma client for unit tests.
// Tests that need specific DB behaviour should override with vi.mock().
export const db = {
  socialAccount: {
    findUnique: async () => null,
    update: async () => null,
    upsert: async () => null,
  },
  socialPost: {
    findMany: async () => [],
    findUnique: async () => null,
    update: async () => null,
    count: async () => 0,
    create: async () => null,
  },
  socialPublishAttempt: {
    create: async () => null,
  },
  video: {
    findUnique: async () => null,
    findMany: async () => [],
    count: async () => 0,
  },
  $transaction: async (ops: unknown[]) => Promise.all(ops),
};
