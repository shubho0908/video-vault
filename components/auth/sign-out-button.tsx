"use client";

import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  async function signOut() {
    await authClient.signOut();
    window.location.assign("/sign-in");
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={signOut}
      className="text-muted-foreground hover:text-foreground"
    >
      <LogOut />
      <span className="hidden sm:inline">Sign out</span>
    </Button>
  );
}

