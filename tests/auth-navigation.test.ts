import { describe, expect, it } from "vitest";
import { sanitizeDashboardPath } from "@/lib/auth-navigation";

describe("sanitizeDashboardPath", () => {
  it("allows dashboard paths and query strings", () => {
    expect(sanitizeDashboardPath("/dashboard/budget/123?tab=plan")).toBe("/dashboard/budget/123?tab=plan");
  });

  it.each([undefined, "/demo", "/dashboard-imposter", "//example.com/dashboard", "https://example.com/dashboard", "/dashboard\\example.com"])("falls back for unsafe destination %s", (value) => {
    expect(sanitizeDashboardPath(value)).toBe("/dashboard");
  });
});
