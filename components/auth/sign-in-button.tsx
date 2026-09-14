"use client";

import { Chrome, LoaderCircle } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function SignInButton() {
  const [pending, setPending] = useState(false);

  async function signIn() {
    setPending(true);
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/dashboard",
    });
  }

  return (
    <Button
      className="h-11 w-full rounded-lg"
      onClick={signIn}
      disabled={pending}
    >
      {pending ? <LoaderCircle className="animate-spin" /> : <Chrome />}
      Continue with Google
    </Button>
  );
}
