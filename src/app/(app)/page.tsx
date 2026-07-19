import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDateJa } from "@/lib/date";
import { TYPE_LABELS } from "@/lib/items";

const PAGE_SIZE = 20;

// ホーム: 自分のアイテム一覧(ページネーション付き)
// RLS により「自分が作成者のもの」しか返らない。クライアント側での絞り込みはしない
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  const { data: items, count } = await supabase
    .from("items")
    .select("id, type, occurred_on, title, body, created_at", {
      count: "exact",
    })
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const total = count ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h2 className="font-serif text-2xl">帳面</h2>
        <Link
          href="/items/new"
          className="bg-ai px-4 py-2 text-sm text-paper transition-colors hover:bg-ai-deep"
        >
          記す
        </Link>
      </div>

      {total === 0 ? (
        <div className="mt-16 text-center text-usuzumi">
          <p>まだなにも記されていません。</p>
          <p className="mt-2 text-sm">
            きょうの出来事を、ひとつ記してみませんか。
          </p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-keisen border border-keisen bg-paper">
          {(items ?? []).map((item) => (
            <li key={item.id}>
              <Link
                href={`/items/${item.id}`}
                className="block px-5 py-4 hover:bg-washi"
              >
                <div className="flex items-baseline gap-3 text-sm text-usuzumi">
                  <time dateTime={item.occurred_on}>
                    {formatDateJa(item.occurred_on)}
                  </time>
                  <span className="border border-keisen px-1.5 text-xs">
                    {TYPE_LABELS[item.type] ?? item.type}
                  </span>
                </div>
                {item.title && <p className="mt-1 font-medium">{item.title}</p>}
                {item.body && (
                  <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm">
                    {item.body}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {total > PAGE_SIZE && (
        <nav className="mt-6 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link
              href={`/?page=${page - 1}`}
              className="text-ai underline underline-offset-4"
            >
              まえの頁
            </Link>
          ) : (
            <span />
          )}
          <span className="text-usuzumi">
            {page} / {lastPage} 頁
          </span>
          {page < lastPage ? (
            <Link
              href={`/?page=${page + 1}`}
              className="text-ai underline underline-offset-4"
            >
              つぎの頁
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
