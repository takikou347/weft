import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatYen } from "@/lib/items";
import { addBudget, removeBudget, updateProjectMeta } from "../org-actions";

const STATUS_LABELS: Record<string, string> = {
  planned: "準備中",
  active: "進行中",
  done: "完了",
};

// 予実(F-08-3): 予算の登録・実績の集計・差異表示
export default async function BudgetPage({
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

  const [{ data: meta }, { data: budgets }, { data: summary }, { data: me }] =
    await Promise.all([
      supabase
        .from("projects_meta")
        .select("*")
        .eq("space_id", id)
        .maybeSingle(),
      supabase
        .from("budgets")
        .select("*")
        .eq("space_id", id)
        .order("created_at"),
      supabase.rpc("space_expense_summary", { target_space_id: id }),
      supabase
        .from("space_members")
        .select("role")
        .eq("space_id", id)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

  const canEdit = me?.role === "owner" || me?.role === "admin";
  const actualExpense = Number(
    (summary ?? []).find((r) => r.kind === "expense")?.total ?? 0,
  );
  const actualIncome = Number(
    (summary ?? []).find((r) => r.kind === "income")?.total ?? 0,
  );
  const budgetTotal = Number(meta?.budget_total ?? 0);
  const diff = budgetTotal - actualExpense;

  return (
    <div>
      <dl className="grid grid-cols-3 divide-x divide-keisen rounded-md border border-keisen bg-paper text-center">
        <div className="px-2 py-4">
          <dt className="text-xs text-usuzumi">予算</dt>
          <dd className="mt-1 text-sm font-medium">{formatYen(budgetTotal)}</dd>
        </div>
        <div className="px-2 py-4">
          <dt className="text-xs text-usuzumi">つかい(実績)</dt>
          <dd className="mt-1 text-sm font-medium">
            {formatYen(actualExpense)}
          </dd>
        </div>
        <div className="px-2 py-4">
          <dt className="text-xs text-usuzumi">残り</dt>
          <dd
            className={`mt-1 text-sm font-medium ${diff < 0 ? "text-ai-deep" : "text-ai"}`}
          >
            {diff < 0 ? "−" : ""}
            {formatYen(Math.abs(diff))}
          </dd>
        </div>
      </dl>
      {actualIncome > 0 && (
        <p className="mt-2 text-xs text-usuzumi">
          はいり(実績): {formatYen(actualIncome)} / 損益:{" "}
          {formatYen(actualIncome - actualExpense)}
        </p>
      )}
      <p className="mt-2 text-xs text-usuzumi">
        実績は、このプロジェクトへ共有された収支の合算です。
      </p>

      <section className="mt-8">
        <h4 className="border-l-4 border-ai pl-2 font-medium">費目別の予算</h4>
        {(budgets ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-usuzumi">まだありません。</p>
        ) : (
          <ul className="mt-2 divide-y divide-keisen rounded-md border border-keisen bg-paper">
            {(budgets ?? []).map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between px-4 py-2 text-sm"
              >
                <span>{b.category}</span>
                <span className="flex items-center gap-3">
                  {formatYen(Number(b.planned_amount))}
                  {canEdit && (
                    <form action={removeBudget}>
                      <input type="hidden" name="id" value={b.id} />
                      <input type="hidden" name="space_id" value={id} />
                      <button
                        type="submit"
                        aria-label={`予算「${b.category}」を消す`}
                        className="text-xs text-usuzumi hover:text-sumi"
                      >
                        ×
                      </button>
                    </form>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}

        {canEdit && (
          <form action={addBudget} className="mt-3 flex flex-wrap gap-2">
            <input type="hidden" name="space_id" value={id} />
            <input
              type="text"
              name="category"
              required
              maxLength={20}
              placeholder="費目"
              className="w-28 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
            />
            <input
              type="number"
              name="planned_amount"
              required
              min={0}
              step={1}
              placeholder="金額(円)"
              className="w-32 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
            />
            <button
              type="submit"
              className="rounded-md border border-keisen bg-paper px-3 py-1 text-sm hover:border-ai"
            >
              加える
            </button>
          </form>
        )}
      </section>

      {canEdit && meta && (
        <section className="mt-8">
          <h4 className="border-l-4 border-ai pl-2 font-medium">
            プロジェクトの管理
          </h4>
          {error && (
            <p role="alert" className="mt-2 text-sm text-ai-deep">
              保存できませんでした。入力をお確かめください。
            </p>
          )}
          <form
            action={updateProjectMeta}
            className="mt-3 rounded-md border border-keisen bg-paper px-5 py-6"
          >
            <input type="hidden" name="space_id" value={id} />
            <div className="flex flex-wrap items-end gap-6">
              <div>
                <label className="block text-sm" htmlFor="meta-status">
                  ステータス
                </label>
                <select
                  id="meta-status"
                  name="status"
                  defaultValue={meta.status}
                  className="mt-1 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                >
                  {Object.entries(STATUS_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm" htmlFor="meta-start">
                  開始
                </label>
                <input
                  id="meta-start"
                  name="start_on"
                  type="date"
                  defaultValue={meta.start_on ?? ""}
                  className="mt-1 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm" htmlFor="meta-end">
                  終了
                </label>
                <input
                  id="meta-end"
                  name="end_on"
                  type="date"
                  defaultValue={meta.end_on ?? ""}
                  className="mt-1 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm" htmlFor="meta-budget">
                  予算総額(円)
                </label>
                <input
                  id="meta-budget"
                  name="budget_total"
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={budgetTotal}
                  className="mt-1 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                />
              </div>
              <button
                type="submit"
                className="rounded-md bg-ai px-5 py-2 text-sm text-paper transition-colors hover:bg-ai-deep"
              >
                保存する
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
