import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/(auth)/actions";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-keisen bg-paper">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-3">
          <Link href="/" className="font-serif text-xl tracking-widest">
            Weft
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-usuzumi">
              {profile?.display_name ?? ""} さん
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="text-usuzumi underline underline-offset-4 hover:text-sumi"
              >
                とじる
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
