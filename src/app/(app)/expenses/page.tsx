import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { addMonths, formatMonthJa, normalizeMonth } from "@/lib/date";
import { formatYen } from "@/lib/items";
import { addCategory, removeCategory } from "./actions";

// 家計簿(F-05-3: 月次集計と簡易グラフ / F-05-2: 費目のカスタマイズ)
export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const month = normalizeMonth(params.month);

  const supabase = await createClient();
  const [{ data: summary }, { data: categories }] = await Promise.all([
    supabase.rpc("expense_monthly_summary", { target_month: `${month}-01` }),
    supabase.from("expense_categories").select("*").order("position"),
  ]);

  const rows = summary ?? [];
  const incomeTotal = rows
    .filter((r) => r.kind === "income")
    .reduce((acc, r) => acc + Number(r.total), 0);
  const expenseRows = rows.filter((r) => r.kind === "expense");
  const expenseTotal = expenseRows.reduce((acc, r) => acc + Number(r.total), 0);
  const balance = incomeTotal - expenseTotal;
  const maxExpense = Math.max(...expenseRows.map((r) => Number(r.total)), 1);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h2 className="font-serif text-2xl">{formatMonthJa(month)} の家計</h2>
        <Link
          href={`/items/new?type=expense`}
          className="rounded-md bg-ai px-4 py-2 text-sm text-paper transition-colors hover:bg-ai-deep"
        >
          記録する
        </Link>
      </div>

      <div className="mt-2 flex items-center justify-between text-sm">
        <Link
          href={`/expenses?month=${addMonths(month, -1)}`}
          className="text-ai underline underline-offset-4"
        >
          前の月
        </Link>
        <Link
          href="/expenses"
          className="text-usuzumi underline underline-offset-4"
        >
          今月
        </Link>
        <Link
          href={`/expenses?month=${addMonths(month, 1)}`}
          className="text-ai underline underline-offset-4"
        >
          次の月
        </Link>
      </div>

      <dl className="mt-4 grid grid-cols-3 divide-x divide-keisen rounded-md border border-keisen bg-paper text-center">
        <div className="px-2 py-4">
          <dt className="text-xs text-usuzumi">収入</dt>
          <dd className="mt-1 text-sm font-medium">{formatYen(incomeTotal)}</dd>
        </div>
        <div className="px-2 py-4">
          <dt className="text-xs text-usuzumi">支出</dt>
          <dd className="mt-1 text-sm font-medium">{formatYen(expenseTotal)}</dd>
        </div>
        <div className="px-2 py-4">
          <dt className="text-xs text-usuzumi">残り</dt>
          <dd
            className={`mt-1 text-sm font-medium ${balance < 0 ? "text-ai-deep" : "text-ai"}`}
          >
            {balance < 0 ? "−" : ""}
            {formatYen(Math.abs(balance))}
          </dd>
        </div>
      </dl>

      <section className="mt-8">
        <h3 className="border-l-4 border-ai pl-2 font-medium">費目ごと</h3>
        {expenseRows.length === 0 ? (
          <p className="mt-3 text-sm text-usuzumi">
            この月の支出はまだありません。
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {expenseRows.map((r) => (
              <li key={`${r.kind}-${r.category}`}>
                <div className="flex items-baseline justify-between text-sm">
                  <span>{r.category}</span>
                  <span>
                    {formatYen(Number(r.total))}
                    <span className="ml-1 text-xs text-usuzumi">
                      ({r.entry_count}件)
                    </span>
                  </span>
                </div>
                <div
                  className="mt-1 h-2 rounded-md border border-keisen bg-paper"
                  role="img"
                  aria-label={`${r.category} ${formatYen(Number(r.total))}`}
                >
                  <div
                    className="h-full bg-ai"
                    style={{
                      width: `${Math.round((Number(r.total) / maxExpense) * 100)}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-sm">
          <Link
            href={`/calendar?view=list&month=${month}`}
            className="text-ai underline underline-offset-4"
          >
            この月の明細を見る
          </Link>
        </p>
      </section>

      <section className="mt-10">
        <h3 className="border-l-4 border-ai pl-2 font-medium">費目の管理</h3>
        <ul className="mt-3 flex flex-wrap gap-2">
          {(categories ?? []).map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-2 rounded-md border border-keisen bg-paper px-3 py-1 text-sm"
            >
              {c.name}
              <form action={removeCategory}>
                <input type="hidden" name="id" value={c.id} />
                <button
                  type="submit"
                  aria-label={`費目「${c.name}」を除く`}
                  className="text-xs text-usuzumi hover:text-sumi"
                >
                  ×
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={addCategory} className="mt-3 flex gap-2">
          <input
            type="text"
            name="name"
            maxLength={20}
            placeholder="新しい費目"
            required
            className="flex-1 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
          />
          <button
            type="submit"
            className="rounded-md border border-keisen bg-paper px-3 py-1 text-sm hover:border-ai"
          >
            追加する
          </button>
        </form>
        <p className="mt-2 text-xs text-usuzumi">
          費目を削除しても、記録済みの収支はそのまま残ります。
        </p>
      </section>
    </div>
  );
}
