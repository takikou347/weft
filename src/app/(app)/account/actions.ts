"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AccountFormState = {
  error: string | null;
  done?: boolean;
};

// F-01-4 プロフィール(表示名)の変更
export async function updateProfile(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const displayName = String(formData.get("display_name") ?? "").trim();
  if (!displayName || displayName.length > 30) {
    return { error: "表示名は1〜30文字で入れてください。" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", user.id);
  if (error) {
    console.error("profile update failed:", error.message);
    return { error: "変えられませんでした。時間をおいてお試しください。" };
  }

  revalidatePath("/account");
  return { error: null, done: true };
}

// F-01-5 退会: 全データ削除(共有先からも消える)
export async function deleteAccount(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const confirmText = String(formData.get("confirm") ?? "");
  if (confirmText !== "退会") {
    return { error: "確認のため「退会」と入力してください。" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  // 写真ファイルの削除(DBはauth.users削除のカスケードで消えるがStorageは別管理)
  const { data: files } = await admin.storage.from("photos").list(user.id, {
    limit: 1000,
  });
  if (files && files.length > 0) {
    const { error: removeError } = await admin.storage
      .from("photos")
      .remove(files.map((f) => `${user.id}/${f.name}`));
    if (removeError) {
      console.error("photo cleanup failed:", removeError.message);
    }
  }

  // アカウント削除(profiles / spaces / items / shares 等はFKカスケードで消える)
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("account delete failed:", error.message);
    return { error: "退会できませんでした。時間をおいてお試しください。" };
  }

  await supabase.auth.signOut();
  redirect("/login");
}
