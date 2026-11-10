import { appendFile, readFile } from 'node:fs/promises';

let detail = 'テスト結果ファイルなし（依存関係の導入やブラウザー起動前に失敗した可能性があります）。';
try {
  const { stats } = JSON.parse(await readFile('test-results/results.json', 'utf8'));
  detail = `成功: ${stats.expected} / 失敗: ${stats.unexpected} / 不安定: ${stats.flaky} / スキップ: ${stats.skipped}`;
} catch (error) {
  console.warn(`Cannot read browser report: ${error.message}`);
}
await appendFile(process.env.GITHUB_STEP_SUMMARY,
  `## 起動テスト: ${process.env.PROJECT}\n\n実行結果: ${process.env.RESULT || '未実行'}\n\n${detail}\n\n詳細はステップログと smoke-${process.env.PROJECT} アーティファクトを確認してください。\n`);
