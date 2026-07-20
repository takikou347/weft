# Server Actions 設計

画面からの書き込み(ミューテーション)はすべて Next.js Server Actions 経由。
各アクションは anon キー+ログインユーザーのJWTで Supabase を呼ぶため、**最終的な権限判定は常にRLS**。
アプリ側の検証は「入力の形」を整えるためのもの(二重防御)。

凡例: 〔状態返却〕= `useActionState` でフォームにエラー文言を返す / 〔redirect〕= 処理後の遷移先

## 認証(src/app/(auth)/actions.ts)

| アクション | 入力 | 検証(アプリ側) | 処理 | 失敗時 | 成功時 |
|---|---|---|---|---|---|
| signup | email, password, display_name | email/password必須、password 8文字以上 | auth.signUp(display_nameはuser_metadata)→DBトリガでprofiles/個人スペース/費目を自動作成 | 〔状態返却〕登録済み:「このメールアドレスはすでに登録されています。」/ その他:汎用文言 | redirect `/` |
| login | email, password, next | − | auth.signInWithPassword | 〔状態返却〕「メールアドレスまたはパスワードが違います。」 | redirect `next`(`/`始まりのみ許可、`//`拒否=オープンリダイレクト対策)or `/` |
| logout | − | − | auth.signOut | − | redirect `/login` |

## アイテム(src/app/(app)/items/actions.ts)

| アクション | 入力 | 検証 | 処理 | 失敗時 | 成功時 |
|---|---|---|---|---|---|
| createItem | type, occurred_on, title, body, type別項目, link_to | typeは4種(diary/event/expense/task)のみ / 日付は正規化(不正→今日) / expense以外: タイトルか本文必須 / expense: 金額は1以上の整数 | ①個人スペースid取得 ②items INSERT(origin=個人スペース=デフォルト非公開) ③link_toがあればlinks INSERT(F-03-4/F-09-3 自動リンク。a<b正規化) | 〔状態返却〕「タイトルか本文のどちらかを入力してください。」「金額は1円以上の整数で入れてください。」等 | redirect `/days/{occurred_on}` |
| updateItem | id + createItemと同じ | 同上 | items UPDATE(RLS=作成者のみ。他人は0件更新) | 〔状態返却〕 | redirect `/items/{id}` |
| deleteItem | id | − | items DELETE(RLS=作成者)。共有行・リンク・コメント等はFKカスケード | ログのみ | redirect `/` |
| createLink | from, to | from≠to | links INSERT(a<b正規化)。重複(23505)は無視 | ログのみ | redirect `/items/{from}` |
| deleteLink | from, to | − | links DELETE(RLS=リンク作成者) | ログのみ | redirect `/items/{from}` |

### payload組み立て(createItem/updateItem共通)

| type | フォーム項目 → payload |
|---|---|
| event | all_day(check)/ start_time / end_time / place / memo → 終日時は時刻を落とす |
| expense | kind(radio: expense/income)/ amount / category(datalist・自由入力可、空→「その他」) |
| task | status(select: todo/doing/done) |
| diary | paper(radio 4種・不正値→plain)/ stamp(radio なし+4種・8文字超は破棄)→ decoration |

## 写真(src/app/(app)/items/photo-actions.ts + photo-uploader.tsx)

| 段階 | 実装 | 内容 |
|---|---|---|
| ① クライアント圧縮 | photo-uploader.tsx | 上限10MB検査 → canvasで長辺1600pxに縮小・JPEG(品質0.82)。EXIFは消える |
| ② アップロード | ブラウザ→Storage | `photos/{uid}/{crypto.randomUUID()}.jpg`(Storage RLS=自分のフォルダのみ) |
| ③ registerPhotoItem | Server Action | パスが `{自分のuid}/`始まりか検証(`..`拒否)→ items(type=photo) INSERT → link_to(日記)へ自動リンク → revalidate |
| 失敗時 | | 「アップロードできませんでした。時間をおいてお試しください。」を表示、input をリセット |

## 家計(src/app/(app)/expenses/actions.ts)

| アクション | 検証 | 処理 | 備考 |
|---|---|---|---|
| addCategory | name 1〜20文字 | 末尾position+1で INSERT。重複(23505)は無視 | RLS=本人 |
| removeCategory | − | DELETE。**記録済み収支のカテゴリ名は文字列保持のため影響なし** | 画面にもその旨を明記 |

## スペース・共有(src/app/(app)/spaces/actions.ts)

