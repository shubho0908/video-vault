import { describe, expect, it } from "vitest";

import { evalExpr, formatNum } from "@/components/finder/calc-expr";

describe("Spotlight arithmetic", () => {
  it("applies operator precedence, parentheses and unary minus", () => {
    expect(evalExpr("2+3*4")).toBe(14);
    expect(evalExpr("(2+3)*4")).toBe(20);
    expect(evalExpr("2*3+4*5")).toBe(26);
    expect(evalExpr("-(3-8)")).toBe(5);
    expect(evalExpr("2^3^2")).toBe(512);
  });

  it("accepts the keyboard shapes a person types", () => {
    expect(evalExpr("10 % 3")).toBe(1);
    expect(evalExpr("8 ÷ 2")).toBe(4);
    expect(evalExpr("6 x 7")).toBe(42);
    expect(evalExpr("1,250 + 750")).toBe(2000);
    expect(evalExpr(" 12 * 0.5 ")).toBe(6);
    expect(evalExpr("2.+3")).toBe(5);
    expect(evalExpr("2.5+.5")).toBe(3);
  });

  it("returns null for anything that is not a finite calculation", () => {
    expect(evalExpr("")).toBeNull();
    expect(evalExpr("bun run dev")).toBeNull();
    expect(evalExpr("alert(1)")).toBeNull();
    expect(evalExpr("2+")).toBeNull();
    expect(evalExpr("(2+3")).toBeNull();
    expect(evalExpr("2 3")).toBeNull();
    expect(evalExpr("1/0")).toBeNull();
    expect(evalExpr("999999999999999999999999999999")).toBeNull();
  });

  it("formats results without float noise or thousands separators", () => {
    expect(formatNum(0.1 + 0.2)).toBe("0.3");
    expect(formatNum(1 / 3)).toBe("0.3333333333");
    expect(formatNum(1234567.5)).toBe("1234567.5");
    expect(formatNum(-0)).toBe("0");
  });
});
