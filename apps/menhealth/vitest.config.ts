import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: [
      // Specific stubs must come before the broad "@" prefix alias.
      // server-only is a Next.js package that throws in non-Next environments.
      {
        find: "server-only",
        replacement: resolve(__dirname, "__tests__/__mocks__/server-only.ts"),
      },
      // Stub env and prisma so adapters can be unit-tested without real credentials.
      {
        find: "@/env",
        replacement: resolve(__dirname, "__tests__/__mocks__/env.ts"),
      },
      {
        find: "@/lib/db/prisma",
        replacement: resolve(__dirname, "__tests__/__mocks__/prisma.ts"),
      },
      // Mock aiClient to avoid initializing real API clients in jsdom
      {
        find: "@/lib/ai/client",
        replacement: resolve(__dirname, "__tests__/__mocks__/ai-client.ts"),
      },
      // next/cache uses Next.js incremental cache context that doesn't exist in Vitest.
      // The stub makes unstable_cache a transparent pass-through.
      {
        find: "next/cache",
        replacement: resolve(__dirname, "__tests__/__mocks__/next-cache.ts"),
      },
      { find: "@", replacement: resolve(__dirname, ".") },
    ],
  },
});
