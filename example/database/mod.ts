import { drizzle } from "drizzle-orm/node-postgres";

const dbUrl = Deno.env.get("DATABASE_URL");
if (!dbUrl) throw new Error("DATABASE_URL environment variable is required");

export const db = drizzle(dbUrl, { casing: "snake_case" });
