import { describe, expect, it } from "vitest";

import { isOwnerEmail } from "@/lib/owner";

describe("single-owner access", () => {
  it("accepts only an exact email match while tolerating casing and incidental whitespace", () => {
    expect(isOwnerEmail("  owner@example.com  ", "Owner@Example.com")).toBe(true);
  });

  it("fails closed for missing configuration, missing identity, and non-owner identities", () => {
    expect(isOwnerEmail("owner@example.com", undefined)).toBe(false);
    expect(isOwnerEmail(undefined, "owner@example.com")).toBe(false);
    expect(isOwnerEmail("other@example.com", "owner@example.com")).toBe(false);
  });
});
