// 使い方: node scripts/check-feature-sync.mjs [ルート(既定: src/test)]
import { checkDirectory } from "./featureSync.mjs";

const root = process.argv[2] ?? "src/test";
const { checked, problems } = checkDirectory(root);

if (problems.length > 0) {
  console.error(`.feature と test の不整合が ${String(problems.length)} 件あります:`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(`check-feature-sync: ${String(checked)} 件の .feature を検査しました（問題なし）`);
