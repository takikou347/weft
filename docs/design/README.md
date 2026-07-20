# Weft 詳細設計書

実装(第1弾 P1〜P6)に対する詳細設計書。仕様の原本は [要件定義書](../requirements.md)、
設計判断の経緯は [decisions.md](../decisions.md) を参照。

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

- デモデータの人物: つむぎ(主人公・各スペースの世話役)/ こはる(山歩きの会のなかま)/ まつり(登録直後の新規ユーザー)

## 用語(マイクロコピー対応表)

| 画面上のことば | 意味 |
|---|---|
| 帳面 | 自分のアイテム一覧(ホーム) |
| 記す / 書き直す / 破り捨てる | 作成 / 編集 / 削除 |
| 差し出す / 取り下げる | 共有 / 共有解除 |
| つどい / つとめ先 / しごと | group / organization / project |
| 世話役 / 副世話役 / なかま | owner / admin / member |
| 回覧板 | 共有フィード |
| つとめ | タスク |
| おぼえ | ナレッジ(document) |
| 便り | アプリ内通知 |
| とじる | ログアウト(ヘッダー)/ 退会(アカウント画面) |
