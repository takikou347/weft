# RLS・データアクセス規約

対象: `supabase/migrations/**`、`src/lib/supabase/**`、Server Actions(`src/app/**/actions.ts`)

- スキーマ・RLSポリシーの変更は必ず `supabase/migrations/` の SQL で行う。ダッシュボード手動変更は禁止
- RLSポリシーは一本のルールに揃える: 「自分が作成者」または「共有先スペースのメンバー」のみ閲覧可。
  これ以外の条件分岐を足す前に CLAUDE.md の不変条件を確認し、逸脱する場合は Issue に記録して止まる
- 共有は `item_shares` への行追加のみ。データの複製・移動で共有を実装しない
- **RLSに関わる変更は、RLS分離テスト(`e2e/rls-isolation.spec.ts` 等)の追加・更新とセット**。
  「他人の非共有データが見えないこと」を必ず検証する
- 新しいテーブルには `authenticated` ロールへの GRANT を明示する(過去に GRANT 漏れで CI E2E が落ちた)
- `service_role` キーはサーバープロセス限定。`NEXT_PUBLIC_` を付けない・クライアントコンポーネントから import しない
- Server Action は必ず認証チェック(セッション取得)と入力検証を先頭で行う。一覧取得はページネーション必須
