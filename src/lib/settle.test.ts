import { describe, expect, it } from "vitest";
import { netBalances, settlementPlan } from "./settle";

describe("netBalances", () => {
  it("割り勘の収支を計算する", () => {
    const b = netBalances([
      { payerId: "a", amount: 3000, participants: ["a", "b", "c"] },
    ]);
    expect(b.get("a")).toBe(2000);
    expect(b.get("b")).toBe(-1000);
    expect(b.get("c")).toBe(-1000);
  });

  it("割り切れない余りは払った人が負担する", () => {
    const b = netBalances([
      { payerId: "a", amount: 1000, participants: ["a", "b", "c"] },
    ]);
    // share=333, 余り1はaが負担 → a: +1000-333-1=666, b/c: -333
    expect(b.get("a")).toBe(666);
    expect(b.get("b")).toBe(-333);
    expect(b.get("c")).toBe(-333);
    const total = [...b.values()].reduce((x, y) => x + y, 0);
    expect(total).toBe(0);
  });

  it("複数の立替を通算する", () => {
    const b = netBalances([
      { payerId: "a", amount: 2000, participants: ["a", "b"] },
      { payerId: "b", amount: 1000, participants: ["a", "b"] },
    ]);
    expect(b.get("a")).toBe(500);
    expect(b.get("b")).toBe(-500);
  });
});

describe("settlementPlan", () => {
  it("誰が誰にいくら払うかを提示する", () => {
    const plan = settlementPlan([
      { payerId: "a", amount: 3000, participants: ["a", "b", "c"] },
    ]);
    expect(plan).toEqual([
      { from: "b", to: "a", amount: 1000 },
      { from: "c", to: "a", amount: 1000 },
    ]);
  });

  it("相殺後の差額だけを移す", () => {
    const plan = settlementPlan([
      { payerId: "a", amount: 2000, participants: ["a", "b"] },
      { payerId: "b", amount: 1000, participants: ["a", "b"] },
    ]);
    expect(plan).toEqual([{ from: "b", to: "a", amount: 500 }]);
  });

  it("全員が均等に払っていれば精算不要", () => {
    const plan = settlementPlan([
      { payerId: "a", amount: 1000, participants: ["a", "b"] },
      { payerId: "b", amount: 1000, participants: ["a", "b"] },
    ]);
    expect(plan).toEqual([]);
  });
});
