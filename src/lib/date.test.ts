import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  formatDateJa,
  monthGrid,
  monthRange,
  normalizeDate,
  normalizeMonth,
  todayIso,
  weekOf,
  weekdayJa,
} from "./date";

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

describe("normalizeMonth / normalizeDate", () => {
  it("正しい形式はそのまま返す", () => {
    expect(normalizeMonth("2026-07")).toBe("2026-07");
    expect(normalizeDate("2026-07-19")).toBe("2026-07-19");
  });
  it("不正な入力は現在にフォールバックする", () => {
    expect(normalizeMonth("2026-13")).toBe(todayIso().slice(0, 7));
    expect(normalizeMonth("abc")).toBe(todayIso().slice(0, 7));
    expect(normalizeDate("2026-02-30")).toBe(todayIso());
    expect(normalizeDate("x")).toBe(todayIso());
  });
});

describe("monthRange / addMonths / addDays", () => {
  it("月初・月末を返す(うるう年も正しい)", () => {
    expect(monthRange("2026-07")).toEqual({
      first: "2026-07-01",
      last: "2026-07-31",
    });
    expect(monthRange("2028-02").last).toBe("2028-02-29");
  });
  it("月をまたぐ加算ができる", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addDays("2026-07-31", 1)).toBe("2026-08-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });
});

describe("monthGrid / weekOf / weekdayJa", () => {
  it("月曜はじまりのグリッドを返す", () => {
    // 2026-07-01 は水曜
    const grid = monthGrid("2026-07");
    expect(grid[0]).toEqual([
      null,
      null,
      "2026-07-01",
      "2026-07-02",
      "2026-07-03",
      "2026-07-04",
      "2026-07-05",
    ]);
    expect(grid.every((w) => w.length === 7)).toBe(true);
    expect(grid.flat().filter(Boolean).length).toBe(31);
  });
  it("その日を含む月曜はじまりの週を返す", () => {
    // 2026-07-19 は日曜
    expect(weekOf("2026-07-19")).toEqual([
      "2026-07-13",
      "2026-07-14",
      "2026-07-15",
      "2026-07-16",
      "2026-07-17",
      "2026-07-18",
      "2026-07-19",
    ]);
    expect(weekdayJa("2026-07-19")).toBe("日");
    expect(weekdayJa("2026-07-13")).toBe("月");
  });
});
