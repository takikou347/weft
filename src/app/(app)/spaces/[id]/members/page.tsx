import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDateJa } from "@/lib/date";
import {
  createInvitation,
  deleteInvitation,
  leaveSpace,
  removeMember,
} from "../../actions";
import { addProjectMember } from "../org-actions";
import type { SpaceRole } from "@/types/database";

const ROLE_LABELS: Record<SpaceRole, string> = {
  owner: "世話役",
  admin: "副世話役",
  member: "なかま",
};

// なかま(F-02-4 ロール / F-02-5 退出・除名 / F-02-3 招待)
export default async function MembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: members } = await supabase
    .from("space_members")
    .select("user_id, role, joined_at")
    .eq("space_id", id)
    .order("joined_at");
  if (!members || members.length === 0) notFound();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in(
      "id",
      members.map((m) => m.user_id),
    );
  const nameOf = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

  const myRole = members.find((m) => m.user_id === user.id)?.role;
  const canManage = myRole === "owner" || myRole === "admin";

  // プロジェクトなら、親組織のなかまを直接加えられる(F-02-2 / add_project_member)
  const { data: space } = await supabase
    .from("spaces")
    .select("type, parent_space_id")
    .eq("id", id)
    .maybeSingle();
  let orgCandidates: { user_id: string; name: string }[] = [];
  if (space?.type === "project" && space.parent_space_id && canManage) {
    const { data: orgMembers } = await supabase
      .from("space_members")
      .select("user_id")
      .eq("space_id", space.parent_space_id);
    const memberIds = new Set(members.map((m) => m.user_id));
    const candidates = (orgMembers ?? []).filter(
      (m) => !memberIds.has(m.user_id),
    );
    if (candidates.length > 0) {
      const { data: candidateProfiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in(
          "id",
          candidates.map((c) => c.user_id),
        );
      const candidateNameOf = new Map(
        (candidateProfiles ?? []).map((p) => [p.id, p.display_name]),
      );
      orgCandidates = candidates.map((c) => ({
        user_id: c.user_id,
        name: candidateNameOf.get(c.user_id) ?? "どなたか",
      }));
    }
  }

  // 招待リンク(owner/adminのみRLSで取得できる)
  const { data: invitations } = canManage
    ? await supabase
        .from("invitations")
        .select("*")
        .eq("space_id", id)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div>
      <ul className="divide-y divide-keisen border border-keisen bg-paper">
        {members.map((m) => (
          <li
            key={m.user_id}
            className="flex items-center justify-between px-5 py-3"
          >
            <span className="text-sm">
              {nameOf.get(m.user_id) ?? "どなたか"}
              {m.user_id === user.id && (
                <span className="ml-1 text-xs text-usuzumi">(あなた)</span>
              )}
            </span>
            <span className="flex items-center gap-3">
              <span className="border border-keisen px-1.5 text-xs text-usuzumi">
                {ROLE_LABELS[m.role as SpaceRole]}
              </span>
              {canManage && m.user_id !== user.id && m.role !== "owner" && (
                <form action={removeMember}>
                  <input type="hidden" name="space_id" value={id} />
                  <input type="hidden" name="user_id" value={m.user_id} />
                  <button
                    type="submit"
                    className="text-xs text-usuzumi underline underline-offset-4 hover:text-sumi"
                  >
                    外す
                  </button>
                </form>
              )}
            </span>
          </li>
        ))}
      </ul>

      {myRole !== "owner" && (
        <form action={leaveSpace} className="mt-4 text-right">
          <input type="hidden" name="space_id" value={id} />
          <button
            type="submit"
            className="text-sm text-usuzumi underline underline-offset-4 hover:text-sumi"
          >
            このつどいから抜ける
          </button>
        </form>
      )}

      {orgCandidates.length > 0 && (
        <section className="mt-8">
          <h4 className="border-l-4 border-ai pl-2 font-medium">
            つとめ先のなかまを加える
          </h4>
          <ul className="mt-3 divide-y divide-keisen border border-keisen bg-paper">
            {orgCandidates.map((c) => (
              <li
                key={c.user_id}
                className="flex items-center justify-between px-4 py-2 text-sm"
              >
                <span>{c.name}</span>
                <form action={addProjectMember}>
                  <input type="hidden" name="project_id" value={id} />
                  <input type="hidden" name="user_id" value={c.user_id} />
                  <button
                    type="submit"
                    className="border border-ai px-3 py-1 text-xs text-ai hover:bg-ai hover:text-paper"
                  >
                    加える
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      {canManage && (
        <section className="mt-8">
          <h4 className="border-l-4 border-ai pl-2 font-medium">招待状</h4>
          <p className="mt-1 text-xs text-usuzumi">
            リンクを知っている人が7日のあいだ参加できます。
          </p>

          {(invitations ?? []).length > 0 && (
            <ul className="mt-3 space-y-2">
              {(invitations ?? []).map((inv) => (
                <li
                  key={inv.id}
                  className="border border-keisen bg-paper px-4 py-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <code className="min-w-0 flex-1 truncate text-xs">
                      /invite/{inv.token}
                    </code>
                    <form action={deleteInvitation}>
                      <input type="hidden" name="id" value={inv.id} />
                      <input type="hidden" name="space_id" value={id} />
                      <button
                        type="submit"
                        className="text-xs text-usuzumi underline underline-offset-4"
                      >
                        破る
                      </button>
                    </form>
                  </div>
                  <p className="mt-1 text-xs text-usuzumi">
                    {formatDateJa(inv.expires_at.slice(0, 10))} まで
                  </p>
                </li>
              ))}
            </ul>
          )}

          <form action={createInvitation} className="mt-3">
            <input type="hidden" name="space_id" value={id} />
            <button
              type="submit"
              className="border border-keisen bg-paper px-4 py-2 text-sm hover:border-ai"
            >
              あたらしい招待状をしたためる
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
