import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { ApiError } from "@/lib/api";
import * as schema from "./schema";

type Database = ReturnType<typeof drizzle<typeof schema>>;

const databaseGlobal = globalThis as typeof globalThis & {
  atamaDatabase?: Database;
  atamaPostgresClient?: ReturnType<typeof postgres>;
};

export function getDb(): Database {
  if (databaseGlobal.atamaDatabase) return databaseGlobal.atamaDatabase;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new ApiError(503, "NOT_CONFIGURED", "DATABASE_URL is not configured.");
  }

  const client = postgres(databaseUrl, { max: 10 });
  const database = drizzle(client, { schema });

  if (process.env.NODE_ENV !== "production") {
    databaseGlobal.atamaPostgresClient = client;
    databaseGlobal.atamaDatabase = database;
  }

  return database;
}

export async function closeDb(): Promise<void> {
  const client = databaseGlobal.atamaPostgresClient;
  delete databaseGlobal.atamaDatabase;
  delete databaseGlobal.atamaPostgresClient;
  if (client) await client.end({ timeout: 5 });
}
