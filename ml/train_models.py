#!/usr/bin/env python3
"""
Train the disease-prediction ML models used by the Smart Disease Prediction System.

Every disease is modelled by FOUR machine-learning algorithms whose probabilities are combined by
soft voting (simple average):

    1. SVM            - RBF-kernel support vector machine (Platt-scaled probabilities)
    2. Random Forest  - bagged decision trees
    3. XGBoost        - gradient-boosted decision trees
    4. ANN            - multi-layer perceptron (neural network)

Usage:
    pip install -r ml/requirements.txt
    python ml/train_models.py            # downloads datasets (first run) + trains + exports

Outputs:
    ml/models/<model_id>.json   -> loaded by backend/server/mlModels.ts (pure TypeScript inference,
                                       no native dependency: support vectors, tree arrays and
                                       network weights are exported as plain JSON)
    ml/models/metrics.json      -> cross-validated performance of every model + the ensemble
    ml/parity_cases.json            -> sklearn/XGBoost reference probabilities for ml/parity.test.ts

Design notes
------------
* Features are named after the app's `HealthInputs` fields and converted to the app's units at
  training time, so the JSON can be evaluated directly on user input. All four models share one
  preprocessing step: log-transform (where flagged) -> median imputation -> standardisation.
* No class weighting is used, so probabilities reflect each training cohort's prevalence.
* Performance = 5-fold stratified cross-validation repeated 5 times (held-out folds only), reported
  for each of the four models and for the ensemble. Hyper-parameters are chosen from a small grid
  with a separate, single 5-fold CV run.
* Risk tiers (Moderate / High / Severe) are derived from the ensemble's out-of-fold predictions.
"""
import io
import json
import os
import sys
import urllib.request
import zipfile
from pathlib import Path

import numpy as np
import pandas as pd
import warnings
from sklearn.ensemble import RandomForestClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.exceptions import ConvergenceWarning
from sklearn.neural_network import MLPClassifier
from sklearn.svm import SVC
from xgboost import XGBClassifier
from sklearn.metrics import (average_precision_score, brier_score_loss, roc_auc_score, roc_curve)
from sklearn.model_selection import RepeatedStratifiedKFold, StratifiedKFold, cross_val_predict
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "ml" / "data"
OUT_DIR = ROOT / "ml" / "models"
DATA_DIR.mkdir(parents=True, exist_ok=True)
OUT_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------------------------
# Datasets (public GitHub mirrors of UCI / Kaggle / Framingham data). Downloaded on first run.
# ---------------------------------------------------------------------------------------------
SOURCES = {
    "pima_diabetes.csv": "https://raw.githubusercontent.com/plotly/datasets/master/diabetes.csv",
    "framingham.csv": "https://raw.githubusercontent.com/ronitmotiwale/Framingham_Heart_Study/master/FraminghamHeart.csv",
    "ilpd_liver.csv": "https://raw.githubusercontent.com/mb-uninsubria/Indian-Liver-Patient-Records/main/indian_liver_patient.csv",
    "uci_ckd.csv": "https://raw.githubusercontent.com/sumeetyadav0202/Predict-status-of-Chronic-kidney-disease/main/kidney_disease.csv",
    "stroke.csv": "https://raw.githubusercontent.com/Saikrishna-89/STROKE-PREDICTION/main/healthcare-dataset-stroke-data.csv",
    "hypothyroid.csv": "https://raw.githubusercontent.com/ArunadeviRamesh/Hypothyroid-Prediction-using-Machine-Learning-Algorithms/master/data/hypothyroid.csv",
}


def fetch(name: str) -> Path:
    path = DATA_DIR / name
    if not path.exists():
        print(f"  downloading {name} ...")
        req = urllib.request.Request(SOURCES[name], headers={"User-Agent": "Mozilla/5.0"})
        path.write_bytes(urllib.request.urlopen(req, timeout=60).read())
    return path


