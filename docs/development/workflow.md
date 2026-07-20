# 開発ルール(ブランチ運用・レビュー体制)

Weft の開発フローの取り決め。GitHub Flow をベースにする。
仕様の原本は [要件定義書](../requirements/requirements.md)、不変条件は [CLAUDE.md](../../CLAUDE.md)。

## ブランチ運用(GitHub Flow ベース)

- **main = 常にデプロイ可能な唯一の長命ブランチ**。Vercel の本番デプロイは main に追随する
- 変更は必ず**トピックブランチ → Pull Request → merge** で main に入れる。main への直 push はしない
- ブランチは**最新の main から**切り、命名は `<type>/<説明>` とする
  - `type` は Conventional Commits と同じ語彙: `feat` / `fix` / `docs` / `refactor` / `test` / `chore` / `ci` など
  - 例: `feat/expense-monthly-summary`、`fix/rls-share-visibility`
  - Issue に紐づく場合は `<type>/issue-<番号>-<説明>`(例: `fix/issue-12-invite-expiry`)
  - AI(Claude Code)セッションが作るブランチは `claude/**` のままでよい
- **1 Issue = 1 ブランチ = 1 PR** を原則とし、ブランチは短命に保つ(長くても数日で merge する)
- merge 後のブランチは削除する

## コミット規約

- **Conventional Commits** 形式: `<type>: <要約>`(例: `feat: 月次の費目別集計を追加`)
- 対応する要件があればコミットメッセージに項番(`F-◯◯` 等)を書く
- 1 コミット = 1 論理変更。無関係な変更を混ぜない
- **RLS ポリシーを変更したときは、コミットメッセージと PR 本文で必ず明示する**(CLAUDE.md)

## Pull Request とレビュー体制

- PR は `.github/pull_request_template.md` に沿って書く(変更内容・対応項番・RLS 変更の有無・確認方法)
- Issue に紐づく PR は本文に `Closes #<番号>` を書く
- **merge の条件**(すべて満たすこと):
  1. CI が green(型チェック・lint・ユニットテスト・RLS 分離テスト)
  2. RLS に関わる変更は、分離テスト(他人の非共有データが見えないこと)の追加・更新を含む
  3. (自動レビューを有効化した後は)`[must]` 指摘がゼロであること
- **merge の担当**:
  - **運用開始(一般公開)まで**: 上記条件を満たせば作成者(AI セッション含む)が自分で merge してよい
  - **一般公開後**: 人間のレビュー承認(Approve)を必須にする。GitHub のブランチ保護で
    required review / required status checks を設定して切り替える
- レビュー指摘の分類は `[must]`(修正必須)/ `[nits]`(任意)。`[must]` を解消せずに merge しない
- push はまとめて行う(push のたびに CI が走るため、コミットごとに push しない)

## CI と自動化(.github/workflows/)

| ワークフロー | トリガー | 内容 |
| --- | --- | --- |
| `ci.yml` | push(main / claude/\*\*)・PR | 型チェック・lint・ユニットテスト、ローカル Supabase でのマイグレーション検証と RLS 分離テスト(E2E) |
| `claude-review.yml` | CI 成功時(workflow_run) | PR 差分の自動コードレビュー。結果を PR コメントに投稿(**現在は未稼働**) |
| `claude-autofix-ci.yml` | CI 失敗時(workflow_run) | AI 運用ブランチの PR で CI が落ちたら原因を診断して修正 push(同一 PR 2 回まで。超えたら人間へ引き継ぎ)(**現在は未稼働**) |
| `claude.yml` | Issue / PR コメント | `@claude` メンションで調査・回答・実装を依頼できる入口(**現在は未稼働**) |
| `supabase-keepalive.yml` | 定期 | Supabase 無料プランの一時停止防止 |

- **Claude 系ワークフロー(自動レビュー等)は当面使わない方針**。リポジトリ Secrets の
  `CLAUDE_CODE_OAUTH_TOKEN` が未設定の間は自動でスキップされ、何も実行されない(CI は影響を受けない)。
  導入を決めたら Secrets を登録するだけで有効化される
- 自動レビューの観点は `.claude/agents/code-reviewer.md` に定義済み(RLS・共有モデルの不変条件を最優先)。
  Claude Code セッションでのセルフレビューにもこの観点を使う

## リポジトリ設定(初回のみ)

- デフォルトブランチは **main**。main には保護ルール(Ruleset `protect-main`)を設定する:
  PR 経由でのみ変更可(直 push 禁止)・force push / ブランチ削除の禁止・CI green の必須化
- 設定は `./scripts/setup-repo.sh` で行う(gh CLI・admin 権限が必要)。
  役目を終えた古いブランチの削除も同スクリプトが行う
- 承認レビュー数は運用開始までは 0(自己マージ可)。一般公開のタイミングで
  Settings > Rules から `required_approving_review_count` を 1 に上げて人間の承認を必須化する
- merge 済みのトピックブランチは削除する(Settings > General の
  「Automatically delete head branches」を有効にすると自動化できる)

## Issue 運用

- バグ報告・機能要望は `.github/ISSUE_TEMPLATE/` のフォームから起票する(自由記述も可)
- 要件定義書にない仕様判断が必要になったら、実装せず Issue に記録して人間の判断を仰ぐ(CLAUDE.md 不変条件 6)
- 完了条件(受け入れ条件)まで書くと、そのまま実装依頼(`@claude` メンション)に使える

## リリース・デプロイ

- main への merge = 本番反映(Vercel)。だからこそ main に入れる前に CI とレビューで守る
- スキーマ変更は必ず `supabase/migrations/` の SQL で行い、ダッシュボードからの手動変更はしない
- 秘密情報(`service_role` キー等)はリポジトリ・クライアントに置かない。`.env.local` のみ

## ドキュメント同期

- 仕様(スキーマ・RLS・画面仕様)を変更する PR では、`docs/` の該当文書を同じ PR で更新する
- フェーズ完了時に [decisions.md](decisions.md) へ設計判断を追記する
