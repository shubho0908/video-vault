import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "@/lib/schema";

const connectionString =
  process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("A Neon Postgres connection string is required.");
}

export const sql = neon(connectionString);
export const db = drizzle({ client: sql, schema });
