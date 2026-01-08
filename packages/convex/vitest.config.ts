import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "edge-runtime",
    include: ["convex/__tests__/**/*.test.ts", "convex/utils/__tests__/**/*.test.ts"],
    // Exclude existing bun:test files that use a different test runner
    exclude: [
      "**/node_modules/**",
      "convex/auth.test.ts",
      "convex/utils/time.test.ts",
      "convex/utils/travelTime.test.ts",
    ],
    coverage: {
      provider: "v8",
      thresholds: { lines: 80 }
    }
  }
});
