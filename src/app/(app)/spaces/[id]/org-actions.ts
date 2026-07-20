"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeDate } from "@/lib/date";

// F-02-2 プロジェクト作成(組織の owner/admin。RPC内で検証)
export async function createProject(formData: FormData): Promise<void> {
  const orgId = String(formData.get("org_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!orgId || !name || name.length > 50) {
    redirect(`/spaces/${orgId}/projects?error=1`);
  }

  const supabase = await createClient();
  const { data: projectId, error } = await supabase.rpc("create_project", {
    org_id: orgId,
    project_name: name,
  });
  if (error || !projectId) {
    console.error("create_project failed:", error?.message);
    redirect(`/spaces/${orgId}/projects?error=1`);
  }

  revalidatePath(`/spaces/${orgId}/projects`);
  redirect(`/spaces/${projectId}`);
}

// プロジェクトへ組織のメンバーを追加する
export async function addProjectMember(formData: FormData): Promise<void> {
  const projectId = String(formData.get("project_id") ?? "");
  const userId = String(formData.get("user_id") ?? "");
  if (!projectId || !userId) return;

  const supabase = await createClient();
  const { error } = await supabase.rpc("add_project_member", {
    project_id: projectId,
    target_user_id: userId,
  });
  if (error) {
    console.error("add_project_member failed:", error.message);
  }

  revalidatePath(`/spaces/${projectId}/members`);
  redirect(`/spaces/${projectId}/members`);
}

// F-08-2 プロジェクトのタスクを作る(作成と同時にプロジェクトへ共有)
export async function createProjectTask(formData: FormData): Promise<void> {
  const spaceId = String(formData.get("space_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const due = normalizeDate(String(formData.get("due") ?? "").trim());
  const assignee = String(formData.get("assignee") ?? "");
  if (!spaceId || !title || title.length > 100) {
    redirect(`/spaces/${spaceId}/tasks?error=1`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: inserted, error } = await supabase
    .from("items")
    .insert({
      type: "task",
      owner_id: user.id,
      origin_space_id: spaceId,
      occurred_on: due,
      title,
      payload: { status: "todo", ...(assignee ? { assignee } : {}) },
    })
    .select("id")
    .single();
  if (error || !inserted) {
    console.error("project task insert failed:", error?.message);
    redirect(`/spaces/${spaceId}/tasks?error=1`);
  }

  // 共有=参照付与(不変条件2)。プロジェクトの全員に見える
  const { error: shareError } = await supabase.from("item_shares").insert({
    item_id: inserted.id,
    space_id: spaceId,
    shared_by: user.id,
  });
  if (shareError) {
    console.error("project task share failed:", shareError.message);
  }

  revalidatePath(`/spaces/${spaceId}/tasks`);
  redirect(`/spaces/${spaceId}/tasks`);
}

// タスクのステータス変更(作成者+担当者。RPC内で検証)
export async function changeTaskStatus(formData: FormData): Promise<void> {
  const itemId = String(formData.get("item_id") ?? "");
  const spaceId = String(formData.get("space_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!itemId || !status) return;

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_task_status", {
    target_item_id: itemId,
    new_status: status,
  });
  if (error) {
    console.error("update_task_status failed:", error.message);
  }

  revalidatePath(`/spaces/${spaceId}/tasks`);
  redirect(`/spaces/${spaceId}/tasks`);
}

// F-08-4 ナレッジ(document)を書いてプロジェクトへ共有
export async function createProjectDoc(formData: FormData): Promise<void> {
  const spaceId = String(formData.get("space_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!spaceId || !title || title.length > 100 || !body) {
    redirect(`/spaces/${spaceId}/docs?error=1`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: inserted, error } = await supabase
    .from("items")
    .insert({
      type: "document",
      owner_id: user.id,
      origin_space_id: spaceId,
      occurred_on: normalizeDate(""),
      title,
      body,
    })
    .select("id")
    .single();
  if (error || !inserted) {
    console.error("doc insert failed:", error?.message);
    redirect(`/spaces/${spaceId}/docs?error=1`);
  }

  const { error: shareError } = await supabase.from("item_shares").insert({
    item_id: inserted.id,
    space_id: spaceId,
    shared_by: user.id,
  });
  if (shareError) {
    console.error("doc share failed:", shareError.message);
  }

  revalidatePath(`/spaces/${spaceId}/docs`);
  redirect(`/spaces/${spaceId}/docs`);
}

// F-08-1 / F-08-3 プロジェクト情報(状態・期間・予算総額)の更新
export async function updateProjectMeta(formData: FormData): Promise<void> {
  const spaceId = String(formData.get("space_id") ?? "");
  const status = String(formData.get("status") ?? "planned");
  const startOn = String(formData.get("start_on") ?? "").trim();
  const endOn = String(formData.get("end_on") ?? "").trim();
  const budgetTotal = Number(String(formData.get("budget_total") ?? "0"));
  if (!spaceId) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("projects_meta")
    .update({
      status: ["planned", "active", "done"].includes(status)
        ? (status as "planned" | "active" | "done")
        : "planned",
      start_on: startOn || null,
      end_on: endOn || null,
      budget_total:
        Number.isInteger(budgetTotal) && budgetTotal >= 0 ? budgetTotal : 0,
    })
    .eq("space_id", spaceId);
  if (error) {
    console.error("project meta update failed:", error.message);
  }

  revalidatePath(`/spaces/${spaceId}/budget`);
  redirect(`/spaces/${spaceId}/budget`);
}

// 費目別の予算行の追加・削除
export async function addBudget(formData: FormData): Promise<void> {
  const spaceId = String(formData.get("space_id") ?? "");
  const category = String(formData.get("category") ?? "").trim();
  const amount = Number(String(formData.get("planned_amount") ?? ""));
  if (
    !spaceId ||
    !category ||
    category.length > 20 ||
    !Number.isInteger(amount) ||
    amount < 0
  ) {
    redirect(`/spaces/${spaceId}/budget?error=1`);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("budgets").insert({
    space_id: spaceId,
    category,
    planned_amount: amount,
  });
  if (error && error.code !== "23505") {
    console.error("budget insert failed:", error.message);
  }

  revalidatePath(`/spaces/${spaceId}/budget`);
  redirect(`/spaces/${spaceId}/budget`);
}

export async function removeBudget(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const spaceId = String(formData.get("space_id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase.from("budgets").delete().eq("id", id);
  if (error) {
    console.error("budget delete failed:", error.message);
  }

  revalidatePath(`/spaces/${spaceId}/budget`);
  redirect(`/spaces/${spaceId}/budget`);
}
