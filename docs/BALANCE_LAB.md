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

## v13.31 — 5機体の30分AI評価と報酬選択方針

- 旧AIの先頭カード選択から、機体専用強化・完成可能シナジー/進化合成・防御/機動・既存属性との整合性を重視する決定的なスコア型の選択へ変更。
- 通常LvUPで融合可能なときは主属性の既存投資と副属性の消費量を比較して、所有する融合武装を自動選択・確定する。外部通信やセーブ変更はしない。
- 近接機体の移動・ダッシュ方向については、初期の実験的変更が短期生存・DPSを悪化させたため適用していない。
- 30分テストは明示 opt-in のまま。実際の継続戦闘と画面遷移を実行し、環境変数 ANKIN_AI_SEEDS の1〜20シード×5機体で複数試行できる。
- 全ての比較値はそのAI判断ルールでの結果。レベル/ビルド/乱数シードを揃えない長時間のDPS値を、人間プレイヤーの機体強弱の直接比較に用いない。
- 初回の数値変更は、複数シード・短期/長期・PC/スマホ・既存セーブ回帰を比較してから判断する。

## v13.33 — 個人アビリティを含む操作AI評価

v13.32までのAIは、NOVA準備完了時にボスが存在するだけで発動していました。
ショット型の範囲外ボスや、8方向拡散するDOG型で有効打にならないケースがありました。
また、ダッシュを停止中に使うと、前フレームの機体向きが残る問題がありました。

- **SHOT**: NOVAの効果半径内にボスがいるか、複数の雑魚が入るときに使用。
- **LASER**: 照射可能なボスへの3.2秒オーバードライブ、複数目標、危険な敵弾の消去を優先。
- **CHARGE**: 彗星弾が届くボス、敵集団、緊急敵弾除去を優先。
- **DRILL**: ボス接近・群れ・防御が必要な場面で無敵を伴うオーバードライブを使用。効果中の再発動は避け、プラズマを溜めて安全に接近できる時はダッシュ攻撃。
- **DOG**: BOW SHOCKの8方向弾が命中しやすい近距離ボス・包囲された集団を優先。
- **共通**: 弾道と危険域を先読みしてダッシュ先を8方向から選択し、キー入力を確定してから発動。すでに無敵なら緊急回避ダッシュは温存。

**戦闘数値、既存セーブ、実績は変更なし。** AIハーネスだけの改良であり、ゲーム本体のオートプレイ機能ではありません。

### 旧AIとの再現可能なA/B比較

GitHub Actions → ANKIN BALANCE LAB (manual) → Run workflow で
`mode: live-ai` または `mode: full-30m` と
`policy: tactical`（新）/ `policy: legacy`（旧）を選択します。
同じシード数、期間、機体、ビルドを両方で実行して比較します。

PowerShellで短期比較する例：

```powershell
$env:ANKIN_AI_SEEDS = "10"
$env:ANKIN_AI_SECONDS = "30"
$env:ANKIN_AI_POLICY = "legacy"
npm.cmd run balance:ai -- --project=desktop
$env:ANKIN_AI_POLICY = "tactical"
npm.cmd run balance:ai -- --project=desktop
Remove-Item Env:ANKIN_AI_SEEDS,Env:ANKIN_AI_SECONDS,Env:ANKIN_AI_POLICY
```

**注意**: 同じフォルダで再実行するとレポートを上書きするため、比較の前に旧結果のJSON/CSVを別名で保存してください。

追加レポート: `abilityPolicy`, `dashReadySeconds`, `novaReadySeconds`,
`dashReasons`, `novaReasons`。ダッシュ・NOVAの実発動数は従来の
`dashCount` / `novaCount` と突合してください。
これらは「AIの発動判断の内訳」であり、回避成功率やNOVAの純粋な与ダメージ増分を
直接示す指標ではありません。死亡時刻・被弾数・DPS・クリア率と合わせて判断します。

改良AIだけの成功率を比較し、公開版のショット型を即座に弱体化することや、
ほかの機体の基本火力を一律に上げることはしません。

### v13.33 再測定と調整（第2次）

先行3シード比較では `tactical` 初版のドリルDPSが激減し、ドリルのダッシュ回数が
旧AIの約650〜3,300回/ランから約170〜220回へ低下した。
早期回避を全機体へ一律適用した再調整はレーザー/ドリルの一部を改善する一方、
チャージ型の溜め撃ちを中断して悪化させた。したがって次の戦術に分離した。

- ショット・チャージ: 重大な被弾予兆/低HPを重視し、通常の接近予兆では無駄にダッシュしない。
- レーザー: 持続照射中も先読み回避し、距離245を維持して不用意に近寄らない。
- ドリル: 敵に接近しつつプラズマを蓄積。ダッシュを防御だけでなく攻撃として積極使用。
- ドッグ: 骨ブーメランの射程に合わせ距離230を維持。2体の密集または一定時間温存後のNOVA発動。
- すべての方針は開発用AIのみ。ゲーム本体の数値はまだ変更していない。

旧AI `legacy` と新AI `tactical` は同じシードで比較する。
同一シードでもAIが異なるため、報酬獲得や乱数消費、育成ビルドが異なり得る。
特に30分未満死亡ランの平均DPSは生存時間の差の影響を強く受けるため、
クリア率・生存時間・撃破数・同等ビルドの短期DPSを総合する。
短期テストの成功を30分クリア率に換算しない。

### v13.33 最終候補（5シードの比較を受けた限定調整）

先の5シード比較でショットは旧AI 4/5、初期戦術AI 2/5、
ドリルは旧AI 1/5、初期戦術AI 0/5だった。
両機体は安全のため実績のある旧ダッシュ/NOVA判断へ戻し、セーブにも影響しないようにした。
チャージ・レーザー・ドッグは改良判断を継続。改良AIのドッグは先行比較で0/5から2/5へ改善したが、
5シードでの結果なので普遍的な勝率は主張しない。

レーザー型は先行5シードでクリア0/5、ただし生存時間中央値は約704秒から1254秒へ改善。
序盤の耐久不足への限定的なバランス変更として、初期HP 94→106、
速度 235→245 に変更する。初期レーザー2本・基本攻撃力35・スキル上限と
他機体の数値は変更しない。再測定で有効性を確認する。

30分シミュレーションはゲーム内1800秒で最終ボスへ到達した後、
1860秒（+60秒）までに撃破できないと `time-limit` になる。
このため `time-limit` は死亡や撃破を意味せず、
実際のゲームの最終ボス撃破可能性と同一視しない。
クリア率だけではなく `stopReason`、`bossRemainingHp`、生存時間を必ず確認する。

出力サマリーに `dashUsesMean`, `novaUsesMean`,
`dashPerMinuteMean`, `novaPerMinuteMean` を追加。


## v13.33 追加監査 — マグマ位置とAIの育成判断

### マグマ位置修正