# ---------------------------------------------------------------------------------------------
# Dataset loaders. Each returns (DataFrame with columns named after app fields, y, meta)
# ---------------------------------------------------------------------------------------------
def load_diabetes():
    d = pd.read_csv(fetch("pima_diabetes.csv"))
    for col in ["Glucose", "BloodPressure", "BMI"]:
        d.loc[d[col] == 0, col] = np.nan  # zeros are missing values in this dataset
    d = d.dropna(subset=["Glucose", "BloodPressure", "BMI"])
    X = pd.DataFrame({
        "glucose": d["Glucose"], "diastolic_bp": d["BloodPressure"], "bmi": d["BMI"], "age": d["Age"],
    })
    return X, d["Outcome"].astype(int), dict(
        dataset="Pima Indians Diabetes Database (NIDDK / UCI)",
        population="Women aged 21+ of Pima Indian heritage; glucose is a 2-hour OGTT value",
        outcome="Diabetes diagnosis (WHO criteria)")


def load_heart():
    d = pd.read_csv(fetch("framingham.csv"))
    X = pd.DataFrame({
        "age": d["age"], "male": d["gender"], "current_smoker": d["currentSmoker"],
        "total_cholesterol": d["totChol"], "systolic_bp": d["sysBP"], "diastolic_bp": d["diaBP"],
        "bmi": d["BMI"], "heart_rate": d["heartRate"], "glucose": d["glucose"],
    })
    return X, d["TenYearCHD"].astype(int), dict(
        dataset="Framingham Heart Study (cleaned extract)",
        population="Adults aged 32-70 from Framingham, Massachusetts (USA)",
        outcome="Coronary heart disease within 10 years")


def load_liver():
    d = pd.read_csv(fetch("ilpd_liver.csv")).dropna()
    X = pd.DataFrame({
        "age": d["Age"], "male": (d["Gender"].str.lower() == "male").astype(int),
        "bilirubin": d["Total_Bilirubin"], "bilirubin_direct": d["Direct_Bilirubin"],
        "alp": d["Alkaline_Phosphotase"], "alt": d["Alamine_Aminotransferase"],
        "ast": d["Aspartate_Aminotransferase"], "total_protein": d["Total_Protiens"],
        "albumin": d["Albumin"],
    })
    return X, (d["Dataset"] == 1).astype(int), dict(
        dataset="Indian Liver Patient Dataset (ILPD, UCI) - Andhra Pradesh, India",
        population="Patients from north-east Andhra Pradesh, India (416 liver patients, 167 non-patients)",
        outcome="Liver disease present")


def load_ckd():
    d = pd.read_csv(fetch("uci_ckd.csv"))
    d["classification"] = d["classification"].astype(str).str.strip()
    for col in ["pcv", "wc", "rc"]:
        d[col] = pd.to_numeric(d[col].astype(str).str.strip().replace({"?": np.nan}), errors="coerce")
    for col in ["age", "bp", "bgr", "bu", "sc", "hemo"]:
        d[col] = pd.to_numeric(d[col], errors="coerce")
    X = pd.DataFrame({
        "age": d["age"], "diastolic_bp": d["bp"], "glucose_random": d["bgr"], "blood_urea": d["bu"],
        "serum_creatinine": d["sc"], "hemoglobin": d["hemo"], "hematocrit": d["pcv"],
        "wbc_count": d["wc"], "rbc_count": d["rc"],
    })
    return X, (d["classification"] == "ckd").astype(int), dict(
        dataset="UCI Chronic Kidney Disease dataset (Apollo Hospitals, Tamil Nadu, India)",
        population="400 patients, southern India, 25 attributes collected over 2 months",
        outcome="Chronic kidney disease present")


