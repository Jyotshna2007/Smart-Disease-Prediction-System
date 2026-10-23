import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { HealthInputs } from './predictionEngine.js';

// -------------------------------------------------------------
// Runtime for the machine-learning models trained by ml/train_models.py.
// Each disease is predicted by FOUR algorithms - SVM (RBF), Random Forest, XGBoost and an ANN
// (multi-layer perceptron) - whose probabilities are averaged (soft voting). Models are exported as
// plain JSON (support vectors, tree arrays, network weights), so inference needs no native dependency.
// Re-run `python ml/train_models.py` to retrain; the server picks the new files up on restart.
// -------------------------------------------------------------

interface FeatureSource { field: string; scale: number }

interface FeatureSpec {
  name: string;
  kind: 'numeric' | 'male' | 'current_smoker' | 'former_smoker' | 'hypertension';
  sources?: FeatureSource[];
  log?: boolean;
  impute: number; // in model space (already log-transformed if log)
  mean: number;
  std: number;
  clip?: [number, number]; // training min/max in raw units
}

interface TreeArrays { l: number[]; r: number[]; f: number[]; t: number[]; v: number[] }
interface MemberMetrics { cv_auc_mean: number; cv_auc_std: number; brier: number }

export type MemberId = 'svm' | 'random_forest' | 'xgboost' | 'ann';

type MemberImpl =
  | { type: 'svm'; gamma: number; intercept: number; dual_coef: number[]; support_vectors: number[][]; prob_a: number; prob_b: number }
  | { type: 'random_forest'; trees: TreeArrays[] }
  | { type: 'xgboost'; base_margin: number; trees: TreeArrays[] }
  | { type: 'ann'; activation: 'relu'; layers: Array<{ w: number[][]; b: number[] }> };

export type MemberSpec = MemberImpl & { name: string; metrics: MemberMetrics; hyperparameters: Record<string, number> };

export interface MlModelSpec {
  id: string;
  name: string;
  algorithm: string;
  features: FeatureSpec[];
  models: Record<MemberId, MemberSpec>;
  required: string[];
  any_of: string[];
  min_features: number;
  tiers: { moderate: number; high: number; severe: number };
  dataset: string;
  population: string;
  outcome: string;
  n_samples: number;
  prevalence: number;
  caveats: string[];
  metrics: {
    cv_auc_mean: number;
    cv_auc_std: number;
    sensitivity_at_moderate: number;
    specificity_at_moderate: number;
    validation: string;
  };
}

export type RiskTier = 'Low' | 'Moderate' | 'High' | 'Severe';

export interface MlPrediction {
  modelId: string;
  name: string;
  probability: number; // raw model probability, 0..1 (relative to the training cohort's prevalence)
  tier: RiskTier;
  score: number; // 0..1 severity score, comparable across diseases (piecewise map through the tier cut-offs)
  members: Array<{ id: MemberId; name: string; probability: number; cv_auc: number; cv_auc_std: number }>; // the 4 individual models
  drivers: Array<{ feature: string; direction: 'raises' | 'lowers'; contribution: number }>;
  featuresProvided: string[];
  featuresImputed: string[];
  spec: MlModelSpec;
}

const here = path.dirname(fileURLToPath(import.meta.url));
const MODEL_DIR = path.resolve(here, '..', '..', 'ml', 'models') // models live in the top-level ml/ folder;
const models = new Map<string, MlModelSpec>();

function loadModels(): void {
  if (!fs.existsSync(MODEL_DIR)) {
    console.warn(`[ml] Model directory not found: ${MODEL_DIR}. Run "python ml/train_models.py" from the project root. Falling back to guideline rules only.`);
    return;
  }
  for (const file of fs.readdirSync(MODEL_DIR)) {
    if (!file.endsWith('.json') || file === 'metrics.json') continue;
    try {
      const spec = JSON.parse(fs.readFileSync(path.join(MODEL_DIR, file), 'utf8')) as MlModelSpec;
      models.set(spec.id, spec);
    } catch (err) {
      console.error(`[ml] Failed to load ${file}:`, err);
    }
  }
  console.log(`[ml] Loaded ${models.size} trained models: ${[...models.keys()].join(', ')}`);
}
loadModels();

export function getMlModelIds(): string[] {
  return [...models.keys()];
}

