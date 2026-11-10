# PRの自動検証

ゲーム本体にビルド手順を追加する必要はありません。Node.js 22とPlaywrightは検証専用です。

## 実行タイミングと結果

`.github/workflows/pr-validation.yml` はPRの作成・コミット追加・再オープン・ドラフト解除・本文や対象ブランチの編集時、mainへのpush時、手動実行時に動きます。PR上部の **Checks** またはマージ欄に各チェックと総合チェック **PR validation** が表示されます。Detailsからログと実行サマリーを確認できます。PR本文への自動コメントは行いません。

| チェック | 内容 |
| --- | --- |
| JavaScript syntax | HTML内の実行可能なJavaScriptとsw.jsの構文 |
| HTML and PWA | HTMLパースエラー・重複ID・ローカル参照、manifestの起動URLとscope、PNGアイコン寸法、Service Workerのキャッシュ対象 |
| Smoke (desktop) | PC Chromiumで出撃、ゲーム時間の進行、描画、一時停止・再開、オフライン起動 |
| Smoke (mobile-390) / Smoke (mobile-320) | モバイルChromiumの390px／320pxで上記とタッチ操作・操作ボタン表示 |
| PR validation | 上記がすべて成功した場合だけ成功。失敗・キャンセル・スキップも成功扱いにしない |

ゲーム時間の進行や初回ガイドなど、現在のゲームの公開UIを使って確認します。GitHub Pagesと同じ `/ankin-drift/` 配下でテストし、各テストは独立したブラウザー保存領域を使います。ゲームコードや保存データにテスト専用の改変はしません。外部サービスの認証情報は不要です。`pull_request_target` は使わず、ワークフローの権限は `contents: read` に限定しています。

Actions実行画面のArtifactsから `smoke-desktop` などをダウンロードできます（保存期間14日）。HTMLレポート、結果JSON、ゲーム画面、失敗時のスクリーンショット・トレースが含まれます。展開後のHTMLレポートは `npx playwright show-report <展開先>/playwright-report`、トレースは `npx playwright show-trace <trace.zip>` で確認できます。依存関係の導入前に失敗した場合、ブラウザーレポートは生成されません。

スマホはChromiumでのエミュレーションです。iPhone Safari、実機の操作感・音声・PWAインストール、長時間プレイ、FPS改善幅は別途確認してください。

## 失敗時にマージできないようにする

ワークフローの追加だけではマージは禁止されません。管理者権限を持つユーザーがGitHub上で次の設定を行ってください。

1. このブランチでPRを作成し、Actionsを少なくとも1回実行します。Actionsが無効ならリポジトリの **Settings → Actions → General** で有効にします。外部コントリビューターのPRでは初回実行の承認が必要な場合があります。
2. **Settings → Rules → Rulesets → New ruleset → New branch ruleset** を開きます。
3. 例として `Protect main` と名付け、Enforcement statusを **Active**、Target branchesを **main** に設定します。
4. **Require a pull request before merging** を有効にします。
5. **Require status checks to pass** を有効にし、**Add checks** から **PR validation** を追加します。選択できる場合はソースをGitHub Actionsに限定します。見つからない場合はPRの実行完了後に再確認してください。
6. **Require branches to be up to date before merging** を有効にします。mainが更新された場合はPR側にも取り込んで再検証します。
7. 意図しない回避を防ぐため、Bypass listに管理者やbotを追加せず保存します。直接pushを許す例外も追加しないでください。
8. テスト用PRでJavaScript構文を一時的に壊すなどして **PR validation** が失敗し、マージがブロックされることを確認したら、そのテスト変更を戻します。

Rulesetsが利用できない場合は **Settings → Branches → Add branch protection rule** でmainを指定し、PR必須・必須ステータスチェック `PR validation`・最新ブランチ必須・管理者を含む回避禁止を設定します。利用可否はリポジトリの公開設定・GitHubプランによります。

この構成はmerge queue用イベントを含みません。merge queueを導入するときは `merge_group` トリガーも追加してください。必須チェック名 `PR validation` を変更する際は保護設定も同時に更新してください。

## ローカル実行

```sh
npm ci
npx playwright install --with-deps chromium
npm test
```

個別には `npm run check:syntax`、`npm run check:pwa`、`npm run test:smoke -- --project=mobile-390` を使えます。ブラウザーが既にある開発環境では `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:smoke` も利用できます。CIはPlaywrightに対応した固定バージョンのブラウザーをインストールします。

失敗したらゲームの変更を確認して修正し、PRブランチへpushすると再実行されます。ゲームのHTMLやPWAのファイル構成を意図的に変える際は、テスト側の期待値もレビュー対象として更新してください。キャッシュ対象が変わったリリースでは `sw.js` の `CACHE_NAME` を更新してください。
