import Link from "next/link";

export const metadata = { title: "利用規約 — Weft" };

// 利用規約(§9)
export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="font-serif text-3xl">利用規約</h1>
      <p className="mt-2 text-sm text-usuzumi">2026年7月19日 制定</p>

      <div className="mt-8 space-y-8 border border-keisen bg-paper px-6 py-8 text-sm leading-loose">
        <section>
          <h2 className="border-l-4 border-ai pl-2 font-medium">
            第1条(本サービス)
          </h2>
          <p className="mt-2">
            Weft(以下「本サービス」)は、個人の予定・記録・お金を一元管理し、利用者が選んだ記録だけをグループ・組織に共有できるWebアプリです。運営者は個人開発者です。
          </p>
        </section>

        <section>
          <h2 className="border-l-4 border-ai pl-2 font-medium">
            第2条(アカウント)
          </h2>
          <p className="mt-2">
            登録にはメールアドレスが必要です。認証情報の管理は利用者の責任で行ってください。未成年の方は、保護者の同意を得たうえでご利用ください。
          </p>
        </section>

        <section>
          <h2 className="border-l-4 border-ai pl-2 font-medium">
            第3条(投稿コンテンツの権利)
          </h2>
          <p className="mt-2">
            利用者が投稿した記録・写真等の権利は利用者に帰属します。運営者は、本サービスの提供・維持・改善に必要な範囲でのみ、投稿コンテンツを利用(保存・複製・表示等)する許諾を受けるものとします。
          </p>
        </section>

        <section>
          <h2 className="border-l-4 border-ai pl-2 font-medium">
            第4条(共有のしくみ)
          </h2>
          <p className="mt-2">
            記録は作成した本人だけが見られる状態で保存されます。利用者が共有の操作を行った場合にのみ、共有先スペースの参加者全員が閲覧できます。特定の個人だけに宛てた非公開のメッセージ機能はありません。共有先での閲覧・スクリーンショット等、共有後の取り扱いについては共有した本人が判断してください。
          </p>
        </section>

        <section>
          <h2 className="border-l-4 border-ai pl-2 font-medium">
            第5条(禁止事項)
          </h2>
          <p className="mt-2">
            法令または公序良俗に違反する行為、他者の権利を侵害する行為、本サービスの運営を妨げる行為、不正アクセスを試みる行為を禁止します。違反があった場合、投稿の削除やアカウントの停止を行うことがあります。
          </p>
        </section>

        <section>
          <h2 className="border-l-4 border-ai pl-2 font-medium">
            第6条(精算機能)
          </h2>
          <p className="mt-2">
            立替精算機能は、金額の記録と計算のみを行います。送金・決済・資金の移動は一切行いません。実際のお金のやりとりは利用者間で行ってください。
          </p>
        </section>

        <section>
          <h2 className="border-l-4 border-ai pl-2 font-medium">
            第7条(免責)
          </h2>
          <p className="mt-2">
            本サービスは無料で提供され、現状有姿での提供となります。データの消失・サービスの中断等について、運営者は故意または重過失がある場合を除き責任を負いません。大切な記録は適宜お手元にも控えてください。
          </p>
        </section>

        <section>
          <h2 className="border-l-4 border-ai pl-2 font-medium">
            第8条(退会)
          </h2>
          <p className="mt-2">
            退会すると、あなたの記録・写真・共有はすべて削除され、共有先からも見えなくなります。削除されたデータは復元できません。
          </p>
        </section>

        <section>
          <h2 className="border-l-4 border-ai pl-2 font-medium">
            第9条(規約の変更)
          </h2>
          <p className="mt-2">
            本規約は必要に応じて変更されることがあります。重要な変更はアプリ内でお知らせします。
          </p>
        </section>
      </div>

      <p className="mt-6 text-sm">
        <Link href="/" className="text-ai underline underline-offset-4">
          もどる
        </Link>
      </p>
    </main>
  );
}