ラヴァ・コンストレイションで統合したマグマは、発生済みの中心座標が固定されていました。新しく発生した場所に統合マグマの中心を移し、重ね掛け数、DPS、半径、残存時間を保持します。通常の独立マグマ生成は変更しません。開発専用 Playwright 回帰テストで「統合マグマは1個のまま別座標へ移動する」「未融合は独立した2個が残る」を検査します。

### AI操作の観察項目

- `novaReasons` と `novaContexts`: NOVAの発動理由、発動時の近隣敵数、ボスまでの距離。 `damageBySource.nova` と組み合わせて実効性を比較します。発動数だけで「適切」と判定しません。
- `dashReasons`, `dashReadySeconds`: ダッシュの用途と待機時間。ダッシュを使う回数が多いほど良いとは限りません。
- `xpSeekSeconds`, `xpSeekKinds`: 何秒EXPや回収コアを追ったか。`pickedExp` / `pickedOrbs` は通常の磁石吸引を含む実取得、`vacuumExp` / `vacuumOrbs` は一括回収、`xpOnField` は試行終了時の未回収値です。追跡時間は回収成功を直接証明する値ではありません。
- `rewardAudit`: 選択したスキルID、主武器／生存／経験値分類、各カテゴリの提示回数。`weaponState` には試行終了時の基本攻撃・攻撃間隔・各機体の主武器強化・磁石・再生・シールドを記録します。分類はスキルタグ・機体専用条件に基づくため実際の主武器数値も必ず併読します。
- `fusionAudit`: 属性融合の機会、実行・見送り・失敗回数、主/副の投資量、融合後の結果。`elementFusions` と照合します。
- すべての追加メトリクスは開発テスト用です。通常公開ゲームにAIボタンや自動回収、外部送信機能は追加しません。

### 融合する場合／しない場合の対照実験

GitHub Actions → **ANKIN BALANCE LAB (manual)** → Run workflow → mode: `full-30m` を選択し、`fusion_policy` で比較します。**同じAI方針・5機体・シード**で比較してください。

| fusion_policy | 内容 |
|---|---|
| `always` | 従来どおり、融合可能なら融合を優先（基準条件） |
| `adaptive` | 主属性の投資が一定以上あり、副属性の損失が大きすぎないときのみ融合する候補 |
| `never` | 融合可能でも保留し、通常スキルを取得する非融合対照条件 |

融合の有無を比較するための独立変数であり、`never` で融合しないことは不具合ではありません。旧AIと新AIの操作判断を比較するときは融合方針を同一に揃えます。短時間テストだけではLv12/28の機会に必ず到達するわけではないため、融合作用の評価には30分ランを使用します。

EXP追跡は `tactical` 方針の **full-30m / preview** のみ有効で、`legacy` と短期固定遭遇テストは変更しません。危険な敵弾やボスが近い場合はEXPより回避・攻撃を優先します。結果の優劣が確定するまでは通常公開版の戦闘数値を変更しません。


## v13.33 — 15分CHALLENGEと30分NORMALを混同しないモード別AI評価

15分は単なる30分ランの途中結果ではありません。実ゲームには以下の独立した設定があります。

| 仕様 | NORMAL | CHALLENGE |
|---|---|---|
| 実際のゲームモード | `normal` | `challenge` |
| THE・END・OF・ANKIN出現 | 1800秒 | 900秒 |
| 次の通常ボス（初回60秒の次） | 150秒 | 135秒 |
| 以降の通常ボス間隔 | 150秒 | 90秒 |
| 通常敵の出現間隔係数 | ×1 | ×0.70 |
| 最終ボス基礎HP（PC） | 292,000 | 204,000 |
| DOGチック・タックのニワトリ進化 | 900秒 | 480秒 |
| 後半敵速度・防御圧力 | NORMALの実処理 | CHALLENGEの実処理 |

報酬抽選や属性融合を特別扱いせず、`newRun()` が各モードに設定した通常敵・ボス・経験値・報酬・抽選・レイド・真の最終ボス進行を使用します。旧フルランにあった強制的なNORMALモード初期化と初期ボス/レリック/EXP SWEEP時刻の上書きは取りやめています。15分と30分の結果は`full-15m`と`full-30m`の**別々のシナリオ**として出力します。クリア率・生存中央値・平均DPSを混ぜて集計しません。

### 手動測定

GitHub Actions → **ANKIN BALANCE LAB (manual)** → Run workflow:

- `mode: full-15m`: CHALLENGE、5機体 × 指定シード数（開始時刻900秒までの進行、最終ボスへの追加60秒）
- `mode: full-30m`: NORMAL、5機体 × 指定シード数（開始時刻1800秒までの進行、最終ボスへの追加60秒）
- `policy: tactical` / `legacy` と `fusion_policy: always` / `adaptive` / `never` はそれぞれ固定し、同一シード同士で比較します。

ローカル PowerShell:

```powershell
$env:ANKIN_AI_SEEDS = "1"
$env:ANKIN_BALANCE_FULL = "15"
npm.cmd run balance:ai -- --project=desktop --grep="optional real 15-minute"

$env:ANKIN_BALANCE_FULL = "30"
npm.cmd run balance:ai -- --project=desktop --grep="optional real 30-minute"
Remove-Item Env:ANKIN_BALANCE_FULL,Env:ANKIN_AI_SEEDS
```

各行には`gameMode`, `finalBossAt`, `finalBossSpawned`, `finalBossSpawnTime`, `startSchedule`を記録。クリアできず`time-limit`になった試行は死亡ではなく「追加時間終了」と分類して、ボス残HP/生存状態とともに判断します。初期検証は各5機体×1シードの正常動作チェックとし、**1シードのクリア率はバランス確定根拠にしません。** この段階では元のプレイヤーのセーブ/実績を変更せず、mainへの統合も行いません。


### NOVA有効性の測定順序と採用判断（2026-11-03）

`novaContexts` 内の発動時近傍敵数は、必ず **`nova()` 呼び出し前**に採取します。旧実装では実際に敵を撃破したあとの近傍敵数を記録しており、特に広範囲のNOVAを「対象なし」と誤記録する危険がありました。その旧結果から無駄撃ち率を断定しないでください。現在の `novaNoNearbyMean` は開発用の近傍指標であり、ドリルの持続強化・DOGの射出型・チャージの遠距離弾などではヒット可否の直接判定ではありません。機体別の `damageBySource.nova`、敵撃破、ボス残HP、被弾、生存時間と併読します。

3シードの対照実験で、ショット型の「ダッシュは旧AI・NOVAだけ射程判定へ変更」は15分ではクリア2/3→3/3でしたが、30分では1/3→0/3かつDPS低下が見られました。モードによる結果が矛盾したため **候補は不採用**、従来のショット/ドリルの能力判断を保持します。全モードで計測フックの誤記録だけを修正します。

追加の受け入れテスト `ANKIN v13.33 separate 15m and 30m AI acceptance` では、独立した `full-15m` と `full-30m`、融合 `always` 3シード／非融合 `never` 1シードをそれぞれ5機体で実行し、JSON/CSVの成果物を別名で残します。テスト合格は正常なゲーム進行とデータ保護の確認であり、各機体の勝率バランスが適切であるとの保証ではありません。


