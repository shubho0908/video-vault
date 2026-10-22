import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/lib/auth";
import { isOwnerEmail } from "@/lib/owner";

// Share one session read within a request; never cache authentication across requests.
export const getOwnerSession = cache(async (fresh = false) => {
  // Mutations bypass the cookie cache so revoked sessions cannot write data.
  const session = await auth.api.getSession({ headers: await headers(), ...(fresh ? { query: { disableCookieCache: true } } : {}) });
  if (!session || !isOwnerEmail(session.user.email)) {
    return null;
  }
  return session;
});

export async function requireOwner({ fresh = false }: { fresh?: boolean } = {}) {
  const session = await getOwnerSession(fresh);
  if (!session) {
    redirect("/sign-in?restricted=1");
  }
  return session;
}
