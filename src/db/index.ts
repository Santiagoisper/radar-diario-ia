import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export type DbClient = ReturnType<typeof drizzle<typeof schema>>;

export function getDb(): DbClient | null {
  const url = process.env.DATABASE_URL;
  if (!url?.trim()) return null;
  const sql = neon(url);
  return drizzle(sql, { schema });
}

export * from "./schema";
