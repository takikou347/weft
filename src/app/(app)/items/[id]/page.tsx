import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDateJa } from "@/lib/date";
import {
  TASK_STATUS_LABELS,
  TYPE_LABELS,
  eventPayload,
  expensePayload,
  formatYen,
  itemLine,
  taskPayload,
} from "@/lib/items";
import { createLink, deleteItem, deleteLink } from "../actions";
import type { Item } from "@/types/database";

// アイテム詳細(F-09-4: リンク一覧、F-03-4: 派生導線)
export default async function ItemDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { id } = await params;
  const { q } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: item } = await supabase
    .from("items")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  // 閲覧権限が無い場合も RLS で0件になる → 404(存在自体を隠す)
  if (!item) notFound();
  const isOwner = user?.id === item.owner_id;

  // リンク済みアイテム(F-09-2: 双方向。RLSにより見えない端点のリンクは返らない)
  const { data: links } = await supabase
    .from("links")
    .select("item_id_a, item_id_b")
    .or(`item_id_a.eq.${id},item_id_b.eq.${id}`);
  const linkedIds = (links ?? []).map((l) =>
    l.item_id_a === id ? l.item_id_b : l.item_id_a,
  );
  const { data: linkedItems } = linkedIds.length
    ? await supabase
        .from("items")
        .select("id, type, occurred_on, title, body, payload, owner_id, origin_space_id, created_at, updated_at")
        .in("id", linkedIds)
    : { data: [] as Item[] };

  // リンク追加の検索(F-09-1)
  const { data: candidates } = q
    ? await supabase
        .from("items")
        .select("id, type, occurred_on, title, body, payload, owner_id, origin_space_id, created_at, updated_at")
        .ilike("title", `%${q}%`)
        .neq("id", id)
        .order("occurred_on", { ascending: false })
        .limit(10)
    : { data: [] as Item[] };
  const candidateItems = (candidates ?? []).filter(
    (c) => !linkedIds.includes(c.id),
  );

  return (
    <div>
      <div className="flex items-baseline gap-3 text-sm text-usuzumi">
        <time dateTime={item.occurred_on}>{formatDateJa(item.occurred_on)}</time>
        <span className="border border-keisen px-1.5 text-xs">
          {TYPE_LABELS[item.type]}
        </span>
      </div>

      <h2 className="mt-2 font-serif text-2xl">{item.title ?? "(無題)"}</h2>

      <div className="mt-4 border border-keisen bg-paper px-6 py-6">
        {item.type === "expense" && (
          <ExpenseDetail item={item as Item} />
        )}
        {item.type === "event" && <EventDetail item={item as Item} />}
        {item.type === "task" && (
          <p className="text-sm">
            すすみ具合:{" "}
            <span className="border border-keisen px-2 py-0.5">
              {TASK_STATUS_LABELS[taskPayload(item as Item).status]}
            </span>
          </p>
        )}
        {item.body && (
          <p className="mt-3 whitespace-pre-wrap leading-loose">{item.body}</p>
        )}
        {!item.body && item.type === "diary" && (
          <p className="text-sm text-usuzumi">本文はありません。</p>
        )}
      </div>

      {isOwner && (
        <div className="mt-4 flex items-center gap-4 text-sm">
          <Link
            href={`/items/${item.id}/edit`}
            className="text-ai underline underline-offset-4"
          >
            書き直す
          </Link>
          <form
            action={deleteItem}
          >
            <input type="hidden" name="id" value={item.id} />
            <button
              type="submit"
              className="text-usuzumi underline underline-offset-4 hover:text-sumi"
            >
              破り捨てる
            </button>
          </form>
        </div>
      )}

      {item.type === "event" && isOwner && (
        <section className="mt-8">
          <h3 className="border-l-4 border-ai pl-2 font-medium">
            この予定から
          </h3>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <Link
              href={`/items/new?type=diary&date=${item.occurred_on}&link=${item.id}`}
              className="border border-keisen bg-paper px-3 py-2 hover:border-ai"
            >
              この日の日記を書く
            </Link>
            <Link
              href={`/items/new?type=expense&date=${item.occurred_on}&link=${item.id}`}
              className="border border-keisen bg-paper px-3 py-2 hover:border-ai"
            >
              収支を記録する
            </Link>
            <Link
              href={`/items/new?type=task&date=${item.occurred_on}&link=${item.id}`}
              className="border border-keisen bg-paper px-3 py-2 hover:border-ai"
            >
              つとめを作る
            </Link>
          </div>
        </section>
      )}

      <section className="mt-8">
        <h3 className="border-l-4 border-ai pl-2 font-medium">
          結びついた記録
        </h3>
        {(linkedItems ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-usuzumi">まだ結びつきはありません。</p>
        ) : (
          <ul className="mt-3 divide-y divide-keisen border border-keisen bg-paper">
            {(linkedItems ?? []).map((linked) => (
              <li
                key={linked.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <Link href={`/items/${linked.id}`} className="min-w-0 flex-1">
                  <span className="mr-2 border border-keisen px-1.5 text-xs text-usuzumi">
                    {TYPE_LABELS[linked.type]}
                  </span>
                  <span className="text-sm">{itemLine(linked as Item)}</span>
                </Link>
                {isOwner && (
                  <form action={deleteLink}>
                    <input type="hidden" name="from" value={item.id} />
                    <input type="hidden" name="to" value={linked.id} />
                    <button
                      type="submit"
                      aria-label="結びつきをほどく"
                      className="ml-3 text-xs text-usuzumi underline underline-offset-4"
                    >
                      ほどく
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}

        {isOwner && (
          <div className="mt-4">
            <form method="get" className="flex gap-2">
              <input
                type="search"
                name="q"
                defaultValue={q ?? ""}
                placeholder="結びつける記録を探す"
                className="flex-1 border-b border-keisen bg-transparent py-2 text-sm outline-none placeholder:text-keisen focus:border-ai"
              />
              <button
                type="submit"
                className="border border-keisen bg-paper px-3 py-1 text-sm hover:border-ai"
              >
                探す
              </button>
            </form>
            {q && (
              <ul className="mt-2 divide-y divide-keisen border border-keisen bg-paper">
                {candidateItems.length === 0 && (
                  <li className="px-4 py-3 text-sm text-usuzumi">
                    見あたりませんでした。
                  </li>
                )}
                {candidateItems.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="mr-2 border border-keisen px-1.5 text-xs text-usuzumi">
                        {TYPE_LABELS[c.type]}
                      </span>
                      {itemLine(c as Item)}
                    </span>
                    <form action={createLink}>
                      <input type="hidden" name="from" value={item.id} />
                      <input type="hidden" name="to" value={c.id} />
                      <button
                        type="submit"
                        className="ml-3 text-xs text-ai underline underline-offset-4"
                      >
                        結びつける
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <p className="mt-8">
        <Link
          href={`/days/${item.occurred_on}`}
          className="text-sm text-usuzumi underline underline-offset-4"
        >
          この日のページへ
        </Link>
      </p>
    </div>
  );
}

function ExpenseDetail({ item }: { item: Item }) {
  const p = expensePayload(item);
  return (
    <p className="text-lg">
      <span className="mr-3 border border-keisen px-2 py-0.5 text-sm text-usuzumi">
        {p.category}
      </span>
      <span className={p.kind === "income" ? "text-ai" : ""}>
        {p.kind === "income" ? "+" : "−"}
        {formatYen(p.amount)}
      </span>
    </p>
  );
}

function EventDetail({ item }: { item: Item }) {
  const p = eventPayload(item);
  return (
    <dl className="space-y-1 text-sm">
      <div>
        <dt className="inline text-usuzumi">とき: </dt>
        <dd className="inline">
          {p.all_day
            ? "終日"
            : p.start_time
              ? `${p.start_time}${p.end_time ? ` 〜 ${p.end_time}` : ""}`
              : "時刻さだめず"}
        </dd>
      </div>
      {p.place && (
        <div>
          <dt className="inline text-usuzumi">ところ: </dt>
          <dd className="inline">{p.place}</dd>
        </div>
      )}
      {p.memo && (
        <div>
          <dt className="inline text-usuzumi">おぼえがき: </dt>
          <dd className="inline whitespace-pre-wrap">{p.memo}</dd>
        </div>
      )}
    </dl>
  );
}
