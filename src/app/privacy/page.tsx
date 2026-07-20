import Link from "next/link";

export const metadata = { title: "プライバシーポリシー — Weft" };

// プライバシーポリシー(§9 個人情報保護法対応)
export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="font-serif text-3xl">プライバシーポリシー</h1>
      <p className="mt-2 text-sm text-usuzumi">2026年7月19日 制定</p>

      <div className="mt-8 space-y-8 rounded-md border border-keisen bg-paper px-6 py-8 text-sm leading-loose">
        <section>
          <h2 className="border-l-4 border-ai pl-2 font-medium">
            1. 取得する情報
          </h2>
          <ul className="mt-2 list-disc pl-5">
            <li>メールアドレス(登録・ログイン・パスワード再設定のため)</li>
            <li>プロフィール(表示名)</li>
            <li>投稿内容(予定・日記・収支・写真・コメント等)</li>
            <li>サービス提供に必要な技術情報(セッション情報等)</li>
          </ul>
        </section>

        <section>
          <h2 className="border-l-4 border-ai pl-2 font-medium">
            2. 利用目的
          </h2>
          <ul className="mt-2 list-disc pl-5">
            <li>本サービスの提供・本人確認・認証</li>
            <li>利用者が選んだ範囲での記録の共有</li>
            <li>不正利用の防止、お問い合わせへの対応</li>
          </ul>
          <p className="mt-2">
            広告配信は行いません。取得した情報を本人の同意なく第三者に提供することはありません(法令に基づく場合を除く)。
          </p>
        </section>

        <section>
          <h2 className="border-l-4 border-ai pl-2 font-medium">
            3. 保存と委託
          </h2>
          <p className="mt-2">
            データの保存には Supabase(データベース・認証・ストレージ)を、配信には
            Vercel を利用しています。いずれも本サービスの提供に必要な範囲での委託です。
          </p>
        </section>

        <section>
          <h2 className="border-l-4 border-ai pl-2 font-medium">
            4. 閲覧できる範囲
          </h2>
          <p className="mt-2">
            記録は作成した本人だけが閲覧できます。本人が共有した記録に限り、共有先スペースの参加者全員が閲覧できます。運営者がデータベースを直接閲覧することは、障害対応等やむを得ない場合を除きありません。
          </p>
        </section>

        <section>
          <h2 className="border-l-4 border-ai pl-2 font-medium">
            5. 削除
          </h2>
          <p className="mt-2">
            記録は本人がいつでも削除できます。退会すると、アカウントに紐づくすべての記録・写真・共有・通知が削除されます。
          </p>
        </section>

        <section>
          <h2 className="border-l-4 border-ai pl-2 font-medium">
            6. お問い合わせ
          </h2>
          <p className="mt-2">
            本ポリシーに関するお問い合わせは、リポジトリのIssue(
            <a
              href="https://github.com/takikou347/weft"
              className="text-ai underline underline-offset-4"
            >
              github.com/takikou347/weft
            </a>
            )までお寄せください。
          </p>
        </section>
      </div>

      <p className="mt-6 text-sm">
        <Link href="/" className="text-ai underline underline-offset-4">
          戻る
        </Link>
      </p>
    </main>
  );
}
