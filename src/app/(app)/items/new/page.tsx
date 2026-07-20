import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { normalizeDate, todayIso } from "@/lib/date";
import { isCreatableType, CREATABLE_TYPES, TYPE_LABELS } from "@/lib/items";
import { ItemForm } from "../item-form";

// アイテム作成(F-03-2 / F-04-1 / F-05-1 / タスク)
// ?type=diary|event|expense|task&date=YYYY-MM-DD&link=<itemId>
export default async function NewItemPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; date?: string; link?: string }>;
}) {
  const params = await searchParams;
  const type = isCreatableType(params.type) ? params.type : "diary";
  const date = params.date ? normalizeDate(params.date) : todayIso();
  const linkTo = params.link;

  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("expense_categories")
    .select("name")
    .order("position");

  const query = (t: string) =>
    `/items/new?type=${t}&date=${date}${linkTo ? `&link=${linkTo}` : ""}`;

  return (
    <div>
      <nav className="flex gap-2 text-sm" aria-label="種別の切り替え">
        {CREATABLE_TYPES.map((t) => (
          <Link
            key={t}
            href={query(t)}
            aria-current={t === type ? "page" : undefined}
            className={
              t === type
                ? "border border-ai bg-ai px-3 py-1 text-paper"
                : "rounded-md border border-keisen bg-paper px-3 py-1 text-usuzumi hover:border-ai"
            }
          >
            {TYPE_LABELS[t]}
          </Link>
        ))}
      </nav>

      <div className="mt-6">
        <ItemForm
          type={type}
          mode="create"
          categories={(categories ?? []).map((c) => c.name)}
          linkTo={linkTo}
          defaults={{ occurredOn: date }}
          backHref={`/days/${date}`}
        />
      </div>
    </div>
  );
}
