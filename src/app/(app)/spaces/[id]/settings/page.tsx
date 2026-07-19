import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { spaceColor } from "@/lib/spaces";
import { SettingsForm } from "./settings-form";

// スペース設定(F-02-6): 名前・テーマカラー。変更は owner / admin(RLSで強制)
export default async function SpaceSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: space } = await supabase
    .from("spaces")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!space || !user) notFound();

  const { data: me } = await supabase
    .from("space_members")
    .select("role")
    .eq("space_id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  const canEdit = me?.role === "owner" || me?.role === "admin";

  if (!canEdit) {
    return (
      <p className="text-sm text-usuzumi">
        設定を変えられるのは、世話役・副世話役だけです。
      </p>
    );
  }

  return (
    <SettingsForm
      spaceId={id}
      currentName={space.name}
      currentColor={spaceColor(space)}
    />
  );
}
