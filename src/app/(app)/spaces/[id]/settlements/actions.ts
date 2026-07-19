"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// F-07-6 立替の記録(送金はしない。記録と計算のみ)
export async function addSettlement(formData: FormData): Promise<void> {
  const spaceId = String(formData.get("space_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const payerId = String(formData.get("payer_id") ?? "");
  const amount = Number(String(formData.get("amount") ?? "").trim());
  const participants = formData
    .getAll("participants")
    .map(String)
    .filter(Boolean);

  if (
    !spaceId ||
    !title ||
    title.length > 100 ||
    !payerId ||
    !Number.isInteger(amount) ||
    amount <= 0 ||
    participants.length === 0
  ) {
    redirect(`/spaces/${spaceId}/settlements?error=1`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 払った人・対象者がスペースのメンバーであることを確認(RLSはメンバーであることまでしか見ない)
  const { data: members } = await supabase
    .from("space_members")
    .select("user_id")
    .eq("space_id", spaceId);
  const memberIds = new Set((members ?? []).map((m) => m.user_id));
  if (!memberIds.has(payerId) || !participants.every((p) => memberIds.has(p))) {
    redirect(`/spaces/${spaceId}/settlements?error=1`);
  }

  const { error } = await supabase.from("settlements").insert({
    space_id: spaceId,
    title,
    payer_id: payerId,
    amount,
    participants,
    created_by: user.id,
  });
  if (error) {
    console.error("settlement insert failed:", error.message);
  }

  revalidatePath(`/spaces/${spaceId}/settlements`);
  redirect(`/spaces/${spaceId}/settlements`);
}

// 精算済みにする / 取り消す(記録者か払った人)
export async function toggleSettlementStatus(
  formData: FormData,
): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const spaceId = String(formData.get("space_id") ?? "");
  const next = formData.get("next") === "settled" ? "settled" : "open";
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("settlements")
    .update({ status: next })
    .eq("id", id);
  if (error) {
    console.error("settlement update failed:", error.message);
  }

  revalidatePath(`/spaces/${spaceId}/settlements`);
  redirect(`/spaces/${spaceId}/settlements`);
}

export async function deleteSettlement(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const spaceId = String(formData.get("space_id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase.from("settlements").delete().eq("id", id);
  if (error) {
    console.error("settlement delete failed:", error.message);
  }

  revalidatePath(`/spaces/${spaceId}/settlements`);
  redirect(`/spaces/${spaceId}/settlements`);
}
