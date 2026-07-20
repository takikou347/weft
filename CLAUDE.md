# CLAUDE.md

**Weft** — 個人の「予定・記録・お金」を一元管理し、選んだものだけをグループ・組織に共有するWebアプリ。
仕様の原本は `docs/requirements/requirements.md`、ドキュメント案内は `docs/README.md`。

## 不変条件(いかなる実装判断でも破らない)

1. **デフォルト非公開**: すべてのアイテムは作成者本人にしか見えない状態で生まれる
2. **共有は参照付与**: 共有=`item_shares`への行追加のみ。複製・移動しない。解除で相手から見えなくなる
3. **オープン型のみ**: 共有はスペース全員に等しく可視。特定個人向けの表示・非公開返信は作らない
4. **チャット・DM・1対1メッセージは実装しない**(電気通信事業法対応の恒久方針)
5. **RLSルールは一本**: 「自分が作成者」または「共有先スペースのメンバー」のみ閲覧可。クライアント側の出し分けで代替しない
6. 反する要望が来たら実装せず、Issueに記録して人間の判断を仰ぐ

## スタックとコマンド

- Next.js(App Router)+ TypeScript + Tailwind + shadcn/ui / Supabase(Auth・Postgres・RLS・Storage)/ Vercel
- `npm run dev` / `npm run typecheck` / `npm run lint` / `npm run test` / `npm run test:e2e`(要ローカルSupabase)
- **完了報告の前に typecheck・lint・test を必ず実行し、結果を添える**

## 分野別ルール(該当分野を触るときは必ず読む)

- RLS・マイグレーション・Server Actions → `.claude/rules/rls.md`
- 画面・文言・レイアウト → `.claude/rules/ui.md`
- テスト(E2EはUI文言セレクタ依存) → `.claude/rules/testing.md`

## 開発プロセス(詳細: docs/development/workflow.md)

- GitHub Flow: mainへの直pushはしない。トピックブランチ → PR → CI green → merge
  (mainへの直push・force pushは `.claude/hooks/guard-git.sh` が遮断)
- コミットはConventional Commits。RLS変更はコミットメッセージとPR本文で必ず明示
- 要件にない仕様判断は、最小実装+Issue記録。フェーズ完了時は `docs/development/decisions.md` に追記

## デザイン原則

- 生成り・紙白 × 墨色 × 差し色は藍1色。shadcn/uiコンポーネント+globals.cssのテーマトークンを使う
- 文言は一般的で分かりやすい日本語(世界観ワード禁止)。モバイルファースト(375pxで崩れない)
- グラデーション・ガラス風・発光・絵文字の多用・過剰な影は禁止
