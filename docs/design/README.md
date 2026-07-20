# Weft 詳細設計書

実装(第1弾 P1〜P6)に対する詳細設計書。仕様の原本は [要件定義書](../requirements/requirements.md)、
設計判断の経緯は [decisions.md](../development/decisions.md) を参照。

## 目次

| 文書 | 内容 |
|---|---|
| [アーキテクチャ設計](./architecture.md) | 構成図・技術スタック・ディレクトリ構成・認証フロー |
| [データベース設計](./database.md) | ER図・テーブル定義・RLSポリシー一覧・DB関数 |
| [API設計(OpenAPI)](./api/openapi.yaml) | Supabase REST/RPC/Auth/Storage の利用API仕様(Swagger) |
| [API設計(Swagger UI)](./api/swagger.html) | ↑をブラウザで閲覧するためのHTML(ローカルで開く) |
| [Server Actions設計](./server-actions.md) | 画面からの全ミューテーション処理の入出力・検証・エラー |
| [画面遷移図](./screen-flow.md) | 全画面の遷移とアクセス制御 |
| [画面設計書](./screens/README.md) | 全画面の項目定義・表示条件・ボタン処理・パターン別スクリーンショット |
| [テスト設計書](./test-design.md) | テスト方針・観点・実装済みテストケース一覧 |

## 読み方

- 画面設計書のスクリーンショットは **モバイル(375px幅)** で撮影した実装の実画面
- 撮影は `scripts/design/` のモックSupabase+Playwrightで再現可能:

```bash
node scripts/design/mock-supabase.mjs &                       # モックAPI (:54321)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
NEXT_PUBLIC_SUPABASE_ANON_KEY=demo npm run build && npm start &  # アプリ (:3000)
node scripts/design/capture-screens.mjs                       # 全画面撮影
```

- デモデータの人物: つむぎ(主人公・各スペースのオーナー)/ こはる(山歩きの会のメンバー)/ まつり(登録直後の新規ユーザー)

## 用語(UI文言対応表)

| 画面上のことば | 意味 |
|---|---|
| ホーム | 自分のアイテム一覧 |
| 保存する / 編集する / 削除する | 作成・更新 / 編集 / 削除 |
| 共有する / 共有を解除する | 共有 / 共有解除 |
| グループ / 組織 / プロジェクト | group / organization / project |
| オーナー / 管理者 / メンバー | owner / admin / member |
| フィード | 共有フィード |
| タスク | task |
| 文書 | ナレッジ(document) |
| 通知 | アプリ内通知 |
| ログアウト / 退会 | セッション破棄(ヘッダー)/ アカウント削除(アカウント画面) |
