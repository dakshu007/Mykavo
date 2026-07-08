import "dotenv/config"; // load packages/database/.env (DATABASE_URL) for integration tests
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    // Baseline tests mutate shared rows; run files serially to avoid races.
    fileParallelism: false,
    hookTimeout: 30_000,
  },
});
