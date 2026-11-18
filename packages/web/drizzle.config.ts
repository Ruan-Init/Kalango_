import { defineConfig } from "drizzle-kit";

// Carrega o .env da raiz do projeto (Node 22+ e Bun); ignora se não existir.
try {
  process.loadEnvFile("../../.env");
} catch {}

export default defineConfig({
  dialect: "turso",
  schema: "./src/api/database/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
});
