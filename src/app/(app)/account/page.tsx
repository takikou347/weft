import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AccountForms } from "./account-forms";

// アカウント(F-01-4 プロフィール / F-01-5 退会)
export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  return (
    <AccountForms
      email={user.email ?? ""}
      displayName={profile?.display_name ?? ""}
    />
  );
}
