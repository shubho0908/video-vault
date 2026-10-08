"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, Copy, Search } from "lucide-react";

import { evalExpr, formatNum } from "./calc-expr";
import { FinderFace } from "./icons";

import { thumb, type LibraryData } from "./library";
import { APPS, ORDER, type AppId } from "./windows";

export type Panel = "battery" | "wifi" | "cc" | "date" | null;

type Battery = { level: number; charging: boolean } | null | undefined;
export function useBattery(): Battery {
  const [b, setB] = useState<Battery>(undefined);
  useEffect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number; charging: boolean; addEventListener: (t: string, f: () => void) => void; removeEventListener: (t: string, f: () => void) => void }> };
    if (!nav.getBattery) return setB(null);
    let off: (() => void) | undefined;
    let dead = false;
    nav.getBattery().then(m => {
      const read = () => setB({ level: m.level, charging: m.charging });
      read();
      m.addEventListener("levelchange", read);
      m.addEventListener("chargingchange", read);
      off = () => (m.removeEventListener("levelchange", read), m.removeEventListener("chargingchange", read));
      if (dead) off();
    }, () => setB(null));
    return () => ((dead = true), off?.());
  }, []);
  return b;
}

export function useConnection() {
  const [c, setC] = useState<{ type?: string; down?: number } | null>(null);
  useEffect(() => {
    const con = (navigator as Navigator & { connection?: { effectiveType?: string; downlink?: number; addEventListener: (t: string, f: () => void) => void; removeEventListener: (t: string, f: () => void) => void } }).connection;
    if (!con) return;
    const read = () => setC({ type: con.effectiveType, down: con.downlink });
    read();
    con.addEventListener("change", read);
    return () => con.removeEventListener("change", read);
  }, []);
  return c;
}

export const BatteryGlyph = ({ level = 1, charging }: { level?: number; charging?: boolean }) => (
  <svg width="27" height="13" viewBox="0 0 26 13" aria-hidden>
    <rect x=".5" y=".5" width="22" height="12" rx="3.500" fill="none" stroke="currentColor" strokeWidth=".9" opacity=".5" />
    <rect x="2" y="2" width={Math.max(level * 19, 2)} height="9" rx="2" fill={level <= 0.2 && !charging ? "#ff3b30" : "currentColor"} />
    <path d="M24 4.500v4c.9-.3 1.500-1.200 1.500-2s-.6-1.700-1.500-2Z" fill="currentColor" opacity=".5" />
  </svg>
);
export const WifiGlyph = ({ off }: { off?: boolean }) => (
  <svg width="18" height="13" viewBox="0 0 18 13" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" aria-hidden opacity={off ? 0.4 : 1}>
    <path d="M2.600 4.100a9.100 9.100 0 0 1 12.800 0" />
    <path d="M5 6.700a5.700 5.700 0 0 1 8 0" />
    <path d="M7.300 9.200a2.500 2.500 0 0 1 3.400 0" />
    <circle cx="9" cy="11.300" r=".9" fill="currentColor" stroke="none" />
  </svg>
);
export const ControlGlyph = () => (
  <svg width="16" height="14" viewBox="0 0 16 14" fill="none" stroke="currentColor" strokeWidth="1.250" aria-hidden>
    <rect x="1" y="1" width="14" height="5" rx="2.500" /><circle cx="11" cy="3.500" r="1.500" fill="currentColor" stroke="none" />
    <rect x="1" y="8" width="14" height="5" rx="2.500" fill="currentColor" fillOpacity=".9" /><circle cx="5" cy="10.500" r="1.500" fill="#000" fillOpacity=".55" stroke="none" />
  </svg>
);

/** Popover that scales out of the icon that opened it (macOS menu-extra feel). */
export function Popover({ right, width, children, cc }: { right: number; width: number; children: ReactNode; cc?: boolean }) {
  return (
    <div className={cc ? "fx-extra fx-cc-pop" : "fx-menu fx-extra"} style={{ right, width, top: 27 }} onPointerDown={e => e.stopPropagation()}>
      {children}
    </div>
  );
}

