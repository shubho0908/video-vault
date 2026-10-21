"use client";

import { useIsDesktop, whenIdle } from "./client-env";

import { useEffect } from "react";

import { authClient } from "@/lib/auth-client";

import "./finder.css";
import { IosHome } from "./ios-home";
import { MacDesktop } from "./mac-desktop";
import { useLibrary, type LibraryData } from "./library";


/**
 * Server pages read the session from a short-lived signed cookie (Better Auth cookieCache) instead of the
 * database. Server components cannot write cookies, so refresh that cookie from the client in the
 * background (when idle, then every 4 minutes while the tab is visible). Opening an entry then never
 * waits on a session query.
 */
function useSessionCacheWarmer() {
  useEffect(() => {
    // disableCookieCache: a cache hit is not re-issued, so force the read that writes a fresh 5-minute cookie
    const refresh = () => void authClient.getSession({ query: { disableCookieCache: true } }).catch(() => undefined);
    const cancelFirst = whenIdle(refresh, 5000, 2000);
    const timer = window.setInterval(() => document.visibilityState === "visible" && refresh(), 4 * 60 * 1000);
    // a tab coming back from the background may hold an expired cookie: refresh before the next click
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => (cancelFirst(), window.clearInterval(timer), document.removeEventListener("visibilitychange", onVisible));
  }, []);
}

/** Desktop gets the macOS Finder workspace; tablet and phone get iOS navigation. */
export function FinderApp({ initial, userName }: { initial: LibraryData; userName: string }) {
  const desktop = useIsDesktop();
  const lib = useLibrary(initial);
  useSessionCacheWarmer();
  if (desktop === null) return <div className="fx fx-desktop" />;
  return desktop ? <MacDesktop lib={lib} userName={userName} /> : <IosHome lib={lib} userName={userName} />;
}
