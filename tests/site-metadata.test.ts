import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { siteMetadata } from "@/lib/site-metadata";

describe("social sharing metadata", () => {
  it("sets the missing Open Graph type and the absolute public URL base", () => {
    expect(siteMetadata.metadataBase?.href).toBe(
      "https://videos.shubhojeet.com/"
    );
    expect(siteMetadata.openGraph).toMatchObject({ type: "website", url: "./" });
    expect(new URL("/", siteMetadata.metadataBase!).href).toBe(
      "https://videos.shubhojeet.com/"
    );
  });

  it("keeps the private journal out of search indexes", () => {
    expect(siteMetadata.robots).toEqual({ index: false, follow: false });
  });

  it("uses one JPEG under the report's 300 KB limit, with the existing alt text", () => {
    const image = fileURLToPath(
      new URL("../app/opengraph-image.jpg", import.meta.url)
    );
    const oldImage = fileURLToPath(
      new URL("../app/opengraph-image.png", import.meta.url)
    );
    const alt = readFileSync(
      new URL("../app/opengraph-image.alt.txt", import.meta.url),
      "utf8"
    );
    expect(existsSync(oldImage)).toBe(false);
    expect(statSync(image).size).toBeLessThan(300_000);
    expect([...readFileSync(image).subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
    expect(alt.trim()).toBe(
      "Shubhojeet's Videos: a private collection of unlisted YouTube explanations, notes, and references."
    );
  });
});