## v13.35 — DOUBLE TIME validation (development branch)

- Branch: `feature/solo-double-time-20261109`, baseline main: `a9bea8e4f7fbc50031dc9e57e87a89f5263aaca9` (v13.34).
- LEVEL 3 optional trial; ordinary 1x damage/HP/weapon statistics are unchanged. CO-OP is excluded.
- `doubleTime` is selected and snapshotted through the existing ANKIN TRIAL menu. A clear uses the existing rank/achievement rules and preserves the new ID through the schema-v2 sanitizer. No incompatible save migration.
- Scheduler stays at 1/60s. 2x admits twice the game time and uses at most 16 fixed steps per RAF (1x remains 8). The bounded backlog is .64 game seconds at 2x (.32 at 1x). Excess stall time is diagnosed and never credited as survival without `drive` calls. Modes and run changes discard paused backlog and reset the RAF origin.
- Audio, visual particles, menu touch guards and achievement/music/boss alert banners stay on real time. Combat announcements and synergy toasts retain their existing `runClock` durations (therefore shorter in real time at 2x, frozen in menus). Enemy warnings/hazards, attacks, cooldowns, physics and encounter scheduling use `drive` game time. This distinction must not be described as every UI timer using real time.
- Added `npm run test:clock`: 15–144 Hz, pause/choice freeze, stalled backlog, 15/30-minute **clock-only** drift checks. These are not real 30-minute AI runs.
- Browser suite: real frame loop/cooldowns for 5 ships; swept high-speed bullets plus BALLISTIC; boss/raid/ultimate boundaries; 5 ships × 2 live conditions × 3 seeds comparing equal simulated time at 1x/2x; trial UI, clear/rank/achievement reload at desktop/390/320.
- Performance job now measures the PR base and candidate sequentially on the same runner. Candidate adds ordinary and late-game 2x/BALLISTIC loads; artifacts include effective speed, pending/discarded game time, frame/sim/draw percentiles and heap.
- Local validation: syntax/PWA and Node tests pass. Chromium launch is blocked by Unix socket policy (`socket() failed: Operation not permitted`). Headless-shell download also fails (invalid/truncated archive). Browser, AI, FPS and render comparisons therefore require Actions; no local browser pass or performance improvement is claimed.
- Release gate: inspect Actions and repeated performance evidence on the latest PR head immediately before merge. Fusion/reward and full-timeline evidence is recorded below; real-device input/audio and sustained rendered wall-clock sessions remain unverified. Public deployment is not confirmed.
- Next priorities: inspect actual benchmark results and frame/simulation split; expand 2x full-timeline/fusion validation; only then consider machine balance changes with 10+ seeds, and later dash/counter build experiments.


### PR #62 follow-up validation

- First head `caefafd1cc1daeca0ce77851767156e5a67cba5d`: Node and PWA Actions passed; initial PC/mobile performance jobs passed. 2x synthetic stress reached effective speed 2.000 without discarded time (desktop frame P95 33.4ms, mobile-390 16.8ms). These are CI diagnostics, not device guarantees.
- Initial mobile 1x late-stress P95 changed from 16.8ms to 33.3ms while sim/draw costs remained near baseline (.8→.9ms / 2.2→2.2ms). This is unresolved timing variance, not a claimed improvement. Re-measure with three repetitions before a merge decision.
- Improved comparison method: use the **same candidate test harness** against both source revisions, reset pilot/clock/render state per workload, and repeat each revision three times. Skip unsupported 2x cases in the baseline. No production base source is modified.
- New explicit full-timeline workflow runs 15/30-minute scheduled AI simulations for all five ships at 1x and 2x, comparing reports including deaths, actual rewards and fusion decisions. Early AI deaths remain deaths and do not prove a clear or final-boss reach. Rendering-free simulation does not certify sustained real-time FPS.
- Added real 2x fusion menu freeze/resume test. Long visible stalls now remain in timing diagnostics rather than being excluded from effective-speed samples.


### Validated behavior at `3fd2d14` (PR #62)

