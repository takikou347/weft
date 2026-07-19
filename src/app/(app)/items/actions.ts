"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ItemFormState = {
  error: string | null;
};

// F-04-1 の最小形: 日付に紐づく記録(日記)の作成。
// origin_space_id には本人の個人スペースを設定する(デフォルト非公開: 不変条件1)
export async function createDiaryItem(
  _prev: ItemFormState,
  formData: FormData,
): Promise<ItemFormState> {
  const occurredOn = String(formData.get("occurred_on") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!occurredOn) {
    return { error: "日付を入れてください。" };
  }
  if (!title && !body) {
    return { error: "題か本文のどちらかを記してください。" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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

  const { error } = await supabase.from("items").insert({
    type: "diary",
    owner_id: user.id,
    origin_space_id: personalSpace.id,
    occurred_on: occurredOn,
    title: title || null,
    body: body || null,
  });

  if (error) {
    console.error("item insert failed:", error.code, error.message);
    return { error: "記せませんでした。時間をおいてお試しください。" };
  }

  revalidatePath("/");
  redirect("/");
}
