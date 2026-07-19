import { describe, expect, it } from "vitest";
import { formatDateJa, todayIso } from "./date";

describe("formatDateJa", () => {
  it("YYYY-MM-DD を和暦風表記に整形する", () => {
    expect(formatDateJa("2026-07-19")).toBe("2026年7月19日");
    expect(formatDateJa("2026-01-05")).toBe("2026年1月5日");
  });
});

describe("todayIso", () => {
  it("ゼロ埋めした YYYY-MM-DD を返す", () => {
    expect(todayIso(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(todayIso(new Date(2026, 11, 31))).toBe("2026-12-31");
  });
});
