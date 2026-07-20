# 画面遷移図

## 全体

```mermaid
graph TD
  subgraph 公開["公開(未ログイン可)"]
    LOGIN["/login ログイン"]
    SIGNUP["/signup 新規登録"]
    TERMS["/terms 利用規約"]
    PRIVACY["/privacy プライバシー"]
  end

  subgraph 個人["要ログイン(個人)"]
    HOME["/ ホーム"]
    CAL["/calendar カレンダー(月/週/一覧)"]
    DAY["/days/:date その日ページ"]
    NEW["/items/new 作成(4種別)"]
    DETAIL["/items/:id アイテム詳細"]
    EDIT["/items/:id/edit 編集"]
    EXP["/expenses 家計"]
    NOTIF["/notifications 通知"]
    ACCT["/account あなたのこと"]
  end

  subgraph 共有["要ログイン(スペース)"]
    SPACES["/spaces スペース"]
    SPNEW["/spaces/new 新しいスペース"]
    FEED["/spaces/:id フィード"]
    SITEM["/spaces/:id/items/:itemId 共有アイテム"]
    SCAL["/spaces/:id/calendar カレンダー"]
    ALBUM["/spaces/:id/album アルバム(group)"]
    SETTLE["/spaces/:id/settlements 精算(group)"]
    PROJ["/spaces/:id/projects プロジェクト(organization)"]
    TASKS["/spaces/:id/tasks タスク(project)"]
    BUDGET["/spaces/:id/budget 予実(project)"]
    DOCS["/spaces/:id/docs 文書(project)"]
    MEMBERS["/spaces/:id/members メンバー"]
    SETTINGS["/spaces/:id/settings 設定"]
    INVITE["/invite/:token 招待"]
  end

  LOGIN <--> SIGNUP
  SIGNUP -. 同意文言 .-> TERMS & PRIVACY
  LOGIN -->|ログイン(成功)| HOME
  SIGNUP -->|新規登録(成功)| HOME

  HOME --> DETAIL
  HOME -->|記録する| NEW
  CAL -->|日付タップ| DAY
  CAL -->|一覧の行| DETAIL
  DAY -->|4つの作成導線| NEW
  DAY --> DETAIL
  NEW -->|保存| DAY
  DETAIL --> EDIT
  DETAIL -->|この日のページへ| DAY
  DETAIL -->|派生導線(予定のみ)| NEW
  DETAIL -->|結びついた記録| DETAIL
  EDIT -->|保存| DETAIL
  EXP -->|明細をみる| CAL
  EXP -->|つける| NEW
  NOTIF -->|通知の行| SITEM & DETAIL & SETTLE

  SPACES --> SPNEW & FEED
  FEED --> SITEM
  SCAL --> SITEM
  ALBUM --> SITEM
  DOCS --> SITEM
  TASKS --> SITEM
  PROJ -->|プロジェクトの行| FEED
  INVITE -->|参加する| FEED
  MEMBERS -. 招待リンク共有(アプリ外) .-> INVITE
```

## アクセス制御

| 区分 | 判定箇所 | 挙動 |
|---|---|---|
| 未ログイン→非公開パス | middleware | `/login?next=元パス` へ302。ログイン成功後 `next` へ戻る(自サイトのパスのみ許可) |
| ログイン済→ /login /signup | middleware | `/` へ302 |
| 権限のないスペース/アイテム | RLS(0件)→ページ | 404(存在自体を隠す) |
| 静的ページ /terms /privacy | 公開 | 誰でも閲覧可 |

## ヘッダーからの遷移(全アプリ内画面共通)

| 要素 | 遷移先 | 備考 |
|---|---|---|
| ロゴ「Weft」 | / | |
| 通知(未読ドット付き) | /notifications | 未読>0で藍色ドット表示 |
| 表示名「◯◯ さん」 | /account | |
| ログアウト | /login | Server Action logout(セッション破棄) |
| カレンダー / ホーム / 家計 / スペース | /calendar / / /expenses /spaces | |
