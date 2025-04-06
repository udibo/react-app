import { defineConfig } from "drizzle-kit";

const dbUrl = Deno.env.get("DATABASE_URL");
if (!dbUrl) throw new Error("DATABASE_URL environment variable is required");

export default defineConfig({
  dialect: "postgresql",
  schema: "./database/schema",
  out: "./database/migrations",
  dbCredentials: {
    url: dbUrl,
  },
  casing: "snake_case",
});
