import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { Resend } from "resend";
import { readAuthRuntimeConfig } from "@/lib/auth-config";
import { getDb } from "@/lib/db";
import {
  authAccounts,
  authRateLimits,
  authSessions,
  authVerifications,
  users,
} from "@/lib/db/schema";

const authRuntimeConfig = readAuthRuntimeConfig();

export const auth = betterAuth({
  baseURL: authRuntimeConfig.baseURL,
  secret: authRuntimeConfig.secret,
  advanced: { database: { generateId: "uuid" } },
  // The adapter uses Better Auth's canonical model keys; each points at our
  // intentionally distinct physical table name.
  database: drizzleAdapter(getDb(), { provider: "pg", schema: { user: users, session: authSessions, account: authAccounts, verification: authVerifications, rateLimit: authRateLimits } }),
  user: { fields: { name: "displayName", emailVerified: "emailVerified", createdAt: "createdAt", updatedAt: "updatedAt" } },
  session: { fields: { userId: "userId", expiresAt: "expiresAt", ipAddress: "ipAddress", userAgent: "userAgent", createdAt: "createdAt", updatedAt: "updatedAt" } },
  account: { fields: { userId: "userId", providerId: "providerId", accountId: "accountId", accessToken: "accessToken", refreshToken: "refreshToken", idToken: "idToken", accessTokenExpiresAt: "accessTokenExpiresAt", refreshTokenExpiresAt: "refreshTokenExpiresAt", createdAt: "createdAt", updatedAt: "updatedAt" } },
  verification: { fields: { expiresAt: "expiresAt", createdAt: "createdAt", updatedAt: "updatedAt" } },
  rateLimit: { fields: { lastRequest: "lastRequest" }, enabled: true, storage: "database" },
  emailAndPassword: {
    enabled: true, minPasswordLength: 8, maxPasswordLength: 128, autoSignIn: false,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      const apiKey = process.env.RESEND_API_KEY;
      const from = process.env.AUTH_EMAIL_FROM;
      if (!apiKey || !from) return; // local development may intentionally omit email delivery
      const resend = new Resend(apiKey);
      await resend.emails.send({ from, to: user.email, subject: "Reset your atama password", text: `Reset your password: ${url}` });
    },
  },
});

export async function requireUserId(request: Request): Promise<string> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    const { ApiError } = await import("@/lib/api");
    throw new ApiError(401, "UNAUTHORIZED", "Sign in to continue.");
  }
  return session.user.id;
}
