import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { isOwnerEmail } from "@/lib/owner";

export async function getOwnerSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !isOwnerEmail(session.user.email)) {
    return null;
  }
  return session;
}

export async function requireOwner() {
  const session = await getOwnerSession();
  if (!session) {
    redirect("/sign-in?restricted=1");
  }
  return session;
}
