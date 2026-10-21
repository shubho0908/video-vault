import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/lib/auth";
import { isOwnerEmail } from "@/lib/owner";

/**
 * Request-scoped: React `cache()` memoizes this for the lifetime of one server request, so a page, its
 * parallel @modal slot, and nested server components share a single session read instead of each hitting
 * Better Auth (and, on a cookie-cache miss, the database). The owner allowlist check is unchanged.
 */
export const getOwnerSession = cache(async (fresh = false) => {
  // fresh: skip the 5-minute cookie cache and read the database, so a revoked session cannot mutate data
  const session = await auth.api.getSession({ headers: await headers(), ...(fresh ? { query: { disableCookieCache: true } } : {}) });
  if (!session || !isOwnerEmail(session.user.email)) {
    return null;
  }
  return session;
});

/** Pages use the cached session; server actions pass `{ fresh: true }` (mutations always check the database). */
export async function requireOwner({ fresh = false }: { fresh?: boolean } = {}) {
  const session = await getOwnerSession(fresh);
  if (!session) {
    redirect("/sign-in?restricted=1");
  }
  return session;
}
