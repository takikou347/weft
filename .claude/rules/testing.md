# テスト規約

- 検証3点セット `npm run typecheck && npm run lint && npm run test` を、完了報告の前に必ず実行し、
  結果を報告に添える
- `src/lib/` のロジック(日付・集計・精算等)の変更にはユニットテスト(Vitest)を追加する
- 画面フローの変更には `e2e/` の Playwright テストを追随させる。
  **E2EはUI文言(getByRole / getByLabel / getByText)に依存しているため、文言変更はテスト同期が必須**
- RLS・共有まわりの変更には分離テスト(他人の非共有データが見えないこと)を必ず追加・更新する
  (`e2e/rls-isolation.spec.ts`)。RLS分離テストは merge 条件(CI)に含まれる
- E2E はローカル Supabase(`npx supabase start`、要 Docker)が前提。手元で動かせない場合は
  CI の結果で確認し、その旨を報告に書く
