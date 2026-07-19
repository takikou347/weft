import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  addDays,
  addMonths,
  formatDateJa,
  formatMonthJa,
  monthGrid,
  monthRange,
  normalizeDate,
  normalizeMonth,
  todayIso,
  weekOf,
  weekdayJa,
} from "@/lib/date";
import { TYPE_LABELS, itemLine } from "@/lib/items";
import type { Item, ItemType } from "@/types/database";

const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];

// カレンダー(F-03-1: 月・週・一覧 / F-03-5: 記録の存在をドットで示す)
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; month?: string; date?: string }>;
}) {
  const params = await searchParams;
  const view =
    params.view === "week" || params.view === "list" ? params.view : "month";

  if (view === "week") return <WeekView date={normalizeDate(params.date)} />;
  if (view === "list") return <ListView month={normalizeMonth(params.month)} />;
  return <MonthView month={normalizeMonth(params.month)} />;
}

function ViewTabs({
  view,
  month,
  date,
}: {
  view: string;
  month: string;
  date: string;
}) {
  const tabs = [
    { key: "month", label: "月", href: `/calendar?view=month&month=${month}` },
    { key: "week", label: "週", href: `/calendar?view=week&date=${date}` },
    { key: "list", label: "一覧", href: `/calendar?view=list&month=${month}` },
  ];
  return (
    <nav className="flex gap-2 text-sm" aria-label="表示の切り替え">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === view ? "page" : undefined}
          className={
            t.key === view
              ? "border border-ai bg-ai px-3 py-1 text-paper"
              : "border border-keisen bg-paper px-3 py-1 text-usuzumi hover:border-ai"
          }
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

async function fetchRange(first: string, last: string): Promise<Item[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("items")
    .select("*")
    .gte("occurred_on", first)
    .lte("occurred_on", last)
    .order("occurred_on")
    .order("created_at");
  return (data ?? []) as Item[];
}

const DOT_TYPES: ItemType[] = ["event", "diary", "expense", "task"];

async function MonthView({ month }: { month: string }) {
  const { first, last } = monthRange(month);
  const items = await fetchRange(first, last);
  const byDate = new Map<string, Set<ItemType>>();
  for (const item of items) {
    if (!byDate.has(item.occurred_on)) byDate.set(item.occurred_on, new Set());
    byDate.get(item.occurred_on)!.add(item.type);
  }
  const today = todayIso();
  const grid = monthGrid(month);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl">{formatMonthJa(month)}</h2>
        <ViewTabs view="month" month={month} date={today} />
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <Link
          href={`/calendar?view=month&month=${addMonths(month, -1)}`}
          className="text-ai underline underline-offset-4"
        >
          まえの月
        </Link>
        <Link
          href="/calendar"
          className="text-usuzumi underline underline-offset-4"
        >
          今月
        </Link>
        <Link
          href={`/calendar?view=month&month=${addMonths(month, 1)}`}
          className="text-ai underline underline-offset-4"
        >
          つぎの月
        </Link>
      </div>

      <table className="mt-4 w-full border-collapse border border-keisen bg-paper text-center">
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
                  <td key={di} className="border border-keisen p-0 align-top">
                    <Link
                      href={`/days/${date}`}
                      className={`block min-h-14 px-1 py-1 hover:bg-washi ${
                        date === today ? "bg-washi" : ""
                      }`}
                    >
                      <span
                        className={`text-sm ${
                          date === today
                            ? "inline-block rounded-full bg-ai px-1.5 text-paper"
                            : ""
                        }`}
                      >
                        {Number(date.slice(8))}
                      </span>
                      <span className="mt-1 flex flex-wrap justify-center gap-0.5">
                        {DOT_TYPES.filter((t) => byDate.get(date)?.has(t)).map(
                          (t) => (
                            <span
                              key={t}
                              title={TYPE_LABELS[t]}
                              className={`inline-block h-1.5 w-1.5 rounded-full ${
                                t === "event"
                                  ? "bg-ai"
                                  : t === "diary"
                                    ? "bg-sumi"
                                    : t === "expense"
                                      ? "bg-usuzumi"
                                      : "border border-sumi"
                              }`}
                            />
                          ),
                        )}
                      </span>
                    </Link>
                  </td>
                ) : (
                  <td key={di} className="border border-keisen bg-washi" />
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-3 flex flex-wrap gap-4 text-xs text-usuzumi">
        <span>
          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-ai" />
          予定
        </span>
        <span>
          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-sumi" />
          日記
        </span>
        <span>
          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-usuzumi" />
          収支
        </span>
        <span>
          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full border border-sumi" />
          つとめ
        </span>
      </p>
    </div>
  );
}

async function WeekView({ date }: { date: string }) {
  const days = weekOf(date);
  const items = await fetchRange(days[0], days[6]);
  const byDate = new Map<string, Item[]>();
  for (const item of items) {
    if (!byDate.has(item.occurred_on)) byDate.set(item.occurred_on, []);
    byDate.get(item.occurred_on)!.push(item);
  }
  const today = todayIso();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl">
          {formatDateJa(days[0])} からの週
        </h2>
        <ViewTabs view="week" month={date.slice(0, 7)} date={date} />
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <Link
          href={`/calendar?view=week&date=${addDays(date, -7)}`}
          className="text-ai underline underline-offset-4"
        >
          まえの週
        </Link>
        <Link
          href={`/calendar?view=week`}
          className="text-usuzumi underline underline-offset-4"
        >
          今週
        </Link>
        <Link
          href={`/calendar?view=week&date=${addDays(date, 7)}`}
          className="text-ai underline underline-offset-4"
        >
          つぎの週
        </Link>
      </div>

      <ul className="mt-4 divide-y divide-keisen border border-keisen bg-paper">
        {days.map((d) => (
          <li key={d} className="px-4 py-3">
            <Link
              href={`/days/${d}`}
              className={`text-sm ${d === today ? "font-medium text-ai" : "text-usuzumi"}`}
            >
              {formatDateJa(d)}({weekdayJa(d)})
            </Link>
            {(byDate.get(d) ?? []).length > 0 && (
              <ul className="mt-1 space-y-0.5">
                {(byDate.get(d) ?? []).map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/items/${item.id}`}
                      className="text-sm hover:underline"
                    >
                      <span className="mr-2 border border-keisen px-1 text-xs text-usuzumi">
                        {TYPE_LABELS[item.type]}
                      </span>
                      {itemLine(item)}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

async function ListView({ month }: { month: string }) {
  const { first, last } = monthRange(month);
  const items = await fetchRange(first, last);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl">{formatMonthJa(month)} の記録</h2>
        <ViewTabs view="list" month={month} date={todayIso()} />
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <Link
          href={`/calendar?view=list&month=${addMonths(month, -1)}`}
          className="text-ai underline underline-offset-4"
        >
          まえの月
        </Link>
        <Link
          href={`/calendar?view=list&month=${addMonths(month, 1)}`}
          className="text-ai underline underline-offset-4"
        >
          つぎの月
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="mt-8 text-center text-usuzumi">
          この月の記録はまだありません。
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-keisen border border-keisen bg-paper">
          {items.map((item) => (
            <li key={item.id} className="px-4 py-3">
              <Link href={`/items/${item.id}`} className="block">
                <span className="text-xs text-usuzumi">
                  {formatDateJa(item.occurred_on)}({weekdayJa(item.occurred_on)})
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
    </div>
  );
}