def load_stroke():
    d = pd.read_csv(fetch("stroke.csv"))
    d = d[(d["gender"].isin(["Male", "Female"])) & (d["smoking_status"] != "Unknown") & (d["age"] >= 18)]
    d = d.assign(bmi=pd.to_numeric(d["bmi"], errors="coerce")).dropna(subset=["bmi"])
    X = pd.DataFrame({
        "age": d["age"], "male": (d["gender"] == "Male").astype(int),
        "hypertension": d["hypertension"], "glucose": d["avg_glucose_level"], "bmi": d["bmi"],
        "current_smoker": (d["smoking_status"] == "smokes").astype(int),
        "former_smoker": (d["smoking_status"] == "formerly smoked").astype(int),
    })
    return X, d["stroke"].astype(int), dict(
        dataset="Stroke Prediction Dataset (Kaggle, adults with known smoking status)",
        population="Adults, mixed demographics; ~5% stroke prevalence",
        outcome="Has had a stroke")


def load_thyroid():
    d = pd.read_csv(fetch("hypothyroid.csv"))
    d = d.replace("?", np.nan)
    d["TSH"] = pd.to_numeric(d["TSH"], errors="coerce")
    d["Age"] = pd.to_numeric(d["Age"], errors="coerce")
    d = d[(d["TSH"].notna()) & (d["Age"].between(1, 110))]
    X = pd.DataFrame({"tsh": d["TSH"], "age": d["Age"], "male": (d["Sex"] == "M").astype(int)})
    return X, (d["class"] == "hypothyroid").astype(int), dict(
        dataset="UCI Thyroid Disease (hypothyroid) dataset, Garavan Institute / Sydney",
        population="Referred patients with a measured TSH",
        outcome="Primary hypothyroidism")


# ---------------------------------------------------------------------------------------------
# Feature specs: how an app `HealthInputs` object becomes a model feature vector.
#   sources : ordered list of app fields (first present wins), with optional scale for unit fixes
#   kind    : numeric | male | current_smoker | former_smoker | hypertension
# ---------------------------------------------------------------------------------------------
def num(name, *fields, log=False, scale=1.0):
    return dict(name=name, kind="numeric", sources=[dict(field=f, scale=scale) for f in fields], log=log)


MODELS = {
    "type_2_diabetes": dict(
        loader=load_diabetes, label="Type 2 Diabetes",
        features=[num("glucose", "glucose_postprandial", "glucose_random"), num("diastolic_bp", "diastolic_bp"),
                  num("bmi", "bmi"), num("age", "age")],
        required=["glucose"], min_features=2,
        caveats=["Trained on Pima Indian women aged 21+; glucose is a 2-hour/postprandial or random value. "
                 "Fasting-only or HbA1c-only inputs are handled by the guideline layer instead."]),
    "heart_disease": dict(
        loader=load_heart, label="Coronary Heart Disease (10-year risk)",
        features=[num("age", "age"), dict(name="male", kind="male"), dict(name="current_smoker", kind="current_smoker"),
                  num("total_cholesterol", "total_cholesterol"), num("systolic_bp", "systolic_bp"),
                  num("diastolic_bp", "diastolic_bp"), num("bmi", "bmi"), num("heart_rate", "heart_rate"),
                  num("glucose", "glucose_random", "glucose_fasting")],
        required=["age", "systolic_bp"], min_features=4,
        caveats=["Framingham cohort is US-based and 32-70 years old; risk may be mis-calibrated for other populations."]),
    "liver_disease": dict(
        loader=load_liver, label="Liver Disease",
        features=[num("age", "age"), dict(name="male", kind="male"),
                  num("bilirubin", "bilirubin", log=True), num("bilirubin_direct", "bilirubin_direct", log=True),
                  num("alp", "alp", log=True), num("alt", "alt", log=True), num("ast", "ast", log=True),
                  num("total_protein", "total_protein"), num("albumin", "albumin")],
        required=[], min_features=4, any_of=["alt", "ast", "bilirubin", "alp"],
        caveats=["Trained on ~580 patients from Andhra Pradesh, India; small sample."]),
    "kidney_disease": dict(
        loader=load_ckd, label="Chronic Kidney Disease",
        features=[num("age", "age"), num("diastolic_bp", "diastolic_bp"), num("glucose_random", "glucose_random", "glucose_fasting", log=True),
                  num("blood_urea", "blood_urea", log=True), num("serum_creatinine", "serum_creatinine", log=True),
                  num("hemoglobin", "hemoglobin"), num("hematocrit", "hematocrit"),
                  num("wbc_count", "wbc_count", log=True), num("rbc_count", "rbc_count")],
        required=[], min_features=3, any_of=["serum_creatinine", "blood_urea", "hemoglobin"],
        caveats=["Only 400 patients; this dataset is known to be almost linearly separable, so the reported "
                 "accuracy is optimistic for real-world early-stage CKD."]),
    "stroke_risk": dict(
        loader=load_stroke, label="Stroke Risk",
        features=[num("age", "age"), dict(name="male", kind="male"), dict(name="hypertension", kind="hypertension"),
                  num("glucose", "glucose_random", "glucose_fasting"), num("bmi", "bmi"),
                  dict(name="current_smoker", kind="current_smoker"), dict(name="former_smoker", kind="former_smoker")],
        required=["age"], min_features=3,
        caveats=["Only ~5% of the training data are stroke cases and there is no time horizon; "
                 "treat the output as relative risk, not a 10-year probability."]),
    "hypothyroidism": dict(
        loader=load_thyroid, label="Hypothyroidism",
        features=[num("tsh", "tsh", log=True), num("age", "age"), dict(name="male", kind="male")],
        required=["tsh"], min_features=1,
        caveats=["Essentially a TSH-driven model; free T4 and clinical context are not modelled."]),
}


