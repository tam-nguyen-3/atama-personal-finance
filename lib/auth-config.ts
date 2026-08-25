import "server-only";

import { randomUUID } from "node:crypto";

export type AuthRuntimeConfig = {
  baseURL: string;
  secret: string;
};

const DEVELOPMENT_AUTH_URL = "http://localhost:3000";
const MINIMUM_SECRET_LENGTH = 32;
const PRODUCTION_BUILD_PHASE = "phase-production-build";

function requiredSecret(value: string | undefined): string {
  const secret = value?.trim();
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is required.");
  }
  if (secret.length < MINIMUM_SECRET_LENGTH) {
    throw new Error(
      `BETTER_AUTH_SECRET must contain at least ${MINIMUM_SECRET_LENGTH} characters.`,
    );
  }
  return secret;
}

function validatedBaseURL(
  value: string | undefined,
  environment: string | undefined,
): string {
  const configuredURL = value?.trim();
  if (!configuredURL && environment === "production") {
    throw new Error("BETTER_AUTH_URL is required in production.");
  }

  const candidate = configuredURL || DEVELOPMENT_AUTH_URL;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error("BETTER_AUTH_URL must be an absolute URL.");
  }

  if (environment === "production" && url.protocol !== "https:") {
    throw new Error("BETTER_AUTH_URL must use HTTPS in production.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("BETTER_AUTH_URL must use HTTP or HTTPS.");
  }

  return url.origin;
}

export function readAuthRuntimeConfig(
  environment: NodeJS.ProcessEnv = process.env,
  nodeEnvironment: string | undefined = process.env.NODE_ENV,
  nextPhase: string | undefined = process.env.NEXT_PHASE,
): AuthRuntimeConfig {
  if (nextPhase === PRODUCTION_BUILD_PHASE) {
    const configuredSecret = environment.BETTER_AUTH_SECRET?.trim();
    const configuredURL = environment.BETTER_AUTH_URL?.trim();
    return {
      baseURL: configuredURL
        ? validatedBaseURL(configuredURL, nodeEnvironment)
        : DEVELOPMENT_AUTH_URL,
      // This value exists only while Next.js collects build metadata. Runtime
      // server processes still require the configured secret below.
      secret: configuredSecret ? requiredSecret(configuredSecret) : randomUUID(),
    };
  }

  return {
    baseURL: validatedBaseURL(environment.BETTER_AUTH_URL, nodeEnvironment),
    secret: requiredSecret(environment.BETTER_AUTH_SECRET),
  };
}
