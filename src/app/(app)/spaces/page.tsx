import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SPACE_TYPE_LABELS, spaceColor } from "@/lib/spaces";

// 参加スペース一覧(F-02)
export default async function SpacesPage() {
  const supabase = await createClient();
  const { data: spaces } = await supabase
    .from("spaces")
    .select("id, type, name, settings, parent_space_id, created_by, created_at, updated_at")
    .neq("type", "personal")
    .is("parent_space_id", null)
    .order("created_at");

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h2 className="font-serif text-2xl">スペース</h2>
        <Link
          href="/spaces/new"
          className="bg-ai px-4 py-2 text-sm text-paper transition-colors hover:bg-ai-deep"
        >
          スペースを作る
        </Link>
      </div>

      {(spaces ?? []).length === 0 ? (
        <div className="mt-16 text-center text-usuzumi">
          <p>まだスペースはありません。</p>
          <p className="mt-2 text-sm">
            スペースを作ると、メンバーを招待できます。
          </p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-keisen border border-keisen bg-paper">
          {(spaces ?? []).map((space) => (
            <li key={space.id}>
              <Link
                href={`/spaces/${space.id}`}
                className="flex items-center gap-3 px-5 py-4 hover:bg-washi"
              >
                <span
                  aria-hidden
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: spaceColor(space) }}
                />
                <span className="flex-1 font-medium">{space.name}</span>
                <span className="border border-keisen px-1.5 text-xs text-usuzumi">
                  {SPACE_TYPE_LABELS[space.type]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
