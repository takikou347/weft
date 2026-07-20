import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SPACE_TYPE_LABELS, spaceColor } from "@/lib/spaces";

// スペース内の共通枠(テーマカラーの見出し帯+タブ)
export default async function SpaceLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: space } = await supabase
    .from("spaces")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  // 非メンバーにはRLSで見えない → 404
  if (!space) notFound();
  const color = spaceColor(space);

  // スペースタイプ別の機能(§4.3)
  const tabs = [
    { href: `/spaces/${id}`, label: "フィード" },
    { href: `/spaces/${id}/calendar`, label: "カレンダー" },
    ...(space.type === "group"
      ? [
          { href: `/spaces/${id}/album`, label: "アルバム" },
          { href: `/spaces/${id}/settlements`, label: "精算" },
        ]
      : []),
    ...(space.type === "organization"
      ? [{ href: `/spaces/${id}/projects`, label: "プロジェクト" }]
      : []),
    ...(space.type === "project"
      ? [
          { href: `/spaces/${id}/tasks`, label: "タスク" },
          { href: `/spaces/${id}/budget`, label: "予実" },
          { href: `/spaces/${id}/docs`, label: "文書" },
        ]
      : []),
    { href: `/spaces/${id}/members`, label: "メンバー" },
    { href: `/spaces/${id}/settings`, label: "設定" },
  ];

  return (
    <div>
      <div
        className="rounded-md border border-keisen bg-paper px-5 py-4"
        style={{ borderTopColor: color, borderTopWidth: 4 }}
      >
        <p className="text-xs text-usuzumi">
          {SPACE_TYPE_LABELS[space.type]}
        </p>
        <h2 className="font-serif text-2xl">{space.name}</h2>
      </div>

      <nav
        aria-label="スペース内のページ"
        className="mt-3 flex gap-4 border-b border-keisen pb-2 text-sm"
      >
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="text-usuzumi hover:text-sumi"
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="mt-4">{children}</div>
    </div>
  );
}
