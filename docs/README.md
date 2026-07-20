# ドキュメント案内

Weft のドキュメントの入口。目的別に読む場所を示す。

## 構成

| ディレクトリ / 文書 | 内容 | 対象 |
| --- | --- | --- |
| [requirements/requirements.md](requirements/requirements.md) | 要件定義書(機能要件 F-◯◯・非機能要件・フェーズ計画)。**仕様の原本** | 全員 |
| [design/](design/README.md) | 詳細設計書(アーキテクチャ・DB/RLS・API・Server Actions・画面設計・テスト設計) | コードを読み書きする人 |
| [development/workflow.md](development/workflow.md) | 開発ルール(ブランチ運用・レビュー体制・コミット規約・CI) | 開発に参加する人 |
| [development/decisions.md](development/decisions.md) | 設計判断の記録(フェーズごとの経緯と理由) | 経緯を知りたい人 |

## 目的別の参照先

- **仕様を確認する** → [requirements/requirements.md](requirements/requirements.md)。
  コミットメッセージや設計書から参照される項番(F-◯◯・§◯◯)の正はここ
- **データベース・RLS を変更する** → [design/database.md](design/database.md) と
  `supabase/migrations/`。RLS の不変条件は [../CLAUDE.md](../CLAUDE.md) を必ず確認
- **画面を変更する** → [design/screens/](design/screens/README.md)(画面ごとの項目定義とスクリーンショット)
- **開発フロー / Git 運用を知る** → [development/workflow.md](development/workflow.md)
- **過去の設計判断の理由を知る** → [development/decisions.md](development/decisions.md)

## ドキュメントの保守

- コードと矛盾したドキュメントは負債になる。仕様(スキーマ・RLS・画面仕様)を変更する PR では、
  対応するドキュメントを同じ PR で更新する
- 要件にない仕様判断は勝手に膨らませず、最小実装 + Issue 記録で進める(CLAUDE.md)
- フェーズ完了時は [development/decisions.md](development/decisions.md) に設計判断を追記する
