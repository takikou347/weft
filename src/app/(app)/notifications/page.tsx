import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { markAllRead } from "./actions";
import type { AppNotification, NotificationType } from "@/types/database";

const PAGE_SIZE = 30;

const TYPE_TEXT: Record<NotificationType, string> = {
  shared: "が記録を共有しました",
  comment: "がコメントしました",
  reaction: "がリアクションしました",
  task_assigned: "がタスクの担当者にあなたを選びました",
  settlement: "が立替を記録しました",
};

// 通知(F-11-1): アプリ内通知
export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  const { data, count } = await supabase
    .from("notifications")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  const notifications = (data ?? []) as AppNotification[];

  const actorIds = [
    ...new Set(
      notifications
        .map((n) => n.payload.actor_id)
        .filter((v): v is string => Boolean(v)),
    ),
  ];
  const { data: profiles } = actorIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", actorIds)
    : { data: [] };
  const nameOf = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

  const total = count ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasUnread = notifications.some((n) => !n.read_at);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h2 className="font-serif text-2xl">通知</h2>
        {hasUnread && (
          <form action={markAllRead}>
            <button
              type="submit"
              className="text-sm text-ai underline underline-offset-4"
            >
              すべて既読にする
            </button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="mt-12 text-center text-usuzumi">通知はまだありません。</p>
      ) : (
        <ul className="mt-6 divide-y divide-keisen rounded-md border border-keisen bg-paper">
          {notifications.map((n) => {
            const href = n.payload.item_id
              ? n.payload.space_id
                ? `/spaces/${n.payload.space_id}/items/${n.payload.item_id}`
                : `/items/${n.payload.item_id}`
              : n.payload.space_id
                ? `/spaces/${n.payload.space_id}${n.type === "settlement" ? "/settlements" : ""}`
                : "/";
            return (
              <li key={n.id}>
                <Link
                  href={href}
                  className={`block px-5 py-3 text-sm hover:bg-washi ${
                    n.read_at ? "text-usuzumi" : ""
                  }`}
                >
                  {!n.read_at && (
                    <span
                      aria-label="未読"
                      className="mr-2 inline-block h-2 w-2 rounded-full bg-ai"
                    />
                  )}
                  <span className="font-medium">
                    {nameOf.get(n.payload.actor_id ?? "") ?? "どなたか"} さん
                  </span>
                  {TYPE_TEXT[n.type]}
                  {n.type === "reaction" && n.payload.emoji
                    ? `(${n.payload.emoji})`
                    : ""}
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
              href={`/notifications?page=${page - 1}`}
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
              href={`/notifications?page=${page + 1}`}
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
