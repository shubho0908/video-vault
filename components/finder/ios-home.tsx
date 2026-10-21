"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { WallLayer } from "./wall-layer";
import { WallPicker } from "./wall-picker";

import { authClient } from "@/lib/auth-client";
import { NotesIos } from "./notes-app";
import { CalculatorIcon, FinderFace, NotesIcon, SettingsIcon } from "./icons";
import { IosLibrary } from "./ios-library";
import type { useLibrary } from "./library";

type Lib = ReturnType<typeof useLibrary>;
type AppId = "files" | "notes" | "calc" | "settings";
const APPS: { id: AppId; name: string; icon: ReactNode }[] = [
  { id: "files", name: "Files", icon: <FinderFace size={60} /> },
  { id: "notes", name: "Notes", icon: <NotesIcon size={60} /> },
  { id: "calc", name: "Calculator", icon: <CalculatorIcon size={60} /> },
  { id: "settings", name: "Settings", icon: <SettingsIcon size={60} /> },
];

function Clock() {
  const [t, setT] = useState("");
  useEffect(() => {
    const f = () => setT(new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: false }));
    f();
    const i = setInterval(f, 15000);
    return () => clearInterval(i);
  }, []);
  return <b>{t}</b>;
}

function StatusBar() {
  return (
    <div className="fx-ios-status"><Clock />
      <span className="fx-ios-status-r">
        <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor" aria-hidden><rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="5.5" width="3" height="6.5" rx="1" /><rect x="10" y="3" width="3" height="9" rx="1" /><rect x="15" y="0" width="3" height="12" rx="1" /></svg>
        <svg width="17" height="12" viewBox="0 0 24 18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden><path d="M2 6.5a14 14 0 0 1 20 0M6 10.5a8.5 8.5 0 0 1 12 0" /><circle cx="12" cy="15.5" r="1.4" fill="currentColor" /></svg>
        <svg width="27" height="13" viewBox="0 0 27 13" aria-hidden><rect x=".5" y=".5" width="23" height="12" rx="4" fill="none" stroke="currentColor" opacity=".4" /><rect x="2" y="2" width="20" height="9" rx="2.8" fill="currentColor" /><rect x="25" y="4.2" width="1.6" height="4.6" rx=".8" fill="currentColor" opacity=".4" /></svg>
      </span>
    </div>
  );
}


function CalcIos() {
  const [d, setD] = useState("0");
  const [acc, setAcc] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [fresh, setFresh] = useState(true);
  const run = (a: number, o: string, b: number) => (o === "+" ? a + b : o === "−" ? a - b : o === "×" ? a * b : b === 0 ? NaN : a / b);
  const press = (k: string) => {
    if (/\d/.test(k)) { setD(fresh || d === "0" ? k : d + k); setFresh(false); }
    else if (k === ".") { if (fresh) { setD("0."); setFresh(false); } else if (!d.includes(".")) setD(d + "."); }
    else if (k === "AC") { setD("0"); setAcc(null); setOp(null); setFresh(true); }
    else if (k === "±") setD(String(-parseFloat(d)));
    else if (k === "%") setD(String(parseFloat(d) / 100));
    else {
      const v = parseFloat(d);
      const r = acc !== null && op && !fresh ? run(acc, op, v) : v;
      setAcc(k === "=" ? null : r); setOp(k === "=" ? null : k); setD(Number.isNaN(r) ? "Error" : String(+r.toPrecision(10))); setFresh(true);
    }
  };
  const keys = ["AC", "±", "%", "÷", "7", "8", "9", "×", "4", "5", "6", "−", "1", "2", "3", "+", "0", ".", "="];
  return (
    <div className="fx-ios-calc">
      <div className="fx-ios-calc-d">{d}</div>
      <div className="fx-ios-calc-g">
        {keys.map(k => <button key={k} className={`k ${"÷×−+=".includes(k) ? "op" : "AC±%".includes(k) && k.length < 3 && !/\d/.test(k) ? "fn" : ""} ${k === "0" ? "z" : ""} ${op === k ? "on" : ""}`} onClick={() => press(k)}>{k}</button>)}
      </div>
    </div>
  );
}

function SettingsIos({ userName }: { userName: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <div className="fx-ios-app-page">
      <h1 className="fx-ios-large">Settings</h1>
      <div className="fx-ios-group" style={{ padding: "4px 16px" }}>
        <div className="fx-ios-srow"><span>{userName}</span></div>
        <div className="fx-ios-srow"><span>Dark Appearance</span><button role="switch" aria-checked={resolvedTheme === "dark"} className="fx-switch" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}><i /></button></div>
        <div className="fx-ios-srow" style={{ display: "block", padding: "12px 0" }}><div style={{ marginBottom: 10 }}>Wallpaper</div><WallPicker kind="ios" /></div>
        <div className="fx-ios-srow"><button style={{ color: "#ff3b30" }} onClick={() => authClient.signOut().then(() => location.assign("/sign-in"))}>Sign Out</button></div>
      </div>
    </div>
  );
}

