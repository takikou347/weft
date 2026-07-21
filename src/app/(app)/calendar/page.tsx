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
import { eventPayload, itemLine } from "@/lib/items";
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

// レイヤー情報(F-03-3): 各アイテムが「自分の記録(own)」か「どのスペース経由の共有か」を引く
async function fetchLayers(items: Item[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
  return { groups, layerOf };
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
  const items = await fetchRange(first, last);
  const { groups, layerOf } = await fetchLayers(items);

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

// "HH:MM" → 分。不正値は null
function toMinutes(hhmm: string | undefined): number | null {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return null;
  const [h, m] = hhmm.split(":").map(Number);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

const HOUR_H = 44; // 時間グリッドの1時間の高さ(px)

async function WeekView({ date }: { date: string }) {
  const days = weekOf(date);
  const items = await fetchRange(days[0], days[6]);
  const { groups, layerOf } = await fetchLayers(items);
  const colorOfSpace = new Map(groups.map((g) => [g.id, spaceColor(g)]));
  const today = todayIso();

  // 時刻つきの予定は時間グリッドへ、それ以外(終日予定・日記・収支等)は終日行へ
  type TimedBlock = {
    item: Item;
    startMin: number;
    endMin: number;
    spaceColor?: string;
  };
  const timedByDate = new Map<string, TimedBlock[]>();
  const alldayByDate = new Map<string, { item: Item; spaceColor?: string }[]>();
  for (const item of items) {
    const layer = layerOf(item);
    const sc = layer === "own" ? undefined : colorOfSpace.get(layer);
    const p = item.type === "event" ? eventPayload(item) : null;
    const startMin = p && !p.all_day ? toMinutes(p.start_time) : null;
    if (item.type === "event" && startMin !== null) {
      const endMin = Math.max(
        toMinutes(p?.end_time) ?? startMin + 60,
        startMin + 30, // 最低30分ぶんの高さを確保する
      );
      if (!timedByDate.has(item.occurred_on))
        timedByDate.set(item.occurred_on, []);
      timedByDate.get(item.occurred_on)!.push({
        item,
        startMin,
        endMin,
        spaceColor: sc,
      });
    } else {
      if (!alldayByDate.has(item.occurred_on))
        alldayByDate.set(item.occurred_on, []);
      alldayByDate.get(item.occurred_on)!.push({ item, spaceColor: sc });
    }
  }
  for (const blocks of timedByDate.values())
    blocks.sort((a, b) => a.startMin - b.startMin);

  // 表示する時間帯: 予定を含む範囲 + 余白(既定は8時〜20時)
  const allTimed = [...timedByDate.values()].flat();
  const startHour = Math.min(
    8,
    ...allTimed.map((b) => Math.floor(b.startMin / 60)),
  );
  const endHour = Math.max(
    20,
    ...allTimed.map((b) => Math.ceil(b.endMin / 60)),
  );
  const hours = Array.from(
    { length: endHour - startHour },
    (_, i) => startHour + i,
  );

  // 共有アイテムはスペース内の詳細ページへ(RLS上そちらが正)
  const detailHref = (item: Item) => {
    const layer = layerOf(item);
    return layer === "own"
      ? `/items/${item.id}`
      : `/spaces/${layer}/items/${item.id}`;
  };
  const chipStyle = (item: Item, sc?: string) =>
    sc
      ? { backgroundColor: sc, color: "var(--card)" }
      : {
          backgroundColor: TAG_COLORS[item.type].bg,
          color: TAG_COLORS[item.type].fg,
        };

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

      <div className="mt-4 overflow-hidden rounded-md border border-keisen bg-paper">
        {/* 曜日ヘッダー(タップでその日のページへ) */}
        <div className="grid grid-cols-[2rem_repeat(7,1fr)] border-b border-keisen text-center sm:grid-cols-[2.5rem_repeat(7,1fr)]">
          <div />
          {days.map((d, i) => (
            <Link
              key={d}
              href={`/days/${d}`}
              className={`py-1 text-xs ${
                i === 5 ? "text-ai" : i === 6 ? "" : "text-usuzumi"
              }`}
              style={i === 6 ? { color: "var(--tag-photo-fg)" } : undefined}
            >
              {weekdayJa(d)}
              <span
                className={`mx-auto mt-0.5 block h-5 w-5 leading-5 ${
                  d === today ? "rounded-full bg-ai text-paper" : "text-sumi"
                }`}
              >
                {Number(d.slice(8))}
              </span>
            </Link>
          ))}
        </div>

        {/* 終日行(時刻のない予定・日記・収支・タスク等) */}
        <div className="grid grid-cols-[2rem_repeat(7,1fr)] border-b border-keisen sm:grid-cols-[2.5rem_repeat(7,1fr)]">
          <div className="py-1 text-center text-[9px] text-usuzumi sm:text-[10px]">
            終日
          </div>
          {days.map((d) => (
            <div
              key={d}
              className="min-h-6 space-y-0.5 border-l border-keisen p-0.5"
            >
              {(alldayByDate.get(d) ?? []).slice(0, 3).map(({ item, spaceColor: sc }) => (
                <Link
                  key={item.id}
                  href={detailHref(item)}
                  title={itemLine(item)}
                  className="block truncate rounded-sm px-0.5 text-[9px] leading-[15px] sm:px-1 sm:text-[10px] sm:leading-4"
                  style={chipStyle(item, sc)}
                >
                  {itemLine(item)}
                </Link>
              ))}
              {(alldayByDate.get(d) ?? []).length > 3 && (
                <Link
                  href={`/days/${d}`}
                  className="block px-0.5 text-[9px] leading-[15px] text-usuzumi sm:text-[10px]"
                >
                  +{(alldayByDate.get(d) ?? []).length - 3}件
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* 時間グリッド */}
        <div className="grid grid-cols-[2rem_repeat(7,1fr)] sm:grid-cols-[2.5rem_repeat(7,1fr)]">
          {/* 時刻の目盛り */}
          <div className="relative" style={{ height: hours.length * HOUR_H }}>
            {hours.map((h, i) => (
              <span
                key={h}
                className="absolute right-1 -translate-y-1/2 text-[9px] text-usuzumi sm:text-[10px]"
                style={{ top: i * HOUR_H }}
              >
                {i === 0 ? "" : `${h}:00`}
              </span>
            ))}
          </div>
          {days.map((d) => (
            <div
              key={d}
              className="relative border-l border-keisen"
              style={{ height: hours.length * HOUR_H }}
            >
              {/* 1時間ごとの罫線 */}
              {hours.map((h, i) => (
                <span
                  key={h}
                  className="absolute inset-x-0 border-t border-keisen/60"
                  style={{ top: i * HOUR_H }}
                />
              ))}
              {/* 予定ブロック */}
              {(timedByDate.get(d) ?? []).map((b, bi) => {
                const top = ((b.startMin - startHour * 60) / 60) * HOUR_H;
                const height = ((b.endMin - b.startMin) / 60) * HOUR_H;
                return (
                  <Link
                    key={b.item.id}
                    href={detailHref(b.item)}
                    title={itemLine(b.item)}
                    className="absolute overflow-hidden rounded-sm border border-paper px-0.5 text-[9px] leading-[13px] sm:px-1 sm:text-[10px] sm:leading-4"
                    style={{
                      top,
                      height,
                      left: `${Math.min(bi, 2) * 10}%`,
                      right: 0,
                      zIndex: bi + 1,
                      ...(b.spaceColor
                        ? {
                            backgroundColor: b.spaceColor,
                            color: "var(--card)",
                          }
                        : {
                            backgroundColor: "var(--tag-event-bg)",
                            color: "var(--tag-event-fg)",
                          }),
                    }}
                  >
                    {b.item.title ?? "(無題)"}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {groups.length > 0 && (
        <p className="mt-3 text-xs text-usuzumi">
          塗りつぶしのチップはメンバーの共有(スペースの色)です。
        </p>
      )}
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
