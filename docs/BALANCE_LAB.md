# ANKIN BALANCE LAB v13.29

開発者向け自動戦闘計測基盤です。通常公開版にデバッグメニューは追加せず、PlaywrightがHTML内へ**テスト専用のハーネスを一時的に注入**して実行します。計測フックは通常プレイで無効、計測ログはセーブデータに保存しません。

## 実行方法 (Windows PowerShell)

前提：Node.js 22+、`npm.cmd ci` と `npx.cmd playwright install chromium` を実行済み。

```powershell
npm.cmd run test:balance-report
npm.cmd run balance:lab -- --project=desktop
```

反復テスト（5機体×2ビルド×2シナリオ×指定シード数）：

```powershell
$env:ANKIN_BALANCE_SEEDS = "10"
$env:ANKIN_BALANCE_DURATION = "10"
npm.cmd run balance:lab -- --project=desktop
Remove-Item Env:ANKIN_BALANCE_SEEDS
Remove-Item Env:ANKIN_BALANCE_DURATION
```

`--project=mobile-390` または `--project=mobile-320` に切り替えて実行可能。

## 計測する内容

- `boss`：高HPの静止した大型単体ターゲット（攻撃を返さない）への10秒DPS。
- `pack`：12体の敵密度を維持する固定パターンの雑魚群テスト。倒した敵は補充するため、強力な機体でも敵の総HPによるダメージ上限に達しません。
- `base`：機体初期性能。`representative`：共通ステータス+機体主武器の代表的な強化を直接設定した比較用構成。
- 5機体：`shot`, `laser`, `charge`, `drill`, `dog`。
- ログ：ダメージ総量・DPS・攻撃源別内訳・ボス与ダメージ・撃破・被弾・被ダメージ・ダッシュ・NOVA・ビルド・1分バケット・ボスゲージイベント・反撃時間のダメージ。
- レポート：平均、P10、中央値、P90、撃破・被ダメ平均。

Playwrightは実際の `drive(1/60)`、敵・ショットの衝突・攻撃処理を呼びます。描画を意図的に省略した**固定ターゲット/固定配置の計測**であり、現時点では人間相当のAIプレイ、30分ランのクリア率、生存率を推測しません。複数回のシード測定は主にクリティカルなどの乱数差の分析です。

## 出力

`artifacts/balance-lab/<project>-<scenario>.json`：試行ごとの詳細および集計。

`artifacts/balance-lab/<project>-<scenario>.csv`：表計算ソフト向け試行一覧。

`artifacts/balance-lab/<project>-<scenario>-summary.csv`：機体ごとの比較集計。

成果物は Git 管理外です（`.gitignore`）。必要ならCIのテストログ内にも `BALANCE_LAB_SUMMARY=` として機体別の数値が表示されます。

## 固定乱数とデータ保護

毎回シード付き PRNG へ置き換え、同一条件を再生します。元の `Math.random` は**試行終了時に必ず復元**します。5機体は独立した `newRun()` で検証し、保存を行う `endRun()` や `recordVictory()` はテストシナリオで実行しません。Playwrightの独立したテストブラウザ、ローカルサーバー内でのみ走らせます。

テスト用コントロールは本番コードに含まれず、`window.__ankinBalanceLabTest` は通常公開版に存在しません。`balanceTelemetry` の計測処理は明示的に開始されない限り記録を作りません。個人のプレイデータを外部へ送信する仕組みもありません。

## バランス変更前に必要な次の段階

v13.30では、回避・移動・NOVA・ビルド選択を機体別に行う開発専用AI、30分試合の高速シミュレーション、敵集団の再出現と危険攻撃を含む実戦シナリオを検討します。その段階で初めてクリア率・被弾率なども公平に比較できます。

**機体バランスを自動で書き換えたり、自動マージしたりはしません。** 測定値は意思決定の根拠であり、バランスそのものの変更はレビュー・再テスト後に行います。