export function IosHome({ lib, userName }: { lib: Lib; userName: string }) {
  const [open, setOpen] = useState<AppId | null>(null);
  const [phase, setPhase] = useState<"from" | "open" | "closing">("from");
  const rect = useRef<DOMRect | null>(null);
  const layer = useRef<HTMLDivElement>(null);

  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(closeTimer.current), []);
  const launch = (id: AppId, el: HTMLElement) => {
    // a close still in flight must not shut the app that is opening now
    clearTimeout(closeTimer.current);
    rect.current = el.getBoundingClientRect();
    setPhase("from"); setOpen(id);
  };
  useEffect(() => {
    if (open && phase === "from") requestAnimationFrame(() => requestAnimationFrame(() => setPhase("open")));
  }, [open, phase]);
  const close = () => {
    if (phase === "closing") return;
    setPhase("closing");
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(null), 420);
  };

  const r = rect.current;
  const small = phase !== "open" && r;
  const style = small
    ? { transform: `translate(${r.left + r.width / 2 - innerWidth / 2}px, ${r.top + r.height / 2 - innerHeight / 2}px) scale(${r.width / innerWidth}, ${r.height / innerHeight})`, borderRadius: 14 / (r.width / innerWidth), opacity: phase === "closing" ? 0 : 1 }
    : { transform: "none", borderRadius: 0, opacity: 1 };

  const today = useMemo(() => {
    const d = new Date();
    return { weekday: d.toLocaleDateString(undefined, { weekday: "long" }).toUpperCase(), day: d.getDate(), month: d.toLocaleDateString(undefined, { month: "long", year: "numeric" }) };
  }, []);
  const DECOR = ["photos", "safari", "maps", "music", "books", "app-store", "home", "find-my"];
  const decor = (id: string) => (
    <div key={id} className="fx-ios-icon" aria-hidden>
      <span className="gl"><img src={`/icons/${id}.png`} width={60} height={60} alt="" draggable={false} style={{ display: "block" }} /></span>
      <span className="nm">{id.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" ")}</span>
    </div>
  );

  return (
    <div className="fx fx-ios-home" data-open={open ? phase : undefined}>
      <div className="fx-ios-wall"><WallLayer kind="ios" /></div>
      <div className="fx-ios-sb" data-app={open && phase === "open" ? (open === "calc" ? "dark" : "app") : undefined}><StatusBar /></div>
      {/* transform only: a blur filter here re-blurred the whole home screen (and its glass widgets) every frame */}
      <div className="fx-ios-springboard" style={{ transform: open && phase === "open" ? "scale(.92)" : "none" }}>
        <div className="fx-ios-widgets">
          <div className="fx-ios-wg fx-ios-wg-date"><b>{today.weekday}</b><span>{today.day}</span><em>{today.month}</em></div>
          <button className="fx-ios-wg fx-ios-wg-short" onClick={e => launch("files", e.currentTarget)}><b>Files</b><em>Open library</em></button>
          <button className="fx-ios-wg fx-ios-wg-short fx-ios-wg-notes" onClick={e => launch("notes", e.currentTarget)}><b>Notes</b><em>About Me</em></button>
        </div>
        <div className="fx-ios-grid">{DECOR.map(decor)}</div>
        <div className="fx-ios-dots"><i className="on" /><i /></div>
        <div className="fx-ios-dock">{APPS.map(a => <button key={a.id} className="fx-ios-icon" aria-label={a.name} onClick={e => launch(a.id, e.currentTarget.querySelector(".gl") as HTMLElement)}><span className="gl">{a.icon}</span></button>)}</div>
      </div>
      <div className="fx-ios-dim" aria-hidden data-on={!!open && phase === "open"} />
      {open && (
        <div ref={layer} className="fx-ios-applayer" style={style}
          onTouchStart={e => { layer.current!.dataset.y = String(e.touches[0].clientY); }}
          onTouchEnd={e => { const y0 = Number(layer.current!.dataset.y); if (y0 > innerHeight - 60 && y0 - e.changedTouches[0].clientY > 60) close(); }}>
          <div className="fx-ios-appbody">
            {open === "files" && <IosLibrary lib={lib} />}
            {open === "notes" && <NotesIos />}
            {open === "calc" && <CalcIos />}
            {open === "settings" && <SettingsIos userName={userName} />}
          </div>
          <button className="fx-ios-indicator" aria-label="Go Home" onClick={close}
            onPointerDown={e => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); (e.currentTarget as HTMLElement).dataset.y = String(e.clientY); }}
            onPointerUp={e => { const y0 = Number((e.currentTarget as HTMLElement).dataset.y); if (y0 - e.clientY > 40) { e.preventDefault(); close(); } }} />
        </div>
      )}
    </div>
  );
}
