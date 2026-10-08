import { describe, expect, it } from "vitest";

describe("ImageKit credentials", () => {
  it("authenticates a lightweight file-list request without exposing keys", async () => {
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
    const endpoint = process.env.IMAGEKIT_URL_ENDPOINT;

    expect(privateKey, "IMAGEKIT_PRIVATE_KEY must be configured").toBeTruthy();
    expect(publicKey, "IMAGEKIT_PUBLIC_KEY must be configured").toBeTruthy();
    expect(endpoint, "IMAGEKIT_URL_ENDPOINT must be configured").toMatch(
      /^https:\/\//
    );

    const authorization = `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    const response = await fetch("https://api.imagekit.io/v1/files?limit=1", {
      headers: { Authorization: authorization },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    expect(response.status).toBe(200);
  }, 10_000);
});

