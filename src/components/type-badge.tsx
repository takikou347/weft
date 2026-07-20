import { TYPE_LABELS } from "@/lib/items";
import type { ItemType } from "@/types/database";
import { cn } from "@/lib/utils";

/* アイテム種別のバッジ。配色は globals.css のタグトークン(和色の淡いトーン)のみを使う */
const TAG_VARS: Record<ItemType, { bg: string; fg: string }> = {
  event: { bg: "var(--tag-event-bg)", fg: "var(--tag-event-fg)" },
  diary: { bg: "var(--tag-diary-bg)", fg: "var(--tag-diary-fg)" },
  expense: { bg: "var(--tag-expense-bg)", fg: "var(--tag-expense-fg)" },
  task: { bg: "var(--tag-task-bg)", fg: "var(--tag-task-fg)" },
  photo: { bg: "var(--tag-photo-bg)", fg: "var(--tag-photo-fg)" },
  document: { bg: "var(--tag-document-bg)", fg: "var(--tag-document-fg)" },
};

export function TypeBadge({
  type,
  className,
}: {
  type: ItemType;
  className?: string;
}) {
  const v = TAG_VARS[type];
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap rounded-sm px-1.5 py-px text-xs",
        className,
      )}
      style={{ backgroundColor: v.bg, color: v.fg }}
    >
      {TYPE_LABELS[type]}
    </span>
  );
}

/* カレンダーのセル用チップの配色にも同じトークンを使う */
export const TAG_COLORS = TAG_VARS;
