import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";
import { ApiError } from "@/lib/api";

const VERSION = "v1";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function encryptionKey(): Buffer {
  const encoded = process.env.PLAID_TOKEN_ENCRYPTION_KEY;
  if (!encoded) {
    throw new ApiError(
      503,
      "NOT_CONFIGURED",
      "PLAID_TOKEN_ENCRYPTION_KEY is not configured.",
    );
  }

  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) {
    throw new ApiError(
      503,
      "NOT_CONFIGURED",
      "PLAID_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes.",
    );
  }
  return key;
}

export function encryptAccessToken(accessToken: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(accessToken, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [VERSION, iv, tag, ciphertext]
    .map((part) =>
      typeof part === "string" ? part : part.toString("base64url"),
    )
    .join(".");
}

export function decryptAccessToken(encrypted: string): string {
  const [version, ivPart, tagPart, ciphertextPart, extra] = encrypted.split(".");
  if (
    version !== VERSION ||
    !ivPart ||
    !tagPart ||
    !ciphertextPart ||
    extra !== undefined
  ) {
    throw new Error("The encrypted Plaid token has an invalid format.");
  }

  const iv = Buffer.from(ivPart, "base64url");
  const tag = Buffer.from(tagPart, "base64url");
  if (iv.length !== IV_LENGTH || tag.length !== AUTH_TAG_LENGTH) {
    throw new Error("The encrypted Plaid token has invalid parameters.");
  }

  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextPart, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