def to_matrix(X, spec):
    cols = []
    for f in spec["features"]:
        s = X[f["name"]].astype(float)
        if f.get("log"):
            s = np.log(s.clip(lower=1e-3))
        cols.append(s)
    return pd.concat(cols, axis=1).values


def choose_tiers(y, p):
    """Derive risk tiers from out-of-fold predictions (no hand-picked numbers).

    Moderate = Youden-optimal screening cut-off (best balance of sensitivity/specificity)
    High     = score exceeded by only ~10% of people WITHOUT the disease (false-positive rate <= 10%)
    Severe   = score exceeded by only ~3% of people WITHOUT the disease (false-positive rate <= 3%)
    """
    fpr, tpr, thr = roc_curve(y, p)
    t_mod = float(thr[np.argmax(tpr - fpr)])

    def at_fpr(limit):
        idx = np.where(fpr <= limit)[0]
        return float(thr[idx[-1]]) if len(idx) else float(thr[0])

    t_high = max(at_fpr(0.10), t_mod * 1.15)
    t_sev = max(at_fpr(0.03), t_high * 1.15)
    t_sev = min(t_sev, 0.97)
    t_high = min(t_high, t_sev * 0.95)
    t_mod = min(t_mod, t_high * 0.95)
    return dict(moderate=round(t_mod, 4), high=round(t_high, 4), severe=round(t_sev, 4))


warnings.filterwarnings("ignore", category=ConvergenceWarning)

ALGOS = ["svm", "random_forest", "xgboost", "ann"]
ALGO_LABEL = {"svm": "SVM (RBF kernel)", "random_forest": "Random Forest", "xgboost": "XGBoost", "ann": "ANN (neural network)"}
ENSEMBLE_NAME = "Ensemble of SVM + Random Forest + XGBoost + ANN (soft voting)"
CV_REPEATS = 5
SEED = 42


