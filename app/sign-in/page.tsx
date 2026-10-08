import { redirect } from "next/navigation";

import { Welcome } from "@/components/finder/welcome";
import { getOwnerSession } from "@/lib/session";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ restricted?: string }>;
}) {
  const session = await getOwnerSession();
  if (session) redirect("/dashboard");
  const { restricted } = await searchParams;

  return <Welcome intro={false} restricted={Boolean(restricted)} />;
}
