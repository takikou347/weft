import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addDays, formatDateJa, normalizeDate, weekdayJa } from "@/lib/date";
import { TYPE_LABELS, itemLine } from "@/lib/items";
import type { Item, ItemType } from "@/types/database";

const SECTIONS: { type: ItemType; heading: string }[] = [
  { type: "event", heading: "予定" },
  { type: "diary", heading: "日記" },
  { type: "expense", heading: "収支" },
  { type: "task", heading: "タスク" },
];

// その日ページ(F-03-5): 日付タップでその日の全記録を一覧
export default async function DayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date: raw } = await params;
  const date = normalizeDate(raw);
  if (date !== raw) redirect(`/days/${date}`);

  const supabase = await createClient();
  const { data } = await supabase
    .from("items")
    .select("*")
    .eq("occurred_on", date)
    .order("created_at");
  const items = (data ?? []) as Item[];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl">
          {formatDateJa(date)}
          <span className="ml-2 text-base text-usuzumi">
            ({weekdayJa(date)})
          </span>
        </h2>
      </div>

      <div className="mt-2 flex items-center justify-between text-sm">
        <Link
          href={`/days/${addDays(date, -1)}`}
          className="text-ai underline underline-offset-4"
        >
          まえの日
        </Link>
        <Link
          href={`/calendar?view=month&month=${date.slice(0, 7)}`}
          className="text-usuzumi underline underline-offset-4"
        >
          月へ戻る
        </Link>
        <Link
          href={`/days/${addDays(date, 1)}`}
          className="text-ai underline underline-offset-4"
        >
          つぎの日
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <Link
          href={`/items/new?type=diary&date=${date}`}
          className="rounded-md border border-keisen bg-paper px-3 py-2 hover:border-ai"
        >
          日記を書く
        </Link>
        <Link
          href={`/items/new?type=event&date=${date}`}
          className="rounded-md border border-keisen bg-paper px-3 py-2 hover:border-ai"
        >
          予定を追加する
        </Link>
        <Link
          href={`/items/new?type=expense&date=${date}`}
          className="rounded-md border border-keisen bg-paper px-3 py-2 hover:border-ai"
        >
          収支を記録する
        </Link>
        <Link
          href={`/items/new?type=task&date=${date}`}
          className="rounded-md border border-keisen bg-paper px-3 py-2 hover:border-ai"
        >
          タスクを追加する
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="mt-12 text-center text-usuzumi">
          この日の記録はまだありません。
        </p>
      ) : (
        SECTIONS.filter((s) => items.some((i) => i.type === s.type)).map(
          (section) => (
            <section key={section.type} className="mt-8">
              <h3 className="border-l-4 border-ai pl-2 font-medium">
                {section.heading}
              </h3>
              <ul className="mt-3 divide-y divide-keisen rounded-md border border-keisen bg-paper">
                {items
                  .filter((i) => i.type === section.type)
                  .map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/items/${item.id}`}
                        className="block px-4 py-3 hover:bg-washi"
                      >
                        <span className="text-sm">{itemLine(item)}</span>
                        {item.type === "diary" && item.body && (
                          <p className="mt-1 line-clamp-2 text-sm text-usuzumi">
                            {item.body}
                          </p>
                        )}
                      </Link>
                    </li>
                  ))}
              </ul>
            </section>
          ),
        )
      )}

      {items.some((i) => !SECTIONS.some((s) => s.type === i.type)) && (
        <section className="mt-8">
          <h3 className="border-l-4 border-ai pl-2 font-medium">そのほか</h3>
          <ul className="mt-3 divide-y divide-keisen rounded-md border border-keisen bg-paper">
            {items
              .filter((i) => !SECTIONS.some((s) => s.type === i.type))
              .map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/items/${item.id}`}
                    className="block px-4 py-3 hover:bg-washi"
                  >
                    <span className="mr-2 rounded-sm border border-keisen px-1 text-xs text-usuzumi">
                      {TYPE_LABELS[item.type]}
                    </span>
                    <span className="text-sm">{itemLine(item)}</span>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}
