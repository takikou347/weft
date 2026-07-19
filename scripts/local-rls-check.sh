#!/usr/bin/env bash
# ローカル素のPostgreSQLでマイグレーション適用+RLS分離チェックを実行する。
# Docker(ローカルSupabase)が使えない環境向けの検証手段。
# 使い方: PGHOST=/path/to/socket PGUSER=postgres ./scripts/local-rls-check.sh
set -euo pipefail

cd "$(dirname "$0")/.."

DB_NAME="${WEFT_CHECK_DB:-weft_rls_check}"

dropdb --if-exists "$DB_NAME"
createdb "$DB_NAME"

psql -v ON_ERROR_STOP=1 -d "$DB_NAME" -f scripts/db/supabase-shim.sql

for f in supabase/migrations/*.sql; do
  echo "applying $f"
  psql -v ON_ERROR_STOP=1 -d "$DB_NAME" -f "$f"
done

psql -v ON_ERROR_STOP=1 -d "$DB_NAME" -f scripts/db/rls-check.sql

dropdb "$DB_NAME"
echo "OK: マイグレーション適用と RLS 分離チェックに成功"