- Full-timeline workflow [42531387049](https://github.com/DanStars12/ankin-drift/actions/runs/42531387049) passed in 2.7 minutes of CI execution. Five ships × NORMAL/CHALLENGE × 1x/2x, seed 17: each paired report is identical, including damage, HP, death/clear, rewards and fusion outcomes. All ten conditions acquired two fusions. This is one seeded correctness comparison, **not** a statistically reliable balance ranking.
- NORMAL: SHOT died at 1281.67 game seconds, LASER 1172.27, DOG 543.22; CHARGE cleared at 1818.68, DRILL 1820.53. Both reached the final boss at 1800.02.
- CHALLENGE: SHOT died at 843.82, CHARGE 842.58; LASER cleared at 923.60, DRILL 943.60, DOG 908.32. Final boss spawn was 900.02. No invulnerability or silent healing was added to these real-AI runs.
- Performance workflow [42531387034](https://github.com/DanStars12/ankin-drift/actions/runs/42531387034), three sequential base/candidate repeats per surface: common 1x late-stress frame P95 desktop base [33.3,16.8,16.8]ms → candidate [16.8,16.8,16.8]ms; mobile-390 [33.4,33.4,33.4]ms → [33.4,33.4,33.4]ms. No major regression is established. Do not describe these variable CI samples as a device FPS improvement.
- 2x + BALLISTIC stress: desktop frame P95 16.8ms in all repeats; mobile-390 33.4ms in all repeats. Effective speed 1.998 in every repeat; discarded game time 0. Median simulation P95 desktop 1.6ms, mobile 3.1ms. Real devices and prolonged rendered sessions remain unverified.
- Validation workflow [42531387007](https://github.com/DanStars12/ankin-drift/actions/runs/42531387007): desktop, 390px, 320px, syntax/PWA and aggregate PR validation all passed; re-run and inspect the final PR head before merging. Desktop 139 passed / 4 intentionally skipped; 320px 140 passed / 3 intentionally skipped (platform-specific and separate opt-in long tests, never failing tests hidden as skips).
- Final test refinement: run common 1x benchmark cases before the candidate-only 2x cases, so warm-up order also matches; require at least one actual final-boss clear and a two-fusion run in each mode in the full-timeline gate. Re-run all workflows on the final head.
- Next investigation: initial single-seed 14s live-boss baseline showed DRILL 47.94 DPS versus SHOT 578.88; full-run results above show this cannot justify simply buffing DRILL. Its AI strafes tangentially at desired range while its real contact drill follows movement heading. Measure target-facing/contact time and compare an approach/withdrawal policy over 10+ seeds before any gameplay balance adjustment. CHARGE pack survival and DOG NORMAL growth also need more seeds and reward/AI analysis.
- Remaining limits: no real Windows/Android/iOS input/audio check, no sustained 15/30-minute **rendered wall-clock** session, no broad 10–20-seed balance conclusions, no public-site confirmation. These are not reported as passes.


## DRILL AI observation follow-up (LEVEL 1, developer tools only)

- Branch: `feature/solo-drill-ai-diagnostics-20261109`. No shipped gameplay/AI input policy is changed, and no CO-OP source is touched.
- Add `drillDiagnostics` to AI JSON/CSV: time with a selected target, radial-reach time, geometric forward-capsule overlap time, actual movement time, post-step dash time, steps producing any DRILL-source damage, and mean angular error to the target.
- Forward overlap is a geometric opportunity after each step, **not** an actual hit or an assertion that walls, invulnerability or attack cooldowns allowed damage. Damage-step time may include rush/secondary DRILL-source damage and is not a count of contact hits. Ratios never imply a survival or clear probability.
- Pure geometry uses the actual 12px capsule start, 32+reach endpoint and 11+width*.53 radius from `updateDrill`. It observes direction and position without consuming RNG, selecting inputs or changing player/enemy state. The observer is only inside Playwright's injected developer harness; the public page never imports the helper.
- `runEncounter({diagnostics:false})` disables observation for a paired control. A browser regression compares all combat/reward reports (apart from the diagnostic field) with observation on/off for ten seeded 30-second DRILL boss encounters. This separates instrumentation effects from tactical changes.
- Node tests verify forward vs sideways targets at the same distance, out-of-range/behind/no-target cases and non-mutation. Pending: latest browser Actions, measured angle/contact distribution and same-seed report equality. No DPS or AI improvement is claimed yet.
- Next: use the 10-seed diagnostic results to design an explicit experimental approach/withdrawal policy, then compare DPS **and** survival before changing the default controller or ship balance.


### v13.35 integration record

- PR #62 merged by squash into main: `1756a618eccf0af6722b9f0eb3da21e7e8febb62`. Tested feature head: `3628924c100010872200da1a418d8824417228d3`.
- Latest pre-merge validation [42532147965](https://github.com/DanStars12/ankin-drift/actions/runs/42532147965), repeated performance [42532147854](https://github.com/DanStars12/ankin-drift/actions/runs/42532147854), strengthened full-timeline gate [42531908120](https://github.com/DanStars12/ankin-drift/actions/runs/42531908120): all jobs PASS, rechecked with unchanged main immediately before merge. Cancelled runs were superseded by these successful runs; they were not counted as passes.
- Final common-first performance runs: 1x late-stress frame P95 [33.4,33.4,33.4]ms for both base/candidate on both surfaces. Candidate 2x stress effective speed [1.998,1.998,1.998], discarded time 0; frame P95 33.4ms on both surfaces in that runner allocation. These final values illustrate why earlier CI FPS samples must not be generalized.
- Source separation confirmed: all 14 changed paths are normal-mode application, save/PWA, tests/workflows or developer documents. No CO-OP branch, Worker or deployment was changed. Public HTML and post-merge Actions are checked separately; no real-device test is inferred.
- The separate DRILL observation cycle above starts from this merged main. Node tests: 50 PASS; live 10-seed on/off measurement pending Actions.


### DRILL diagnostic evidence — PR #63

- First tested head: `60c96811eab40b80f8db782ee6d93bdb5a3d8a8d`. Validation [42532648274](https://github.com/DanStars12/ankin-drift/actions/runs/42532648274) and performance [42532648218](https://github.com/DanStars12/ankin-drift/actions/runs/42532648218): all jobs PASS. Public v13.35 post-merge validation [42532569675](https://github.com/DanStars12/ankin-drift/actions/runs/42532569675) also PASS.
- Desktop: 140 browser tests passed / 4 intentional skips. Ten DRILL 30s boss encounters, diagnostics on/off: every paired report is identical except `drillDiagnostics`. Pure geometry and other Node tests: 50 PASS.
- In this fixed phase-10 guardian encounter, desktop observed mean DPS 59.8268 (seed range 53.465–65.845), mean heading error 103.53°, radial reach 8.350/30s (27.83%), forward-capsule overlap 5.067/30s (16.89%), and DRILL-damage steps .450/30s (1.5%). Every run survived; none killed the boss in 30s. These are encounter results, not full-run clear rates.
- The identical geometric trajectory across these ten seeds is itself a limit: seeds vary damage/critical results here, not a broad range of enemy movement patterns. Test more boss types, phases and initial positions before generalizing. Post-step overlap is not the exact pre-movement attack check, and neither overlap nor angular error alone proves the cause of low DPS.
- Hypothesis for next work: current distance/strafe controller often points away from the target while DRILL contact follows movement direction. Compare an approach/withdrawal policy to the unchanged controller with identical builds/seeds. Record contact vs rush damage, actual safe attack time, taken damage, boss clear time and ordinary-pack survival; do not buff the ship based on this short sample.
- Public verification: canonical `https://danstars12.github.io/ankin-drift/` and cache-busted URL returned `v13.35 | DOUBLE TIME` and the new trial rule; Pages workflow 42532569400 succeeded. This verifies deployed HTML availability, not a real-device playthrough. All unverified real-device/rendered-long-session limits above still apply.
- Final documentation commit is revalidated before integration. No new input policy or gameplay balance change is included in this cycle.


The three test surfaces remain separate cohorts (all ten on/off pairs passed on each). Their camera/world layout and encounter placement differ; do not pool or interpret these numbers as hardware-dependent weapon strength.

| Surface | Browser passed / intentional skipped | Mean DPS | Mean aim error | Forward overlap |
| --- | --- | --- | --- | --- |
| Desktop | 140 / 4 | 59.8268 | 103.53° | 16.89% |
| Mobile 390 | 141 / 3 | 179.0163 | 111.54° | 18.83% |
| Mobile 320 | 141 / 3 | 90.8211 | 104.07° | 14.83% |

## v13.36 — ARSENAL EXPANSION (candidate)

- Baseline: main `8dde4c0ee67bfe7a5d822ae98865630d6cf8673c`, v13.35. Branch `feature/solo-arsenal-expansion-20261109`. LEVEL 2/3 normal-mode catalog update; no CO-OP changes.
- Add 59 once-per-run skills: 20 normal (9 COMMON / 9 UNCOMMON / 2 RARE), 12 POWER, 12 LEGENDARY, 5 UNIQUE and 10 machine-specific relics. Catalog grows 335 → 394; DOG-specific definitions 75 → 84. Add five machine-specific POWER+LEGENDARY evolutions without changing elemental fusion tickets/recipes.
- Normal cards use small, final stat gains; no additional emitters/projectiles, revives, lifesteal or global damage multipliers. New cards declare final deltas directly (unlike the legacy catalog's rarity-gain attenuation) so their concise numerical descriptions match application and reconstruction. Relics have explicit specialization costs. Existing per-weapon projectile caps remain intact.
- Ordinary `life`, `critEpic`, `superDash` now stop offering at three acquisitions; `expShield` becomes once-per-run. Existing acquired stacks are not deleted or truncated on reconstruction. Stable IDs, archive schema, achievements and previous clear records remain unchanged.
- Revise 40 existing descriptions, retaining effects/conditions while removing commentary or invented effects. Examples: thermal no longer promises an explosion-radius increase, rain no longer implies magma creation, reaper states its real 30-kill heal cadence. Correct non-gameplay secondary tags while preserving actual attribute/fusion permissions. Existing and new one-off cards show a clear acquisition-limit tag.
- New external `skill-arsenal.js` is part of the offline shell; app/manifest/SW are v13.36. It contains data and bounded stat application, no new per-frame combat loops or timers.
- Local checks: 60 Node tests, syntax and HTML/PWA pass. Catalog tests execute the actual shipped declarations through a VM, rather than a duplicate catalog. Chromium launch is still blocked by Unix socket policy; browser passes are not claimed locally.
- Browser acceptance: all 59 cards acquired through real choice logic, duplicate exclusion, 2x fixed-step combat and rebuild parity; five recipe activations; all machine/reward pools; searchable atlas at desktop/390/320; ordinary 3-seed paired combat. Dedicated standard job: 5 ships × early/mid/late × pack/boss × 10 seeds, reference/new equal-card-budget loadouts (300 paired trials per surface). This is a controlled conservative-budget comparison, not a proof that every random full run is balanced.
- Merge gates: latest PR Actions, standard budget results, 15m/30m real-timeline 1x/2x regression, same-runner before/after performance, save/offline and UI tests. Pending results must remain pending, never be counted as passes.
- Remaining work after this cycle: use the recorded distributions to tune any outliers, then evaluate late-game offer diversity and individual relic specialization in more builds. Do not normalize five ships to identical DPS or infer hardware power from different camera layouts.

### Initial v13.36 findings and reward-tier correction

- Initial head `94e53b4`: Node/syntax/PWA and mobile390 browser acceptance passed, both 300-pair standard jobs passed, 1x/2x full timeline passed. Passing a test is not itself balance approval.
- In normal-card budget comparisons, most DPS ratios were near/below the legacy-reference kit. DRILL phase10 boss was an outlier (desktop 1.98x reference), while phase20 boss was 0.83x; small reach/speed differences change this movement-facing AI's hit opportunities. Many late samples died in both loadouts. Do not label the new normals globally overpowered or balanced from aggregate DPS alone.
- Initial seed17 full progression differed from the recorded baseline: SHOT cleared both modes and DOG CHALLENGE cleared, but several formerly successful machine/mode combinations died early. One seed cannot distinguish RNG/build selection from a progression regression, so integration is held for further comparison.
- Catalog review found several new boss rewards weaker than existing ordinary cards (for example laser POWER vs ordinary laser focus). Correct higher tiers toward their existing peer budgets, while leaving all 20 new ordinary skills unchanged. Strengthen the defensive roles rather than buffing every common skill. Remove DRILL capacity-only bonuses, which otherwise slow normalized charging without improving maximum rush power.
- Raise specialization relic benefits where the first version was strictly inferior to an existing card without the advertised cost. Keep every relic's explicit drawback, per-weapon count limits, and once-per-run restriction. No new per-frame emitters are introduced.
- Add an actual before/after random-progression comparison: the same harness against PR base and candidate, five ships × both modes × seeds17/18/19 (30 runs per revision), reporting real death/clear, fusion/reward choices and final-boss reach. Normal-budget tests remain separate from these random full runs. Archive writes are suppressed and original RNG restored.
- Acquisition-limit information stays in tags; avoid duplicating the limit as an extra sentence in each skill description. Empty-effect filtering considers beneficial deltas, not drawbacks alone.

- Arsenal-specific battle/progression probes route AI ticks through the shipped fixed-step scheduler and reset the shared combat clock per trial, matching actual frame progression. They do not freeze the shared animation/combat clock like legacy `drive`-only DPS probes. Re-measure the final candidate under this corrected harness; early diagnostic ratios are not its final acceptance numbers.

- New-card floor/ceiling regression: shared dash reductions now preserve an existing .52s DRILL cooldown rather than raising it to .7s; count bonuses preserve already-over-cap legacy values. Availability and application share the same bounded calculation. Two direct regression tests cover these cases (62 Node tests total).

### Integration hold: measured progression regression

- Tested gameplay head `a6d21e1668d21f6f9ab300809f0070966b052691`: validation and repeated performance workflows PASS; arsenal measurement workflow PASS means the measurements completed, **not** that progression balance passed.
- Same AI/harness, seeds17/18/19, five ships: NORMAL clears fall from 4/15 on base to 0/15 on candidate; CHALLENGE from 11/15 to 4/15. This small sample cannot establish player win rates, but the consistent aggregate regression is sufficient to block integration. Do not increase ordinary-card damage globally to hide it.
- DOUBLE TIME full regression workflow `42541722106` FAIL: 1x/2x paired-report comparisons finished, but no NORMAL seed17 ship cleared, violating the existing final-boss coverage assertion. The assertion remains intact. This is a progression/coverage failure, not evidence that the two simulation speeds diverged.
- Add three disposable CI-only ablations, keeping the AI/seeds/harness identical: remove new legacy acquisition limits; exclude new cards from reward offers while keeping limits; remove both (legacy control). Each executes 30 real-timeline runs and uploads its own report. Production source is never changed by this diagnostic script outside the runner, and diagnostic success is not a release gate substitute.
- PR #64 remains unmerged. Next: compare these cohorts to the recorded base/candidate, identify the source of the regression, then tune only the implicated choices/offer rules and repeat the full acceptance gates. Real-device input/audio and rendered 15/30-minute sessions remain unverified.

- First ablations (30 runs each): removing acquisition limits alone yields NORMAL 1/15 and CHALLENGE 4/15 clears; keeping limits and excluding new rewards yields 8/15 and 12/15. Excluding both yields 6/15 and 11/15. The latter is a legacy-offer control, not a bit-for-bit original build: the corrected once-only bucket check still applies. The main adverse signal comes from reward-pool expansion, rather than the new caps alone.
- Follow-up diagnostics isolate ordinary vs upper-tier dilution: exclude only new normal cards; exclude only new upper-tier cards; keep every card but allow at most one new normal card per offer while other legacy choices remain. Each uses the same 30-run cohort. No production balance changes are made until these comparisons finish.

### Candidate correction: preserve build choices during expansion

- Follow-up ablations at `65229b0`: excluding new normal cards yields NORMAL 1/15, CHALLENGE 8/15; excluding new upper-tier cards 3/15 and 6/15; limiting only new normals to one slot 3/15 and 6/15. Both reward tiers contribute to the adverse signal; three-seed cohorts are diagnostic evidence, not precise win-rate estimates.
- Across all reward kinds, offer at most one new once-only stat specialization while other core choices remain. This preserves two core choices in ordinary menus and three in boss menus; it never forces acquisition, changes rarity rolls, grants free power, or replaces unclaimed cards with supplies. Once core choices run out, remaining new one-offs fill the menu normally. Unique/relic/ordinary bucket guards and reroll filtering still apply.
- Correct four strictly inferior choices with modest tradeoffs: reserve hull HP18/shield4 versus armor HP14.72/shield7.36; insulation shield12/recharge2 versus barrier20.24/1.84; NOVA lens damage50/radius18 versus radius36.8/36.8; laser coating scale.06/shield6 versus cooling scale.092/reach36.8. No new attackers, extra lives, lifesteal or normal global multipliers. Add peer-tradeoff and offer-depletion regression tests (64 Node tests total).
- Increase the actual base/candidate long-progression cohort from three to ten seeds per ship/mode (17–26): 100 runs per revision, while keeping the AI and measurement harness identical. Keep the separate fixed-step 1x/2x final-boss coverage assertion unchanged. Integration remains held until final results and the latest commit's required Actions are reviewed.

### Ten-seed findings and upper-tier peer adjustment

- Head `3e6f4a5`: all browser/clock/performance checks passed, but progression acceptance remains separate. NORMAL total clears recover to 9/50 versus base8/50; CHALLENGE remains 20/50 versus base28/50. Per-ship NORMAL (base→candidate): SHOT3→5, LASER0→1, CHARGE3→2, DRILL2→1, DOG0→0. CHALLENGE: SHOT8→5, LASER5→7, CHARGE6→5, DRILL5→0, DOG4→3.
- DRILL reward histories show new machine POWER/LEGENDARY cards repeatedly chosen before mid-run deaths; three runs take the new UNIQUE. Audit against real peers finds weak tier budgets: new torque contact24/rush40 versus existing POWER body contact35/HP79.9; new UNIQUE rush120/gain.14/reach30 versus existing UNIQUE rush380/cap.15/dash-.25. The unchanged tag-based AI favors machine-specific cards and is not a human win-rate model. Do not mask these results by retuning AI only for the candidate.
- Keep all 20 ordinary cards unchanged from the prior correction. Raise DRILL's new upper-tier rewards into their real peer budgets, preserving contact-versus-rush and shield-versus-range roles. Recalibrate the five new UNIQUE cards against the existing machine UNIQUE cards: shot is a critical volley, laser sustained damage versus more independent beams, charge penetrates versus NOVA spread, drill trades maximum rush/dash for reach/accumulation, DOG focuses bones versus a mixed animal pack. Still once per run, no new emitters, no blanket rarity multiplier.
- Add UNIQUE peer comparisons: five ships × early/mid × pack/boss × ten seeds =200 paired encounters per surface. These compare role differences and survival rather than demanding equal DPS. Full progression stays 100 runs per revision, now sharded by machine/mode/revision so long simulations do not block unrelated cohorts. All source changes require the acceptance gates again.
- Prior measured performance at `3e6f4a5` (three repeats per surface): common late-stress frame P95 33.4ms base/candidate; candidate 2x-stress speed1.998, discarded time0, frame P95 33.3ms. Browser PC144 passed/6 deliberate opt-in skips; mobile390/320 each145 passed/5 skips. The fixed-step full-clock suite PASS includes identical 1x/2x reports and actual final-boss clears. These results do not certify the subsequent upper-tier revision.

### Final acceptance cohort: twenty seeds

- Upper-tier head `bdcae29` completes all 100 progression runs per revision: NORMAL base8/50→candidate8/50; CHALLENGE28/50→25/50. Candidate per-ship NORMAL: SHOT4, LASER1, CHARGE3, DRILL0, DOG0; CHALLENGE: SHOT6, LASER6, CHARGE6, DRILL3, DOG4. DRILL's challenge result recovered from0/10 to3/10, but its base5/10 and remaining uncertainty justify a larger cohort, not a claim of equivalence.
- Desktop UNIQUE peer encounters show the intended weapon-specialist boss advantage (early ratios1.01–1.83; mid ratios1.08–2.23 against the existing machine UNIQUE) with different pack outcomes (early.90–1.08, mid1.13–1.61). These are controlled 20s kits, not comparisons against the best universal UNIQUE or completed 30-minute builds. Counts/limits and secondary unlocks differ. All ordinary-card budgets remain unchanged. Mobile and desktop are separate camera/layout cohorts.
- Audit also finds a pre-existing shared-upgrade defect: `superDash` could increase an already-.52s DRILL cooldown to.7s; `dash` used a similar higher floor during direct application/reconstruction. Preserve the stronger existing cooldown while retaining the normal speed gain. This is a monotonic quality fix, not a new reduction below the machine's existing floor. Add an actual-catalog regression (65 Node tests total).
- Final long comparison uses twenty seeds (17–36), five ships and both actual schedules: 200 runs per revision /400 total, with unchanged AI on both sides. Ordinary encounters remain300 pairs per surface; UNIQUE peers200 per surface. Do not merge before reviewing these results, latest Actions and same-runner performance. Final integration and measured results will be recorded after the feature merge in a documentation-only PR so source acceptance is not altered by reporting edits.

## v13.36 integration record

- Feature PR: [#64](https://github.com/DanStars12/ankin-drift/pull/64); squash commit `38e6698c56dcf3e8047d37416578cd889c7fd9b6`. Baseline main `8dde4c0ee67bfe7a5d822ae98865630d6cf8673c` (v13.35); tested feature head `f67b0a0480d8b1e5f02773ba98f17e1749134e03` (tree identical to `5b373f5`). Final version: v13.36 ARSENAL EXPANSION. LEVEL 2/3, normal mode only. No CO-OP/Workers/network changes.
- GitHub Actions/Webhooks incident was resolved at 2026-11-09 20:50 JST. An empty branch commit resumed missing checks; no source/CI requirement was bypassed. Latest final validation [42640589741](https://github.com/DanStars12/ankin-drift/actions/runs/42640589741), 400-run comparison [42638924128](https://github.com/DanStars12/ankin-drift/actions/runs/42638924128), fixed-step full timeline [42638924458](https://github.com/DanStars12/ankin-drift/actions/runs/42638924458), repeated performance [42638924108](https://github.com/DanStars12/ankin-drift/actions/runs/42638924108), diagnostic fixtures [42638924168](https://github.com/DanStars12/ankin-drift/actions/runs/42638924168): all PASS, rechecked against the unchanged head/main immediately before integration. Superseded cancelled validation runs are not counted as passes.
- Delivered: 59 once-per-run cards (20 ordinary, 12 POWER, 12 LEGENDARY, 5 UNIQUE, 10 relics), five machine evolutions, 40 legacy description corrections, meaningful tags and bounded offer composition. Catalog335→394, DOG75→84. Legacy acquisition stacks/IDs/archive schema remain intact. Existing dash reductions now preserve a stronger already-reduced cooldown.

### Actual progression comparison

Both revisions use the same controller, twenty seeds17–36, all five ships and both real schedules: 200 runs per revision /400 total. These are rendering-free game-time simulations, including early deaths/time limits, not 400 successful clears or physical-device playtests.

| Mode | Ship | Base clears /20 | Candidate clears /20 | Base mean end time (s) | Candidate mean end time (s) |
| --- | --- | --- | --- | --- | --- |
| normal | shot | 6 | 10 | 1354.7 | 1560.8 |
| normal | laser | 2 | 2 | 1023.2 | 934.5 |
| normal | charge | 6 | 6 | 1306.6 | 1301.6 |
| normal | drill | 4 | 1 | 1157.4 | 1110.0 |
| normal | dog | 1 | 0 | 744.6 | 698.0 |
| challenge | shot | 15 | 15 | 897.3 | 858.4 |
| challenge | laser | 11 | 12 | 803.5 | 807.8 |
| challenge | charge | 12 | 11 | 801.5 | 803.6 |
| challenge | drill | 7 | 6 | 894.5 | 761.5 |
| challenge | dog | 11 | 7 | 749.7 | 785.0 |

- NORMAL:19/100→19/100 clears; mean end time1117.3→1121.0s. CHALLENGE:56/100→51/100;829.3→803.3s. NORMAL has16 discordant losses and16 gains; CHALLENGE30 losses and25 gains. Exploratory exact paired tests give p=1.000 and .590; absence of a detected difference is **not** proof of equivalence or a bound on human clear rates.
- Adoption judgment combines stable overall NORMAL progression, modest ordinary-card stat budgets, actual upper-tier peer comparisons, preserved limits/records, all regressions and repeated performance. The initial broad collapse was corrected before integration. Do not claim every ship is equally strong or every changed seed improves.
- Residual signals remain visible: DRILL NORMAL4/20→1/20 (mean1157.4→1110.0s), DOG CHALLENGE11/20→7/20 despite longer mean survival749.7→785.0s, and DRILL CHALLENGE mean894.5→761.5s. Twenty samples per machine and the tag-based build chooser/known DRILL heading issue limit causal conclusions. These are priority follow-ups, not reasons for an unmeasured global ship buff.

### Functional and performance evidence

- 65 Node tests plus syntax/PWA; PC/390/320 browser regressions; all59 real acquisitions, once-only exclusion, finite 2x combat and reconstruction; all five evolutions, reward menus, atlas search and viewport bounds; archive compatibility/offline startup. Ordinary controlled combat300 pairs/surface and UNIQUE peers200 pairs/surface keep camera cohorts separate. Full 1x/2x reports match for all five ships and both modes, with actual final-boss clears and two-fusion coverage. Assertions were retained.
- On each of desktop and mobile390, same-runner base/candidate three repeats: common late-stress frame P95[33.4,33.4,33.4]ms in both revisions. Candidate 2x-stress effective speed[1.998,1.998,1.998], discarded time0; frame P95 desktop[33.4,33.4,33.4]ms, mobile[33.4,33.3,33.4]ms. This is a short rendered benchmark; it is not a universal device-FPS guarantee or a rendered30-minute memory soak.
- Public verification: canonical https://danstars12.github.io/ankin-drift/ HTML, skill-arsenal.js, sw.js and manifest.webmanifest all byte-match merged UI-repair commit f2d03060fc3c3f58185b1ca17cbbf14cd1ec0bf5 after successful Pages deployment42644787919. Public version13.36 and offline cache arsenal-v2 are present. This verifies deployed content, not a physical-device playthrough.
- Still unverified: real Windows/Android/iOS input/audio, physical mobile performance and rendered15/30-minute continuous sessions. The local Chromium socket restriction persists. A temporary Node/DOM-stub experiment matched only8/20 known browser summaries and was rejected as release evidence; it is not imported by the product or accepted test suite.

### Next cycle

1. Compare DRILL approach/withdrawal policies against the unchanged strafe controller using multiple bosses, phases and matched builds; use forward-overlap/heading diagnostics and actual damage/survival. Separate AI weakness from ship output before tuning the ship.
2. Inspect DOG late-boss damage versus mixed-animal/bone-focused reward histories, and improve the experimental reward evaluator to account for actual stat budgets, defensive needs and relic costs. Compare the same evaluator on base/candidate; do not change only the candidate controller to manufacture favorable clears.
3. Monitor individual once-only pick rates, evolution completion and late-game stock depletion with larger independent seed batches; retain NORMAL baseline difficulty and all save records. No additional gameplay changes are bundled with this release-record PR.

### Post-merge touch-hover repair

- Original main validation [42641525510](https://github.com/DanStars12/ankin-drift/actions/runs/42641525510) failed one mobile320 DOG fusion click. It was not reclassified as a pass or hidden by retries. Trace and screenshot showed the TAG GUIDE sheet intercepting the fusion button before any intended tag tap: a mouse left by menu interaction hovered a tag when the touch-control menu appeared.
- [PR #65](https://github.com/DanStars12/ankin-drift/pull/65), tested head `7bcc1d6df28d6473e7dd9d2aed7dccd6b605ec2b`, squash `f2d03060fc3c3f58185b1ca17cbbf14cd1ec0bf5`: suppress hover previews for touch controls/coarse non-hover inputs; retain intentional tap/click, keyboard details and ordinary desktop hover. Bump the normal offline shell to `ankin-drift-mobile-v13-36-arsenal-v2`. No combat values or saves changed.
- Add deterministic regressions for hover suppression, actual tag tap/close and reachable fusion action, plus desktop hover open/dismiss. No force clicks and no skip of the original failing case. Desktop/mobile390/mobile320 each146 browser tests PASS (7 deliberate platform/opt-in skips per surface).
- Latest validation [42643448902](https://github.com/DanStars12/ankin-drift/actions/runs/42643448902), comparison [42643448701](https://github.com/DanStars12/ankin-drift/actions/runs/42643448701), performance [42643448473](https://github.com/DanStars12/ankin-drift/actions/runs/42643448473), full clock [42643448658](https://github.com/DanStars12/ankin-drift/actions/runs/42643448658), diagnosis [42643448442](https://github.com/DanStars12/ankin-drift/actions/runs/42643448442): all PASS. All20 cohorts/400 progression summaries exactly match the previously integrated gameplay candidate, including all seeds and ending/choice/fusion fields. Main/head were rechecked before this LEVEL1 repair merged.


## v13.37 TACTICAL ARSENAL — 開発中 (2026-11-10 JST)

開始main: `73bd3906992fe34b3e3ce7aced56f3bb05099ee7` (v13.36)。専用ブランチ: `feature/solo-tactical-skills-20261110`。PR [#67](https://github.com/DanStars12/ankin-drift/pull/67)、統合コミットは未確定。通常ソロのみ。CO-OP、通信、Workers、セーブ形式は変更しない。

### 狙いと追加範囲

前回59種と同等規模の60種＋進化5種。各機体12種 (通常4、POWER3、LEGENDARY2、RELIC2、UNIQUE1)、全て一度限り。全454種、DOG専用96種。既存IDとログ形式は維持する。

|機体|判断を変える仕組み|主な進化|
|---|---|---|
|ショット|遠近の射線選択、ダッシュ終了後の1斉射だけ反撃装填|反撃窓1.7秒・貫通追加|
|レーザー|主照準維持と標的切替、照射しながらの移動|維持成立0.6秒・移動再充填|
|チャージ|蓄電を保持した回避、40〜85%の中間解放|最大解放から再巡航|
|ドリル|最後に接触した1体への再突入、消費プラズマ回収|標識2秒・短時間離脱装甲|
|DOG|既存骨の呼び戻し、捕球直後の仲間連携|連携窓2.2秒・帰還補給|

通常20種は常時ステータスの増加なし。小さな条件付き効果を基本とする。威力の条件補正は同系合計最大1.8倍 (ショットは発射時と命中時の積を含む)、軽減22%まで。回収は最大率のみ・実消費量に限定し、NOVAの無料突進・NOVA骨を回収源にしない。追加の発射器や毎フレームの敵探索は導入しない。レリック10種は実際の威力低下を持つ。

カード説明は効果・条件・時間を中心に短く記載。新規10タグにガイドを追加。戦闘状態は再計算時にも引き継ぎ、プレビューで実機のフラグを変更しない。シミュレーション時間だけで連携窓・再使用間隔を進める。

### 現時点の検証

ローカル: Node 73件PASS、JS構文・HTML/PWA PASS (キャッシュ17件)。新規8テストは全60種の機体制限・重複防止、通常枠の非永続強化、上限、照準遷移、最大/中間チャージ、回収量、NOVA除外、捕球/回収の間隔、プレビュー独立を検証。

ブラウザはローカルOSのソケット/ptrace制限で起動不可。VMによる代替戦闘数値を採用しない。GitHub CIで実ブラウザ検証を行う。完了・公開済みとは扱わない。

追加ブラウザ試験: 全60種の実choose経路・2倍速戦闘・再構築一致、進化5種、ネイティブ操作、1x/2x/ポーズ、320/390pxの図鑑検索。

比較計画: 旧/新の通常4枚予算 (機体専用2＋共通2と新規専用4)、DOGヒヨコは両条件同数。5機体×序中終盤×2戦況×10シード=300ペア/画面。UNIQUEは前回専用と新規専用の同枚数、200ペア/画面。AI方針は固定し、発動カウンタを取得する。既存のmain/候補20シード×両モード×5機体=400長時間シミュレーションも継続する。

性能: 既存の同条件3反復比較に加え、ネイティブ武装数を揃えた5機体・2倍速/高速弾・220敵/300弾/複合レイドを3反復比較する。新規のパッシブ増分は付けずフラグだけ有効にしてフック負荷を比較。ブラウザCIは実スマホ端末ではない。バランスと性能の数値・ばらつきを確認するまでマージしない。

未解決: 全実ブラウザ結果、長時間比較、性能差の判定。前回からのDRILLのAI角度とDOG終盤ボスは、専用スキルを追加しただけでは解決と見なさない。


CI初回診断: legacy-upper / legacy-control の「empty choice」は、診断フィクスチャが新規レリックを報酬から除外しながら、出現条件では数えていた不一致。追加後は除外レリックだけで出現閾値3種を超え、空の旧報酬が開いた。診断専用スクリプトの出現・撃破時の候補判定にも同じ除外条件を適用する。通常ゲーム側の出現条件や報酬は変更しない。失敗した初回を合格に置き換えず、修正後に再実行する。

追加の上位比較: POWER3枚/LEGENDARY2枚/RELIC2枚を旧/新同数で固定。序盤向けではない上位枠は中盤・後半の5機体×2戦況×3レアリティ×10シード=600ペア/画面を測定する。


初回追加ブラウザ試験で、テスト用grantがUNIQUE/進化の演出画面を閉じずに時計を進めていた問題も検出。旧59種と新60種のgrantを実際の続行経路で閉じるようにし、新60種は戦闘時計>0.99秒も必須にする。ポーズ中を戦闘成功と数えない。

初回1x/2x長時間試験は全5機体・seed17で結果完全一致だが、NORMALのクリア例がなく最終ボスクリア到達ゲートが失敗。クリア率の判断は20シード比較に委ね、時計の完走例は連続固定3シード17/18/19へ拡張して検証する。既存の「各モードにクリア例・属性融合2件が必要」のゲートは維持する。難易度やAI方針を成功目的で変更しない。


初回の同条件UNIQUE比較 (各10シード、序/中盤、PC/390px): レーザーの対ボスDPS比は約0.65〜0.89、DOGは約0.44〜0.86。新規の連携が基礎火力の差を補い切れていない。通常枠の数値は据え置く。レーザーUNIQUEを+3本/威力補正+1.1/線幅+1.5、DOGを+3本/威力補正+0.85/帰還補正+0.75へ。旧UNIQUEより低いパッシブの一部を補い、固有条件を活かす余地を残す。チャージは貫通+3、ドリルはリーチ+25を加え、旧品の貫通+6/リーチ+45との射線差を緩和する。最終UNIQUE比較は20シードへ増やし、未使用だった11〜20も含めて再測定する。既存品と通常モードの基本性能は変更しない。

初回400走の旧AI集計: NORMAL旧19/100→候補10/100、CHALLENGE旧51/100→候補42/100。機体順SHOT/LASER/CHARGE/DRILL/DOGのNORMALは旧10/2/6/1/0→候補6/1/2/1/0、CHALLENGEは旧15/12/11/6/7→候補14/8/9/5/6。この結果を改善扱いにせず、現段階ではマージ保留とする。

旧AIは通常カードにも機体専用+3.5、主武装タグ+2.3を加点し、小さな条件付き補助カードを実際の火力成長より優先する。開発者専用の通常報酬評価を、独立コピーへ実際のカードを適用して得るステータス差・HP状況・保守的な条件稼働率で評価する方式へ変更する。近似値は測定DPSではない。通常レアリティと専用ラベルの固定加点を縮小し、無効な上限超過やタグだけに火力加点しない。シナジー/進化・属性選択、移動/回避/NOVA AIは維持する。同じ新評価コードをmain比較側へコピーし、旧/候補とも20シードで再測定する。候補だけAIを有利に変更しない。公開ゲームにはAIや評価推定を読み込まない。旧AIの低下結果も上記のまま記録する。

新しい報酬評価の単体3件を追加、Node計76件。初回性能3反復/画面: アクティブフック負荷下でPCフレームP95は概ね50.1ms、390pxは33.4msで両版同水準。実効速度1.996〜1.997、破棄ゲーム時間0。390pxのシミュレーションP95は旧1.0〜3.1ms/候補1.1〜3.1ms、PCは旧2.4〜5.9ms/候補2.3〜6.1ms。DOGはPCで約1msの増加が見られるため、最終反復でも確認する。エミュレーション値であり実スマホ端末の性能保証ではない。


報酬評価の追加確認: 全ての実通常カードを独立した機体コピーへ適用し、推定値が有限・実機とゲーム記録が不変であることを検証する。吸収・撃破回復・補助攻撃・回避系の効果も評価へ含め、基礎値0の補助攻撃は適切な分母で比較して過大評価を避ける。Node計77件。推定は対戦闘の近似であり、実測とクリア率が改善したことの代替にはしない。
