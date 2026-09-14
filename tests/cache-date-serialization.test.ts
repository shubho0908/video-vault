import { describe, expect, it } from "vitest";

import { reviveCacheValue, serializeCacheValue } from "@/lib/journal-cache";

const dateFormat = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

describe("journal cache Date serialization", () => {
  it("revives dashboard entry dates after a serialized cache round trip", () => {
    const databaseEntries = [
      {
        id: "entry-1",
        title: "Caching",
        createdAt: new Date("2026-09-14T10:00:00.000Z"),
        updatedAt: new Date("2026-09-14T11:00:00.000Z"),
      },
    ];

    const cachedPayload = JSON.parse(
      JSON.stringify(serializeCacheValue(databaseEntries))
    );
    const entries = reviveCacheValue(cachedPayload) as typeof databaseEntries;

    expect(entries[0].createdAt).toBeInstanceOf(Date);
    expect(entries[0].updatedAt).toBeInstanceOf(Date);
    expect(() => dateFormat.format(entries[0].createdAt)).not.toThrow();
  });

  it("revives nested playlist and image timestamps without changing strings", () => {
    const payload = {
      playlist: { createdAt: new Date("2026-09-14T10:00:00.000Z") },
      images: [{ createdAt: new Date("2026-09-14T10:30:00.000Z") }],
      description: "2026-09-14T10:00:00.000Z",
    };

    const result = reviveCacheValue(
      JSON.parse(JSON.stringify(serializeCacheValue(payload)))
    ) as typeof payload;

    expect(result.playlist.createdAt).toBeInstanceOf(Date);
    expect(result.images[0].createdAt).toBeInstanceOf(Date);
    expect(result.description).toBe("2026-09-14T10:00:00.000Z");
  });
});