def build(algo, hp, n_features=1, tuning=False):
    """Return an unfitted scaler+model pipeline for an algorithm and hyper-parameter dict."""
    if algo == "svm":
        # gamma = g / n_features equals scikit-learn's gamma="scale" when g == 1 (inputs are standardised)
        # class_weight="balanced" fixes the SVM's poor ranking on rare outcomes (stroke, heart); the Platt step below
        # re-calibrates the scores to real probabilities, so prevalence is still reflected in the output.
        m = SVC(kernel="rbf", C=hp["C"], gamma=hp["g"] / n_features, class_weight="balanced", random_state=SEED)
        if not tuning:  # Platt scaling fitted on 5-fold out-of-fold decision values (final SVC refit on all data)
            m = CalibratedClassifierCV(m, method="sigmoid", cv=5, ensemble=False)
    elif algo == "random_forest":
        m = RandomForestClassifier(n_estimators=100, max_depth=6, min_samples_leaf=hp["leaf"],
                                   max_features="sqrt", random_state=SEED, n_jobs=1)
    elif algo == "xgboost":
        m = XGBClassifier(n_estimators=150, max_depth=hp["depth"], learning_rate=0.05, subsample=0.8,
                          colsample_bytree=0.8, min_child_weight=3, reg_lambda=1.0, random_state=SEED,
                          n_jobs=1, eval_metric="logloss", base_score=None)
    else:
        m = MLPClassifier(hidden_layer_sizes=(16, 8), activation="relu", alpha=hp["alpha"], max_iter=800,
                          learning_rate_init=0.01, random_state=SEED)
    return make_pipeline(StandardScaler(), m)


GRIDS = {
    "svm": [dict(C=c, g=g) for c in (0.1, 0.3, 1.0, 3.0) for g in (0.1, 0.3, 1.0)],
    "random_forest": [dict(leaf=l) for l in (3, 8, 20)],
    "xgboost": [dict(depth=d) for d in (2, 3, 4)],
    "ann": [dict(alpha=a) for a in (0.01, 0.1, 1.0)],
}


def tune(algo, M, y):
    """Pick hyper-parameters by AUC of 5-fold out-of-fold predictions."""
    best, best_auc = None, -1.0
    for hp in GRIDS[algo]:
        pipe = build(algo, hp, M.shape[1], tuning=True)
        method = "decision_function" if algo == "svm" else "predict_proba"  # same ranking, much faster for SVC
        p = cross_val_predict(pipe, M, y, cv=StratifiedKFold(5, shuffle=True, random_state=1), method=method)
        p = p if p.ndim == 1 else p[:, 1]
        auc = roc_auc_score(y, p)
        if auc > best_auc:
            best, best_auc = hp, auc
    return best


def r6(a):
    return np.round(np.asarray(a, dtype=float), 6).tolist()


# ---------------------------------------------------------------------------------------------
# Exporters: convert fitted models to plain JSON that server/mlModels.ts can evaluate.
# All models receive the standardised feature vector.
# ---------------------------------------------------------------------------------------------
def export_svm(pipe):
    cc = pipe[-1].calibrated_classifiers_[0]
    m, cal = cc.estimator, cc.calibrators[0]
    return dict(
        type="svm", gamma=float(m._gamma), intercept=float(m.intercept_[0]),
        dual_coef=m.dual_coef_[0].tolist(), support_vectors=m.support_vectors_.tolist(),
        prob_a=float(cal.a_), prob_b=float(cal.b_), n_support=int(len(m.support_vectors_)))


def export_rf(pipe):
    trees = []
    for est in pipe[-1].estimators_:
        t = est.tree_
        v = t.value[:, 0, :]
        v = v[:, 1] / v.sum(axis=1)
        trees.append(dict(l=t.children_left.tolist(), r=t.children_right.tolist(), f=t.feature.tolist(),
                          t=t.threshold.tolist(), v=np.round(v, 6).tolist()))
    return dict(type="random_forest", trees=trees)


