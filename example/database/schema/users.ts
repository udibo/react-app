import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const usersTable = pgTable("users", {
  id: uuid().primaryKey().default(sql`uuid_generate_v7()`),
  username: text().notNull().unique(),
  displayName: text().notNull(),
  email: text().notNull().unique(),
  passwordHash: text(),
  passwordSalt: text(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
  deletedAt: timestamp(),
});

export const userInsertSchema = createInsertSchema(usersTable, {
  username: (schema) => schema.min(1).max(50),
  displayName: (schema) => schema.min(1).max(50),
  email: (schema) => schema.email().max(255),
});

export const userSelectSchema = createSelectSchema(usersTable);

export type userInsertSchemaType = typeof userInsertSchema._type;
export type userSelectSchemaType = typeof userSelectSchema._type;
