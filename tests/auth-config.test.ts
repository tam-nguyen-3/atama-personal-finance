import { describe, expect, it } from "vitest";
import { readAuthRuntimeConfig } from "@/lib/auth-config";

function environment(
  values: Record<string, string | undefined>,
): NodeJS.ProcessEnv {
  return values as NodeJS.ProcessEnv;
}

describe("auth runtime configuration", () => {
  it.each([undefined, "", "   "])(
    "rejects a missing or blank secret",
    (secret) => {
      expect(() =>
        readAuthRuntimeConfig(
          environment({ BETTER_AUTH_SECRET: secret }),
          "development",
        ),
      ).toThrow("BETTER_AUTH_SECRET is required.");
    },
  );

  it("rejects a short secret without exposing it", () => {
    const secret = "do-not-print-me";
    let error: unknown;
    try {
      readAuthRuntimeConfig(
        environment({ BETTER_AUTH_SECRET: secret }),
        "development",
      );
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("at least 32 characters");
    expect((error as Error).message).not.toContain(secret);
  });

  it("uses localhost by default in development", () => {
    expect(
      readAuthRuntimeConfig(
        environment({ BETTER_AUTH_SECRET: "a".repeat(32) }),
        "development",
      ),
    ).toEqual({
      baseURL: "http://localhost:3000",
      secret: "a".repeat(32),
    });
  });

  it("requires an explicit HTTPS URL in production", () => {
    const baseEnvironment = {
      BETTER_AUTH_SECRET: "a".repeat(32),
    };

    expect(() =>
      readAuthRuntimeConfig(environment(baseEnvironment), "production"),
    ).toThrow("BETTER_AUTH_URL is required in production.");
    expect(() =>
      readAuthRuntimeConfig(
        environment({
          ...baseEnvironment,
          BETTER_AUTH_URL: "http://example.com",
        }),
        "production",
      ),
    ).toThrow("BETTER_AUTH_URL must use HTTPS in production.");
  });

  it("rejects malformed and unsupported URLs", () => {
    const baseEnvironment = {
      BETTER_AUTH_SECRET: "a".repeat(32),
    };

    expect(() =>
      readAuthRuntimeConfig(
        environment({ ...baseEnvironment, BETTER_AUTH_URL: "not-a-url" }),
        "development",
      ),
    ).toThrow("BETTER_AUTH_URL must be an absolute URL.");
    expect(() =>
      readAuthRuntimeConfig(
        environment({ ...baseEnvironment, BETTER_AUTH_URL: "ftp://example.com" }),
        "development",
      ),
    ).toThrow("BETTER_AUTH_URL must use HTTP or HTTPS.");
  });

  it("accepts and normalizes a production URL", () => {
    expect(
      readAuthRuntimeConfig(
        environment({
          BETTER_AUTH_SECRET: "a".repeat(32),
          BETTER_AUTH_URL: "https://finance.example.com/path",
        }),
        "production",
      ).baseURL,
    ).toBe("https://finance.example.com");
  });

  it("uses ephemeral configuration only during a credential-free build", () => {
    const first = readAuthRuntimeConfig(
      environment({}),
      "production",
      "phase-production-build",
    );
    const second = readAuthRuntimeConfig(
      environment({}),
      "production",
      "phase-production-build",
    );

    expect(first.baseURL).toBe("http://localhost:3000");
    expect(first.secret).toHaveLength(36);
    expect(first.secret).not.toBe(second.secret);
  });
});