| アクション | 入力 | 検証 | 処理 | 失敗時 | 成功時 |
|---|---|---|---|---|---|
| createGroup | name, type(group/organization) | 名前1〜50文字 | RPC create_group / create_organization(definerでスペース+owner登録を原子的に) | 〔状態返却〕 | redirect `/spaces/{id}` |
| updateSpaceSettings | space_id, name, color | 名前1〜50 / 色は#RRGGBB | spaces UPDATE(RLS=owner/admin) | 〔状態返却〕「変えられませんでした。権限をお確かめください。」 | redirect 設定画面 |
| createInvitation | space_id | − | invitations INSERT(token/期限7日はDB既定) | ログのみ | redirect メンバー画面 |
| deleteInvitation | id | − | invitations DELETE(RLS=owner/admin) | ログのみ | 同上 |
| acceptInvitation | token | − | RPC accept_invitation(期限内検証+member登録。冪等) | redirect `/invite/{token}?error=1` | redirect `/spaces/{id}` |
| leaveSpace | space_id | − | space_members DELETE(自分の行。RLS=owner不可) | ログのみ | redirect `/spaces` |
| removeMember | space_id, user_id | − | space_members DELETE(RLS=owner/adminがowner以外を) | ログのみ | redirect メンバー画面 |
| shareItem | item_id, space_id | − | item_shares INSERT(**行追加のみ**=不変条件2。重複は無視)→共有先全員へ通知トリガ | ログのみ | redirect `/items/{item_id}` |
| unshareItem | item_id, space_id | − | item_shares DELETE(RLS=作成者)。元データは残る | ログのみ | 同上 |
| addComment | item_id, space_id, body | body 1〜2000字 | comments INSERT(RLS=メンバー+共有中アイテム)→作成者へ通知 | ログのみ | redirect 共有アイテム画面 |
| deleteComment | id | − | comments DELETE(RLS=本人) | ログのみ | 同上 |
| toggleReaction | item_id, space_id, emoji | emoji 8文字以下 | 既存あり→DELETE / なし→INSERT(トグル) | ログのみ | 同上 |

## 組織・プロジェクト(src/app/(app)/spaces/[id]/org-actions.ts)

| アクション | 検証 | 処理 | 権限(RLS/RPC内) |
|---|---|---|---|
| createProject | 名前1〜50 | RPC create_project → projects_meta 同時作成 | 組織のowner/admin |
| addProjectMember | − | RPC add_project_member(冪等) | プロジェクトowner/admin、対象は親組織メンバーのみ |
| createProjectTask | タイトル1〜100、期限正規化 | items INSERT(origin=project, payload.status=todo, assignee任意)→**同時にitem_shares INSERT**(作成=共有) | プロジェクトメンバー |
| changeTaskStatus | − | RPC update_task_status | 作成者+担当者のみ(statusのみ変更可) |
| createProjectDoc | タイトル1〜100+本文必須 | items(type=document) INSERT+共有 | プロジェクトメンバー |
| updateProjectMeta | statusは3値、予算は0以上整数 | projects_meta UPDATE | owner/admin(§7) |
| addBudget | 費目1〜20、金額0以上整数 | budgets INSERT(重複は無視) | owner/admin |
| removeBudget | − | budgets DELETE | owner/admin |

## 立替精算(src/app/(app)/spaces/[id]/settlements/actions.ts)

| アクション | 検証 | 処理 |
|---|---|---|
| addSettlement | タイトル1〜100 / 金額1以上整数 / 対象1名以上 / **支払者・対象全員がスペースメンバーであることをアプリ側でも確認** | settlements INSERT → スペース全員へ通知トリガ。失敗は `?error=1` で文言表示 |
| toggleSettlementStatus | next は open/settled のみ | UPDATE(RLS=記録者or支払者) |
| deleteSettlement | − | DELETE(RLS=記録者or支払者) |

## 通知・アカウント

| アクション | 処理 | 備考 |
|---|---|---|
| markAllRead | notifications UPDATE(read_at=now, 未読のみ) | RLS=本人 |
| updateProfile | 表示名1〜30文字 → profiles UPDATE | 成功時は「保存しました。」を表示(遷移なし) |
| deleteAccount | 確認語「退会」一致必須 → ①Storageの自分のフォルダ削除 ②**service_role**で auth.admin.deleteUser(FKカスケードで全行削除) ③signOut | service_roleはこのアクション専用(server-only)。失敗時〔状態返却〕 |
