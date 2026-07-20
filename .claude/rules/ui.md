# UI・文言規約

対象: `src/app/**`(画面)、`src/components/**`

## コンポーネント

- フォーム要素・ボタン・カードは `src/components/ui/` の shadcn/ui コンポーネントを使う
  (Button / Input / Textarea / Label / Card / Badge / NativeSelect)。生の `<input>` `<button>` を新設しない
  (checkbox / radio / hidden は生のままでよい)
- 色は globals.css のテーマトークン(`bg-background` `text-foreground` `bg-primary` `border-border`
  `text-muted-foreground` 等)を使う。hex 直書き・新しい色の追加はしない(差し色は藍の1色のみ)
- 角丸は控えめ(`rounded-md` 基調)。グラデーション・グラスモーフィズム・発光・過剰な影は禁止(CLAUDE.md)

## 文言

- **一般的で分かりやすい日本語**を使う: ログイン / 新規登録 / 保存する / 共有する / 削除する /
  メンバー / 通知 / カレンダー / ホーム / フィード / グループ / 組織 / プロジェクト / タスク / ステータス
- 世界観ワード・独特な言い回しは禁止(例: 帳面・差し出す・つどい・なかま・回覧板・しるし・記す・ひらく/とじる)
- 任意項目は「(任意)」と表記する。ボタンは動詞で終える(「保存する」「共有する」)
- **UI文言を変更したら、同じ文言をセレクタに使っている `e2e/` のテストを必ず同時に更新する**

## レイアウト

- モバイルファースト。375px 幅で崩れないことを必ず確認する
- 余白を贅沢に使い、1画面の情報量を絞る
