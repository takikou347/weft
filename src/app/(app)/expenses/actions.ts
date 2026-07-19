"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// F-05-2 費目のカスタマイズ
export async function addCategory(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name || name.length > 20) {
    redirect("/expenses");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("expense_categories")
    .select("position")
    .order("position", { ascending: false })
    .limit(1);
  const nextPosition = (existing?.[0]?.position ?? 0) + 1;

  const { error } = await supabase.from("expense_categories").insert({
    user_id: user.id,
    name,
    position: nextPosition,
  });
  if (error && error.code !== "23505") {
    console.error("category insert failed:", error.code, error.message);
  }

  revalidatePath("/expenses");
  redirect("/expenses");
}

export async function removeCategory(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/expenses");

  const supabase = await createClient();
  const { error } = await supabase
    .from("expense_categories")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("category delete failed:", error.code, error.message);
  }

  revalidatePath("/expenses");
  redirect("/expenses");
}
