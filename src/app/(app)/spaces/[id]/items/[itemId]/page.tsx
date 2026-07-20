import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDateJa } from "@/lib/date";
import { eventPayload, expensePayload, formatYen } from "@/lib/items";
import { TypeBadge } from "@/components/type-badge";
import { STAMP_SET } from "@/lib/spaces";
import { addComment, deleteComment, toggleReaction } from "../../../actions";
import type { Item } from "@/types/database";

// スペース文脈でのアイテム閲覧(F-07-4 コメント / F-07-5 リアクション)
// コメント・リアクションはスペース全員に可視のオープン型(不変条件3・4)
export default async function SpaceItemPage({
  params,
}: {
  params: Promise<{ id: string; itemId: string }>;
}) {
  const { id: spaceId, itemId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // このスペースに共有されているアイテムだけを見せる
  const { data: share } = await supabase
    .from("item_shares")
    .select("shared_by, shared_at, items!inner(*)")
    .eq("space_id", spaceId)
    .eq("item_id", itemId)
    .maybeSingle();
  if (!share) notFound();
  const item = share.items as unknown as Item;

  const [{ data: comments }, { data: reactions }, { data: profiles }] =
    await Promise.all([
      supabase
        .from("comments")
        .select("*")
        .eq("item_id", itemId)
        .eq("space_id", spaceId)
        .order("created_at"),
      supabase
        .from("reactions")
        .select("*")
        .eq("item_id", itemId)
        .eq("space_id", spaceId),
      supabase.from("profiles").select("id, display_name"),
    ]);
  const nameOf = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

  const reactionCounts = new Map<string, { count: number; mine: boolean }>();
  for (const r of reactions ?? []) {
    const entry = reactionCounts.get(r.emoji) ?? { count: 0, mine: false };
    entry.count += 1;
    if (r.user_id === user?.id) entry.mine = true;
    reactionCounts.set(r.emoji, entry);
  }

  return (
    <div>
      <div className="flex items-baseline gap-3 text-sm text-usuzumi">
        <time dateTime={item.occurred_on}>{formatDateJa(item.occurred_on)}</time>
        <TypeBadge type={item.type} />
        <span className="text-xs">
          {nameOf.get(share.shared_by) ?? "どなたか"} さんより
        </span>
      </div>

      <h3 className="mt-2 font-serif text-2xl">{item.title ?? "(無題)"}</h3>

      <div className="mt-4 rounded-md border border-keisen bg-paper px-6 py-6">
        {item.type === "expense" && (
          <p>
            {expensePayload(item).kind === "income" ? "+" : "−"}
            {formatYen(expensePayload(item).amount)}
            <span className="ml-2 text-sm text-usuzumi">
              ({expensePayload(item).category})
            </span>
          </p>
        )}
        {item.type === "event" && (
          <p className="text-sm">
            {eventPayload(item).all_day
              ? "終日"
              : (eventPayload(item).start_time ?? "時刻さだめず")}
            {eventPayload(item).place && ` / ${eventPayload(item).place}`}
          </p>
        )}
        {item.body && (
          <p className="mt-2 whitespace-pre-wrap leading-loose">{item.body}</p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {STAMP_SET.map((emoji) => {
          const entry = reactionCounts.get(emoji);
          return (
            <form key={emoji} action={toggleReaction}>
              <input type="hidden" name="item_id" value={itemId} />
              <input type="hidden" name="space_id" value={spaceId} />
              <input type="hidden" name="emoji" value={emoji} />
              <button
                type="submit"
                aria-pressed={entry?.mine ?? false}
                className={`border px-3 py-1 text-sm ${
                  entry?.mine
                    ? "border-ai bg-ai text-paper"
                    : "border-keisen bg-paper hover:border-ai"
                }`}
              >
                {emoji}
                {entry ? ` ${entry.count}` : ""}
              </button>
            </form>
          );
        })}
      </div>

      <section className="mt-8">
        <h4 className="border-l-4 border-ai pl-2 font-medium">
          コメント
        </h4>
        <p className="mt-1 text-xs text-usuzumi">
          コメントは、このスペースのメンバー全員が読めます。
        </p>

        {(comments ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-usuzumi">まだコメントはありません。</p>
        ) : (
          <ul className="mt-3 divide-y divide-keisen rounded-md border border-keisen bg-paper">
            {(comments ?? []).map((c) => (
              <li key={c.id} className="px-4 py-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-usuzumi">
                    {nameOf.get(c.author_id) ?? "どなたか"} さん
                  </span>
                  {c.author_id === user?.id && (
                    <form action={deleteComment}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="item_id" value={itemId} />
                      <input type="hidden" name="space_id" value={spaceId} />
                      <button
                        type="submit"
                        className="text-xs text-usuzumi underline underline-offset-4"
                      >
                        消す
                      </button>
                    </form>
                  )}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm">{c.body}</p>
              </li>
            ))}
          </ul>
        )}

        <form action={addComment} className="mt-4">
          <input type="hidden" name="item_id" value={itemId} />
          <input type="hidden" name="space_id" value={spaceId} />
          <label className="block text-sm" htmlFor="comment-body">
            コメント
          </label>
          <textarea
            id="comment-body"
            name="body"
            rows={3}
            required
            maxLength={2000}
            className="mt-1 w-full resize-y rounded-md border border-keisen bg-paper px-3 py-2 text-sm leading-relaxed outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          />
          <div className="mt-2 text-right">
            <button
              type="submit"
              className="rounded-md bg-ai px-4 py-2 text-sm text-paper transition-colors hover:bg-ai-deep"
            >
              コメントする
            </button>
          </div>
        </form>
      </section>

      <p className="mt-8">
        <Link
          href={`/spaces/${spaceId}`}
          className="text-sm text-usuzumi underline underline-offset-4"
        >
          フィードへ戻る
        </Link>
      </p>
    </div>
  );
}
