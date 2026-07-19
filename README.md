# Weft

個人の「予定・記録・お金」を一元管理し、選んだものだけをグループ・組織に共有できるWebアプリ。
コンセプトは「人生を経営する」。

- 仕様: [docs/requirements.md](docs/requirements.md)
- 開発ルール・不変条件: [CLAUDE.md](CLAUDE.md)
- 設計判断の記録: [docs/decisions.md](docs/decisions.md)

## 技術スタック

Next.js (App Router) + TypeScript + Tailwind CSS / Supabase (Auth・Postgres・RLS・Storage)

## 開発

```bash
npm install
cp .env.example .env.local   # ローカルSupabaseの値を設定

npx supabase start           # ローカルSupabase(要Docker)。マイグレーションが適用される
npm run dev                  # http://localhost:3000
```

### チェック・テスト

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint
npm run test        # Vitest(ユニット)
npm run test:e2e    # Playwright(RLS分離テスト。ローカルSupabase起動が前提)

# Dockerが使えない環境でのRLS検証(素のPostgreSQLで実行)
PGHOST=/path/to/socket PGUSER=postgres ./scripts/local-rls-check.sh
```

## 原則(抜粋)

- すべてのアイテムはデフォルト非公開。共有は `item_shares` への参照付与のみ
- アクセス制御はRLS一本(「自分が作成者」または「共有先スペースのメンバー」)
- スキーマ変更は必ず `supabase/migrations/` のSQLで管理
- チャット・DM・1対1メッセージは実装しない
