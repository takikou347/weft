import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatYen } from "@/lib/items";
import { settlementPlan } from "@/lib/settle";
import {
  addSettlement,
  deleteSettlement,
  toggleSettlementStatus,
} from "./actions";

// 立替精算(F-07-6): 記録・割り勘計算・精算案。送金機能は持たない(§9)
export default async function SettlementsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const [{ data: settlements }, { data: members }] = await Promise.all([
    supabase
      .from("settlements")
      .select("*")
      .eq("space_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("space_members")
      .select("user_id")
      .eq("space_id", id),
  ]);
  if (!members || members.length === 0) notFound();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in(
      "id",
      members.map((m) => m.user_id),
    );
  const nameOf = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

  const open = (settlements ?? []).filter((s) => s.status === "open");
  const plan = settlementPlan(
    open.map((s) => ({
      payerId: s.payer_id,
      amount: Number(s.amount),
      participants: (s.participants as string[]) ?? [],
    })),
  );

  return (
    <div>
      <section>
        <h4 className="border-l-4 border-ai pl-2 font-medium">精算のすすめ</h4>
        {plan.length === 0 ? (
          <p className="mt-3 text-sm text-usuzumi">
            いまのところ、貸し借りはありません。
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-keisen rounded-md border border-keisen bg-paper">
            {plan.map((t) => (
              <li key={`${t.from}-${t.to}`} className="px-4 py-3 text-sm">
                <span className="font-medium">
                  {nameOf.get(t.from) ?? "どなたか"}
                </span>
                <span className="text-usuzumi"> さんから </span>
                <span className="font-medium">
                  {nameOf.get(t.to) ?? "どなたか"}
                </span>
                <span className="text-usuzumi"> さんへ </span>
                <span className="font-medium">{formatYen(t.amount)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-usuzumi">
          Weft はお金のやりとりそのものは行いません。記録と計算だけです。
        </p>
      </section>

      <section className="mt-8">
        <h4 className="border-l-4 border-ai pl-2 font-medium">立替の記録</h4>
        {(settlements ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-usuzumi">まだ記録はありません。</p>
        ) : (
          <ul className="mt-3 divide-y divide-keisen rounded-md border border-keisen bg-paper">
            {(settlements ?? []).map((s) => (
              <li key={s.id} className="px-4 py-3">
                <div className="flex items-baseline justify-between">
                  <span
                    className={`text-sm ${s.status === "settled" ? "text-usuzumi line-through" : ""}`}
                  >
                    {s.title}
                  </span>
                  <span className="text-sm font-medium">
                    {formatYen(Number(s.amount))}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-usuzumi">
                  {nameOf.get(s.payer_id) ?? "どなたか"} さんが立替 /{" "}
                  {((s.participants as string[]) ?? [])
                    .map((p) => nameOf.get(p) ?? "どなたか")
                    .join("・")}{" "}
                  で割り勘
                  {s.status === "settled" && " / 精算済み"}
                </p>
                {(s.created_by === user.id || s.payer_id === user.id) && (
                  <div className="mt-1 flex gap-3 text-xs">
                    <form action={toggleSettlementStatus}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="space_id" value={id} />
                      <input
                        type="hidden"
                        name="next"
                        value={s.status === "open" ? "settled" : "open"}
                      />
                      <button
                        type="submit"
                        className="text-ai underline underline-offset-4"
                      >
                        {s.status === "open"
                          ? "精算済みにする"
                          : "精算前にもどす"}
                      </button>
                    </form>
                    <form action={deleteSettlement}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="space_id" value={id} />
                      <button
                        type="submit"
                        className="text-usuzumi underline underline-offset-4"
                      >
                        消す
                      </button>
                    </form>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h4 className="border-l-4 border-ai pl-2 font-medium">立替を記録する</h4>
        {error && (
          <p role="alert" className="mt-2 text-sm text-ai-deep">
            記録できませんでした。入力をお確かめください。
          </p>
        )}
        <form
          action={addSettlement}
          className="mt-3 rounded-md border border-keisen bg-paper px-5 py-6"
        >
          <input type="hidden" name="space_id" value={id} />

          <label className="block text-sm" htmlFor="settle-title">
            なんの立替か
          </label>
          <input
            id="settle-title"
            name="title"
            type="text"
            required
            maxLength={100}
            placeholder="例: 宿代、レンタカー"
            className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
          />

          <label className="mt-4 block text-sm" htmlFor="settle-amount">
            金額(円)
          </label>
          <input
            id="settle-amount"
            name="amount"
            type="number"
            min={1}
            step={1}
            required
            className="mt-1 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          />

          <label className="mt-4 block text-sm" htmlFor="settle-payer">
            払った人
          </label>
          <select
            id="settle-payer"
            name="payer_id"
            defaultValue={user.id}
            className="mt-1 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          >
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {nameOf.get(m.user_id) ?? "どなたか"}
              </option>
            ))}
          </select>

          <fieldset className="mt-4">
            <legend className="text-sm">割り勘に入る人</legend>
            <div className="mt-1 flex flex-wrap gap-4 text-sm">
              {members.map((m) => (
                <label key={m.user_id} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    name="participants"
                    value={m.user_id}
                    defaultChecked
                    className="accent-ai"
                  />
                  {nameOf.get(m.user_id) ?? "どなたか"}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-6 text-right">
            <button
              type="submit"
              className="rounded-md bg-ai px-5 py-2 text-sm text-paper transition-colors hover:bg-ai-deep"
            >
              記録する
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
