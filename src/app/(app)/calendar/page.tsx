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
import { itemLine } from "@/lib/items";
import { TAG_COLORS, TypeBadge } from "@/components/type-badge";
import { spaceColor } from "@/lib/spaces";
import type { Item, ItemType } from "@/types/database";

const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];

// カレンダー(F-03-1: 月・週・一覧 / F-03-3: レイヤー表示 / F-03-5: ドット)
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    month?: string;
    date?: string;
    hide?: string;
  }>;
}) {
  const params = await searchParams;
  const view =
    params.view === "week" || params.view === "list" ? params.view : "month";

  if (view === "week") return <WeekView date={normalizeDate(params.date)} />;
  if (view === "list") return <ListView month={normalizeMonth(params.month)} />;
  return (
    <MonthView
      month={normalizeMonth(params.month)}
      hidden={new Set((params.hide ?? "").split(",").filter(Boolean))}
    />
  );
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
              ? "rounded-md border border-ai bg-ai px-3 py-1 text-paper"
              : "rounded-md border border-keisen bg-paper px-3 py-1 text-usuzumi hover:border-ai"
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

// セル内チップの表示順: 予定(時刻つき)を先頭に、次いでタスク・日記・収支・写真・文書
const CHIP_ORDER: ItemType[] = [
  "event",
  "task",
  "diary",
  "expense",
  "photo",
  "document",
];

async function MonthView({
  month,
  hidden,
}: {
  month: string;
  hidden: Set<string>;
}) {
  const { first, last } = monthRange(month);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const items = await fetchRange(first, last);

  // レイヤー分け(F-03-3): 自分の記録=own、他人の記録=共有経由のスペース
  const otherIds = items
    .filter((i) => i.owner_id !== user?.id)
    .map((i) => i.id);
  const { data: shares } = otherIds.length
    ? await supabase
        .from("item_shares")
        .select("item_id, space_id")
        .in("item_id", otherIds)
    : { data: [] };
  const spaceOfItem = new Map<string, string>();
  for (const s of shares ?? []) {
    if (!spaceOfItem.has(s.item_id)) spaceOfItem.set(s.item_id, s.space_id);
  }
  const { data: myGroups } = await supabase
    .from("spaces")
    .select("id, name, settings")
    .neq("type", "personal")
    .order("created_at");
  const groups = myGroups ?? [];
  const layerOf = (item: Item): string =>
    item.owner_id === user?.id ? "own" : (spaceOfItem.get(item.id) ?? "own");

  // Googleカレンダー風: 各日にアイテムのタイトルをチップで並べる。
  // 自分の記録=種別ごとの淡色チップ、メンバーの共有=スペース色の塗りチップ
  const colorOfSpace = new Map(groups.map((g) => [g.id, spaceColor(g)]));
  const visibleItems = items.filter((i) => !hidden.has(layerOf(i)));
  type Chip = { id: string; label: string; type: ItemType; spaceColor?: string };
  const chipsByDate = new Map<string, Chip[]>();
  for (const item of visibleItems) {
    const layer = layerOf(item);
    if (!chipsByDate.has(item.occurred_on))
      chipsByDate.set(item.occurred_on, []);
    chipsByDate.get(item.occurred_on)!.push({
      id: item.id,
      label: itemLine(item),
      type: item.type,
      spaceColor: layer === "own" ? undefined : colorOfSpace.get(layer),
    });
  }
  for (const chips of chipsByDate.values()) {
    chips.sort(
      (a, b) => CHIP_ORDER.indexOf(a.type) - CHIP_ORDER.indexOf(b.type),
    );
  }
  const MAX_CHIPS = 3;
  const today = todayIso();
  const grid = monthGrid(month);

  // レイヤーON/OFFの切り替えリンク(F-03-3)
  const toggleHref = (layer: string) => {
    const next = new Set(hidden);
    if (next.has(layer)) next.delete(layer);
    else next.add(layer);
    const hideParam = [...next].join(",");
    return `/calendar?view=month&month=${month}${hideParam ? `&hide=${hideParam}` : ""}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl">{formatMonthJa(month)}</h2>
        <ViewTabs view="month" month={month} date={today} />
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <Link
          href={`/calendar?view=month&month=${addMonths(month, -1)}`}
          className="inline-block px-2 py-1 text-ai underline underline-offset-4"
        >
          前の月
        </Link>
        <Link
          href="/calendar"
          className="inline-block px-2 py-1 text-usuzumi underline underline-offset-4"
        >
          今月
        </Link>
        <Link
          href={`/calendar?view=month&month=${addMonths(month, 1)}`}
          className="inline-block px-2 py-1 text-ai underline underline-offset-4"
        >
          次の月
        </Link>
      </div>

      {groups.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Link
            href={toggleHref("own")}
            aria-pressed={!hidden.has("own")}
            className={`border px-2 py-0.5 ${
              hidden.has("own")
                ? "border-keisen text-keisen line-through"
                : "border-sumi text-sumi"
            }`}
          >
            自分の記録
          </Link>
          {groups.map((g) => (
            <Link
              key={g.id}
              href={toggleHref(g.id)}
              aria-pressed={!hidden.has(g.id)}
              className={`border px-2 py-0.5 ${
                hidden.has(g.id) ? "border-keisen text-keisen line-through" : ""
              }`}
              style={
                hidden.has(g.id)
                  ? undefined
                  : { borderColor: spaceColor(g), color: spaceColor(g) }
              }
            >
              {g.name}
            </Link>
          ))}
        </div>
      )}

      {/* table-fixed で7列を均等幅に固定する(モバイルで横スクロールさせない) */}
      <table className="mt-4 w-full table-fixed border-collapse rounded-md border border-keisen bg-paper text-center">
        <thead>
          <tr>
            {WEEKDAYS.map((w, i) => (
              <th
                key={w}
                scope="col"
                className={`border border-keisen py-1 text-xs font-normal ${
                  i === 5 ? "text-ai" : "text-usuzumi"
                }`}
                style={i === 6 ? { color: "var(--tag-photo-fg)" } : undefined}
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
                      className={`block min-h-16 px-0.5 pb-1 pt-0.5 hover:bg-washi sm:min-h-20 ${
                        date === today ? "bg-washi" : ""
                      }`}
                    >
                      <span
                        className={`text-xs ${
                          date === today
                            ? "inline-block rounded-full bg-ai px-1.5 text-paper"
                            : "text-usuzumi"
                        }`}
                      >
                        {Number(date.slice(8))}
                      </span>
                      <span className="mt-0.5 block space-y-0.5 text-left">
                        {(chipsByDate.get(date) ?? [])
                          .slice(0, MAX_CHIPS)
                          .map((c) => (
                            <span
                              key={c.id}
                              title={c.label}
                              className="block truncate rounded-sm px-0.5 text-[9px] leading-[15px] sm:px-1 sm:text-[10px] sm:leading-4"
                              style={
                                c.spaceColor
                                  ? {
                                      backgroundColor: c.spaceColor,
                                      color: "var(--card)",
                                    }
                                  : {
                                      backgroundColor: TAG_COLORS[c.type].bg,
                                      color: TAG_COLORS[c.type].fg,
                                    }
                              }
                            >
                              {c.label}
                            </span>
                          ))}
                        {(chipsByDate.get(date) ?? []).length > MAX_CHIPS && (
                          <span className="block px-0.5 text-[9px] leading-[15px] text-usuzumi sm:px-1 sm:text-[10px] sm:leading-4">
                            +{(chipsByDate.get(date) ?? []).length - MAX_CHIPS}件
                          </span>
                        )}
                      </span>
                    </Link>
                  </td>
                ) : (
                  <td key={di} className="rounded-md border border-keisen bg-washi" />
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {groups.length > 0 && (
        <p className="mt-3 text-xs text-usuzumi">
          塗りつぶしのチップはメンバーの共有(スペースの色)です。
        </p>
      )}
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
          className="inline-block px-2 py-1 text-ai underline underline-offset-4"
        >
          前の週
        </Link>
        <Link
          href={`/calendar?view=week`}
          className="inline-block px-2 py-1 text-usuzumi underline underline-offset-4"
        >
          今週
        </Link>
        <Link
          href={`/calendar?view=week&date=${addDays(date, 7)}`}
          className="inline-block px-2 py-1 text-ai underline underline-offset-4"
        >
          次の週
        </Link>
      </div>

      <ul className="mt-4 divide-y divide-keisen rounded-md border border-keisen bg-paper">
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
                      <TypeBadge type={item.type} className="mr-2" />
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
          className="inline-block px-2 py-1 text-ai underline underline-offset-4"
        >
          前の月
        </Link>
        <Link
          href={`/calendar?view=list&month=${addMonths(month, 1)}`}
          className="inline-block px-2 py-1 text-ai underline underline-offset-4"
        >
          次の月
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="mt-8 text-center text-usuzumi">
          この月の記録はまだありません。
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-keisen rounded-md border border-keisen bg-paper">
          {items.map((item) => (
            <li key={item.id} className="px-4 py-3">
              <Link href={`/items/${item.id}`} className="block">
                <span className="text-xs text-usuzumi">
                  {formatDateJa(item.occurred_on)}({weekdayJa(item.occurred_on)})
                </span>
                <TypeBadge type={item.type} className="mx-2" />
                <span className="text-sm">{itemLine(item)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
