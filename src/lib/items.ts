import type {
  EventPayload,
  ExpensePayload,
  Item,
  ItemType,
  TaskPayload,
} from "@/types/database";

export const TYPE_LABELS: Record<ItemType, string> = {
  event: "予定",
  diary: "日記",
  expense: "収支",
  task: "つとめ",
  document: "書きもの",
  photo: "写真",
};

// P2 でユーザーが作成できるアイテム種別
export const CREATABLE_TYPES = ["diary", "event", "expense", "task"] as const;
export type CreatableType = (typeof CREATABLE_TYPES)[number];

export function isCreatableType(v: string | undefined): v is CreatableType {
  return (CREATABLE_TYPES as readonly string[]).includes(v ?? "");
}

export const TASK_STATUS_LABELS: Record<TaskPayload["status"], string> = {
  todo: "これから",
  doing: "とりくみ中",
  done: "しあげた",
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
