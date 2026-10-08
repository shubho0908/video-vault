/** Safe arithmetic for Spotlight: numbers, + - * / x × ÷ % (modulo), ^ and parentheses. No eval. */
export function evalExpr(src: string): number | null {
  const s = src.replace(/[×x]/gi, "*").replace(/÷/g, "/").replace(/,/g, "").replace(/\s+/g, "");
  if (!s || !/^[0-9+\-*/%^().]+$/.test(s) || !/[+\-*/%^]/.test(s.replace(/^[+-]/, "")) ) return null;
  let i = 0;
  const peek = () => s[i];
  const num = (): number => {
    if (peek() === "(") { i++; const v = add(); if (peek() !== ")") throw 0; i++; return v; }
    const m = /^\d*\.?\d+(?:e[+-]?\d+)?|^\d+\.?/i.exec(s.slice(i));
    if (!m) throw 0;
    i += m[0].length;
    return parseFloat(m[0]);
  };
  const unary = (): number => {
    if (peek() === "-") { i++; return -unary(); }
    if (peek() === "+") { i++; return unary(); }
    return pow();
  };
  const pow = (): number => { const b = num(); if (peek() === "^") { i++; return Math.pow(b, unary()); } return b; };
  const mul = (): number => {
    let v = unary();
    while (peek() === "*" || peek() === "/" || peek() === "%") {
      const o = s[i++]; const r = unary();
      v = o === "*" ? v * r : o === "/" ? v / r : v % r;
    }
    return v;
  };
  const add = (): number => {
    let v = mul();
    while (peek() === "+" || peek() === "-") { const o = s[i++]; const r = mul(); v = o === "+" ? v + r : v - r; }
    return v;
  };
  try {
    const v = add();
    if (i !== s.length || !Number.isFinite(v)) return null;
    return v;
  } catch { return null; }
}

export function formatNum(v: number): string {
  const r = Math.round(v * 1e10) / 1e10;
  return r.toLocaleString("en-US", { maximumFractionDigits: 10, useGrouping: false });
}
