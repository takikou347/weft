// "YYYY-MM-DD" を「YYYY年M月D日」に整形する
export function formatDateJa(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${y}年${Number(m)}月${Number(d)}日`;
}

// ローカルタイムゾーンでの今日を "YYYY-MM-DD" で返す
export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function toIso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// "YYYY-MM" の妥当性を確認し、不正なら今月を返す
export function normalizeMonth(input: string | undefined): string {
  if (input && /^\d{4}-(0[1-9]|1[0-2])$/.test(input)) return input;
  return todayIso().slice(0, 7);
}

// "YYYY-MM-DD" の妥当性を確認し、不正なら今日を返す
export function normalizeDate(input: string | undefined): string {
  if (input && /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(input)) {
    const [y, m, d] = input.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    if (dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d) {
      return input;
    }
  }
  return todayIso();
}

// 月("YYYY-MM")の1日〜末日を返す
export function monthRange(month: string): { first: string; last: string } {
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return { first: toIso(y, m, 1), last: toIso(y, m, lastDay) };
}

// 前月・翌月("YYYY-MM")
export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const dt = new Date(y, m - 1 + delta, 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

export function addDays(isoDate: string, delta: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y, m - 1, d + delta);
  return todayIso(dt);
}

// カレンダー月グリッド(月曜はじまり)。前後月の埋め草は null
export function monthGrid(month: string): (string | null)[][] {
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  // getDay(): 日=0 → 月曜はじまりのオフセットへ変換
  const firstWeekday = (new Date(y, m - 1, 1).getDay() + 6) % 7;

  const cells: (string | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: lastDay }, (_, i) => toIso(y, m, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

// その日を含む週(月曜はじまり)の7日分
export function weekOf(isoDate: string): string[] {
  const [y, m, d] = isoDate.split("-").map(Number);
  const weekday = (new Date(y, m - 1, d).getDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, i) => addDays(isoDate, i - weekday));
}

const WEEKDAY_JA = ["月", "火", "水", "木", "金", "土", "日"] as const;

export function weekdayJa(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return WEEKDAY_JA[(new Date(y, m - 1, d).getDay() + 6) % 7];
}

export function formatMonthJa(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${y}年${m}月`;
}
