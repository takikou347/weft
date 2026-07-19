import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  eventPayload,
  expensePayload,
  isCreatableType,
  taskPayload,
} from "@/lib/items";
import { ItemForm } from "../../item-form";
import type { Item } from "@/types/database";

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: item } = await supabase
    .from("items")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  // 編集は作成者のみ(RLSでも強制されるが、他人の編集画面は開かせない)
  if (!item || item.owner_id !== user?.id || !isCreatableType(item.type)) {
    notFound();
  }

  const { data: categories } = await supabase
    .from("expense_categories")
    .select("name")
    .order("position");

  const it = item as Item;
  const ev = it.type === "event" ? eventPayload(it) : undefined;
  const ex = it.type === "expense" ? expensePayload(it) : undefined;
  const tk = it.type === "task" ? taskPayload(it) : undefined;

  return (
    <ItemForm
      type={item.type}
      mode="edit"
      categories={(categories ?? []).map((c) => c.name)}
      defaults={{
        id: it.id,
        occurredOn: it.occurred_on,
        title: it.title ?? undefined,
        body: it.body ?? undefined,
        allDay: ev?.all_day,
        startTime: ev?.start_time,
        endTime: ev?.end_time,
        place: ev?.place,
        memo: ev?.memo,
        amount: ex?.amount,
        kind: ex?.kind,
        category: ex?.category,
        status: tk?.status,
      }}
      backHref={`/items/${it.id}`}
    />
  );
}
