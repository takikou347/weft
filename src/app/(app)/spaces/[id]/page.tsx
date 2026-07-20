import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDateJa } from "@/lib/date";
import { TYPE_LABELS, itemLine } from "@/lib/items";
import type { Item } from "@/types/database";

const PAGE_SIZE = 20;

// フィード(F-07-3): スペースへ共有された記録の時系列フィード
export default async function SpaceFeedPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  const { data: shares, count } = await supabase
    .from("item_shares")
    .select("shared_at, shared_by, items!inner(*)", { count: "exact" })
    .eq("space_id", id)
    .order("shared_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const sharerIds = [...new Set((shares ?? []).map((s) => s.shared_by))];
  const { data: profiles } = sharerIds.length
    ? await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", sharerIds)
    : { data: [] };
  const nameOf = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

  const total = count ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      {total === 0 ? (
        <div className="mt-8 text-center text-usuzumi">
          <p>まだ共有された記録がありません。</p>
          <p className="mt-2 text-sm">
            記録の詳細ページから、このスペースに共有できます。
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-keisen rounded-md border border-keisen bg-paper">
          {(shares ?? []).map((share) => {
            const item = share.items as unknown as Item;
            return (
              <li key={`${item.id}-${share.shared_at}`}>
                <Link
                  href={`/spaces/${id}/items/${item.id}`}
                  className="block px-5 py-4 hover:bg-washi"
                >
                  <div className="flex items-baseline gap-3 text-xs text-usuzumi">
                    <span>
                      {nameOf.get(share.shared_by) ?? "どなたか"} さんより
                    </span>
                    <time dateTime={item.occurred_on}>
                      {formatDateJa(item.occurred_on)}
                    </time>
                    <span className="rounded-sm border border-keisen px-1.5">
                      {TYPE_LABELS[item.type]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm">{itemLine(item)}</p>
                  {item.type === "diary" && item.body && (
                    <p className="mt-1 line-clamp-2 text-sm text-usuzumi">
                      {item.body}
                    </p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {total > PAGE_SIZE && (
        <nav className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link
              href={`/spaces/${id}?page=${page - 1}`}
              className="text-ai underline underline-offset-4"
            >
              新しい方
            </Link>
          ) : (
            <span />
          )}
          <span className="text-usuzumi">
            {page} / {lastPage} 頁
          </span>
          {page < lastPage ? (
            <Link
              href={`/spaces/${id}?page=${page + 1}`}
              className="text-ai underline underline-offset-4"
            >
              古い方
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
