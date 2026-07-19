import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatYen } from "@/lib/items";
import { createProject } from "../org-actions";

const STATUS_LABELS: Record<string, string> = {
  planned: "支度中",
  active: "とりくみ中",
  done: "しあげた",
};

// 組織ダッシュボード(F-08-5): 配下プロジェクトの予実・進捗一覧
export default async function ProjectsPage({
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

  const { data: org } = await supabase
    .from("spaces")
    .select("id, type")
    .eq("id", id)
    .maybeSingle();
  if (!org || org.type !== "organization") notFound();

  const { data: me } = await supabase
    .from("space_members")
    .select("role")
    .eq("space_id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  const canCreate = me?.role === "owner" || me?.role === "admin";

  // 配下プロジェクト(自分が参加しているもの+組織owner/adminなら全件)
  const { data: projects } = await supabase
    .from("spaces")
    .select("id, name")
    .eq("parent_space_id", id)
    .order("created_at");
  const projectIds = (projects ?? []).map((p) => p.id);

  const [{ data: metas }, { data: myMemberships }] = await Promise.all([
    projectIds.length
      ? supabase.from("projects_meta").select("*").in("space_id", projectIds)
      : Promise.resolve({ data: [] as never[] }),
    projectIds.length
      ? supabase
          .from("space_members")
          .select("space_id")
          .in("space_id", projectIds)
          .eq("user_id", user.id)
      : Promise.resolve({ data: [] as never[] }),
  ]);
  const metaOf = new Map((metas ?? []).map((m) => [m.space_id, m]));
  const joined = new Set((myMemberships ?? []).map((m) => m.space_id));

  // 実績(参加しているプロジェクトのみ。非参加はアイテムが見えないため集計不能: §6.3)
  const actuals = new Map<string, number>();
  await Promise.all(
    projectIds
      .filter((pid) => joined.has(pid))
      .map(async (pid) => {
        const { data } = await supabase.rpc("space_expense_summary", {
          target_space_id: pid,
        });
        const expense = (data ?? []).find((r) => r.kind === "expense");
        actuals.set(pid, Number(expense?.total ?? 0));
      }),
  );

  return (
    <div>
      {(projects ?? []).length === 0 ? (
        <p className="mt-4 text-sm text-usuzumi">まだしごとはありません。</p>
      ) : (
        <ul className="divide-y divide-keisen border border-keisen bg-paper">
          {(projects ?? []).map((p) => {
            const meta = metaOf.get(p.id);
            const isMember = joined.has(p.id);
            const budget = Number(meta?.budget_total ?? 0);
            const actual = actuals.get(p.id);
            return (
              <li key={p.id} className="px-5 py-4">
                {isMember ? (
                  <Link href={`/spaces/${p.id}`} className="font-medium hover:underline">
                    {p.name}
                  </Link>
                ) : (
                  <span className="font-medium text-usuzumi">{p.name}</span>
                )}
                <span className="ml-2 border border-keisen px-1.5 text-xs text-usuzumi">
                  {STATUS_LABELS[meta?.status ?? "planned"]}
                </span>
                <p className="mt-1 text-xs text-usuzumi">
                  予算 {formatYen(budget)}
                  {isMember ? (
                    <>
                      {" "}
                      / 実績 {formatYen(actual ?? 0)} / 残り{" "}
                      {formatYen(budget - (actual ?? 0))}
                    </>
                  ) : (
                    " / 実績は参加者のみ閲覧できます"
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {canCreate && (
        <section className="mt-8">
          <h4 className="border-l-4 border-ai pl-2 font-medium">
            あたらしいしごと
          </h4>
          {error && (
            <p role="alert" className="mt-2 text-sm text-ai-deep">
              つくれませんでした。入力をお確かめください。
            </p>
          )}
          <form action={createProject} className="mt-3 flex gap-2">
            <input type="hidden" name="org_id" value={id} />
            <input
              type="text"
              name="name"
              required
              maxLength={50}
              placeholder="しごとの名前"
              className="flex-1 border-b border-keisen bg-transparent py-2 text-sm outline-none placeholder:text-keisen focus:border-ai"
            />
            <button
              type="submit"
              className="border border-keisen bg-paper px-4 py-1 text-sm hover:border-ai"
            >
              はじめる
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
