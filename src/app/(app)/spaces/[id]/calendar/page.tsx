import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  addMonths,
  formatMonthJa,
  monthGrid,
  monthRange,
  normalizeMonth,
  todayIso,
} from "@/lib/date";
import { TYPE_LABELS, itemLine } from "@/lib/items";
import type { Item } from "@/types/database";

const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];

// 共有カレンダー(F-07-1): このスペースへ共有された予定・記録の月表示
export default async function SpaceCalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { id } = await params;
  const { month: monthRaw } = await searchParams;
  const month = normalizeMonth(monthRaw);
  const { first, last } = monthRange(month);

  const supabase = await createClient();
  const { data: shares } = await supabase
    .from("item_shares")
    .select("items!inner(*)")
    .eq("space_id", id)
    .gte("items.occurred_on", first)
    .lte("items.occurred_on", last);

  const items = (shares ?? [])
    .map((s) => s.items as unknown as Item)
    .sort((a, b) => a.occurred_on.localeCompare(b.occurred_on));
  const byDate = new Map<string, Item[]>();
  for (const item of items) {
    if (!byDate.has(item.occurred_on)) byDate.set(item.occurred_on, []);
    byDate.get(item.occurred_on)!.push(item);
  }
  const today = todayIso();
  const grid = monthGrid(month);

  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <Link
          href={`/spaces/${id}/calendar?month=${addMonths(month, -1)}`}
          className="text-ai underline underline-offset-4"
        >
          まえの月
        </Link>
        <span className="font-serif text-lg">{formatMonthJa(month)}</span>
        <Link
          href={`/spaces/${id}/calendar?month=${addMonths(month, 1)}`}
          className="text-ai underline underline-offset-4"
        >
          つぎの月
        </Link>
      </div>

      <table className="mt-3 w-full border-collapse border border-keisen bg-paper text-center">
        <thead>
          <tr>
            {WEEKDAYS.map((w) => (
              <th
                key={w}
                scope="col"
                className="border border-keisen py-1 text-xs font-normal text-usuzumi"
              >
                {w}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.map((week, wi) => (
            <tr key={wi}>
              {week.map((date, di) =>
                date ? (
                  <td key={di} className="border border-keisen p-1 align-top">
                    <span
                      className={`text-sm ${
                        date === today
                          ? "inline-block rounded-full bg-ai px-1.5 text-paper"
                          : ""
                      }`}
                    >
                      {Number(date.slice(8))}
                    </span>
                    <span className="mt-0.5 flex flex-wrap justify-center gap-0.5">
                      {(byDate.get(date) ?? []).slice(0, 4).map((item) => (
                        <span
                          key={item.id}
                          title={itemLine(item)}
                          className="inline-block h-1.5 w-1.5 rounded-full bg-ai"
                        />
                      ))}
                    </span>
                  </td>
                ) : (
                  <td key={di} className="border border-keisen bg-washi" />
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <section className="mt-6">
        <h4 className="border-l-4 border-ai pl-2 font-medium">この月の共有</h4>
        {items.length === 0 ? (
          <p className="mt-3 text-sm text-usuzumi">
            この月に共有された記録はありません。
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-keisen border border-keisen bg-paper">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/spaces/${id}/items/${item.id}`}
                  className="block px-4 py-3 hover:bg-washi"
                >
                  <span className="text-xs text-usuzumi">
                    {item.occurred_on.slice(5).replace("-", "/")}
                  </span>
                  <span className="mx-2 border border-keisen px-1 text-xs text-usuzumi">
                    {TYPE_LABELS[item.type]}
                  </span>
                  <span className="text-sm">{itemLine(item)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
