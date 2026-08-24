import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

process.env.DATABASE_URL ??=
  "postgresql://atama:atama@localhost:5433/atama_test";
process.env.PLAID_TOKEN_ENCRYPTION_KEY ??=
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./tests/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    fileParallelism: false,
    globalSetup: ["./tests/integration/global-setup.ts"],
    setupFiles: ["./tests/integration/setup.ts"],
    include: ["tests/integration/*.integration.ts"],
  },
});
