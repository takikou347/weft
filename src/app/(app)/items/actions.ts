"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isCreatableType } from "@/lib/items";
import { normalizeDate } from "@/lib/date";
import type { ItemType } from "@/types/database";

export type ItemFormState = {
  error: string | null;
};

function orderPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

// フォーム値から type 別の payload を組み立てる
function buildPayload(
  type: ItemType,
  formData: FormData,
): Record<string, unknown> | { payloadError: string } {
  if (type === "event") {
    const allDay = formData.get("all_day") === "on";
    const startTime = String(formData.get("start_time") ?? "").trim();
    const endTime = String(formData.get("end_time") ?? "").trim();
    const place = String(formData.get("place") ?? "").trim();
    const memo = String(formData.get("memo") ?? "").trim();
    return {
      all_day: allDay,
      ...(allDay || !startTime ? {} : { start_time: startTime }),
      ...(allDay || !endTime ? {} : { end_time: endTime }),
      ...(place ? { place } : {}),
      ...(memo ? { memo } : {}),
    };
  }
  if (type === "expense") {
    const amount = Number(String(formData.get("amount") ?? "").trim());
    const kind = formData.get("kind") === "income" ? "income" : "expense";
    const category = String(formData.get("category") ?? "").trim() || "その他";
    if (!Number.isInteger(amount) || amount <= 0) {
      return { payloadError: "金額は1円以上の整数で入れてください。" };
    }
    return { amount, kind, category };
  }
  if (type === "task") {
    const status = String(formData.get("status") ?? "todo");
    return {
      status: status === "doing" || status === "done" ? status : "todo",
    };
  }
  if (type === "diary") {
    const paper = String(formData.get("paper") ?? "plain");
    const stamp = String(formData.get("stamp") ?? "").trim();
    const decoration = {
      ...(["plain", "lined", "grid", "washi"].includes(paper)
        ? { paper }
        : { paper: "plain" }),
      ...(stamp && stamp.length <= 8 ? { stamp } : {}),
    };
    return { decoration };
  }
  return {};
}

// F-04-1 / F-03-2 / F-05-1 / タスク: アイテムの作成
// origin_space_id は本人の個人スペース(デフォルト非公開: 不変条件1)
export async function createItem(
  _prev: ItemFormState,
  formData: FormData,
): Promise<ItemFormState> {
  const typeRaw = String(formData.get("type") ?? "");
  if (!isCreatableType(typeRaw)) {
    return { error: "種別が正しくありません。" };
  }
  const type = typeRaw as ItemType;
  const occurredOn = normalizeDate(
    String(formData.get("occurred_on") ?? "").trim(),
  );
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const linkTo = String(formData.get("link_to") ?? "").trim();

  if (type !== "expense" && !title && !body) {
    return { error: "題か本文のどちらかを記してください。" };
  }

  const payload = buildPayload(type, formData);
  if ("payloadError" in payload) {
    return { error: payload.payloadError as string };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: personalSpace, error: spaceError } = await supabase
    .from("spaces")
    .select("id")
    .eq("type", "personal")
    .eq("created_by", user.id)
    .single();

  if (!personalSpace) {
    console.error("personal space not found:", spaceError?.message);
    return { error: "帳面が見つかりませんでした。開き直してください。" };
  }

  const { data: inserted, error } = await supabase
    .from("items")
    .insert({
      type,
      owner_id: user.id,
      origin_space_id: personalSpace.id,
      occurred_on: occurredOn,
      title: title || null,
      body: body || null,
      payload,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    console.error("item insert failed:", error?.code, error?.message);
    return { error: "記せませんでした。時間をおいてお試しください。" };
  }

  // F-03-4 / F-09-3: 派生導線から来た場合は自動で双方向リンクを張る
  if (linkTo) {
    const [a, b] = orderPair(inserted.id, linkTo);
    const { error: linkError } = await supabase.from("links").insert({
      item_id_a: a,
      item_id_b: b,
      created_by: user.id,
    });
    if (linkError) {
      console.error("auto link failed:", linkError.message);
    }
  }

  revalidatePath("/");
  redirect(`/days/${occurredOn}`);
}

export async function updateItem(
  _prev: ItemFormState,
  formData: FormData,
): Promise<ItemFormState> {
  const id = String(formData.get("id") ?? "");
  const typeRaw = String(formData.get("type") ?? "");
  if (!id || !isCreatableType(typeRaw)) {
    return { error: "更新対象が正しくありません。" };
  }
  const type = typeRaw as ItemType;
  const occurredOn = normalizeDate(
    String(formData.get("occurred_on") ?? "").trim(),
  );
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (type !== "expense" && !title && !body) {
    return { error: "題か本文のどちらかを記してください。" };
  }

  const payload = buildPayload(type, formData);
  if ("payloadError" in payload) {
    return { error: payload.payloadError as string };
  }

  const supabase = await createClient();
  // RLS により作成者以外の更新は0件になる(クライアント側の権限判定はしない)
  const { error } = await supabase
    .from("items")
    .update({
      occurred_on: occurredOn,
      title: title || null,
      body: body || null,
      payload,
    })
    .eq("id", id);

  if (error) {
    console.error("item update failed:", error.code, error.message);
    return { error: "書き直せませんでした。時間をおいてお試しください。" };
  }

  revalidatePath(`/items/${id}`);
  redirect(`/items/${id}`);
}

export async function deleteItem(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) {
    console.error("item delete failed:", error.code, error.message);
  }

  revalidatePath("/");
  redirect("/");
}

// F-09-1: リンクの作成(相手は自分が閲覧できるアイテムのみ。RLSでも強制される)
export async function createLink(formData: FormData): Promise<void> {
  const from = String(formData.get("from") ?? "");
  const to = String(formData.get("to") ?? "");
  if (!from || !to || from === to) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [a, b] = orderPair(from, to);
  const { error } = await supabase.from("links").insert({
    item_id_a: a,
    item_id_b: b,
    created_by: user.id,
  });
  if (error && error.code !== "23505") {
    console.error("link insert failed:", error.code, error.message);
  }

  revalidatePath(`/items/${from}`);
  redirect(`/items/${from}`);
}

export async function deleteLink(formData: FormData): Promise<void> {
  const from = String(formData.get("from") ?? "");
  const to = String(formData.get("to") ?? "");
  if (!from || !to) return;

  const [a, b] = orderPair(from, to);
  const supabase = await createClient();
  const { error } = await supabase
    .from("links")
    .delete()
    .eq("item_id_a", a)
    .eq("item_id_b", b);
  if (error) {
    console.error("link delete failed:", error.code, error.message);
  }

  revalidatePath(`/items/${from}`);
  redirect(`/items/${from}`);
}
