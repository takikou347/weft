import type {
  DiaryPayload,
  EventPayload,
  ExpensePayload,
  Item,
  ItemType,
  PhotoPayload,
  TaskPayload,
} from "@/types/database";

export const TYPE_LABELS: Record<ItemType, string> = {
  event: "予定",
  diary: "日記",
  expense: "収支",
  task: "タスク",
  document: "文書",
  photo: "写真",
};

// P2 でユーザーが作成できるアイテム種別
export const CREATABLE_TYPES = ["diary", "event", "expense", "task"] as const;
export type CreatableType = (typeof CREATABLE_TYPES)[number];

export function isCreatableType(v: string | undefined): v is CreatableType {
  return (CREATABLE_TYPES as readonly string[]).includes(v ?? "");
}

export const TASK_STATUS_LABELS: Record<TaskPayload["status"], string> = {
  todo: "未着手",
  doing: "進行中",
  done: "完了",
};

export function eventPayload(item: Item): EventPayload {
  return item.payload as EventPayload;
}

export function expensePayload(item: Item): ExpensePayload {
  const p = item.payload as Partial<ExpensePayload>;
  return {
    amount: Number(p.amount) || 0,
    kind: p.kind === "income" ? "income" : "expense",
    category: typeof p.category === "string" ? p.category : "その他",
  };
}

export function taskPayload(item: Item): TaskPayload {
  const p = item.payload as Partial<TaskPayload>;
  return {
    status:
      p.status === "doing" || p.status === "done" ? p.status : "todo",
  };
}

export function diaryPayload(item: Item): DiaryPayload {
  return item.payload as DiaryPayload;
}

export function photoPayload(item: Item): PhotoPayload {
  const p = item.payload as Partial<PhotoPayload>;
  return { path: typeof p.path === "string" ? p.path : "" };
}

// F-04-4 / F-10-2 装飾の基本セット
export const PAPER_CHOICES = [
  { value: "plain", label: "白紙" },
  { value: "lined", label: "便箋" },
  { value: "grid", label: "方眼" },
  { value: "washi", label: "生成り" },
] as const;

export const STAMP_CHOICES = ["花丸", "いいね", "見たよ", "感謝"] as const;

// 用紙のスタイル(罫線・方眼はCSSグラデーションで描く)
export const PAPER_CLASS: Record<string, string> = {
  plain: "bg-paper",
  lined:
    "bg-paper bg-[linear-gradient(transparent_calc(1.9em-1px),#ddd6c7_calc(1.9em-1px),#ddd6c7_1.9em)] bg-[length:100%_1.9em] bg-local",
  grid: "bg-paper bg-[linear-gradient(#eee8da_1px,transparent_1px),linear-gradient(90deg,#eee8da_1px,transparent_1px)] bg-[length:1.25em_1.25em]",
  washi: "bg-washi",
};

export function formatYen(amount: number): string {
  return `${amount.toLocaleString("ja-JP")}円`;
}

// 一覧・カレンダーでの一行表示
export function itemLine(item: Item): string {
  if (item.type === "expense") {
    const p = expensePayload(item);
    const sign = p.kind === "income" ? "+" : "−";
    return `${item.title ?? p.category} ${sign}${formatYen(p.amount)}`;
  }
  if (item.type === "event") {
    const p = eventPayload(item);
    const time = p.all_day || !p.start_time ? "" : `${p.start_time} `;
    return `${time}${item.title ?? "(無題)"}`;
  }
  return item.title || (item.body ? item.body.slice(0, 20) : "(無題)");
}
