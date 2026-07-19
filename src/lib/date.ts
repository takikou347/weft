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
