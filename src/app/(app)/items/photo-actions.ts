"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeDate } from "@/lib/date";

function orderPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

// アップロード済みの写真を photo アイテムとして帳面に登録する(§6.2)
// デフォルト非公開。linkTo があれば自動で双方向リンク(F-09-3)
export async function registerPhotoItem(input: {
  path: string;
  date: string;
  title?: string;
  linkTo?: string;
}): Promise<{ error?: string } | void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です。" };

  // 自分のフォルダ配下のパスしか登録させない
  if (!input.path.startsWith(`${user.id}/`) || input.path.includes("..")) {
    return { error: "写真の置き場所が正しくありません。" };
  }

  const { data: personalSpace } = await supabase
    .from("spaces")
    .select("id")
    .eq("type", "personal")
    .eq("created_by", user.id)
    .single();
  if (!personalSpace) {
    return { error: "帳面が見つかりませんでした。" };
  }

  const { data: inserted, error } = await supabase
    .from("items")
    .insert({
      type: "photo",
      owner_id: user.id,
      origin_space_id: personalSpace.id,
      occurred_on: normalizeDate(input.date),
      title: (input.title ?? "").slice(0, 100) || null,
      payload: { path: input.path },
    })
    .select("id")
    .single();
  if (error || !inserted) {
    console.error("photo item insert failed:", error?.message);
    return { error: "登録できませんでした。" };
  }

  if (input.linkTo) {
    const [a, b] = orderPair(inserted.id, input.linkTo);
    await supabase
      .from("links")
      .insert({ item_id_a: a, item_id_b: b, created_by: user.id });
  }

  revalidatePath(input.linkTo ? `/items/${input.linkTo}` : "/");
}
