"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTheme } from "next-themes";
import { useState } from "react";
import { Moon, Sun } from "lucide-react";

import { SmallFolder } from "./icons";
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

export function SettingsApp({ userName, drag, signOut }: { userName: string; drag: Drag; signOut: () => void }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [pane, setPane] = useState<"Appearance" | "General">("Appearance");
  return (
    <>
      <aside className="fx-sidebar" style={{ width: 210 }} onPointerDown={drag}>
        <div>
          <div className="fx-side-row" style={{ height: 52, gap: 10, marginTop: 6 }}>
            <span className="fx-avatar">{userName.slice(0, 1)}</span>
            <span style={{ fontWeight: 600 }}>{userName}</span>
          </div>
        </div>
        <div>
          {(["Appearance", "General"] as const).map(p => (
            <button key={p} className="fx-side-row" aria-current={pane === p} onClick={() => setPane(p)} style={{ width: "100%" }}>{p}</button>
          ))}
        </div>
      </aside>
      <section className="fx-main" style={{ padding: "58px 28px 24px", overflow: "auto" }}>
        <div className="fx-toolbar" onPointerDown={drag}><div className="fx-title">{pane}</div></div>
        {pane === "Appearance" ? (
          <div className="fx-set-card">
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Appearance</div>
            <div style={{ display: "flex", gap: 18 }}>
              {(["light", "dark"] as const).map(t => (
                <button key={t} className="fx-tile-pick" aria-pressed={resolvedTheme === t} onClick={() => setTheme(t)}>
                  <span className={`fx-tile-prev ${t}`}>{t === "light" ? <Sun size={18} /> : <Moon size={18} />}</span>
                  <span>{t === "light" ? "Light" : "Dark"}</span>
                </button>
              ))}
            </div>
            <div style={{ fontWeight: 600, margin: "20px 0 12px" }}>Wallpaper</div>
            <WallPicker kind="mac" />
          </div>
        ) : (
          <div className="fx-set-card">
            <div className="fx-set-row"><span>Name</span><span style={{ color: "var(--fx-label-2)" }}>{userName}</span></div>
            <div className="fx-set-row"><span>Account</span><button className="fx-btn" onClick={signOut}>Sign Out…</button></div>
          </div>
        )}
      </section>
    </>
  );
}