const Toggle = ({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) => (
  <button role="switch" aria-checked={on} aria-label={label} className="fx-switch" onClick={onChange}><i /></button>
);

export function BatteryPanel({ b, openSettings }: { b: Battery; openSettings: () => void }) {
  return (
    <>
      <div className="fx-x-h">Battery</div>
      <div className="fx-x-big">{b ? `${Math.round(b.level * 100)}%` : "--"}</div>
      <div className="fx-x-sub">{b === undefined ? "Checking…" : b === null ? "Battery details aren't available in this browser." : b.charging ? "Power Source: Power Adapter" : "Power Source: Battery"}</div>
      <hr />
      <div className="fx-menu-row" onClick={openSettings}>Battery Settings…</div>
    </>
  );
}

export function WifiPanel({ on, setOn, openSettings }: { on: boolean; setOn: () => void; openSettings: () => void }) {
  const con = useConnection();
  return (
    <>
      <div className="fx-x-row"><b>Wi-Fi</b><Toggle on={on} onChange={setOn} label="Wi-Fi" /></div>
      <hr />
      <div className="fx-x-sub" style={{ padding: "0 10px 6px" }}>
        {!on ? "Wi-Fi is turned off (display only)." : con ? `Connected · ${con.type ?? "online"}${con.down ? ` · ~${con.down} Mbps` : ""}` : navigator.onLine ? "Connected" : "Offline"}
      </div>
      <hr />
      <div className="fx-menu-row" onClick={openSettings}>Wi-Fi Settings…</div>
    </>
  );
}

const G = (d: ReactNode) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d}</svg>;
const gWifi = G(<><path d="M2 9a15 15 0 0 1 20 0M5 12.5a10.5 10.5 0 0 1 14 0M8.5 16a5.5 5.5 0 0 1 7 0" /><circle cx="12" cy="19.2" r=".6" fill="currentColor" /></>);
const gBt = G(<path d="M7 7l10 10-5 4V3l5 4L7 17" />);
const gAir = G(<><circle cx="12" cy="12" r="2" /><path d="M7.8 16.2a6 6 0 0 1 0-8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 19a10 10 0 0 1 0-14M19.1 5a10 10 0 0 1 0 14" /></>);
const gMoon = G(<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z" />);
const gStage = <svg className="wide" viewBox="0 0 36 26" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true"><g fill="currentColor" stroke="none"><rect x="0" y="1" width="5.4" height="5.4" rx="1.3" /><rect x="0" y="10.3" width="5.4" height="5.4" rx="1.3" /><rect x="0" y="19.6" width="5.4" height="5.4" rx="1.3" /></g><rect x="10.5" y="1.5" width="24" height="23" rx="4" /></svg>;
const gMirror = <svg className="wide" viewBox="0 0 36 28" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true"><rect x="2" y="1.5" width="22" height="17" rx="4" opacity=".85" /><rect x="8.5" y="7.5" width="26" height="19" rx="4" /></svg>;
const gDark = G(<><circle cx="12" cy="12" r="8.5" /><path d="M12 3.5v17" fill="currentColor" /><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" /></>);
const gCalc = G(<><rect x="5" y="3" width="14" height="18" rx="2.5" /><path d="M8.5 7.5h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01" /></>);
const gTimer = G(<><circle cx="12" cy="13.5" r="7.5" /><path d="M12 13.5l3.5-3.5M9.5 2.5h5" /></>);
const gShot = G(<><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" /><circle cx="12" cy="12" r="3.2" /></>);
const gSun = G(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M5 19l1.4-1.4M17.6 6.4L19 5" /></>);
const gVol = G(<><path d="M4 9.5v5h4l5 4v-13l-5 4z" fill="currentColor" /><path d="M16.5 9a4 4 0 0 1 0 6" /></>);

export function ControlCenter({ dark, setDark, wifi, setWifi, brightness, setBrightness, openSettings }: { dark: boolean; setDark: () => void; wifi: boolean; setWifi: () => void; brightness: number; setBrightness: (n: number) => void; openSettings: () => void }) {
  const [bt, setBt] = useState(true);
  const [air, setAir] = useState(true);
  const [focus, setFocus] = useState(false);
  const [vol, setVol] = useState(0.6);
  const slider = (label: string, v: number, set: (n: number) => void, min: number, lo: ReactNode, hi: ReactNode) => (
    <div className="fx-g fx-cc-slider">
      <b>{label}</b>
      <div className="fx-cc-srow">{lo}
        <input type="range" min={min} max={1} step={0.01} value={v} onChange={e => set(+e.target.value)} aria-label={label} className="fx-range" style={{ ["--p" as string]: `${((v - min) / (1 - min)) * 100}%` }} />
        {hi}</div>
    </div>
  );
  return (
    <div className="fx-cc2">
      <button className="fx-g fx-cc-cap" style={{ gridArea: "wifi" }} aria-pressed={wifi} onClick={setWifi}><span className="fx-cc-ic" data-on={wifi}>{gWifi}</span><span><b>Wi-Fi</b><small>{wifi ? "Home" : "Off"}</small></span></button>
      <div className="fx-g fx-cc-music" style={{ gridArea: "music" }}>
        <span className="fx-cc-art" />
        <div className="fx-cc-meta"><b>Not Playing</b><small>Music</small></div>
        <div className="fx-cc-tr">
          <button aria-label="Previous" tabIndex={-1}><svg viewBox="0 0 26 18" width="26" height="18" fill="currentColor"><path d="M13 2.2v13.6c0 .7-.8 1.1-1.4.7L2.6 9.7a.9.9 0 0 1 0-1.4l9-6.8c.6-.4 1.4 0 1.4.7Z" /><path d="M24 2.2v13.6c0 .7-.8 1.1-1.4.7l-9-6.8a.9.9 0 0 1 0-1.4l9-6.8c.6-.4 1.4 0 1.4.7Z" /></svg></button>
          <button aria-label="Play" tabIndex={-1}><svg viewBox="0 0 20 24" width="20" height="24" fill="currentColor"><path d="M2 3.1v17.8c0 1 1.1 1.6 1.9 1l14.2-8.9a1.2 1.2 0 0 0 0-2L3.9 2.1C3.1 1.5 2 2.1 2 3.1Z" /></svg></button>
          <button aria-label="Next" tabIndex={-1}><svg viewBox="0 0 26 18" width="26" height="18" fill="currentColor"><path d="M13 2.2v13.6c0 .7.8 1.1 1.4.7l9-6.8a.9.9 0 0 0 0-1.4l-9-6.8c-.6-.4-1.4 0-1.4.7Z" /><path d="M2 2.2v13.6c0 .7.8 1.1 1.4.7l9-6.8a.9.9 0 0 0 0-1.4l-9-6.8C2.8 1.1 2 1.5 2 2.2Z" /></svg></button>
        </div>
      </div>
      <button className="fx-g fx-cc-circ" style={{ gridArea: "bt" }} aria-label="Bluetooth" aria-pressed={bt} data-on={bt} onClick={() => setBt(!bt)}>{gBt}</button>
      <button className="fx-g fx-cc-circ" style={{ gridArea: "air" }} aria-label="AirDrop" aria-pressed={air} data-on={air} onClick={() => setAir(!air)}>{gAir}</button>
      <button className="fx-g fx-cc-cap" style={{ gridArea: "focus" }} aria-pressed={focus} onClick={() => setFocus(!focus)}><span className="fx-cc-ic" data-on={focus}>{gMoon}</span><b>Focus</b></button>
      <button className="fx-g fx-cc-circ" style={{ gridArea: "stage" }} aria-label="Stage Manager">{gStage}</button>
      <button className="fx-g fx-cc-circ" style={{ gridArea: "mirror" }} aria-label="Screen Mirroring">{gMirror}</button>
      <div style={{ gridArea: "disp" }}>{slider("Display", brightness, setBrightness, 0.4, gSun, gSun)}</div>
      <div style={{ gridArea: "snd" }}>{slider("Sound", vol, setVol, 0, gVol, gVol)}</div>
      <div className="fx-cc-bottom">
        <button className="fx-g fx-cc-circ" aria-label="Dark Mode" aria-pressed={dark} data-on={dark} onClick={setDark}>{gDark}</button>
        <button className="fx-g fx-cc-circ" aria-label="System Settings" onClick={openSettings}>{gCalc}</button>
        <button className="fx-g fx-cc-circ" aria-label="Timer">{gTimer}</button>
        <button className="fx-g fx-cc-circ" aria-label="Screenshot">{gShot}</button>
      </div>
    </div>
  );
}

export function DatePanel({ onClose }: { onClose: () => void }) {
  const [now] = useState(() => new Date());
  const y = now.getFullYear(), m = now.getMonth();
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  return (
    <div className="fx-notif fx-glass" onPointerDown={e => e.stopPropagation()}>
      <button className="fx-notif-x" aria-label="Close" onClick={onClose}>×</button>
      <div className="fx-notif-date">{now.toLocaleDateString("en-US", { weekday: "long" })}<small>{now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</small></div>
      <div className="fx-cal">
        <b>{now.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</b>
        {"SMTWTFS".split("").map((d, i) => <span key={i} className="h">{d}</span>)}
        {cells.map((d, i) => <span key={i} className={d === now.getDate() ? "today" : ""}>{d}</span>)}
      </div>
      <div className="fx-x-sub" style={{ textAlign: "center", marginTop: 14 }}>No Notifications</div>
    </div>
  );
}

export function Spotlight({ data, close, openApp, openEntry, openFolder, searchFinder }: { data: LibraryData; close: () => void; openApp: (id: AppId) => void; openEntry: (id: string) => void; openFolder: (id: string) => void; searchFinder?: (q: string) => void }) {
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return [
      ...ORDER.filter(a => APPS[a].name.toLowerCase().includes(t)).map(a => ({ key: a, label: APPS[a].name, kind: "Application", icon: APPS[a].icon(26), run: () => openApp(a) })),
      ...data.folders.filter(f => f.name.toLowerCase().includes(t)).map(f => ({ key: f.id, label: f.name, kind: "Folder", icon: <span style={{ width: 26 }} />, run: () => openFolder(f.id) })),
      ...data.entries.filter(e => e.title.toLowerCase().includes(t) || e.topic.toLowerCase().includes(t)).slice(0, 8).map(e => ({ key: e.id, label: e.title, kind: e.topic, icon: <img src={thumb(e.youtubeId)} alt="" width={26} height={16} style={{ borderRadius: 2 }} />, run: () => openEntry(e.id) })),
    ];
  }, [q, data, openApp, openEntry, openFolder]);
  const calc = useMemo(() => { const v = evalExpr(q); return v === null ? null : formatNum(v); }, [q]);
  const [copied, setCopied] = useState(false);
  const all = useMemo(() => {
    const t = q.trim();
    if (!t || !searchFinder) return results;
    return [...results, { key: "__finder", label: "Search in Finder", kind: "", icon: <FinderFace size={26} />, run: () => searchFinder(t) }];
  }, [results, q, searchFinder]);
  return (
    <div className="fx-spot-back" onPointerDown={close}>
      <div className="fx-spot fx-glass" onPointerDown={e => e.stopPropagation()}>
        <div className="fx-spot-in">
          <Search size={22} style={{ opacity: 0.55 }} />
          <input
            ref={ref}
            value={q}
            placeholder="Spotlight Search"
            onChange={e => (setQ(e.target.value), setI(0))}
            onKeyDown={e => {
              e.stopPropagation();
              if (e.key === "Escape") close();
              if (e.key === "ArrowDown") (e.preventDefault(), setI(Math.min(i + 1, all.length - 1)));
              if (e.key === "ArrowUp") (e.preventDefault(), setI(Math.max(i - 1, 0)));
              if (e.key === "Enter" && all[i]) (close(), all[i].run());
            }}
          />
        </div>
        {calc !== null && (
          <div className="fx-spot-calc">
            <div className="fx-spot-calc-t"><small>{q.trim()} =</small><b>{calc}</b></div>
            <button aria-label="Copy result" className="fx-spot-copy" onClick={() => { navigator.clipboard?.writeText(calc).then(() => (setCopied(true), setTimeout(() => setCopied(false), 1200)), () => undefined); }}>{copied ? <Check size={16} /> : <Copy size={16} />}</button>
          </div>
        )}
        {all.length > 0 && (
          <div className="fx-spot-list">
            {all.map((r, n) => (
              <button key={r.key} aria-selected={n === i} onPointerEnter={() => setI(n)} onClick={() => (close(), r.run())}>
                {r.icon}<span>{r.label}</span><small>{r.kind}</small>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
