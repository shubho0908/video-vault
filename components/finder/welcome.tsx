"use client";

import { useIsDesktop } from "./client-env";

import Link from "next/link";
import { helloPaths } from "./hello-paths";
import { useEffect, useState, useSyncExternalStore } from "react";

import { authClient } from "@/lib/auth-client";
import "./finder.css";
import "./welcome.css";



const greetings = ["नमस्ते", "Bonjour", "Hola", "こんにちは", "Ciao", "Hello"];
const SEEN_KEY = "shubhojeets-videos:intro-seen";
const introSeen = () => { try { return localStorage.getItem(SEEN_KEY) === "1"; } catch { return false; } };
const markIntroSeen = () => { try { localStorage.setItem(SEEN_KEY, "1"); } catch {} };
const WRITE_MS = 2100;
const STEP_MS = 300;
const OUT_MS = 500;

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function Intro({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(-1);
  const [out, setOut] = useState(false);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return onDone();
    const timers: ReturnType<typeof setTimeout>[] = [];
    greetings.forEach((_, n) => timers.push(setTimeout(() => setI(n), WRITE_MS + 250 + n * STEP_MS)));
    const end = WRITE_MS + 250 + greetings.length * STEP_MS + 150;
    timers.push(setTimeout(() => setOut(true), end));
    timers.push(setTimeout(onDone, end + OUT_MS));
    return () => timers.forEach(clearTimeout);
  }, [onDone]);
  return (
    <div className="wl-intro" data-out={out} onClick={onDone} role="presentation">
      {i < 0 ? (
        <svg className="wl-write" viewBox="-20 -20 678 240" fill="none" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="hello">
          <defs>
            <linearGradient id="wl-g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="638" y2="0"><stop offset="0" className="wl-s0" /><stop offset=".55" className="wl-s1" /><stop offset="1" className="wl-s2" /></linearGradient>
          </defs>
          <g transform="translate(0 4)">
            {helloPaths.map((d, n) => <path key={`s${n}`} d={d} pathLength={1} className={`wl-p wl-sh wl-p${n}`} />)}
            {helloPaths.map((d, n) => <path key={`t${n}`} d={d} pathLength={1} className={`wl-p wl-sh2 wl-p${n}`} />)}
          </g>
          {helloPaths.map((d, n) => <path key={`r${n}`} d={d} pathLength={1} className={`wl-p wl-rim wl-p${n}`} />)}
          {helloPaths.map((d, n) => <path key={n} d={d} pathLength={1} className={`wl-p wl-body wl-p${n}`} />)}
          {helloPaths.map((d, n) => <path key={`i${n}`} d={d} pathLength={1} className={`wl-p wl-in wl-p${n}`} />)}
          {helloPaths.map((d, n) => <path key={`j${n}`} d={d} pathLength={1} className={`wl-p wl-in2 wl-p${n}`} />)}
          <g transform="translate(-2.5 -3.5)">{helloPaths.map((d, n) => <path key={`h${n}`} d={d} pathLength={1} className={`wl-p wl-hl wl-p${n}`} />)}</g>
        </svg>
      ) : (
        <span key={i} className="wl-greet" lang="">{greetings[i]}</span>
      )}
    </div>
  );
}

function Auth({ desktop, restricted }: { desktop: boolean; restricted: boolean }) {
  const now = useClock();
  const tablet = useSyncExternalStore((cb) => { const m = matchMedia("(min-width: 700px)"); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); }, () => matchMedia("(min-width: 700px)").matches, () => false);
  const [pending, setPending] = useState(false);
  async function signIn() {
    setPending(true);
    await authClient.signIn.social({ provider: "google", callbackURL: "/dashboard" });
  }
  const time = now?.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: !desktop ? false : true }).replace(/ ?[AP]M/, "") ?? "";
  const bar = now ? `${now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} ${now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : "";
  const date = now?.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) ?? "";
  const btn = (
    <button className="wl-btn" onClick={signIn} disabled={pending}>
      {pending ? "Signing in…" : "Continue with Google"}
    </button>
  );
  const legal = (
    <p className="wl-legal">
      <Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link>
    </p>
  );
  const alert = restricted ? (
    <p role="alert" className="wl-alert">This journal is restricted to its designated owner account.</p>
  ) : null;

  return desktop ? (
    <div className="wl-auth wl-mac">
      <div className="wl-wall" />
      <div className="wl-mbar"><span /><span>{bar}</span></div>
      <div className="wl-center">
        <div className="wl-avatar"><img src="/avatar.webp" alt="" width="104" height="104" /></div>
        <h1>Shubhojeet&apos;s MacBook</h1>
        {btn}
        {alert}
      </div>
      {legal}
    </div>
  ) : (
    <div className="wl-auth wl-ios">
      <div className="wl-wall" />
      <div className="wl-lock">
        <div className="wl-avatar wl-avatar-sm"><img src="/avatar.webp" alt="" width="64" height="64" /></div>
        <p className="wl-date">{date}</p>
        <p className="wl-time">{time}</p>
      </div>
      <div className="wl-bottom">
        {alert}
        <p className="wl-sub">Shubhojeet&apos;s {tablet ? "iPad" : "iPhone"}</p>
        {btn}
        {legal}
      </div>
      <div className="wl-home" />
    </div>
  );
}

export function Welcome({ intro = true, restricted = false }: { intro?: boolean; restricted?: boolean }) {
  const desktop = useIsDesktop();
  const [showIntro, setShowIntro] = useState(() => intro && !introSeen());
  if (desktop === null) return <div className="fx wl-root wl-blank" />;
  return (
    <div className="fx wl-root" data-os={desktop ? "mac" : "ios"}>
      <Auth desktop={desktop} restricted={restricted} />
      {showIntro ? <Intro onDone={() => (markIntroSeen(), setShowIntro(false))} /> : null}
    </div>
  );
}
