import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Welcome } from "@/components/finder/welcome";
import { getOwnerSession } from "@/lib/session";

export const metadata: Metadata = {
  description:
    "Shubhojeet's Videos is a private, single-owner learning journal: save unlisted YouTube explanations, write lasting notes, and keep references together.",
};


export default async function HomePage() {
  const session = await getOwnerSession();
  if (session) redirect("/dashboard");

  return <Welcome />;
}