def _flatten_xgb(node, out):
    idx = len(out["l"])
    for k in ("l", "r", "f", "t", "v"):
        out[k].append(0)
    if "leaf" in node:
        out["l"][idx] = out["r"][idx] = -1
        out["f"][idx] = -1
        out["v"][idx] = round(float(node["leaf"]), 8)
        return idx
    kids = {c["nodeid"]: c for c in node["children"]}
    out["f"][idx] = int(node["split"][1:])
    out["t"][idx] = float(np.float32(node["split_condition"]))  # XGBoost compares in float32
    out["l"][idx] = _flatten_xgb(kids[node["yes"]], out)
    out["r"][idx] = _flatten_xgb(kids[node["no"]], out)
    return idx


def export_xgb(pipe):
    booster = pipe[-1].get_booster()
    cfg = json.loads(booster.save_config())
    bs = cfg["learner"]["learner_model_param"]["base_score"]
    bs = float(str(bs).strip("[]"))
    trees = []
    for d in booster.get_dump(dump_format="json"):
        out = dict(l=[], r=[], f=[], t=[], v=[])
        _flatten_xgb(json.loads(d), out)
        trees.append(out)
    return dict(type="xgboost", base_margin=float(np.log(bs / (1 - bs))), trees=trees)


def export_ann(pipe):
    m = pipe[-1]
    return dict(type="ann", activation="relu", layers=[dict(w=[r6(r) for r in W], b=r6(b)) for W, b in zip(m.coefs_, m.intercepts_)])


EXPORT = dict(svm=export_svm, random_forest=export_rf, xgboost=export_xgb, ann=export_ann)


def cv_evaluate(M, y, hps):
    """Repeated stratified CV for all four algorithms + the ensemble.
    Returns per-model fold AUCs and out-of-fold predictions from repeat 0 (every row predicted once)."""
    yv = y.values
    folds = list(RepeatedStratifiedKFold(n_splits=5, n_repeats=CV_REPEATS, random_state=SEED).split(M, yv))
    keys = ALGOS + ["ensemble"]
    aucs = {k: [] for k in keys}
    oof = {k: np.zeros(len(yv)) for k in keys}
    for i, (tr, te) in enumerate(folds):
        preds = {}
        for a in ALGOS:
            pipe = build(a, hps[a], M.shape[1]).fit(M[tr], yv[tr])
            preds[a] = pipe.predict_proba(M[te])[:, 1]
        preds["ensemble"] = np.mean([preds[a] for a in ALGOS], axis=0)
        for k in keys:
            aucs[k].append(roc_auc_score(yv[te], preds[k]))
            if i < 5:
                oof[k][te] = preds[k]
    return aucs, oof


