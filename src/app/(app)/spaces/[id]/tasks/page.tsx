import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDateJa, todayIso } from "@/lib/date";
import { taskPayload } from "@/lib/items";
import { changeTaskStatus, createProjectTask } from "../org-actions";
import type { Item, TaskPayload } from "@/types/database";

const STATUS_ORDER: TaskPayload["status"][] = ["todo", "doing", "done"];
const STATUS_HEADINGS: Record<TaskPayload["status"], string> = {
  todo: "これから",
  doing: "とりくみ中",
  done: "しあげた",
};

// プロジェクトのつとめ(F-08-2): 担当者・期限・ステータス
export default async function TasksPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: space } = await supabase
    .from("spaces")
    .select("id, type")
    .eq("id", id)
    .maybeSingle();
  if (!space || space.type !== "project") notFound();

  const [{ data: shares }, { data: members }] = await Promise.all([
    supabase
      .from("item_shares")
      .select("items!inner(*)")
      .eq("space_id", id)
      .eq("items.type", "task"),
    supabase.from("space_members").select("user_id").eq("space_id", id),
  ]);
  const tasks = (shares ?? [])
    .map((s) => s.items as unknown as Item)
    .sort((a, b) => a.occurred_on.localeCompare(b.occurred_on));

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in(
      "id",
      (members ?? []).map((m) => m.user_id),
    );
  const nameOf = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

  return (
    <div>
      {STATUS_ORDER.map((status) => {
        const list = tasks.filter((t) => taskPayload(t).status === status);
        return (
          <section key={status} className="mt-6 first:mt-0">
            <h4 className="border-l-4 border-ai pl-2 font-medium">
              {STATUS_HEADINGS[status]}
              <span className="ml-2 text-xs text-usuzumi">{list.length}</span>
            </h4>
            {list.length === 0 ? (
              <p className="mt-2 text-xs text-usuzumi">ありません。</p>
            ) : (
              <ul className="mt-2 divide-y divide-keisen border border-keisen bg-paper">
                {list.map((task) => {
                  const p = taskPayload(task);
                  const canMove =
                    task.owner_id === user.id || p.assignee === user.id;
                  return (
                    <li key={task.id} className="px-4 py-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <Link
                          href={`/spaces/${id}/items/${task.id}`}
                          className="min-w-0 flex-1 text-sm hover:underline"
                        >
                          {task.title}
                        </Link>
                        <span className="text-xs text-usuzumi">
                          {formatDateJa(task.occurred_on)}まで
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-xs text-usuzumi">
                          担い手:{" "}
                          {p.assignee
                            ? (nameOf.get(p.assignee) ?? "どなたか")
                            : "きめず"}
                        </span>
                        {canMove && (
                          <span className="flex gap-2">
                            {STATUS_ORDER.filter((s) => s !== status).map(
                              (s) => (
                                <form key={s} action={changeTaskStatus}>
                                  <input
                                    type="hidden"
                                    name="item_id"
                                    value={task.id}
                                  />
                                  <input
                                    type="hidden"
                                    name="space_id"
                                    value={id}
                                  />
                                  <input type="hidden" name="status" value={s} />
                                  <button
                                    type="submit"
                                    className="text-xs text-ai underline underline-offset-4"
                                  >
                                    {STATUS_HEADINGS[s]}へ
                                  </button>
                                </form>
                              ),
                            )}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}

      <section className="mt-8">
        <h4 className="border-l-4 border-ai pl-2 font-medium">
          つとめを書き出す
        </h4>
        {error && (
          <p role="alert" className="mt-2 text-sm text-ai-deep">
            書き出せませんでした。入力をお確かめください。
          </p>
        )}
        <form
          action={createProjectTask}
          className="mt-3 border border-keisen bg-paper px-5 py-6"
        >
          <input type="hidden" name="space_id" value={id} />
          <label className="block text-sm" htmlFor="task-title">
            なにをするか
          </label>
          <input
            id="task-title"
            name="title"
            type="text"
            required
            maxLength={100}
            className="mt-1 w-full border-b border-keisen bg-transparent py-2 text-sm outline-none focus:border-ai"
          />
          <div className="mt-4 flex flex-wrap items-end gap-6">
            <div>
              <label className="block text-sm" htmlFor="task-due">
                期限
              </label>
              <input
                id="task-due"
                name="due"
                type="date"
                defaultValue={todayIso()}
                className="mt-1 border-b border-keisen bg-transparent py-2 text-sm outline-none focus:border-ai"
              />
            </div>
            <div>
              <label className="block text-sm" htmlFor="task-assignee">
                担い手
              </label>
              <select
                id="task-assignee"
                name="assignee"
                defaultValue=""
                className="mt-1 border-b border-keisen bg-transparent py-2 text-sm outline-none focus:border-ai"
              >
                <option value="">きめず</option>
                {(members ?? []).map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {nameOf.get(m.user_id) ?? "どなたか"}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="bg-ai px-5 py-2 text-sm text-paper transition-colors hover:bg-ai-deep"
            >
              書き出す
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
