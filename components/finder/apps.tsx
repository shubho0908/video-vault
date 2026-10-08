"use client";

import { useTheme } from "next-themes";
import { useState } from "react";
import { Moon, Search, Sun } from "lucide-react";

import { SFChevronLeft, SFChevronRight } from "./sf";

import { WallPicker } from "./wall-picker";


type Drag = (e: React.PointerEvent) => void;


type Calc = { disp: string; acc: number | null; op: string | null; fresh: boolean };
const apply = (a: number, b: number, op: string) => (op === "+" ? a + b : op === "−" ? a - b : op === "×" ? a * b : b === 0 ? NaN : a / b);
const fmt = (n: number) => (Number.isFinite(n) ? String(+n.toPrecision(10)) : "Error");

export function CalculatorApp({ drag }: { drag: Drag }) {
  const [c, setC] = useState<Calc>({ disp: "0", acc: null, op: null, fresh: true });
  const press = (k: string) =>
    setC(s => {
      if (/\d/.test(k)) return s.fresh ? { ...s, disp: k, fresh: false } : { ...s, disp: s.disp === "0" ? k : s.disp.length < 12 ? s.disp + k : s.disp };
      if (k === ".") return s.fresh ? { ...s, disp: "0.", fresh: false } : s.disp.includes(".") ? s : { ...s, disp: s.disp + "." };
      if (k === "AC") return { disp: "0", acc: null, op: null, fresh: true };
      if (k === "±") return { ...s, disp: s.disp.startsWith("-") ? s.disp.slice(1) : s.disp === "0" ? s.disp : "-" + s.disp };
      if (k === "%") return { ...s, disp: fmt(parseFloat(s.disp) / 100), fresh: true };
      const cur = parseFloat(s.disp);
      const result = s.acc !== null && s.op && !s.fresh ? apply(s.acc, cur, s.op) : cur;
      if (k === "=") return { disp: fmt(result), acc: null, op: null, fresh: true };
      return { disp: fmt(result), acc: result, op: k, fresh: true };
    });
  const rows = [["AC", "±", "%", "÷"], ["7", "8", "9", "×"], ["4", "5", "6", "−"], ["1", "2", "3", "+"], ["0", ".", "="]];
  return (
    <div className="fx-calc" onPointerDown={drag}>
      <div className="fx-calc-disp" style={{ fontSize: c.disp.length > 8 ? 34 : 52 }} aria-live="polite">{c.disp}</div>
      <div className="fx-calc-grid" data-nodrag>
        {rows.flat().map(k => (
          <button key={k} className={`fx-calc-k ${"÷×−+=".includes(k) ? "op" : "AC±%".includes(k) && k.length ? "fn" : ""} ${c.op === k && c.fresh ? "on" : ""}`} style={k === "0" ? { gridColumn: "span 2", justifyContent: "flex-start", paddingLeft: 22 } : undefined} onClick={() => press(k)}>
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}

type Pane = "Appearance" | "General";
const Glyph = ({ pane, size }: { pane: Pane; size: number }) => pane === "Appearance" ? (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
    <circle cx="12" cy="12" r="8.2" /><path d="M12 3.8a8.2 8.2 0 0 1 0 16.4Z" fill="currentColor" stroke="none" />
  </svg>
) : (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
    <circle cx="12" cy="12" r="6.6" /><circle cx="12" cy="12" r="2.3" />
    <path d="M12 2.6v3M12 18.4v3M2.6 12h3M18.4 12h3M5.4 5.4l2.1 2.1M16.5 16.5l2.1 2.1M18.6 5.4l-2.1 2.1M7.5 16.5l-2.1 2.1" />
  </svg>
);
const PANES: { id: Pane; tint: string; blurb: string }[] = [
  { id: "Appearance", tint: "linear-gradient(#3a3a3c,#0a0a0b)", blurb: "Choose how Video Vault looks, and pick a wallpaper for the desktop." },
  { id: "General", tint: "linear-gradient(#a7a7ac,#7a7a80)", blurb: "Your account and basic details for this library." },
];

export function SettingsApp({ userName, drag, signOut }: { userName: string; drag: Drag; signOut: () => void }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [hist, setHist] = useState<{ stack: Pane[]; at: number }>({ stack: ["Appearance"], at: 0 });
  const [view, setView] = useState<"list" | "detail">("detail");
  const [scrolled, setScrolled] = useState(false);
  const [q, setQ] = useState("");
  const pane = hist.stack[hist.at];
  const go = (p: Pane) => { setView("detail"); if (p !== pane) setHist(h => ({ stack: [...h.stack.slice(0, h.at + 1), p], at: h.at + 1 })); };
  const meta = PANES.find(x => x.id === pane)!;
  const shown = PANES.filter(x => x.id.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <>
      <aside className="fx-sidebar fx-set-side" data-view={view} onPointerDown={drag}>
        <label className="fx-set-search" data-nodrag><Search size={14} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search" aria-label="Search settings" /></label>
        <div className="fx-set-profile">
          <span className="fx-avatar">{userName.slice(0, 1)}</span>
          <span><b>{userName}</b><small>Account</small></span>
        </div>
        <div className="fx-set-list">
          {shown.map(x => (
            <button key={x.id} className="fx-side-row" aria-current={pane === x.id} onClick={() => go(x.id)}>
              <span className="fx-set-ic" style={{ background: x.tint }}><Glyph pane={x.id} size={14} /></span>{x.id}
            </button>
          ))}
        </div>
      </aside>
      <section className="fx-main fx-set-main" data-view={view}>
        <div className="fx-toolbar" onPointerDown={drag}>
          <button className="fx-set-back fx-pill fx-glass" data-nodrag onClick={() => setView("list")}><SFChevronLeft size={16} />Settings</button>
          <div className="fx-navpill fx-glass" data-nodrag>
            <button className="fx-nav" aria-label="Back" disabled={hist.at === 0} onClick={() => setHist(h => ({ ...h, at: h.at - 1 }))}><SFChevronLeft size={16} /></button>
            <i className="fx-nav-div" aria-hidden />
            <button className="fx-nav" aria-label="Forward" disabled={hist.at >= hist.stack.length - 1} onClick={() => setHist(h => ({ ...h, at: h.at + 1 }))}><SFChevronRight size={16} /></button>
          </div>
          <div className="fx-title" style={{ opacity: scrolled ? 1 : 0, transition: "opacity .15s" }}><span>{pane}</span></div>
        </div>
        <div className="fx-set-scroll" onScroll={e => setScrolled(e.currentTarget.scrollTop > 56)}>
          <header className="fx-set-head">
            <span className="fx-set-big" style={{ background: meta.tint }}><Glyph pane={pane} size={34} /></span>
            <h2>{pane}</h2>
            <p>{meta.blurb}</p>
          </header>
          {pane === "Appearance" ? (
            <>
              <div className="fx-set-group">
                <div className="fx-set-grow fx-set-pick">
                  {(["light", "dark"] as const).map(t => (
                    <button key={t} className="fx-tile-pick" aria-pressed={resolvedTheme === t} onClick={() => setTheme(t)}>
                      <span className={`fx-tile-prev ${t}`}>{t === "light" ? <Sun size={18} /> : <Moon size={18} />}</span>
                      <span>{t === "light" ? "Light" : "Dark"}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="fx-set-cap">Wallpaper</div>
              <div className="fx-set-group"><div className="fx-set-grow"><WallPicker kind="mac" /></div></div>
              <div className="fx-set-cap" />
              <div className="fx-set-group"><button className="fx-set-grow fx-set-link" onClick={() => go("General")}><span>General</span><span className="fx-set-chev"><SFChevronRight size={13} /></span></button></div>
            </>
          ) : (
            <>
              <div className="fx-set-group">
                <div className="fx-set-grow"><span>Name</span><span className="fx-set-val">{userName}</span></div>
                <div className="fx-set-grow"><span>Account</span><button className="fx-btn" onClick={signOut}>Sign Out…</button></div>
              </div>
              <div className="fx-set-cap" />
              <div className="fx-set-group"><button className="fx-set-grow fx-set-link" onClick={() => go("Appearance")}><span>Appearance</span><span className="fx-set-chev"><SFChevronRight size={13} /></span></button></div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
