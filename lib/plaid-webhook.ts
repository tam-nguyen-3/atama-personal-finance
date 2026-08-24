import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import { decodeProtectedHeader, importJWK, jwtVerify, type JWK } from "jose";
import { ApiError } from "@/lib/api";
import { plaidClient } from "@/lib/plaid";

const MAX_WEBHOOK_AGE_SECONDS = 5 * 60;

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function hashesMatch(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export async function verifyPlaidWebhook(
  signedToken: string | null,
  rawBody: string,
): Promise<string> {
  if (!signedToken) {
    throw new ApiError(401, "UNAUTHORIZED", "Missing Plaid-Verification header.");
  }

  try {
    const header = decodeProtectedHeader(signedToken);
    if (header.alg !== "ES256" || !header.kid) {
      throw new Error("Unexpected webhook signing algorithm or key.");
    }

    const keyResponse = await plaidClient.webhookVerificationKeyGet({
      key_id: header.kid,
    });
    const key = keyResponse.data.key;
    if (key.expired_at !== null && key.expired_at <= Date.now() / 1000) {
      throw new Error("The Plaid webhook verification key is expired.");
    }

    const publicKey = await importJWK(key as JWK, "ES256");
    const { payload } = await jwtVerify(signedToken, publicKey, {
      algorithms: ["ES256"],
      clockTolerance: 5,
      maxTokenAge: `${MAX_WEBHOOK_AGE_SECONDS}s`,
    });
    if (
      typeof payload.iat !== "number" ||
      typeof payload.request_body_sha256 !== "string"
    ) {
      throw new Error("The Plaid webhook claims are incomplete.");
    }
    const age = Math.floor(Date.now() / 1000) - payload.iat;
    if (age < -5 || age > MAX_WEBHOOK_AGE_SECONDS) {
      throw new Error("The Plaid webhook signature is outside its valid age.");
    }

    const bodyHash = sha256Hex(rawBody);
    if (!hashesMatch(bodyHash, payload.request_body_sha256)) {
      throw new Error("The Plaid webhook body hash does not match.");
    }
    return bodyHash;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      401,
      "UNAUTHORIZED",
      "The Plaid webhook signature is invalid.",
    );
  }
}
