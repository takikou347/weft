#!/usr/bin/env bash
# PreToolUse(Bash)フック: Git運用ルール(docs/development/workflow.md)を決定論的に守らせる。
# - main への直 push の禁止(変更は必ずトピックブランチ → PR → merge)
# - force push の禁止(--force-with-lease のみ許可)
# - main ブランチの削除・強制移動の禁止
# 終了コード 2 = ツール実行をブロックし、stderr のメッセージを Claude に返す
set -uo pipefail

# stdin の JSON からコマンド文字列を取り出す(ヒアドキュメントに stdin を奪わせない)
INPUT=$(cat || true)
export HOOK_INPUT="$INPUT"

python3 <<'PY'
import json, os, re, sys

try:
    data = json.loads(os.environ.get("HOOK_INPUT", "") or "{}")
except Exception:
    sys.exit(0)

cmd = (data.get("tool_input") or {}).get("command", "")
if not cmd:
    sys.exit(0)

def deny(msg: str):
    print(msg, file=sys.stderr)
    sys.exit(2)

if re.search(r"\bgit\b[^|;&\n]*\bpush\b", cmd):
    # force push(--force-with-lease は許可)
    stripped = cmd.replace("--force-with-lease", "")
    if re.search(r"(\s|^)--force(\s|$)", stripped) or re.search(r"(\s|^)-f(\s|$)", stripped):
        deny("force push は禁止です(--force-with-lease のみ可)。docs/development/workflow.md を参照。")
    # main への push・削除(refspec に main が含まれるもの)
    if re.search(r"(\s|:)(refs/heads/)?main(\s|:|$)", cmd):
        deny("main への直 push・削除は禁止です。トピックブランチから PR を作成して merge してください(docs/development/workflow.md)。")

# main ブランチのローカル削除・強制移動
if re.search(r"\bgit\b[^|;&\n]*\bbranch\b[^|;&\n]*(\s-D|\s-d|\s-f|\s-M)[^|;&\n]*\bmain\b", cmd):
    deny("main ブランチの削除・強制移動は禁止です。")

sys.exit(0)
PY
exit $?
