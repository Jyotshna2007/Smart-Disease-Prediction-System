// End-to-end scenarios through evaluateClinicalFeatures (rules + ML). Run: npx tsx ml/engine.scenarios.test.ts
import { evaluateClinicalFeatures, HealthInputs } from '../backend/server/predictionEngine.js';

let failed = 0;
function run(name: string, input: HealthInputs, check: (r: ReturnType<typeof evaluateClinicalFeatures>) => string | null) {
  const r = evaluateClinicalFeatures(JSON.parse(JSON.stringify(input)));
  const problem = check(r);
  const sec = (r.secondary_predictions || []).map(s => `${s.disease_name}[${s.risk_level},${s.confidence}%,${s.method}]`).join(' | ');
  console.log(`${problem ? 'FAIL' : 'ok  '} ${name}\n      -> ${r.predicted_condition} | ${r.risk_level} | ${r.confidence}% | ${r.method}${sec ? '\n      2nd: ' + sec : ''}`);
  if (r.model_info?.model) console.log(`      model: ${r.model_info.model.id} AUC=${r.model_info.model.cv_auc} p=${r.model_info.model.probability_pct}% drivers=${r.model_info.model.drivers.map(d => d.feature + ' ' + d.direction).join(', ')} imputed=[${r.model_info.model.features_imputed}]`);
  if (problem) { console.log('      PROBLEM:', problem); failed++; }
}

run('healthy 26F, all normal', { age: 26, gender: 'female', bmi: 22, systolic_bp: 110, diastolic_bp: 70, glucose_fasting: 85, hba1c: 5.0, total_cholesterol: 170, hemoglobin: 13.5, serum_creatinine: 0.8, tsh: 2.0, alt: 20, ast: 22 },
  r => r.condition_id === 'optimal_health_profile' && r.confidence === 0 ? null : `expected optimal, got ${r.condition_id}`);

run('diabetic 55M, random glucose 260, BMI 33', { age: 55, gender: 'male', bmi: 33, glucose_random: 260, diastolic_bp: 88, hba1c: 9.1, frequent_urination: true },
  r => r.condition_id === 'type_2_diabetes' && (r.risk_level === 'High' || r.risk_level === 'Severe') && r.method === 'ml+guidelines' ? null : `got ${r.condition_id}/${r.risk_level}/${r.method}`);

run('CKD-like 60M: creatinine 5.2, urea 110, Hb 8.1', { age: 60, gender: 'male', serum_creatinine: 5.2, blood_urea: 110, hemoglobin: 8.1, diastolic_bp: 95 },
  r => r.condition_id === 'kidney_disease' && r.risk_level !== 'Low' ? null : `got ${r.condition_id}/${r.risk_level}`);

run('normal kidney labs 30F', { age: 30, gender: 'female', serum_creatinine: 0.7, blood_urea: 22, hemoglobin: 13.2 },
  r => r.condition_id !== 'kidney_disease' ? null : 'kidney wrongly flagged');

run('liver panel abnormal 48M', { age: 48, gender: 'male', alt: 210, ast: 260, bilirubin: 4.2, alp: 420, albumin: 2.7, total_protein: 6.1 },
  r => (r.condition_id === 'liver_disease' || (r.secondary_predictions || []).some(s => /Liver/i.test(s.disease_name))) ? null : `liver not flagged: ${r.condition_id}`);

run('hypothyroid 41F TSH 48', { age: 41, gender: 'female', tsh: 48 },
  r => r.condition_id === 'thyroid_disease' && r.method === 'ml+guidelines' ? null : `got ${r.condition_id}/${r.method}`);

run('normal TSH 41F', { age: 41, gender: 'female', tsh: 2.1 },
  r => r.condition_id !== 'thyroid_disease' ? null : 'thyroid wrongly flagged');

run('stroke profile 74M smoker BP 165/98', { age: 74, gender: 'male', smoking_status: 'current', systolic_bp: 165, diastolic_bp: 98, glucose_random: 190, bmi: 31 },
  r => [r.condition_id, ...(r.secondary_predictions || []).map(s => s.disease_name)].join('|').match(/stroke|Stroke/) ? null : 'stroke not surfaced');

run('young healthy 22M, smoker, normal vitals', { age: 22, gender: 'male', smoking_status: 'current', systolic_bp: 115, diastolic_bp: 72, bmi: 23, glucose_random: 95 },
  r => r.condition_id === 'optimal_health_profile' ? null : `flagged ${r.condition_id} for a healthy 22-year-old`);

run('fasting glucose only (ML n/a) -> guideline path', { age: 50, gender: 'male', glucose_fasting: 140 },
  r => r.method === 'guidelines' && r.condition_id === 'type_2_diabetes' ? null : `got ${r.condition_id}/${r.method}`);

run('absurd glucose 99999 does not crash / saturates', { age: 50, gender: 'male', glucose_random: 99999, bmi: 28, diastolic_bp: 80 },
  r => r.sufficient_data && r.confidence <= 99 ? null : 'bad result');

run('empty submission', {}, r => (!r.sufficient_data ? null : 'expected insufficient'));

console.log(failed ? `\n${failed} scenario(s) FAILED` : '\nAll scenarios passed');
process.exit(failed ? 1 : 0);
