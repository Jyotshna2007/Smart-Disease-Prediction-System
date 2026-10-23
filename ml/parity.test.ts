// Verifies that the TypeScript runtime reproduces the Python models (scikit-learn SVM / Random Forest /
// ANN and XGBoost) for every disease. Run: npx tsx ml/parity.test.ts
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { predictWithModel } from '../backend/server/mlModels.js';

const TOL = 1e-4;
type Case = { input: any; probability: number; models: Record<string, number> };
const cases = JSON.parse(fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'parity_cases.json'), 'utf8')) as Record<string, Case[]>;
let checked = 0, worst = 0, failures = 0;
const worstBy: Record<string, number> = {};
for (const [id, list] of Object.entries(cases)) {
  for (const c of list) {
    const res = predictWithModel(id, c.input);
    if (!res) { console.error(`FAIL ${id}: model returned null for`, c.input); failures++; continue; }
    const pairs: Array<[string, number, number]> = [['ensemble', res.probability, c.probability]];
    for (const m of res.members) pairs.push([m.id, m.probability, c.models[m.id]]);
    for (const [name, ts, py] of pairs) {
      const diff = Math.abs(ts - py);
      worst = Math.max(worst, diff); worstBy[name] = Math.max(worstBy[name] ?? 0, diff); checked++;
      if (!(diff <= TOL)) { console.error(`FAIL ${id}/${name}: ts=${ts} py=${py}`); failures++; }
    }
  }
}
console.log('worst |ts - python| per model:', Object.fromEntries(Object.entries(worstBy).map(([k, v]) => [k, v.toExponential(1)])));
console.log(`parity: ${checked} comparisons, max diff = ${worst.toExponential(2)}, failures = ${failures}`);
process.exit(failures ? 1 : 0);