export function getMlModelSpec(id: string): MlModelSpec | undefined {
  return models.get(id);
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function rawFeatureValue(f: FeatureSpec, inp: HealthInputs, bmi: number | undefined): number | undefined {
  switch (f.kind) {
    case 'male':
      return inp.gender === 'male' ? 1 : inp.gender === 'female' ? 0 : undefined;
    case 'current_smoker':
      return inp.smoking_status === 'current' ? 1 : inp.smoking_status ? 0 : undefined;
    case 'former_smoker':
      return inp.smoking_status === 'former' ? 1 : inp.smoking_status ? 0 : undefined;
    case 'hypertension': {
      if (isNum(inp.systolic_bp) || isNum(inp.diastolic_bp)) {
        return (isNum(inp.systolic_bp) && inp.systolic_bp >= 140) || (isNum(inp.diastolic_bp) && inp.diastolic_bp >= 90) ? 1 : 0;
      }
      if ((inp.diagnosed_conditions || []).some(d => /hypertension|high\s*blood\s*pressure/i.test(d))) return 1;
      return undefined;
    }
    case 'numeric':
      for (const src of f.sources || []) {
        let v: number | undefined = src.field === 'bmi' ? (bmi ?? inp.bmi) : ((inp as Record<string, unknown>)[src.field] as number | undefined);
        if (!isNum(v)) continue;
        v = v * src.scale;
        // Unit safety: WBC may be reported as x10^3/uL (e.g. 7.8) or cells/uL (e.g. 7800)
        if (src.field === 'wbc_count' && v < 100) v *= 1000;
        if (v <= 0) continue; // a non-positive lab value is not physiologically meaningful
        return v;
      }
      return undefined;
  }
}

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

function walkTree(t: TreeArrays, x: number[], strictLess: boolean): number {
  let n = 0;
  while (t.l[n] !== -1) {
    const v = Math.fround(x[t.f[n]]); // scikit-learn / XGBoost compare in float32
    const goLeft = strictLess ? v < Math.fround(t.t[n]) : v <= t.t[n];
    n = goLeft ? t.l[n] : t.r[n];
  }
  return t.v[n];
}

/** Probability of the positive class from one member model; `x` is the standardised feature vector. */
function memberProbability(m: MemberSpec, x: number[]): number {
  switch (m.type) {
    case 'svm': {
      let f = m.intercept;
      for (let i = 0; i < m.support_vectors.length; i++) {
        const sv = m.support_vectors[i];
        let d2 = 0;
        for (let j = 0; j < sv.length; j++) { const d = sv[j] - x[j]; d2 += d * d; }
        f += m.dual_coef[i] * Math.exp(-m.gamma * d2);
      }
      return sigmoid(-(m.prob_a * f + m.prob_b)); // Platt scaling of the decision value (scikit-learn CalibratedClassifierCV, method='sigmoid')
    }
    case 'random_forest': {
      let sum = 0;
      for (const t of m.trees) sum += walkTree(t, x, false);
      return sum / m.trees.length;
    }
    case 'xgboost': {
      let margin = m.base_margin;
      for (const t of m.trees) margin += walkTree(t, x, true);
      return sigmoid(margin);
    }
    case 'ann': {
      let a = x;
      m.layers.forEach((layer, li) => {
        const out = layer.b.slice();
        for (let i = 0; i < a.length; i++) {
          const row = layer.w[i];
          for (let j = 0; j < out.length; j++) out[j] += a[i] * row[j];
        }
        a = li < m.layers.length - 1 ? out.map(v => Math.max(0, v)) : out;
      });
      return sigmoid(a[0]);
    }
  }
}

const MEMBER_IDS: MemberId[] = ['svm', 'random_forest', 'xgboost', 'ann'];

/** Soft-voting ensemble: the mean of the four models' probabilities. */
function ensembleProbability(spec: MlModelSpec, x: number[]): { p: number; members: MlPrediction['members'] } {
  const members = MEMBER_IDS.map(id => {
    const m = spec.models[id];
    return { id, name: m.name, probability: memberProbability(m, x), cv_auc: m.metrics.cv_auc_mean, cv_auc_std: m.metrics.cv_auc_std };
  });
  return { p: members.reduce((s, m) => s + m.probability, 0) / members.length, members };
}

// Map a probability onto a 0..1 severity scale using the model's own tier cut-offs, so results from
// models with very different base rates (stroke ~6% vs CKD ~62%) can be ranked against each other.
function severityScore(p: number, t: MlModelSpec['tiers']): number {
  const lerp = (x: number, a: number, b: number, c: number, d: number) => c + ((x - a) / Math.max(1e-9, b - a)) * (d - c);
  if (p < t.moderate) return Math.max(0, lerp(p, 0, t.moderate, 0, 0.3));
  if (p < t.high) return lerp(p, t.moderate, t.high, 0.3, 0.55);
  if (p < t.severe) return lerp(p, t.high, t.severe, 0.55, 0.8);
  return Math.min(1, lerp(p, t.severe, 1, 0.8, 1));
}

export function tierFor(p: number, t: MlModelSpec['tiers']): RiskTier {
  return p >= t.severe ? 'Severe' : p >= t.high ? 'High' : p >= t.moderate ? 'Moderate' : 'Low';
}

/**
 * Run one trained model on the patient's inputs.
 * Returns null when the input does not contain enough of the model's features to be meaningful
 * (the caller then falls back to the guideline rules).
 */
export function predictWithModel(modelId: string, inp: HealthInputs, bmi?: number): MlPrediction | null {
  const spec = models.get(modelId);
  if (!spec) return null;

  const provided: string[] = [];
  const imputed: string[] = [];
  const x: number[] = []; // standardised feature vector shared by all four models
  const rawProvided: boolean[] = [];

  for (const f of spec.features) {
    const raw = rawFeatureValue(f, inp, bmi);
    let v: number;
    if (raw === undefined) {
      v = f.impute;
      imputed.push(f.name);
    } else {
      const clipped = f.clip ? Math.min(f.clip[1], Math.max(f.clip[0], raw)) : raw;
      v = f.log ? Math.log(Math.max(1e-3, clipped)) : clipped;
      provided.push(f.name);
    }
    rawProvided.push(raw !== undefined);
    x.push((v - f.mean) / (f.std || 1));
  }

  if (spec.required.some(r => !provided.includes(r))) return null;
  if (spec.any_of.length > 0 && !spec.any_of.some(r => provided.includes(r))) return null;
  if (provided.length < spec.min_features) return null;

  const { p: probability, members } = ensembleProbability(spec, x);

  // Local explanation (model-agnostic): how much does the ensemble's log-odds change when one
  // provided feature is replaced by the training average (standardised value 0)?
  const logit = (p: number) => Math.log(Math.max(1e-6, p) / Math.max(1e-6, 1 - p));
  const base = logit(probability);
  const contributions: Array<{ feature: string; contribution: number }> = [];
  spec.features.forEach((f, i) => {
    if (!rawProvided[i]) return;
    const xr = x.slice();
    xr[i] = 0;
    contributions.push({ feature: f.name, contribution: base - logit(ensembleProbability(spec, xr).p) });
  });
  const drivers = contributions
    .filter(c => Math.abs(c.contribution) > 0.05)
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 3)
    .map(c => ({
      feature: c.feature.replace(/_/g, ' '),
      direction: (c.contribution > 0 ? 'raises' : 'lowers') as 'raises' | 'lowers',
      contribution: Number(c.contribution.toFixed(2)),
    }));

  return {
    modelId,
    name: spec.name,
    probability,
    tier: tierFor(probability, spec.tiers),
    score: severityScore(probability, spec.tiers),
    members,
    drivers,
    featuresProvided: provided,
    featuresImputed: imputed,
    spec,
  };
}

/** Public, patient-independent description of every model (used by the "About the model" page). */
export function getModelCatalog() {
  return [...models.values()].map(spec => ({
    id: spec.id,
    name: spec.name,
    dataset: spec.dataset,
    population: spec.population,
    outcome: spec.outcome,
    n_samples: spec.n_samples,
    prevalence: spec.prevalence,
    cv_auc: spec.metrics.cv_auc_mean,
    cv_auc_std: spec.metrics.cv_auc_std,
    sensitivity: spec.metrics.sensitivity_at_moderate,
    specificity: spec.metrics.specificity_at_moderate,
    validation: spec.metrics.validation,
    caveats: spec.caveats,
    members: MEMBER_IDS.map(id => ({ id, name: spec.models[id].name, cv_auc: spec.models[id].metrics.cv_auc_mean })),
  }));
}
