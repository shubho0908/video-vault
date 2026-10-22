"use client";

import { useIsDesktop, whenIdle } from "./client-env";

import { useEffect } from "react";

import { authClient } from "@/lib/auth-client";

import "./finder.css";
import { IosHome } from "./ios-home";
import { MacDesktop } from "./mac-desktop";
import { useLibrary, type LibraryData } from "./library";


// Server components cannot refresh cookies; warm the session cache through the client endpoint.
function useSessionCacheWarmer() {
  useEffect(() => {
    // Cache hits do not reissue cookies; force a fresh read before the cached session expires.
    const refresh = () => void authClient.getSession({ query: { disableCookieCache: true } }).catch(() => undefined);
    const cancelFirst = whenIdle(refresh, 5000, 2000);
    const timer = window.setInterval(() => document.visibilityState === "visible" && refresh(), 4 * 60 * 1000);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => (cancelFirst(), window.clearInterval(timer), document.removeEventListener("visibilitychange", onVisible));
  }, []);
}

export function FinderApp({ initial, userName }: { initial: LibraryData; userName: string }) {
  const desktop = useIsDesktop();
  const lib = useLibrary(initial);
  useSessionCacheWarmer();
  if (desktop === null) return <div className="fx fx-desktop" />;
  return desktop ? <MacDesktop lib={lib} userName={userName} /> : <IosHome lib={lib} userName={userName} />;
}
