import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.credentials.test.ts"],
    testTimeout: 15_000,
  },
});
