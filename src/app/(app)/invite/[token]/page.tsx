import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SPACE_TYPE_LABELS } from "@/lib/spaces";
import { acceptInvitation } from "../../spaces/actions";

// 招待の受け取り(F-02-3)
export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();
  const { data: previews } = await supabase.rpc("invitation_preview", {
    invite_token: token,
  });
  const preview = previews?.[0];

  return (
    <div className="mx-auto max-w-sm text-center">
      <h2 className="font-serif text-2xl">招待状</h2>

      {!preview ? (
        <div className="mt-8 border border-keisen bg-paper px-6 py-8">
          <p className="text-sm text-usuzumi">
            この招待状は見あたりませんでした。
            <br />
            すでに破られたのかもしれません。
          </p>
        </div>
      ) : preview.expired ? (
        <div className="mt-8 border border-keisen bg-paper px-6 py-8">
          <p className="text-sm text-usuzumi">
            「{preview.space_name}」への招待状は、期限が過ぎています。
            <br />
            あたらしい招待状をお願いしてみてください。
          </p>
        </div>
      ) : (
        <div className="mt-8 border border-keisen bg-paper px-6 py-8">
          <p className="text-sm text-usuzumi">
            {SPACE_TYPE_LABELS[preview.space_type]}
          </p>
          <p className="mt-1 font-serif text-xl">{preview.space_name}</p>
          <p className="mt-4 text-sm text-usuzumi">
            へお招きいただいています。
          </p>

          {error && (
            <p role="alert" className="mt-4 text-sm text-ai-deep">
              参加できませんでした。もう一度お試しください。
            </p>
          )}

          <form action={acceptInvitation} className="mt-6">
            <input type="hidden" name="token" value={token} />
            <button
              type="submit"
              className="w-full bg-ai py-3 text-paper transition-colors hover:bg-ai-deep"
            >
              なかまに入る
            </button>
          </form>
        </div>
      )}

      <p className="mt-6">
        <Link
          href="/"
          className="text-sm text-usuzumi underline underline-offset-4"
        >
          帳面へもどる
        </Link>
      </p>
    </div>
  );
}
