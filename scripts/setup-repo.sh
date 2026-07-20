#!/usr/bin/env bash
# リポジトリ初期設定スクリプト(初回のみ・要 admin 権限)
#
# GitHub の「リポジトリ設定」は API 経由でしか変えられないため、gh CLI で実行する:
#   1. デフォルトブランチを main にする
#   2. main の保護ルール(Ruleset)を作成する
#      - PR 経由でのみ変更可(直 push 禁止)
#      - force push・ブランチ削除の禁止
#      - CI(型チェック・lint・テスト / RLS分離テスト)の green を必須化
#      ※ 承認レビュー数は 0(運用開始までは自己マージ可: docs/development/workflow.md)。
#        一般公開後は GitHub の Settings > Rules で required_approving_review_count を 1 に上げる
#   3. (任意)役目を終えたブランチの削除
#
# 使い方:
#   gh auth login                # 未ログインの場合
#   ./scripts/setup-repo.sh      # 対象: takikou347/weft
set -euo pipefail

REPO="${1:-takikou347/weft}"

echo "== 1/3 デフォルトブランチを main に変更 =="
gh api -X PATCH "repos/$REPO" -f default_branch=main >/dev/null
echo "OK"

echo "== 2/3 main の保護ルール(Ruleset)を作成 =="
if gh api "repos/$REPO/rulesets" --jq '.[].name' | grep -qx "protect-main"; then
  echo "既に protect-main が存在するためスキップ"
else
  gh api -X POST "repos/$REPO/rulesets" --input - <<'JSON' >/dev/null
{
  "name": "protect-main",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": false,
        "required_status_checks": [
          { "context": "型チェック・lint・ユニットテスト" },
          { "context": "マイグレーション検証・RLS分離テスト(E2E)" }
        ]
      }
    }
  ]
}
JSON
  echo "OK"
fi

echo "== 3/3 役目を終えたブランチの削除(存在する場合) =="
for BR in "claude/weft-p1-foundation-636w41"; do
  if gh api "repos/$REPO/branches/$BR" >/dev/null 2>&1; then
    gh api -X DELETE "repos/$REPO/git/refs/heads/$BR" && echo "削除: $BR"
  else
    echo "なし: $BR"
  fi
done

echo "完了。GitHub の Settings > Rules で protect-main が有効なことを確認してください。"
