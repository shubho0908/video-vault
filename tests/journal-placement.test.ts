import { createRequire } from "node:module";
import type { SQLInputValue } from "node:sqlite";
import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ values: vi.fn(), batch: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({ where: () => ({ limit: async () => [{ id: "owned" }] }) }),
    }),
    insert: () => ({ values: mocks.values }),
    batch: mocks.batch,
  },
}));

import { placeEntry } from "@/lib/journal";

const { DatabaseSync } = createRequire(import.meta.url)(
  "node:sqlite"
) as typeof import("node:sqlite");

beforeEach(() => {
  vi.clearAllMocks();
  mocks.values.mockReturnValue({ onConflictDoNothing: () => "insert" });
});

it.each([{ positions: [0, 3, 4] }, { positions: [] }])(
  "appends after remaining positions $positions",
  async ({ positions }) => {
    await placeEntry("owner", {
      entryId: "entry",
      fromId: null,
      toId: "folder",
    });
    const query = new PgDialect().sqlToQuery(
      mocks.values.mock.calls[0][0].position
    );
    // Run the common SQL aggregate against real rows without needing a remote DB.
    const db = new DatabaseSync(":memory:");
    try {
      db.exec(
        "create table playlist_entries (playlist_id text, position integer)"
      );
      const insert = db.prepare("insert into playlist_entries values (?, ?)");
      positions.forEach(position => insert.run("folder", position));
      insert.run("other-folder", 100);
      const result = db
        .prepare(`select ${query.sql.replace(/\$\d+/g, "?")} as position`)
        .get(...(query.params as SQLInputValue[]));
      expect(result!.position).toBe(
        positions.length ? Math.max(...positions) + 1 : 0
      );
      expect(mocks.batch).toHaveBeenCalledWith(["insert"]);
    } finally {
      db.close();
    }
  }
);
