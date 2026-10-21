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
export const getOwnerSession = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !isOwnerEmail(session.user.email)) {
    return null;
  }
  return session;
});

export async function requireOwner() {
  const session = await getOwnerSession();
  if (!session) {
    redirect("/sign-in?restricted=1");
  }
  return session;
}
