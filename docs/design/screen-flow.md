# 画面遷移図

## 全体

```mermaid
graph TD
  subgraph 公開["公開(未ログイン可)"]
    LOGIN["/login ひらく"]
    SIGNUP["/signup 帳面をつくる"]
    TERMS["/terms 利用規約"]
    PRIVACY["/privacy プライバシー"]
  end

  subgraph 個人["要ログイン(個人)"]
    HOME["/ 帳面"]
    CAL["/calendar こよみ(月/週/一覧)"]
    DAY["/days/:date その日ページ"]
    NEW["/items/new 記す(4種別)"]
    DETAIL["/items/:id アイテム詳細"]
    EDIT["/items/:id/edit 書き直す"]
    EXP["/expenses 家計"]
    NOTIF["/notifications 便り"]
    ACCT["/account あなたのこと"]
  end

  subgraph 共有["要ログイン(スペース)"]
    SPACES["/spaces つながり"]
    SPNEW["/spaces/new あたらしいつながり"]
    FEED["/spaces/:id 回覧板"]
    SITEM["/spaces/:id/items/:itemId 共有アイテム"]
    SCAL["/spaces/:id/calendar こよみ"]
    ALBUM["/spaces/:id/album アルバム(group)"]
    SETTLE["/spaces/:id/settlements 精算(group)"]
    PROJ["/spaces/:id/projects しごと(organization)"]
    TASKS["/spaces/:id/tasks つとめ(project)"]
    BUDGET["/spaces/:id/budget 予実(project)"]
    DOCS["/spaces/:id/docs おぼえ(project)"]
    MEMBERS["/spaces/:id/members なかま"]
    SETTINGS["/spaces/:id/settings 設定"]
    INVITE["/invite/:token 招待状"]
  end

  LOGIN <--> SIGNUP
  SIGNUP -. 同意文言 .-> TERMS & PRIVACY
  LOGIN -->|ひらく(成功)| HOME
  SIGNUP -->|つくる(成功)| HOME

  HOME --> DETAIL
  HOME -->|記す| NEW
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
  NOTIF -->|便りの行| SITEM & DETAIL & SETTLE

  SPACES --> SPNEW & FEED
  FEED --> SITEM
  SCAL --> SITEM
  ALBUM --> SITEM
  DOCS --> SITEM
  TASKS --> SITEM
  PROJ -->|しごとの行| FEED
  INVITE -->|なかまに入る| FEED
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
| 便り(未読ドット付き) | /notifications | 未読>0で藍色ドット表示 |
| 表示名「◯◯ さん」 | /account | |
| とじる | /login | Server Action logout(セッション破棄) |
| こよみ / 帳面 / 家計 / つながり | /calendar / / /expenses /spaces | |
