import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  exportJWK,
  generateKeyPair,
  SignJWT,
  type JWK,
} from "jose";

const plaidMocks = vi.hoisted(() => ({
  getVerificationKey: vi.fn(),
}));

vi.mock("@/lib/plaid", () => ({
  plaidClient: {
    webhookVerificationKeyGet: plaidMocks.getVerificationKey,
  },
}));

import { sha256Hex, verifyPlaidWebhook } from "@/lib/plaid-webhook";

beforeEach(() => {
  plaidMocks.getVerificationKey.mockReset();
});

async function signedWebhook(rawBody: string, issuedAt = Math.floor(Date.now() / 1000)) {
  const { publicKey, privateKey } = await generateKeyPair("ES256");
  const publicJwk: JWK = await exportJWK(publicKey);
  plaidMocks.getVerificationKey.mockResolvedValue({
    data: {
      key: {
        ...publicJwk,
        alg: "ES256",
        kid: "test-key",
        use: "sig",
        created_at: issuedAt,
        expired_at: null,
      },
    },
  });
  return new SignJWT({ request_body_sha256: sha256Hex(rawBody) })
    .setProtectedHeader({ alg: "ES256", kid: "test-key" })
    .setIssuedAt(issuedAt)
    .sign(privateKey);
}

describe("Plaid webhook verification", () => {
  it("accepts a current signature for the exact raw body", async () => {
    const body = '{"webhook_type":"TRANSACTIONS"}';
    const token = await signedWebhook(body);

    await expect(verifyPlaidWebhook(token, body)).resolves.toBe(sha256Hex(body));
  });

  it("rejects a signed token when the request body changes", async () => {
    const token = await signedWebhook('{"value":1}');

    await expect(verifyPlaidWebhook(token, '{"value":2}')).rejects.toThrow(
      "signature is invalid",
    );
  });

  it("rejects signatures older than five minutes", async () => {
    const body = '{"value":1}';
    const token = await signedWebhook(
      body,
      Math.floor(Date.now() / 1000) - 301,
    );

    await expect(verifyPlaidWebhook(token, body)).rejects.toThrow(
      "signature is invalid",
    );
  });
});
