// Vitest stub for "next/cache".
// unstable_cache in production wraps a function with Next.js incremental caching.
// In tests we just call the function directly — no caching context needed.
export function unstable_cache<
  T extends (...args: unknown[]) => Promise<unknown>,
>(fn: T): T {
  return fn;
}

export function revalidatePath(): void {}
export function revalidateTag(): void {}
export function unstable_noStore(): void {}
