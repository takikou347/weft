import type { Space, SpaceType } from "@/types/database";

export const SPACE_TYPE_LABELS: Record<SpaceType, string> = {
  personal: "わたし",
  group: "つどい",
  organization: "つとめ先",
  project: "しごと",
};

// スペースのテーマカラー(F-02-6 / F-10-1)。未設定時は落ち着いた既定色を順に使う
const DEFAULT_COLORS = [
  "#3f5d7d", // 藍
  "#7d3f4b", // 蘇芳
  "#4b6b3f", // 松葉
  "#7d6a3f", // 芥子
  "#5d3f7d", // 江戸紫
  "#3f7d74", // 青碧
];

export function spaceColor(space: Pick<Space, "id" | "settings">): string {
  const c = (space.settings as { color?: string }).color;
  if (typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c)) return c;
  // idの先頭バイトで安定して既定色を割り当てる
  const seed = parseInt(space.id.slice(0, 2), 16) || 0;
  return DEFAULT_COLORS[seed % DEFAULT_COLORS.length];
}

// F-07-5 リアクションの基本スタンプセット
export const STAMP_SET = ["🌸", "👏", "祝", "見た", "🍵"] as const;
