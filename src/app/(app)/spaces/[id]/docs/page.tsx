import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDateJa } from "@/lib/date";
import { createProjectDoc } from "../org-actions";
import type { Item } from "@/types/database";

const PAGE_SIZE = 20;

// ナレッジ(F-08-4): 議事録・作業記録・ノウハウ。共有されたものだけが見える
export default async function DocsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; error?: string }>;
}) {
  const { id } = await params;
  const { page: pageRaw, error } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  const { data: space } = await supabase
    .from("spaces")
    .select("id, type")
    .eq("id", id)
    .maybeSingle();
  if (!space || space.type !== "project") notFound();

  const { data: shares, count } = await supabase
    .from("item_shares")
    .select("items!inner(*)", { count: "exact" })
    .eq("space_id", id)
    .eq("items.type", "document")
    .order("shared_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  const docs = (shares ?? []).map((s) => s.items as unknown as Item);
  const total = count ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      {docs.length === 0 ? (
        <p className="mt-2 text-sm text-usuzumi">
          まだ文書はありません。
        </p>
      ) : (
        <ul className="divide-y divide-keisen rounded-md border border-keisen bg-paper">
          {docs.map((doc) => (
            <li key={doc.id}>
              <Link
                href={`/spaces/${id}/items/${doc.id}`}
                className="block px-5 py-3 hover:bg-washi"
              >
                <p className="text-sm font-medium">{doc.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-usuzumi">
                  {doc.body}
                </p>
                <p className="mt-0.5 text-xs text-usuzumi">
                  {formatDateJa(doc.occurred_on)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {total > PAGE_SIZE && (
        <nav className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link
              href={`/spaces/${id}/docs?page=${page - 1}`}
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
              href={`/spaces/${id}/docs?page=${page + 1}`}
              className="text-ai underline underline-offset-4"
            >
              古い方
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}

      <section className="mt-8">
        <h4 className="border-l-4 border-ai pl-2 font-medium">
          文書を保存する
        </h4>
        {error && (
          <p role="alert" className="mt-2 text-sm text-ai-deep">
            保存できませんでした。題と本文の両方を入れてください。
          </p>
        )}
        <form
          action={createProjectDoc}
          className="mt-3 rounded-md border border-keisen bg-paper px-5 py-6"
        >
          <input type="hidden" name="space_id" value={id} />
          <label className="block text-sm" htmlFor="doc-title">
            題
          </label>
          <input
            id="doc-title"
            name="title"
            type="text"
            required
            maxLength={100}
            className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          />
          <label className="mt-4 block text-sm" htmlFor="doc-body">
            本文
          </label>
          <textarea
            id="doc-body"
            name="body"
            rows={6}
            required
            className="mt-1 w-full resize-y border border-keisen bg-transparent px-3 py-2 text-sm leading-relaxed outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          />
          <div className="mt-4 text-right">
            <button
              type="submit"
              className="rounded-md bg-ai px-5 py-2 text-sm text-paper transition-colors hover:bg-ai-deep"
            >
              保存する
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
