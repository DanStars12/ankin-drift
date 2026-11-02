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

## GitHub Actionsから自動収集

GitHub → Actions → **ANKIN BALANCE LAB (manual)** → **Run workflow** を選び、シード数（1〜20）と計測秒数（1〜60秒）を指定します。PC、スマホ390px、320pxの3環境で同じ検証を自動実行し、完了後はワークフローの **Artifacts** からJSON/CSVを取得できます。毎回PRの必須検証でも1シード分を自動収集します。GitHub Actionsの実行枠を消費するため、定期実行は今のところ設定していません。

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

## v13.30 — 実戦自動操作AIと生存率

実戦シナリオは v13.29 の静止ボス・固定配置DPSとは**別の測定**です。Playwrightが開発専用ハーネス `scripts/balance-ai-harness.mjs` を一時注入し、全5機体に操作方針を割り当てます。通常公開版にはAIやデバッグボタンを表示しません。

```powershell
npm.cmd run balance:ai -- --project=desktop
$env:ANKIN_AI_SEEDS = "5"
$env:ANKIN_AI_SECONDS = "30"
npm.cmd run balance:ai -- --project=desktop
Remove-Item Env:ANKIN_AI_SEEDS
Remove-Item Env:ANKIN_AI_SECONDS
```

- `live-pack`: 実際に移動し、追撃・突進・予測射撃をする通常敵を6体単位で追加。10分相当の敵ステータスで実戦攻撃と衝突判定を有効にします。
- `live-boss`: 10分相当のHP・攻撃力を持つ中ボスが、通常弾幕とv13.28大技を使用。AIが予告・実弾を考慮して移動・ダッシュ・NOVAを使用します。撃破した瞬間に計測を停止し、**戦闘中DPS・撃破までの秒数**を取得します。この勝率は中ボス撃破率であり、30分クリア率ではありません。
- 追加確認: 同じAIで0分・10分・20分相当の敵を使って、敵攻撃に対する生存状況を比較します。
- すべての敵のダメージ、弾速、被弾、HP・シールド、武器の実際の処理を有効にしています。ダメージ無効化による偽の生存率は計測しません。
- AIはショット＝射程維持、レーザー＝移動照射、チャージ＝停止蓄積／回避発射、ドリル＝接近・プラズマダッシュ、ドッグ＝射程管理。弾道の予測・範囲回避・壁際の回避を共通で使用します。

CSVには `alive`、`won`、`cleared`、`survivalSeconds`、HP、AI移動/ダッシュ数などを追加。集計は `survivalRate`（模擬戦での生存率）、`encounterWinRate`（模擬ボス戦撃破率）、`clearRate`（本当の30分シミュレーションのみ）を**混合しません**。未測定項目は 0% ではなく `null` として表示します。

### 本当の30分クリア率を測る場合

GitHub Actions → **ANKIN BALANCE LAB (manual)** → **Run workflow** で `mode: full-30m` を選びます。計算負荷が高いため**desktopのみ**実行し、1回の実行で5機体をそれぞれ約30分（ゲーム内時間）進行させます。

このモードでは実際の敵出現・レベルアップ・カード抽選・ボス戦・最終ボスを動かし、AIが報酬カードを自動選択します。選択AIは当面、最初の有効なカードを採る基礎モデルで、属性融合の選択は自動化していません。結果は **「このAI/選択ポリシーのクリア率」** であって、人間プレイヤーのクリア率や各機体の普遍的な勝率ではありません。

初回は各機体1シードでの**動作確認が必須**です。1シードの0/100%だけでバランス調整を行わず、十分な反復数・複数のビルド・操作AIの妥当性を確認した後に判断します。未対応の選択画面に到達した場合は `stopReason: unhandled-menu` を返し、クリア率母数に混ぜる前に修正が必要です。

ローカルの長時間テスト用コマンド：

```powershell
$env:ANKIN_BALANCE_FULL = "1"
npm.cmd run balance:ai -- --project=desktop --grep="optional true 30-minute"
Remove-Item Env:ANKIN_BALANCE_FULL
```

短時間模擬戦では `game.autoBank` と比較用の代表的強化を使用し、30分シミュレーションでは通常のレベルアップ報酬処理に戻します。実績・セーブを守るため計測は独立したPlaywrightブラウザで行い、アーカイブ書込関数を試行中だけ無効化して終了後に復元します。ローカルストレージが変化していないこともテストで検証します。

次の調整は平均値だけでなく、P10/中央値/P90、実際の被ダメ、撃破傾向、レベル・スキル獲得率の差を見て慎重に行います。機体の火力数値を自動変更する機能はありません。

## バランス変更前に必要な次の段階

v13.30では機体別AIと実戦テストを追加しました。次期段階では報酬選択AI、融合AI、長時間ランの再現性と勝率推計の精度を向上させた上で、バランス数値の調整を検討します。

**機体バランスを自動で書き換えたり、自動マージしたりはしません。** 測定値は意思決定の根拠であり、バランスそのものの変更はレビュー・再テスト後に行います。
