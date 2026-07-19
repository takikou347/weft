"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SpaceFormState = {
  error: string | null;
};

// F-02-1 グループ・組織の作成(作成者が owner)
export async function createGroup(
  _prev: SpaceFormState,
  formData: FormData,
): Promise<SpaceFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const type = formData.get("type") === "organization" ? "organization" : "group";
  if (!name || name.length > 50) {
    return { error: "名前は1〜50文字で入れてください。" };
  }

  const supabase = await createClient();
  const { data: spaceId, error } =
    type === "organization"
      ? await supabase.rpc("create_organization", { org_name: name })
      : await supabase.rpc("create_group", { group_name: name });
  if (error || !spaceId) {
    console.error("create space failed:", error?.message);
    return { error: "つくれませんでした。時間をおいてお試しください。" };
  }

  revalidatePath("/spaces");
  redirect(`/spaces/${spaceId}`);
}

// F-02-6 スペース設定(名前・テーマカラー)
export async function updateSpaceSettings(
  _prev: SpaceFormState,
  formData: FormData,
): Promise<SpaceFormState> {
  const spaceId = String(formData.get("space_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();
  if (!spaceId) return { error: "対象が見つかりません。" };
  if (!name || name.length > 50) {
    return { error: "名前は1〜50文字で入れてください。" };
  }
  if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) {
    return { error: "色の形式が正しくありません。" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("spaces")
    .update({ name, settings: color ? { color } : {} })
    .eq("id", spaceId);
  if (error) {
    console.error("space update failed:", error.message);
    return { error: "変えられませんでした。権限をお確かめください。" };
  }

  revalidatePath(`/spaces/${spaceId}`);
  redirect(`/spaces/${spaceId}/settings`);
}

// F-02-3 招待リンクの発行(owner / admin)
export async function createInvitation(formData: FormData): Promise<void> {
  const spaceId = String(formData.get("space_id") ?? "");
  if (!spaceId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("invitations").insert({
    space_id: spaceId,
    created_by: user.id,
  });
  if (error) {
    console.error("invitation insert failed:", error.message);
  }

  revalidatePath(`/spaces/${spaceId}/members`);
  redirect(`/spaces/${spaceId}/members`);
}

export async function deleteInvitation(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const spaceId = String(formData.get("space_id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("invitations").delete().eq("id", id);

  revalidatePath(`/spaces/${spaceId}/members`);
  redirect(`/spaces/${spaceId}/members`);
}

// 招待の受諾
export async function acceptInvitation(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  if (!token) redirect("/spaces");

  const supabase = await createClient();
  const { data: spaceId, error } = await supabase.rpc("accept_invitation", {
    invite_token: token,
  });
  if (error || !spaceId) {
    console.error("accept_invitation failed:", error?.message);
    redirect(`/invite/${token}?error=1`);
  }

  revalidatePath("/spaces");
  redirect(`/spaces/${spaceId}`);
}

// F-02-5 退出
export async function leaveSpace(formData: FormData): Promise<void> {
  const spaceId = String(formData.get("space_id") ?? "");
  if (!spaceId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("space_members")
    .delete()
    .eq("space_id", spaceId)
    .eq("user_id", user.id);
  if (error) {
    console.error("leave failed:", error.message);
  }

  revalidatePath("/spaces");
  redirect("/spaces");
}

// F-02-5 除名(owner / admin)
export async function removeMember(formData: FormData): Promise<void> {
  const spaceId = String(formData.get("space_id") ?? "");
  const userId = String(formData.get("user_id") ?? "");
  if (!spaceId || !userId) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("space_members")
    .delete()
    .eq("space_id", spaceId)
    .eq("user_id", userId);
  if (error) {
    console.error("remove member failed:", error.message);
  }

  revalidatePath(`/spaces/${spaceId}/members`);
  redirect(`/spaces/${spaceId}/members`);
}

// F-06-1 共有=item_shares への行追加のみ(不変条件2)
export async function shareItem(formData: FormData): Promise<void> {
  const itemId = String(formData.get("item_id") ?? "");
  const spaceId = String(formData.get("space_id") ?? "");
  if (!itemId || !spaceId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("item_shares").insert({
    item_id: itemId,
    space_id: spaceId,
    shared_by: user.id,
  });
  if (error && error.code !== "23505") {
    console.error("share failed:", error.message);
  }

  revalidatePath(`/items/${itemId}`);
  redirect(`/items/${itemId}`);
}

// F-06-3 共有の解除(作成者のみ。RLSで強制)
export async function unshareItem(formData: FormData): Promise<void> {
  const itemId = String(formData.get("item_id") ?? "");
  const spaceId = String(formData.get("space_id") ?? "");
  if (!itemId || !spaceId) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("item_shares")
    .delete()
    .eq("item_id", itemId)
    .eq("space_id", spaceId);
  if (error) {
    console.error("unshare failed:", error.message);
  }

  revalidatePath(`/items/${itemId}`);
  redirect(`/items/${itemId}`);
}

// F-07-4 コメント(スペース全員に可視)
export async function addComment(formData: FormData): Promise<void> {
  const itemId = String(formData.get("item_id") ?? "");
  const spaceId = String(formData.get("space_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!itemId || !spaceId || !body || body.length > 2000) {
    return;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("comments").insert({
    item_id: itemId,
    space_id: spaceId,
    author_id: user.id,
    body,
  });
  if (error) {
    console.error("comment failed:", error.message);
  }

  revalidatePath(`/spaces/${spaceId}/items/${itemId}`);
  redirect(`/spaces/${spaceId}/items/${itemId}`);
}

export async function deleteComment(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const itemId = String(formData.get("item_id") ?? "");
  const spaceId = String(formData.get("space_id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("comments").delete().eq("id", id);

  revalidatePath(`/spaces/${spaceId}/items/${itemId}`);
  redirect(`/spaces/${spaceId}/items/${itemId}`);
}

// F-07-5 リアクション(押す/取り消すのトグル)
export async function toggleReaction(formData: FormData): Promise<void> {
  const itemId = String(formData.get("item_id") ?? "");
  const spaceId = String(formData.get("space_id") ?? "");
  const emoji = String(formData.get("emoji") ?? "");
  if (!itemId || !spaceId || !emoji || emoji.length > 8) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("reactions")
    .select("emoji")
    .eq("item_id", itemId)
    .eq("space_id", spaceId)
    .eq("user_id", user.id)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("reactions")
      .delete()
      .eq("item_id", itemId)
      .eq("space_id", spaceId)
      .eq("user_id", user.id)
      .eq("emoji", emoji);
  } else {
    const { error } = await supabase.from("reactions").insert({
      item_id: itemId,
      space_id: spaceId,
      user_id: user.id,
      emoji,
    });
    if (error && error.code !== "23505") {
      console.error("reaction failed:", error.message);
    }
  }

  revalidatePath(`/spaces/${spaceId}/items/${itemId}`);
  redirect(`/spaces/${spaceId}/items/${itemId}`);
}
