<div align="center">
<h1>Smart Disease Prediction System</h1>
</div>

Multi-disease screening app: enter lab values manually or upload a PDF lab report, and get a risk
assessment in English, Telugu or Hindi.

## Project structure

```
backend/    Express API: login, PDF extraction, prediction engine (loads the ML models), report generation, data/
ml/         The machine-learning project: training script, trained models, tests, datasets, sample reports
frontend/   React + Vite + Tailwind web app
README.md
.gitignore
```

## Run locally (two terminals)

```bash
# 1) Backend  ->  http://localhost:3000
cd backend
cp .env.example .env        # optional: add GEMINI_API_KEY for PDF reading
npm install
npm run dev

# 2) Frontend ->  http://localhost:5173   (proxies /api to the backend)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. For a single-server production run: `cd frontend && npm run build`, then
`cd backend && npm start` - the backend serves `frontend/dist` automatically.

## Patient-friendly results

The result screen and downloadable report only show the person's own result. Model accuracy, datasets and the
four individual model estimates are kept on a separate **About the Model** page (menu tab, or the small link at
the bottom of a result), written in plain language in English, Telugu and Hindi.

## How predictions work

Two layers run side by side (`backend/server/predictionEngine.ts`):

1. **Trained machine-learning models** (`ml/models/*.json`, trained by `ml/train_models.py`) for
   diseases that have a suitable public dataset.
2. **Clinical guideline rules** for the remaining diseases (and as a safety net for the ML diseases).
   These are hand-written thresholds from published guidelines. They are **not** trained models.

When both apply, the shown risk level is the higher of the two. Every result states which method was
used (`ml+guidelines`, `ml` or `guidelines`) and, for ML, the dataset, sample size and cross-validated AUC.

### ML models: SVM + Random Forest + XGBoost + ANN (real cross-validated performance)

Every ML-backed disease is predicted by **four algorithms** trained on the same dataset, and their
probabilities are averaged (soft voting). The result screen shows each model's probability and
cross-validated AUC next to the final ensemble value.

| Algorithm | Implementation |
|---|---|
| SVM | RBF kernel, class-balanced, Platt-scaled probabilities (scikit-learn) |
| Random Forest | 100 trees, depth <= 6 (scikit-learn) |
| XGBoost | 150 boosted trees (xgboost) |
| ANN | MLP 16-8 hidden units, ReLU, L2 penalty (scikit-learn) |

Cross-validated AUC (mean of 5-fold CV x 5 repeats):

| Disease | Rows | Prevalence | SVM | RF | XGBoost | ANN | **Ensemble** | Sens / spec at screening cut-off |
|---|---|---|---|---|---|---|---|---|
| Type 2 Diabetes | 724 | 34% | 0.83 | 0.83 | 0.83 | 0.83 | **0.84** | 79% / 74% |
| Coronary Heart Disease (10-yr) | 3658 | 15% | 0.73 | 0.72 | 0.72 | 0.73 | **0.73** | 67% / 69% |
| Liver Disease | 579 | 72% | 0.75 | 0.74 | 0.73 | 0.73 | **0.74** | 52% / 90% |
| Chronic Kidney Disease | 400 | 62% | 0.97 | 1.00 | 1.00 | 0.97 | **0.99** | 96% / 98% |
| Stroke Risk | 3255 | 6% | 0.82 | 0.80 | 0.80 | 0.80 | **0.81** | 79% / 70% |
| Hypothyroidism | 2291 | 6% | 0.97 | 0.97 | 0.97 | 0.97 | **0.97** | 97% / 92% |

Validation = 5-fold stratified cross-validation repeated 5 times (held-out folds only). Hyper-parameters
come from a small grid evaluated with a separate 5-fold run (not fully nested, so figures are slightly
optimistic). Missing inputs are replaced by the median of the non-disease group ("assume normal").
The models are exported to plain JSON (support vectors, tree arrays, network weights) and evaluated in
TypeScript (`server/mlModels.ts`); `npm run test:ml` checks they reproduce the Python probabilities.
"Main factors" are computed by replacing one input at a time with the training average and measuring the
change in the ensemble's log-odds.
Datasets: Pima Indians Diabetes, Framingham Heart Study, Indian Liver Patient (ILPD), UCI Chronic Kidney
Disease, Kaggle Stroke Prediction, UCI Thyroid (hypothyroid). See `ml/train_models.py` for exact sources.

**Limitations you should know about**
* Probabilities are relative to each training cohort's disease prevalence (e.g. 62% CKD, 6% stroke), not to the general population.
* The kidney dataset (400 rows) is almost linearly separable, so its 0.99 AUC is optimistic for early-stage CKD.
* The diabetes model uses 2-hour/random glucose (Pima data). Fasting-only or HbA1c-only input uses the guideline rules.
* The heart model estimates 10-year CHD risk from a US cohort; AUC 0.73 is in line with published Framingham-type scores.
* Diseases not listed above (asthma, COPD, anemia, gout, GERD, pneumonia, RA, cancers, etc.) are still guideline rules only.
* This is a screening aid, not a diagnostic device.

### Retrain / verify

```bash
pip install -r ml/requirements.txt
python3 ml/train_models.py     # downloads datasets, cross-validates (~7 min), rewrites ml/models/*.json
cd backend && npm install && npm run test:ml    # checks the TypeScript runtime matches scikit-learn + end-to-end scenarios
```


## Sample reports

`ml/sample_reports/*.pdf` - one test lab report per ML-backed disease (plus a healthy one) for trying the PDF upload.
Regenerate with `pip install reportlab && python ml/make_sample_reports.py`.
