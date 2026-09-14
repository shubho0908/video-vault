import { neon } from "@neondatabase/serverless";
import { describe, expect, it } from "vitest";

describe("Neon credentials", () => {
  it("runs a lightweight Postgres health query using the pooled connection string", async () => {
    const connectionString = process.env.NEON_DATABASE_URL;
    expect(connectionString, "NEON_DATABASE_URL must be configured").toMatch(
      /^postgres(ql)?:\/\//
    );

    const sql = neon(connectionString as string);
    const result = await sql`SELECT 1 AS healthy`;

    expect(result).toEqual([{ healthy: 1 }]);

    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('user', 'session', 'account', 'verification', 'video_entries', 'entry_images')
    `;

    expect(tables.map(row => row.table_name).sort()).toEqual([
      "account",
      "entry_images",
      "session",
      "user",
      "verification",
      "video_entries",
    ]);
  }, 10_000);
});