def main():
    metrics = {}
    parity = {}
    for mid, spec in MODELS.items():
        print(f"\n=== {mid} ===", flush=True)
        X, y, meta = spec["loader"]()
        # Missing values (in training rows AND at inference time) are replaced by the median of the
        # people WITHOUT the disease, i.e. "assume a normal value" - a screening-friendly default.
        medians = X[y == 0].median()
        Xf = X.fillna(medians)
        M = to_matrix(Xf, spec)
        clip_lo = X.min(); clip_hi = X.max()

        hps = {a: tune(a, M, y) for a in ALGOS}
        print("  hyper-parameters:", hps, flush=True)
        aucs, oof = cv_evaluate(M, y, hps)

        tiers = choose_tiers(y.values, oof["ensemble"])
        flag = oof["ensemble"] >= tiers["moderate"]
        sens = float((flag & (y.values == 1)).sum() / max(1, (y.values == 1).sum()))
        spec_ = float((~flag & (y.values == 0)).sum() / max(1, (y.values == 0).sum()))

        # Final fits on all data
        finals = {a: build(a, hps[a], M.shape[1]).fit(M, y) for a in ALGOS}
        scaler = finals["svm"][0]  # identical StandardScaler for every pipeline

        members = {}
        for a in ALGOS:
            members[a] = dict(
                name=ALGO_LABEL[a], hyperparameters=hps[a],
                metrics=dict(cv_auc_mean=round(float(np.mean(aucs[a])), 3), cv_auc_std=round(float(np.std(aucs[a])), 3),
                             brier=round(float(brier_score_loss(y, oof[a])), 3)),
                **EXPORT[a](finals[a]))

        feats = []
        for i, f in enumerate(spec["features"]):
            name = f["name"]
            entry = dict(f)
            entry["impute"] = float(np.log(max(medians[name], 1e-3))) if f.get("log") else float(medians[name])
            entry["impute_raw"] = float(medians[name])
            entry["mean"] = float(scaler.mean_[i]); entry["std"] = float(scaler.scale_[i])
            entry["clip"] = [float(clip_lo[name]), float(clip_hi[name])]
            feats.append(entry)

        ens = oof["ensemble"]
        result = dict(
            id=mid, name=spec["label"], algorithm=ENSEMBLE_NAME, features=feats,
            required=spec.get("required", []), any_of=spec.get("any_of", []), min_features=spec["min_features"],
            tiers=tiers, dataset=meta["dataset"], population=meta["population"], outcome=meta["outcome"],
            n_samples=int(len(y)), prevalence=round(float(y.mean()), 4), caveats=spec["caveats"],
            metrics=dict(
                cv_auc_mean=round(float(np.mean(aucs["ensemble"])), 3), cv_auc_std=round(float(np.std(aucs["ensemble"])), 3),
                pr_auc=round(float(average_precision_score(y, ens)), 3), brier=round(float(brier_score_loss(y, ens)), 3),
                sensitivity_at_moderate=round(sens, 3), specificity_at_moderate=round(spec_, 3),
                validation=f"5-fold stratified cross-validation x{CV_REPEATS} repeats (held-out folds only)"),
            models=members,
        )
        (OUT_DIR / f"{mid}.json").write_text(json.dumps(result, separators=(",", ":")))

        # Parity cases: raw app-style inputs + reference probabilities from the Python models.
        complete = X.dropna()
        cases = []
        rng = np.random.RandomState(0)
        for idx in rng.choice(len(complete), size=min(10, len(complete)), replace=False):
            row = complete.iloc[idx]
            inp = {}
            for f in spec["features"]:
                v = float(row[f["name"]])
                if f["kind"] == "numeric":
                    inp[f["sources"][0]["field"]] = v
                elif f["kind"] == "male":
                    inp["gender"] = "male" if v >= 0.5 else "female"
                elif f["kind"] == "current_smoker":
                    inp["smoking_status"] = "current" if v >= 0.5 else "never"
                elif f["kind"] == "former_smoker" and v >= 0.5:
                    inp["smoking_status"] = "former"
                elif f["kind"] == "hypertension":
                    inp["systolic_bp"], inp["diastolic_bp"] = (150.0, 95.0) if v >= 0.5 else (118.0, 76.0)
            if any(v <= 0 for v in [x for k, x in inp.items() if isinstance(x, float)]):
                continue
            Mrow = to_matrix(pd.DataFrame([row]), spec)
            per = {a: float(finals[a].predict_proba(Mrow)[0, 1]) for a in ALGOS}
            cases.append(dict(input=inp, probability=float(np.mean(list(per.values()))), models=per))
        parity[mid] = cases
        metrics[mid] = dict(
            name=spec["label"], n=result["n_samples"], prevalence=result["prevalence"], tiers=tiers,
            **result["metrics"], per_model={a: members[a]["metrics"] for a in ALGOS})
        print(json.dumps(metrics[mid], indent=1), flush=True)

    (OUT_DIR / "metrics.json").write_text(json.dumps(metrics, indent=1))
    (ROOT / "ml" / "parity_cases.json").write_text(json.dumps(parity, indent=1))
    print("\nDone. Models written to", OUT_DIR)


if __name__ == "__main__":
    main()
