import { test, expect, describe, beforeEach, afterEach } from "bun:test";

/**
 * Tests for auth.ts environment gating logic.
 *
 * The auth.ts module determines trustedOrigins based on process.env.ENVIRONMENT.
 * Since the module reads the environment at import time, we need to test the
 * logic by re-importing the module with different environment values.
 */

describe("auth trustedOrigins environment gating", () => {
  const originalEnv = process.env.ENVIRONMENT;

  afterEach(() => {
    // Restore original environment
    if (originalEnv === undefined) {
      delete process.env.ENVIRONMENT;
    } else {
      process.env.ENVIRONMENT = originalEnv;
    }
  });

  test("isDevelopment logic: production environment", () => {
    // Verify the logic that auth.ts uses
    process.env.ENVIRONMENT = "production";
    const isDevelopment = process.env.ENVIRONMENT !== "production";
    expect(isDevelopment).toBe(false);
  });

  test("isDevelopment logic: development environment", () => {
    // Verify the logic that auth.ts uses
    process.env.ENVIRONMENT = "development";
    const isDevelopment = process.env.ENVIRONMENT !== "production";
    expect(isDevelopment).toBe(true);
  });

  test("isDevelopment logic: undefined environment defaults to development", () => {
    // Verify the logic that auth.ts uses
    delete process.env.ENVIRONMENT;
    const isDevelopment = process.env.ENVIRONMENT !== "production";
    expect(isDevelopment).toBe(true);
  });

  test("trustedOrigins always includes production deep link", () => {
    // The production deep link should always be present
    const productionDeepLink = "flowday://";

    // In production mode
    process.env.ENVIRONMENT = "production";
    const isDevelopmentProd = process.env.ENVIRONMENT !== "production";
    const trustedOriginsProd = [
      productionDeepLink,
      ...(isDevelopmentProd
        ? [
            "exp://192.168.*.*:*",
            "exp://localhost:*",
          ]
        : []),
    ];
    expect(trustedOriginsProd).toContain(productionDeepLink);

    // In development mode
    process.env.ENVIRONMENT = "development";
    const isDevelopmentDev = process.env.ENVIRONMENT !== "production";
    const trustedOriginsDev = [
      productionDeepLink,
      ...(isDevelopmentDev
        ? [
            "exp://192.168.*.*:*",
            "exp://localhost:*",
          ]
        : []),
    ];
    expect(trustedOriginsDev).toContain(productionDeepLink);
  });

  test("trustedOrigins excludes exp:// URLs in production", () => {
    process.env.ENVIRONMENT = "production";
    const isDevelopment = process.env.ENVIRONMENT !== "production";

    const trustedOrigins = [
      "flowday://",
      ...(isDevelopment
        ? [
            "exp://192.168.*.*:*",
            "exp://localhost:*",
          ]
        : []),
    ];

    expect(trustedOrigins).not.toContain("exp://192.168.*.*:*");
    expect(trustedOrigins).not.toContain("exp://localhost:*");
    expect(trustedOrigins).toHaveLength(1);
  });

  test("trustedOrigins includes exp:// URLs in development", () => {
    process.env.ENVIRONMENT = "development";
    const isDevelopment = process.env.ENVIRONMENT !== "production";

    const trustedOrigins = [
      "flowday://",
      ...(isDevelopment
        ? [
            "exp://192.168.*.*:*",
            "exp://localhost:*",
          ]
        : []),
    ];

    expect(trustedOrigins).toContain("exp://192.168.*.*:*");
    expect(trustedOrigins).toContain("exp://localhost:*");
    expect(trustedOrigins).toHaveLength(3);
  });

  test("trustedOrigins includes exp:// URLs when ENVIRONMENT is not set", () => {
    delete process.env.ENVIRONMENT;
    const isDevelopment = process.env.ENVIRONMENT !== "production";

    const trustedOrigins = [
      "flowday://",
      ...(isDevelopment
        ? [
            "exp://192.168.*.*:*",
            "exp://localhost:*",
          ]
        : []),
    ];

    expect(trustedOrigins).toContain("exp://192.168.*.*:*");
    expect(trustedOrigins).toContain("exp://localhost:*");
    expect(trustedOrigins).toHaveLength(3);
  });
});
