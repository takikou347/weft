import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMonthJa } from "@/lib/date";
import { photoPayload } from "@/lib/items";
import type { Item } from "@/types/database";

const PAGE_SIZE = 30;

// 思い出アルバム(F-07-2): 共有された写真・日記を時系列で
export default async function AlbumPage({
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
    .select("items!inner(*)", { count: "exact" })
    .eq("space_id", id)
    .in("items.type", ["photo", "diary"])
    .order("shared_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const items = (shares ?? [])
    .map((s) => s.items as unknown as Item)
    .sort((a, b) => b.occurred_on.localeCompare(a.occurred_on));

  // 月ごとにまとめる(時系列表示)
  const byMonth = new Map<string, Item[]>();
  for (const item of items) {
    const month = item.occurred_on.slice(0, 7);
    if (!byMonth.has(month)) byMonth.set(month, []);
    byMonth.get(month)!.push(item);
  }

  // 写真は署名付きURLで表示
  const photoUrls = new Map<string, string>();
  await Promise.all(
    items
      .filter((i) => i.type === "photo")
      .map(async (i) => {
        const { data: signed } = await supabase.storage
          .from("photos")
          .createSignedUrl(photoPayload(i).path, 3600);
        if (signed?.signedUrl) photoUrls.set(i.id, signed.signedUrl);
      }),
  );

  const total = count ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      {items.length === 0 ? (
        <div className="mt-8 text-center text-usuzumi">
          <p>まだ写真や日記がありません。</p>
          <p className="mt-2 text-sm">
            写真や日記を共有すると、ここに集まります。
          </p>
        </div>
      ) : (
        [...byMonth.entries()].map(([month, monthItems]) => (
          <section key={month} className="mt-6 first:mt-0">
            <h4 className="border-l-4 border-ai pl-2 font-serif">
              {formatMonthJa(month)}
            </h4>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {monthItems.map((item) =>
                item.type === "photo" ? (
                  <Link
                    key={item.id}
                    href={`/spaces/${id}/items/${item.id}`}
                    className="block"
                  >
                    {photoUrls.has(item.id) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photoUrls.get(item.id)}
                        alt={item.title ?? "写真"}
                        loading="lazy"
                        className="aspect-square w-full rounded-md border border-keisen object-cover"
                      />
                    ) : (
                      <span className="flex aspect-square w-full items-center justify-center rounded-md border border-keisen bg-washi text-xs text-usuzumi">
                        写真
                      </span>
                    )}
                  </Link>
                ) : (
                  <Link
                    key={item.id}
                    href={`/spaces/${id}/items/${item.id}`}
                    className="flex aspect-square w-full flex-col justify-between overflow-hidden rounded-md border border-keisen bg-paper p-2"
                  >
                    <span className="line-clamp-4 text-xs leading-relaxed">
                      {item.title ?? item.body ?? "(無題)"}
                    </span>
                    <span className="text-right text-[10px] text-usuzumi">
                      {item.occurred_on.slice(5).replace("-", "/")} の日記
                    </span>
                  </Link>
                ),
              )}
            </div>
          </section>
        ))
      )}

      {total > PAGE_SIZE && (
        <nav className="mt-6 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link
              href={`/spaces/${id}/album?page=${page - 1}`}
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
              href={`/spaces/${id}/album?page=${page + 1}`}
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
