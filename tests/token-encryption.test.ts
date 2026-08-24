import { afterEach, describe, expect, it } from "vitest";
import {
  decryptAccessToken,
  encryptAccessToken,
} from "@/lib/security/token-encryption";

const originalKey = process.env.PLAID_TOKEN_ENCRYPTION_KEY;

afterEach(() => {
  if (originalKey === undefined) {
    delete process.env.PLAID_TOKEN_ENCRYPTION_KEY;
  } else {
    process.env.PLAID_TOKEN_ENCRYPTION_KEY = originalKey;
  }
});

describe("Plaid access-token encryption", () => {
  it("round trips tokens without exposing plaintext", () => {
    process.env.PLAID_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString(
      "base64",
    );
    const encrypted = encryptAccessToken("access-sandbox-secret");

    expect(encrypted).toMatch(/^v1\./);
    expect(encrypted).not.toContain("access-sandbox-secret");
    expect(decryptAccessToken(encrypted)).toBe("access-sandbox-secret");
  });

  it("detects ciphertext tampering", () => {
    process.env.PLAID_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString(
      "base64",
    );
    const encrypted = encryptAccessToken("token");
    const [version, iv, tag, ciphertext] = encrypted.split(".");
    const changed = Buffer.from(ciphertext!, "base64url");
    changed[0] = changed[0]! ^ 1;
    const tampered = [version, iv, tag, changed.toString("base64url")].join(".");

    expect(() => decryptAccessToken(tampered)).toThrow();
  });
});
