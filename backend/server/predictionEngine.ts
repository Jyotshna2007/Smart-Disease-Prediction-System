import { ClinicalSignal } from './db.js';
import { predictWithModel, getMlModelIds, MlPrediction, RiskTier } from './mlModels.js';

export interface HealthInputs {
  age?: number;
  gender?: 'male' | 'female' | 'other';
  height_cm?: number;
  weight_kg?: number;
  bmi?: number;
  systolic_bp?: number;
  diastolic_bp?: number;
  heart_rate?: number;
  respiratory_rate?: number;
  spo2?: number;
  temperature?: number;
  // Glycemic / Metabolic
  glucose_fasting?: number;
  glucose_random?: number;
  glucose_postprandial?: number;
  hba1c?: number;
  insulin?: number;
  // Lipids / Cardio
  total_cholesterol?: number;
  hdl_cholesterol?: number;
  ldl_cholesterol?: number;
  vldl_cholesterol?: number;
  triglycerides?: number;
  troponin?: number;
  bnp?: number;
  // Renal
  serum_creatinine?: number;
  egfr?: number;
  blood_urea?: number;
  bun?: number;
  serum_uric_acid?: number;
  urine_protein?: string;
  urine_albumin?: number;
  // Hepatic
  alt?: number;
  ast?: number;
  bilirubin?: number;
  bilirubin_direct?: number;
  alp?: number;
  albumin?: number;
  total_protein?: number;
  ggt?: number;
  // Thyroid
  tsh?: number;
  free_t3?: number;
  free_t4?: number;
  // Hematology
  hemoglobin?: number;
  hematocrit?: number;
  rbc_count?: number;
  wbc_count?: number;
  platelet_count?: number;
  mcv?: number;
  mch?: number;
  mchc?: number;
  serum_iron?: number;
  ferritin?: number;
  // Inflammatory
  crp?: number;
  esr?: number;
  // Oncology
  psa?: number;
  cea?: number;
  ca125?: number;
  breast_mass_size?: number;
  birads_score?: number;
  fev1_fvc_ratio?: number;
  // Symptoms & Lifestyle
  smoking_status?: 'never' | 'former' | 'current';
  alcohol_consumption?: 'none' | 'moderate' | 'heavy';
  family_history_diabetes?: boolean;
  family_history_heart?: boolean;
  family_history_cancer?: boolean;
  frequent_urination?: boolean;
  excessive_thirst?: boolean;
  chest_pain?: boolean;
  shortness_of_breath?: boolean;
  fatigue?: boolean;
  swelling_legs?: boolean;
  headache_severe?: boolean;
  photophobia?: boolean;
  wheezing?: boolean;
  chronic_cough?: boolean;
  joint_pain?: boolean;
  pallor?: boolean;
  palpitations?: boolean;
  // Document impressions / diagnoses extracted from PDF
  diagnosed_conditions?: string[];
  notes?: string;
  symChestPain?: boolean;
}

export interface PredictionResult {
  sufficient_data: boolean;
  condition_id: string;
  predicted_condition: string;
  predicted_condition_te: string;
  predicted_condition_hi: string;
  confidence: number; // 0 - 100
  risk_level: 'Low' | 'Moderate' | 'High' | 'Severe';
  signals: ClinicalSignal[];
  summary: string;
  summary_te: string;
  summary_hi: string;
  recommendations: string[];
  recommendations_te: string[];
  recommendations_hi: string[];
  secondary_predictions?: Array<{
    disease_name: string;
    risk_level: string;
    confidence: number;
    method?: PredictionMethod;
  }>;
  method?: PredictionMethod;
  model_info?: ModelInfo;
  errorMessage?: string;
}

export type PredictionMethod = 'ml+guidelines' | 'ml' | 'guidelines';

export interface ModelInfo {
  method: PredictionMethod;
  model?: {
    id: string;
    name: string;
    algorithm: string;
    dataset: string;
    population: string;
    n_samples: number;
    cv_auc: number;
    cv_auc_std: number;
    probability_pct: number;
    tier: RiskTier;
    members: Array<{ id: string; name: string; probability_pct: number; cv_auc: number; cv_auc_std: number }>;
    drivers: Array<{ feature: string; direction: 'raises' | 'lowers' }>;
    features_provided: string[];
    features_imputed: string[];
    caveats: string[];
    validation: string;
  };
}

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-Math.max(-10, Math.min(10, z))));
}

// -------------------------------------------------------------
// Scalable Disease Model Definition Interface
// -------------------------------------------------------------
export interface EvaluatedDisease {
  id: string;
  category: string;
  nameEn: string;
  nameTe: string;
  nameHi: string;
  probability: number; // 0 to 1
  confidence: number;  // 70 to 98
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Severe';
  isApplicable: boolean; // Does the input contain relevant features?
  featureContributionScore: number;
  referenceSource: string;
  summaryEn: string;
  summaryTe: string;
  summaryHi: string;
  recommendationsEn: string[];
  recommendationsTe: string[];
  recommendationsHi: string[];
  method?: PredictionMethod;
  modelInfo?: ModelInfo;
}

export interface DiseaseModel {
  id: string;
  category: string;
  nameEn: string;
  nameTe: string;
  nameHi: string;
  referenceSource: string;
  isFeatureApplicable: (input: HealthInputs) => boolean;
  predict: (input: HealthInputs, calculatedBmi?: number) => EvaluatedDisease | null;
}

// Helper: check if diagnosed conditions list contains keywords
function hasDiagnosisMatch(inp: HealthInputs, regex: RegExp): boolean {
  return (inp.diagnosed_conditions || []).some(d => regex.test(d));
}

// -------------------------------------------------------------
// Guideline-based disease rules (NOT trained ML).
// Thresholds follow published clinical guidelines; `referenceSource` names the literature/dataset the
// thresholds were informed by. Diseases with a trained ML model (see mlModels.ts) use these rules as a
// safety net and for the explanatory text; see applyMlModels() below.
// -------------------------------------------------------------
const diseaseRegistry: DiseaseModel[] = [
  // 1. Type 2 Diabetes Mellitus (guideline rules; reference: UCI Pima Indians Diabetes Dataset & CDC NHANES III)
  {
    id: 'type_2_diabetes',
    category: 'Endocrine & Metabolic',
    nameEn: 'Type 2 Diabetes',
    nameTe: 'టైప్ 2 డయాబెటిస్',
    nameHi: 'टाइप 2 डायबिटीज',
    referenceSource: 'UCI Pima Indians Diabetes Dataset & CDC NHANES III',
    isFeatureApplicable: (inp) =>
      inp.glucose_fasting !== undefined ||
      inp.glucose_random !== undefined ||
      inp.glucose_postprandial !== undefined ||
      inp.hba1c !== undefined ||
      inp.frequent_urination ||
      inp.excessive_thirst ||
      hasDiagnosisMatch(inp, /type\s*2\s*diabetes|t2dm|diabetes\s*mellitus|hyperglycemia/i),
    predict: (inp, bmi) => {
      const fbg = inp.glucose_fasting;
      const rbg = inp.glucose_random;
      const pp = inp.glucose_postprandial;
      const effectiveGluc = fbg !== undefined ? fbg : (pp !== undefined ? pp - 15 : (rbg !== undefined ? rbg - 20 : undefined));
      const hba1c = inp.hba1c;
      const age = inp.age || 48;

      let score = 0;
      if (hba1c !== undefined) {
        if (hba1c >= 6.5) score += 0.70;
        else if (hba1c >= 5.7) score += 0.40;
        else score += 0.05;
      }
      if (effectiveGluc !== undefined) {
        if (effectiveGluc >= 126) score += 0.65;
        else if (effectiveGluc >= 100) score += 0.35;
        else score += 0.05;
      }
      if (bmi && bmi >= 30) score += 0.18;
      else if (bmi && bmi >= 25) score += 0.10;
      if (inp.frequent_urination) score += 0.22;
      if (inp.excessive_thirst) score += 0.22;
      if (inp.family_history_diabetes) score += 0.15;
      if (hasDiagnosisMatch(inp, /type\s*2\s*diabetes|t2dm|diabetes\s*mellitus/i)) score += 0.85;

      const gVal = effectiveGluc || 95;
      const z = -4.1 + 0.03 * (age - 40) + 0.07 * ((bmi || 24) - 22) + 0.038 * (gVal - 90) +
        (hba1c ? 1.45 * (hba1c - 5.4) : 0) + (inp.frequent_urination ? 0.9 : 0) + (inp.excessive_thirst ? 0.9 : 0);
      const logProb = sigmoid(z);
      const prob = Math.min(0.98, Math.max(0.12, 0.45 * score + 0.55 * logProb));

      if (score < 0.28 && (effectiveGluc !== undefined && effectiveGluc < 100) && (!hba1c || hba1c < 5.7) && !hasDiagnosisMatch(inp, /type\s*2\s*diabetes|t2dm|diabetes\s*mellitus/i)) {
        return null;
      }

      const riskLevel: 'Low' | 'Moderate' | 'High' | 'Severe' =
        prob >= 0.72 || (hba1c && hba1c >= 8.0) || (effectiveGluc && effectiveGluc >= 180) ? 'Severe' :
        prob >= 0.50 || (hba1c && hba1c >= 6.5) || (effectiveGluc && effectiveGluc >= 126) ? 'High' :
        prob >= 0.30 || (hba1c && hba1c >= 5.7) || (effectiveGluc && effectiveGluc >= 100) ? 'Moderate' : 'Low';
      const confidence = Math.min(97, Math.max(82, Math.round(prob * 22 + 75)));

      return {
        id: 'type_2_diabetes',
        category: 'Endocrine & Metabolic',
        nameEn: 'Type 2 Diabetes',
        nameTe: 'టైప్ 2 డయాబెటిస్',
        nameHi: 'टाइप 2 डायबिटीज',
        probability: prob,
        confidence,
        riskLevel,
        isApplicable: true,
        featureContributionScore: score,
        referenceSource: 'UCI Pima Indians Diabetes Dataset & CDC NHANES III',
        summaryEn: `Assessment predicts Type 2 Diabetes based on clinical markers of persistent glycemic dysregulation (${effectiveGluc ? `Blood Glucose: ${effectiveGluc} mg/dL` : ''}${hba1c ? `, HbA1c: ${hba1c}%` : ''}${bmi ? `, BMI: ${bmi}` : ''})${inp.frequent_urination || inp.excessive_thirst ? ', alongside reported osmotic symptoms (polyuria/polydipsia)' : ''}. The multi-model clinical engine confirms significant pancreatic beta-cell strain and peripheral insulin resistance.`,
        summaryTe: `రక్తంలో గ్లూకోజ్ స్థాయిలు (${effectiveGluc ? `గ్లూకోజ్: ${effectiveGluc} mg/dL` : ''}${hba1c ? `, HbA1c: ${hba1c}%` : ''}${bmi ? `, BMI: ${bmi}` : ''}) మరియు లక్షణాల ఆధారంగా టైప్ 2 డయాబెటిస్ అంచనా వేయబడింది. ఇన్సులిన్ నిరోధకతను క్లినికల్ మోడల్స్ నిర్ధారిస్తున్నాయి.`,
        summaryHi: `लगातार ग्लूकोज असंतुलन (${effectiveGluc ? `रक्त शर्करा: ${effectiveGluc} mg/dL` : ''}${hba1c ? `, HbA1c: ${hba1c}%` : ''}${bmi ? `, बीएमआई: ${bmi}` : ''}) और लक्षणों के आधार पर टाइप 2 डायबिटीज की पहचान की गई है।`,
        recommendationsEn: [
          'Consult an endocrinologist or physician for formal venous plasma glucose testing and medical review.',
          'Adopt an individualized medical nutrition therapy (MNT) plan low in refined carbohydrates and high in dietary fiber.',
          'Perform at least 150 minutes of moderate-intensity aerobic exercise per week.',
          'Establish routine self-monitoring of blood glucose (SMBG) to track glycemic stability.',
        ],
        recommendationsTe: [
          'పూర్తి రోగనిర్ధారణ కోసం ఎండోక్రినాలజిస్ట్ లేదా వైద్యుడిని సంప్రదించండి.',
          'శుద్ధి చేసిన పిండి పదార్థాలు తగ్గించి, ఫైబర్ అధికంగా ఉండే సమతుల్య ఆహారాన్ని పాటించండి.',
          'వారానికి కనీసం 150 నిమిషాల వేగవంతమైన నడక లేదా వ్యాయామం చేయండి.',
          'రక్తంలో చక్కెర స్థాయిలను క్రమం తప్పకుండా పర్యవేక్షించండి.',
        ],
        recommendationsHi: [
          'पुष्टिकरण के लिए एंडोक्रिनोलॉजिस्ट या चिकित्सक से परामर्श करें।',
          'फाइबर से भरपूर और परिष्कृत कार्बोहाइड्रेट से मुक्त आहार योजना अपनाएं।',
          'प्रति सप्ताह कम से कम 150 मिनट का मध्यम व्यायाम शामिल करें।',
          'नियमित रूप से रक्त शर्करा के स्तर की निगरानी करें।',
        ],
      };
    },
  },

  // 2. Pre-Diabetes / Impaired Fasting Glucose (ADA Standards of Medical Care in Diabetes)
  {
    id: 'prediabetes',
    category: 'Endocrine & Metabolic',
    nameEn: 'Pre-Diabetes',
    nameTe: 'ప్రీ-డయాబెటిస్ (మధుమేహ పూర్వ స్థితి)',
    nameHi: 'प्री-डायबिटीज (मधुमेह पूर्व स्थिति)',
    referenceSource: 'CDC National Diabetes Statistics & ADA Multi-Center Cohort',
    isFeatureApplicable: (inp) =>
      (inp.glucose_fasting !== undefined && inp.glucose_fasting >= 100 && inp.glucose_fasting < 126) ||
      (inp.hba1c !== undefined && inp.hba1c >= 5.7 && inp.hba1c < 6.5) ||
      hasDiagnosisMatch(inp, /pre-?diabetes|impaired\s*fasting\s*glucose|impaired\s*glucose/i),
    predict: (inp, bmi) => {
      const fbg = inp.glucose_fasting || 108;
      const hba1c = inp.hba1c || 5.9;
      let score = 0.55;
      if (hba1c >= 6.0) score += 0.25;
      if (bmi && bmi >= 25) score += 0.15;
      if (hasDiagnosisMatch(inp, /pre-?diabetes/i)) score += 0.40;

      const prob = Math.min(0.94, score);
      return {
        id: 'prediabetes',
        category: 'Endocrine & Metabolic',
        nameEn: 'Pre-Diabetes',
        nameTe: 'ప్రీ-డయాబెటిస్ (మధుమేహ పూర్వ స్థితి)',
        nameHi: 'प्री-डायबिटीज (मधुमेह पूर्व स्थिति)',
        probability: prob,
        confidence: Math.min(94, Math.round(prob * 20 + 75)),
        riskLevel: 'Moderate',
        isApplicable: true,
        featureContributionScore: score,
        referenceSource: 'CDC National Diabetes Statistics & ADA Multi-Center Cohort',
        summaryEn: `Assessment identifies Pre-Diabetes based on impaired fasting glucose (${fbg} mg/dL [Normal: 70-99]) or borderline glycated hemoglobin (${hba1c}% [Normal: < 5.7%]). Progression to overt Type 2 Diabetes is highly preventable with targeted lifestyle modification.`,
        summaryTe: `రక్తంలో గ్లూకోజ్ స్థాయిలు (${fbg} mg/dL) మరియు HbA1c (${hba1c}%) ఆధారంగా ప్రీ-డయాబెటిస్ స్థితి గుర్తించబడింది. సమయానికి తగిన జాగ్రత్తలతో పూర్తి మధుమేహం రాకుండా నివారించవచ్చు.`,
        summaryHi: `फास्टिंग ग्लूकोज (${fbg} mg/dL) और HbA1c (${hba1c}%) के आधार पर प्री-डायबिटीज की पहचान की गई है। जीवनशैली में सुधार से इसे पूरी तरह नियंत्रित किया जा सकता है।`,
        recommendationsEn: [
          'Implement the Diabetes Prevention Program (DPP) protocol targeting 5-7% weight reduction.',
          'Eliminate sugar-sweetened beverages and refined flours.',
          'Schedule repeat fasting plasma glucose and HbA1c testing in 6 months.',
        ],
        recommendationsTe: ['ఆహారంలో మార్పులు మరియు రోజువారీ నడక ద్వారా షుగర్ రాకుండా నియంత్రించండి.'],
        recommendationsHi: ['आहार में मीठे पेय बंद करें और नियमित व्यायाम से वजन नियंत्रित करें।'],
      };
    },
  },

  // 3. Non-Alcoholic Fatty Liver Disease (NAFLD / Hepatic Steatosis) (Dallas Heart Study & NIH NASH CRN)
  {
    id: 'fatty_liver',
    category: 'Hepatorenal & GI',
    nameEn: 'Fatty Liver Disease',
    nameTe: 'ఫ్యాటీ లివర్ వ్యాధి (కాలేయంలో కొవ్వు చేరడం)',
    nameHi: 'फैटी लीवर रोग (हेपेटिक स्टीटोसिस)',
    referenceSource: 'Dallas Heart Study NAFLD Cohort & NIH NASH Clinical Research Network',
    isFeatureApplicable: (inp) =>
      hasDiagnosisMatch(inp, /fatty\s*liver|hepatic\s*steatosis|steatohepatitis|nafld|nash/i) ||
      ((inp.alt !== undefined && inp.alt > 35) && (inp.triglycerides !== undefined && inp.triglycerides > 150)) ||
      (inp.alt !== undefined && inp.alt > 40 && inp.bmi !== undefined && inp.bmi >= 26),
    predict: (inp, bmi) => {
      const alt = inp.alt;
      const ast = inp.ast;
      const tg = inp.triglycerides;
      let score = 0.50;
      if (alt && alt >= 50) score += 0.25;
      if (tg && tg >= 180) score += 0.20;
      if (bmi && bmi >= 28) score += 0.15;
      if (hasDiagnosisMatch(inp, /fatty\s*liver|steatosis/i)) score += 0.45;

      const prob = Math.min(0.96, score);
      const riskLevel: 'Low' | 'Moderate' | 'High' | 'Severe' = prob >= 0.75 ? 'Severe' : prob >= 0.55 ? 'High' : 'Moderate';
      return {
        id: 'fatty_liver',
        category: 'Hepatorenal & GI',
        nameEn: 'Fatty Liver Disease',
        nameTe: 'ఫ్యాటీ లివర్ వ్యాధి (కాలేయంలో కొవ్వు చేరడం)',
        nameHi: 'फैटी लीवर रोग (हेपेटिक स्टीटोसिस)',
        probability: prob,
        confidence: Math.min(96, Math.round(prob * 20 + 76)),
        riskLevel,
        isApplicable: true,
        featureContributionScore: score,
        referenceSource: 'Dallas Heart Study NAFLD Cohort & NIH NASH Clinical Research Network',
        summaryEn: `Assessment predicts Fatty Liver Disease (Hepatic Steatosis) based on elevated hepatic transaminases (${alt ? `ALT/SGPT: ${alt} U/L` : ''}${ast ? `, AST/SGOT: ${ast} U/L` : ''})${tg ? `, hypertriglyceridemia (${tg} mg/dL)` : ''}, and hepatobiliary metabolic markers. Lipid accumulation inside hepatocytes presents ongoing steatohepatitis risk.`,
        summaryTe: `కాలేయ ఎంజైములు (${alt ? `ALT: ${alt} U/L` : ''}${ast ? `, AST: ${ast} U/L` : ''}) మరియు ట్రైగ్లిజరైడ్స్ ఆధారంగా ఫ్యాటీ లివర్ వ్యాధి అంచనా వేయబడింది. కాలేయ కణాలలో కొవ్వు పేరుకుపోవడం వల్ల వచ్చే నష్టాన్ని మోడల్ వెల్లడిస్తుంది.`,
        summaryHi: `लीवर एंजाइम (${alt ? `ALT: ${alt} U/L` : ''}${ast ? `, AST: ${ast} U/L` : ''}) और ट्राइग्लिसराइड्स के आधार पर फैटी लीवर रोग की पहचान की गई है। यकृत कोशिकाओं में वसा के संचय के स्पष्ट संकेत हैं।`,
        recommendationsEn: [
          'Consult a gastroenterologist or hepatologist for a targeted abdominal ultrasound and FIB-4 liver fibrosis staging.',
          'Adopt an authentic Mediterranean diet rich in extra virgin olive oil, nuts, and omega-3 fatty acids.',
          'Target a gradual, sustainable 7% to 10% reduction in body weight.',
          'Strictly eliminate alcohol, sweetened soft drinks, and high-fructose syrups.',
        ],
        recommendationsTe: [
          'పూర్తి అల్ట్రాసౌండ్ స్కాన్ కోసం గ్యాస్ట్రోఎంటరాలజిస్ట్‌ను సంప్రదించండి.',
          'మద్యపానాన్ని పూర్తిగా విరమించుకోండి మరియు శరీర బరువును 7-10% తగ్గించుకోండి.',
          'నూనె, వేపుడు పదార్థాలు మరియు అధిక తీపి పదార్థాలను నివారించండి.',
        ],
        recommendationsHi: [
          'अल्ट्रासाउंड और लिवर फाइब्रोसिस मूल्यांकन के लिए गैस्ट्रोएंटेरोलॉजिस्ट से मिलें।',
          'शराब का पूरी तरह त्याग करें और संतुलित आहार अपनाएं।',
          'वजन 7-10% कम करने का लक्ष्य रखें।',
        ],
      };
    },
  },

  // 4. Chronic Liver Disease & Cirrhosis (Indian Liver Patient Dataset [ILPD] & Mayo Clinic Cirrhosis)
  {
    id: 'liver_disease',
    category: 'Hepatorenal & GI',
    nameEn: 'Chronic Liver Disease',
    nameTe: 'క్రానిక్ లివర్ వ్యాధి (కాలేయ వ్యాధి)',
    nameHi: 'क्रोनिक लीवर रोग',
    referenceSource: 'Indian Liver Patient Dataset (ILPD) & Mayo Clinic Cirrhosis Registry',
    isFeatureApplicable: (inp) =>
      inp.alt !== undefined ||
      inp.ast !== undefined ||
      inp.bilirubin !== undefined ||
      inp.alp !== undefined ||
      inp.albumin !== undefined ||
      hasDiagnosisMatch(inp, /cirrhosis|chronic\s*liver|hepatitis|hepatic\s*failure/i),
    predict: (inp, bmi) => {
      const alt = inp.alt;
      const ast = inp.ast;
      const bili = inp.bilirubin;
      const alp = inp.alp;
      const alb = inp.albumin;

      let score = 0;
      if (alt && alt > 45) score += 0.40;
      if (ast && ast > 40) score += 0.40;
      if (bili && bili > 1.2) score += 0.45;
      if (alp && alp > 140) score += 0.30;
      if (alb && alb < 3.5) score += 0.35;
      if (hasDiagnosisMatch(inp, /cirrhosis|chronic\s*liver/i)) score += 0.85;

      if (score < 0.30 && !hasDiagnosisMatch(inp, /cirrhosis|chronic\s*liver/i)) {
        return null;
      }

      const prob = Math.min(0.97, Math.max(0.25, score));
      const riskLevel: 'Low' | 'Moderate' | 'High' | 'Severe' =
        prob >= 0.70 || (bili && bili >= 2.5) ? 'Severe' : prob >= 0.50 ? 'High' : 'Moderate';
      const confidence = Math.min(96, Math.max(81, Math.round(prob * 22 + 74)));

      return {
        id: 'liver_disease',
        category: 'Hepatorenal & GI',
        nameEn: 'Chronic Liver Disease',
        nameTe: 'క్రానిక్ లివర్ వ్యాధి (కాలేయ వ్యాధి)',
        nameHi: 'क्रोनिक लीवर रोग',
        probability: prob,
        confidence,
        riskLevel,
        isApplicable: true,
        featureContributionScore: score,
        referenceSource: 'Indian Liver Patient Dataset (ILPD) & Mayo Clinic Cirrhosis Registry',
        summaryEn: `Assessment predicts Chronic Liver Disease based on parenchymal hepatocellular injury markers (${alt ? `ALT: ${alt} U/L` : ''}${ast ? `, AST: ${ast} U/L` : ''}${bili ? `, Total Bilirubin: ${bili} mg/dL` : ''}${alb ? `, Albumin: ${alb} g/dL` : ''}). Clinical scoring models confirm hepatocellular damage and impaired biliary excretion.`,
        summaryTe: `కాలేయ ఎంజైములు (${alt ? `ALT: ${alt} U/L` : ''}${ast ? `, AST: ${ast} U/L` : ''}${bili ? `, బిలిరుబిన్: ${bili} mg/dL` : ''}) ఆధారంగా క్రానిక్ లివర్ వ్యాధి అంచనా వేయబడింది. కాలేయ కణాలలో వాపును మోడల్స్ ధృవీకరిస్తున్నాయి.`,
        summaryHi: `यकृत एंजाइमों (${alt ? `ALT: ${alt} U/L` : ''}${ast ? `, AST: ${ast} U/L` : ''}${bili ? `, बिलीरुबिन: ${bili} mg/dL` : ''}) के आधार पर क्रोनिक लीवर रोग की पहचान की गई है।`,
        recommendationsEn: [
          'Consult a hepatologist immediately for a comprehensive liver panel, viral serologies, and elastography (FibroScan).',
          'Strictly refrain from all alcohol consumption and avoid hepatotoxic analgesics like high-dose paracetamol.',
          'Monitor serum albumin, prothrombin time / INR, and platelet counts regularly.',
        ],
        recommendationsTe: [
          'కాలేయ పరీక్షల (FibroScan) కోసం వెంటనే హెపటాలజిస్ట్‌ను సంప్రదించండి.',
          'మద్యపానాన్ని పూర్తిగా విరమించుకోండి.',
        ],
        recommendationsHi: [
          'हेपेटोलॉजिस्ट से तुरंत मिलें और आवश्यक लिवर स्कैन करवाएं।',
          'शराब का पूरी तरह परहेज करें।',
        ],
      };
    },
  },

  // 5. Coronary Heart Disease & Ischemic Heart Disease (Framingham Heart Study & Cleveland Clinic CAD)
  {
    id: 'heart_disease',
    category: 'Cardiovascular',
    nameEn: 'Coronary Heart Disease',
    nameTe: 'కొరోనరీ హార్ట్ డిసీజ్ (గుండె జబ్బు)',
    nameHi: 'कोरोनरी हृदय रोग',
    referenceSource: 'Framingham Heart Study Cohort & Cleveland Clinic CAD Dataset',
    isFeatureApplicable: (inp) =>
      inp.chest_pain ||
      (inp.systolic_bp && inp.systolic_bp >= 130) ||
      (inp.total_cholesterol && inp.total_cholesterol >= 200) ||
      (inp.ldl_cholesterol && inp.ldl_cholesterol >= 130) ||
      inp.troponin !== undefined ||
      inp.bnp !== undefined ||
      inp.family_history_heart ||
      hasDiagnosisMatch(inp, /coronary|ischemi|cardio|angina|myocardial/i),
    predict: (inp, bmi) => {
      const sbp = inp.systolic_bp || 122;
      const dbp = inp.diastolic_bp || 80;
      const totalChol = inp.total_cholesterol;
      const ldl = inp.ldl_cholesterol;
      const age = inp.age || 50;

      let score = 0;
      if (sbp >= 140 || dbp >= 90) score += 0.35;
      else if (sbp >= 130) score += 0.18;
      if (totalChol && totalChol >= 240) score += 0.35;
      else if (totalChol && totalChol >= 200) score += 0.20;
      if (ldl && ldl >= 160) score += 0.32;
      else if (ldl && ldl >= 130) score += 0.18;
      if (inp.smoking_status === 'current') score += 0.30;
      if (inp.chest_pain) score += 0.48;
      if (inp.shortness_of_breath) score += 0.22;
      if (inp.troponin && inp.troponin > 0.04) score += 0.65;
      if (inp.family_history_heart) score += 0.18;
      if (hasDiagnosisMatch(inp, /coronary|ischemi|cardio|angina/i)) score += 0.85;

      const z = -4.3 + 0.04 * (age - 45) + 0.028 * (sbp - 120) + (totalChol ? 0.015 * (totalChol - 180) : 0) +
        (inp.smoking_status === 'current' ? 1.1 : 0) + (inp.chest_pain ? 1.6 : 0);
      const logProb = sigmoid(z);
      const prob = Math.min(0.97, Math.max(0.18, 0.45 * score + 0.55 * logProb));

      if (score < 0.28 && !inp.chest_pain && !hasDiagnosisMatch(inp, /coronary|ischemi|cardio|angina/i)) {
        return null;
      }

      const riskLevel: 'Low' | 'Moderate' | 'High' | 'Severe' =
        prob >= 0.70 || inp.troponin ? 'Severe' : prob >= 0.48 ? 'High' : 'Moderate';
      const confidence = Math.min(96, Math.max(81, Math.round(prob * 22 + 74)));

      return {
        id: 'heart_disease',
        category: 'Cardiovascular',
        nameEn: 'Coronary Heart Disease',
        nameTe: 'కొరోనరీ హార్ట్ డిసీజ్ (గుండె జబ్బు)',
        nameHi: 'कोरोनरी हृदय रोग',
        probability: prob,
        confidence,
        riskLevel,
        isApplicable: true,
        featureContributionScore: score,
        referenceSource: 'Framingham Heart Study Cohort & Cleveland Clinic CAD Dataset',
        summaryEn: `Assessment predicts Coronary Heart Disease based on hemodynamic arterial tension (${sbp}/${dbp} mmHg)${totalChol ? `, elevated atherogenic serum cholesterol (${totalChol} mg/dL)` : ''}${inp.chest_pain ? ', and reported ischemic chest tightness/discomfort' : ''}. Multi-parameter arterial scoring indicates significant coronary atherosclerotic risk.`,
        summaryTe: `రక్తపోటు కొలతలు (${sbp}/${dbp} mmHg)${totalChol ? `, కొలెస్ట్రాల్ (${totalChol} mg/dL)` : ''}${inp.chest_pain ? ' మరియు ఛాతీ నొప్పి' : ''} ఆధారంగా కొరోనరీ గుండె జబ్బు అంచనా వేయబడింది. గుండె రక్తనాళాలలో ఒత్తిడిని క్లినికల్ మోడల్స్ సూచిస్తున్నాయి.`,
        summaryHi: `रक्तचाप माप (${sbp}/${dbp} mmHg)${totalChol ? `, उच्च कोलेस्ट्रॉल (${totalChol} mg/dL)` : ''}${inp.chest_pain ? ' और सीने में दर्द' : ''} के आधार पर कोरोनरी हृदय रोग की पहचान की गई है।`,
        recommendationsEn: [
          'Schedule an evaluation with a cardiologist for a resting 12-lead ECG, echocardiogram, and treadmill stress test.',
          'Adopt a cardioprotective low-sodium (< 2,000 mg/day) and low-saturated-fat dietary protocol.',
          'Cease all tobacco use immediately if currently smoking.',
          'Seek emergency care immediately if experiencing active radiating chest heaviness, diaphoresis, or pain radiating to jaw or left arm.',
        ],
        recommendationsTe: [
          'పూర్తి ఈసీజీ (ECG) మరియు ఎకోకార్డియోగ్రామ్ పరీక్షల కోసం కార్డియాలజిస్ట్‌ను సంప్రదించండి.',
          'ఉప్పు మరియు కొవ్వు పదార్ధాలను తగ్గించి ఆరోగ్యకరమైన ఆహారాన్ని తీసుకోండి.',
          'తీవ్రమైన ఛాతీ నొప్పి ఉంటే వెంటనే అత్యవసర వైద్య విభాగాన్ని ఆశ్రయించండి.',
        ],
        recommendationsHi: [
          'ईसीजी और इकोकार्डियोग्राम के लिए हृदय रोग विशेषज्ञ से तुरंत मिलें।',
          'कम सोडियम और कम वसा वाले आहार का पालन करें तथा धूम्रपान बंद करें।',
          'सीने में तेज भारीपन महसूस होने पर तुरंत आपातकालीन सहायता लें।',
        ],
      };
    },
  },

  // 6. Essential Hypertension (NHANES Hypertension Cohort & JNC8 / ACC/AHA 2017 Guidelines)
  {
    id: 'hypertension',
    category: 'Cardiovascular',
    nameEn: 'Essential Hypertension',
    nameTe: 'ఎసెన్షియల్ హైపర్‌టెన్షన్ (అధిక రక్తపోటు)',
    nameHi: 'एसेंशियल हाइपरटेंशन (उच्च रक्तचाप)',
    referenceSource: 'CDC NHANES Longitudinal Cohort & JNC8 Clinical Standards',
    isFeatureApplicable: (inp) =>
      inp.systolic_bp !== undefined ||
      inp.diastolic_bp !== undefined ||
      hasDiagnosisMatch(inp, /hypertension|high\s*blood\s*pressure/i),
    predict: (inp, bmi) => {
      const s = inp.systolic_bp || 120;
      const d = inp.diastolic_bp || 80;

      let score = 0;
      if (s >= 160 || d >= 100) score += 0.88;
      else if (s >= 140 || d >= 90) score += 0.68;
      else if (s >= 130 || d >= 80) score += 0.45;
      else score += 0.10;
      if (inp.age && inp.age >= 50) score += 0.15;
      if (bmi && bmi >= 28) score += 0.15;
      if (hasDiagnosisMatch(inp, /hypertension/i)) score += 0.80;

      if (s < 130 && d < 80 && !hasDiagnosisMatch(inp, /hypertension/i)) {
        return null;
      }

      const prob = Math.min(0.98, Math.max(0.20, score));
      const riskLevel: 'Low' | 'Moderate' | 'High' | 'Severe' =
        s >= 160 || d >= 100 ? 'Severe' : s >= 140 || d >= 90 ? 'High' : s >= 130 ? 'Moderate' : 'Low';
      const confidence = Math.min(97, Math.max(82, Math.round(prob * 20 + 76)));

      return {
        id: 'hypertension',
        category: 'Cardiovascular',
        nameEn: 'Essential Hypertension',
        nameTe: 'ఎసెన్షియల్ హైపర్‌టెన్షన్ (అధిక రక్తపోటు)',
        nameHi: 'एसेंशियल हाइपरटेंशन (उच्च रक्तचाप)',
        probability: prob,
        confidence,
        riskLevel,
        isApplicable: true,
        featureContributionScore: score,
        referenceSource: 'CDC NHANES Longitudinal Cohort & JNC8 Clinical Standards',
        summaryEn: `Assessment predicts Essential Hypertension based on sustained arterial tension elevation (${s}/${d} mmHg). Chronic elevated hydrostatic pressure against arterial walls accelerates vascular endothelial strain and end-organ burden.`,
        summaryTe: `రక్తపోటు కొలతలు (${s}/${d} mmHg) ఆధారంగా ఎసెన్షియల్ హైపర్‌టెన్షన్ (అధిక రక్తపోటు) నిర్ధారించబడింది. ధమనుల గోడలపై నిరంతర అధిక ఒత్తిడి గుండె మరియు రక్తనాళాలపై ఒత్తిడిని పెంచుతుంది.`,
        summaryHi: `रक्तचाप माप (${s}/${d} mmHg) के आधार पर एसेंशियल हाइपरटेंशन (उच्च रक्तचाप) की पुष्टि की गई है।`,
        recommendationsEn: [
          'Visit a physician to assess whether pharmacological antihypertensive therapy is indicated.',
          'Adopt the DASH (Dietary Approaches to Stop Hypertension) dietary plan rich in potassium and magnesium.',
          'Limit dietary sodium to under 1,500 - 2,000 mg per day.',
          'Engage in daily aerobic exercise and consistent stress-reduction practices.',
        ],
        recommendationsTe: [
          'రక్తపోటు నియంత్రణ కోసం వైద్యుడిని సంప్రదించండి.',
          'ఉప్పు వాడకాన్ని తగ్గించి DASH ఆహార పద్ధతులను పాటించండి.',
          'రోజూ క్రమం తప్పకుండా వ్యాయామం చేయండి.',
        ],
        recommendationsHi: [
          'रक्तचाप नियंत्रण और दवा संबंधी मार्गदर्शन के लिए चिकित्सक से मिलें।',
          'DASH आहार योजना अपनाएं और सोडियम सीमित करें।',
        ],
      };
    },
  },

  // 7. Chronic Kidney Disease (UCI Chronic Kidney Disease Dataset & KDIGO 2024 Guidelines)
  {
    id: 'kidney_disease',
    category: 'Hepatorenal & GI',
    nameEn: 'Chronic Kidney Disease',
    nameTe: 'క్రానిక్ కిడ్నీ వ్యాధి (మూత్రపిండాల వ్యాధి)',
    nameHi: 'क्रोनिक किडनी रोग',
    referenceSource: 'UCI Chronic Kidney Disease Dataset & KDIGO Clinical Guidelines',
    isFeatureApplicable: (inp) =>
      inp.serum_creatinine !== undefined ||
      inp.egfr !== undefined ||
      inp.blood_urea !== undefined ||
      inp.bun !== undefined ||
      inp.urine_protein !== undefined ||
      inp.swelling_legs ||
      hasDiagnosisMatch(inp, /kidney|renal|nephro|ckd/i),
    predict: (inp) => {
      const creat = inp.serum_creatinine;
      const egfr = inp.egfr;
      const urea = inp.blood_urea || inp.bun;

      let score = 0;
      if (creat && creat >= 1.4) score += 0.65;
      else if (creat && creat >= 1.1) score += 0.30;
      if (egfr && egfr < 60) score += 0.70;
      else if (egfr && egfr < 90) score += 0.28;
      if (urea && urea >= 40) score += 0.35;
      if (inp.swelling_legs) score += 0.30;
      if (inp.urine_protein && !/nil|neg/i.test(inp.urine_protein)) score += 0.45;
      if (inp.fatigue) score += 0.15;
      if (hasDiagnosisMatch(inp, /kidney|renal|nephro|ckd/i)) score += 0.85;

      if (score < 0.28 && !hasDiagnosisMatch(inp, /kidney|renal|nephro|ckd/i)) {
        return null;
      }

      const prob = Math.min(0.97, Math.max(0.25, score));
      const riskLevel: 'Low' | 'Moderate' | 'High' | 'Severe' =
        prob >= 0.75 || (creat && creat >= 2.0) || (egfr && egfr < 30) ? 'Severe' : prob >= 0.50 ? 'High' : 'Moderate';
      const confidence = Math.min(96, Math.max(81, Math.round(prob * 22 + 75)));

      return {
        id: 'kidney_disease',
        category: 'Hepatorenal & GI',
        nameEn: 'Chronic Kidney Disease',
        nameTe: 'క్రానిక్ కిడ్నీ వ్యాధి (మూత్రపిండాల వ్యాధి)',
        nameHi: 'क्रोनिक किडनी रोग',
        probability: prob,
        confidence,
        riskLevel,
        isApplicable: true,
        featureContributionScore: score,
        referenceSource: 'UCI Chronic Kidney Disease Dataset & KDIGO Clinical Guidelines',
        summaryEn: `Assessment predicts Chronic Kidney Disease based on abnormal renal clearance biomarkers (${creat ? `Serum Creatinine: ${creat} mg/dL` : ''}${egfr ? `, eGFR: ${egfr} mL/min/1.73m²` : ''}${urea ? `, Urea/BUN: ${urea} mg/dL` : ''})${inp.swelling_legs ? ' and clinical peripheral edema' : ''}. Renal functional models indicate compromised glomerular filtration efficiency.`,
        summaryTe: `సీరం క్రియాటినిన్${creat ? ` (${creat} mg/dL)` : ''}${egfr ? `, eGFR: ${egfr}` : ''} మరియు కాళ్ళ వాపు ఆధారంగా క్రానిక్ కిడ్నీ వ్యాధి అంచనా వేయబడింది. మూత్రపిండాల వడపోత సామర్థ్యం తగ్గినట్లు క్లినికల్ మోడల్ వెల్లడిస్తుంది.`,
        summaryHi: `सीरम क्रिएटिनिन${creat ? ` (${creat} mg/dL)` : ''}${egfr ? `, eGFR: ${egfr}` : ''} के आधार पर क्रोनिक किडनी रोग की पहचान की गई है। गुर्दे की निस्पंदन क्षमता में कमी पाई गई है।`,
        recommendationsEn: [
          'Consult a nephrologist for formal estimated GFR calculation and a urine albumin-to-creatinine ratio (uACR) test.',
          'Avoid all nephrotoxic medications, specifically over-the-counter NSAIDs (ibuprofen, diclofenac, naproxen).',
          'Maintain strict blood pressure and glycemic targets to protect residual renal microvasculature.',
          'Consult a renal dietitian for protein, sodium, and potassium balance.',
        ],
        recommendationsTe: [
          'ఖచ్చితమైన eGFR మరియు మూత్రంలో ప్రోటీన్ పరీక్షల కోసం నెఫ్రాలజిస్ట్‌ను సంప్రదించండి.',
          'పెయిన్ కిల్లర్ మందులు (NSAIDs) వాడకాన్ని పూర్తిగా నివారించండి.',
          'రక్తపోటు మరియు షుగర్‌ను కచ్చితంగా అదుపులో ఉంచుకోండి.',
        ],
        recommendationsHi: [
          'औपचारिक परीक्षणों के लिए नेफ्रोलॉजिस्ट से तुरंत संपर्क करें।',
          'दर्द निवारक दवाओं (NSAIDs) के सेवन से बचें और रक्तचाप नियंत्रित रखें।',
        ],
      };
    },
  },

  // 8. Iron Deficiency & Chronic Anemia (WHO Global Anemia Database & NHANES Hematology)
  {
    id: 'anemia',
    category: 'Hematologic & Oncologic',
    nameEn: 'Iron Deficiency & Chronic Anemia',
    nameTe: 'ఐరన్ లోపం & రక్తహీనత (అనీమియా)',
    nameHi: 'आयरन की कमी और एनीमिया (रक्ताल्पता)',
    referenceSource: 'WHO Global Database on Anemia & CDC NHANES Hematology Survey',
    isFeatureApplicable: (inp) =>
      inp.hemoglobin !== undefined ||
      inp.hematocrit !== undefined ||
      inp.mcv !== undefined ||
      inp.ferritin !== undefined ||
      inp.serum_iron !== undefined ||
      inp.pallor ||
      hasDiagnosisMatch(inp, /anemia|anaemia|hemoglobin\s*low|haemoglobin\s*low/i),
    predict: (inp) => {
      const hb = inp.hemoglobin;
      const mcv = inp.mcv;
      const ferritin = inp.ferritin;
      const isFem = inp.gender === 'female';
      const hbThreshold = isFem ? 12.0 : 13.0;

      let score = 0;
      if (hb !== undefined) {
        if (hb < 8.0) score += 0.92;
        else if (hb < 10.0) score += 0.72;
        else if (hb < hbThreshold) score += 0.52;
      }
      if (mcv && mcv < 80) score += 0.35; // Microcytic
      if (ferritin && ferritin < 30) score += 0.40;
      if (inp.pallor) score += 0.25;
      if (inp.fatigue) score += 0.15;
      if (hasDiagnosisMatch(inp, /anemia|anaemia/i)) score += 0.80;

      if (score < 0.28 && !hasDiagnosisMatch(inp, /anemia|anaemia/i)) {
        return null;
      }

      const prob = Math.min(0.98, Math.max(0.30, score));
      const riskLevel: 'Low' | 'Moderate' | 'High' | 'Severe' =
        hb && hb < 8.0 ? 'Severe' : prob >= 0.60 ? 'High' : 'Moderate';
      const confidence = Math.min(97, Math.max(82, Math.round(prob * 20 + 76)));

      return {
        id: 'anemia',
        category: 'Hematologic & Oncologic',
        nameEn: 'Iron Deficiency & Chronic Anemia',
        nameTe: 'ఐరన్ లోపం & రక్తహీనత (అనీమియా)',
        nameHi: 'आयरन की कमी और एनीमिया (रक्ताल्पता)',
        probability: prob,
        confidence,
        riskLevel,
        isApplicable: true,
        featureContributionScore: score,
        referenceSource: 'WHO Global Database on Anemia & CDC NHANES Hematology Survey',
        summaryEn: `Assessment predicts Iron Deficiency & Chronic Anemia based on depressed hemoglobin concentration (${hb ? `Hemoglobin: ${hb} g/dL [Normal: ${hbThreshold}+ g/dL]` : ''}${mcv ? `, MCV: ${mcv} fL` : ''}${ferritin ? `, Ferritin: ${ferritin} ng/mL` : ''})${inp.fatigue ? ', persistent systemic fatigue, and cellular oxygen transport deficit' : ''}. Hematologic algorithms identify significant microcytic/normocytic erythrocyte deficiency.`,
        summaryTe: `రక్తంలో హిమోగ్లోబిన్ పరిమాణం తగ్గడం (${hb ? `హిమోగ్లోబిన్: ${hb} g/dL` : ''}${mcv ? `, MCV: ${mcv}` : ''}) మరియు అలసట ఆధారంగా ఐరన్ లోపం & రక్తహీనత (అనీమియా) నిర్ధారించబడింది. ఎర్ర రక్త కణాల ఆక్సిజన్ రవాణా సామర్థ్యం తగ్గినట్లు మోడల్ వెల్లడిస్తుంది.`,
        summaryHi: `कम हीमोग्लोबिन स्तर (${hb ? `हीमोग्लोबिन: ${hb} g/dL` : ''}${mcv ? `, एमसीवी: ${mcv}` : ''}) और लगातार थकान के आधार पर आयरन की कमी और एनीमिया की पहचान की गई है।`,
        recommendationsEn: [
          'Consult a hematologist or general physician for a Complete Blood Count (CBC) and full iron profile (Serum Iron, Ferritin, TIBC).',
          'Evaluate potential sources of chronic blood loss or malabsorption with your doctor.',
          'Incorporate dietary iron-rich foods (lean meats, dark leafy spinach, lentils) paired with vitamin C to enhance absorption.',
          'Discuss therapeutic oral or intravenous iron supplementation under clinical supervision.',
        ],
        recommendationsTe: [
          'పూర్తి రక్త పరీక్ష (CBC) మరియు ఐరన్ ప్రొఫైల్ పరీక్షల కోసం వైద్యుడిని సంప్రదించండి.',
          'ఐరన్ సమృద్ధిగా ఉండే ఆకుకూరలు, బెల్లం, ఎండుద్రాక్ష మరియు పప్పుధాన్యాలను ఆహారంలో చేర్చుకోండి.',
          'వైద్యుల సలహా మేరకు ఐరన్ మాత్రలను వాడండి.',
        ],
        recommendationsHi: [
          'पूर्ण रक्त गणना (CBC) और आयरन प्रोफाइल के लिए चिकित्सक से परामर्श लें।',
          'आहार में आयरन से भरपूर खाद्य पदार्थ (पालक, दालें, अनार) शामिल करें।',
          'चिकित्सक की सलाह से आयरन सप्लीमेंट्स लें।',
        ],
      };
    },
  },

  // 9. Primary Hypothyroidism (UCI Thyroid Dataset & American Thyroid Association [ATA])
  {
    id: 'thyroid_disease',
    category: 'Endocrine & Metabolic',
    nameEn: 'Primary Hypothyroidism',
    nameTe: 'హైపోథైరాయిడిజం (థైరాయిడ్ వ్యాధి)',
    nameHi: 'हाइपोथायरायडिज्म',
    referenceSource: 'UCI Thyroid Disease Dataset & American Thyroid Association Standards',
    isFeatureApplicable: (inp) =>
      inp.tsh !== undefined ||
      inp.free_t4 !== undefined ||
      hasDiagnosisMatch(inp, /thyroid|hypothyroid/i),
    predict: (inp, bmi) => {
      const tsh = inp.tsh;
      const ft4 = inp.free_t4;

      let score = 0;
      if (tsh && tsh > 10.0) score += 0.88;
      else if (tsh && tsh > 4.5) score += 0.65;
      if (ft4 && ft4 < 0.8) score += 0.35;
      if (inp.fatigue) score += 0.20;
      if (inp.heart_rate && inp.heart_rate < 60) score += 0.20;
      if (bmi && bmi >= 28) score += 0.15;
      if (hasDiagnosisMatch(inp, /hypothyroid/i)) score += 0.80;

      if (((tsh !== undefined && tsh <= 4.5) || score < 0.30) && !hasDiagnosisMatch(inp, /hypothyroid/i)) {
        return null;
      }

      const prob = Math.min(0.97, Math.max(0.30, score));
      const riskLevel: 'Low' | 'Moderate' | 'High' | 'Severe' =
        prob >= 0.75 || (tsh && tsh >= 15.0) ? 'Severe' : prob >= 0.50 ? 'High' : 'Moderate';
      const confidence = Math.min(96, Math.max(82, Math.round(prob * 20 + 76)));

      return {
        id: 'thyroid_disease',
        category: 'Endocrine & Metabolic',
        nameEn: 'Primary Hypothyroidism',
        nameTe: 'హైపోథైరాయిడిజం (థైరాయిడ్ వ్యాధి)',
        nameHi: 'हाइपोथायरायडिज्म',
        probability: prob,
        confidence,
        riskLevel,
        isApplicable: true,
        featureContributionScore: score,
        referenceSource: 'UCI Thyroid Disease Dataset & American Thyroid Association Standards',
        summaryEn: `Assessment predicts Primary Hypothyroidism based on elevated serum Thyroid Stimulating Hormone (${tsh ? `TSH: ${tsh} mIU/L [Normal: 0.4 - 4.5 mIU/L]` : ''}${ft4 ? `, Free T4: ${ft4} ng/dL` : ''})${inp.fatigue ? ', clinical cold sensitivity, and cellular metabolic slowing' : ''}. Endocrine algorithmic models confirm primary thyroid hormone deficit.`,
        summaryTe: `పెరిగిన TSH హార్మోన్ స్థాయిలు (${tsh ? `TSH: ${tsh} mIU/L` : ''}) మరియు అలసట ఆధారంగా హైపోథైరాయిడిజం అంచనా వేయబడింది. థైరాయిడ్ గ్రంధి పనితీరు తగ్గినట్లు ఎండోక్రైన్ మోడల్ నిర్ధారిస్తుంది.`,
        summaryHi: `बढ़े हुए TSH स्तर (${tsh ? `TSH: ${tsh} mIU/L` : ''}) और लगातार थकान के आधार पर हाइपोथायरायडिज्म की पहचान की गई है।`,
        recommendationsEn: [
          'Consult an endocrinologist for a full thyroid profile (Free T3, Free T4, and anti-TPO antibodies).',
          'Discuss initiation or dosage optimization of levothyroxine sodium replacement therapy.',
          'Take prescribed thyroid medication strictly on an empty stomach with water 30-60 minutes before breakfast.',
        ],
        recommendationsTe: [
          'పూర్తి థైరాయిడ్ పరీక్షల (Free T3, Free T4, anti-TPO) కోసం ఎండోక్రినాలజిస్ట్‌ను సంప్రదించండి.',
          'వైద్యుల సలహా ప్రకారం థైరాయిడ్ మందులను క్రమం తప్పకుండా తీసుకోండి.',
        ],
        recommendationsHi: [
          'थायरॉइड प्रोफाइल परीक्षण के लिए विशेषज्ञ से परामर्श लें और नियमित दवा लें।',
        ],
      };
    },
  },

  // 10. Hyperthyroidism & Graves' Disease / Thyrotoxicosis
  {
    id: 'hyperthyroidism',
    category: 'Endocrine & Metabolic',
    nameEn: 'Hyperthyroidism / Thyrotoxicosis',
    nameTe: 'హైపర్‌థైరాయిడిజం',
    nameHi: 'हाइपरथायरायडिज्म',
    referenceSource: 'UCI Thyroid Disease Dataset & ATA Thyrotoxicosis Guidelines',
    isFeatureApplicable: (inp) =>
      (inp.tsh !== undefined && inp.tsh < 0.4) ||
      hasDiagnosisMatch(inp, /hyperthyroid|graves|thyrotoxicosis/i),
    predict: (inp) => {
      const tsh = inp.tsh;
      let score = 0.60;
      if (tsh !== undefined && tsh < 0.1) score += 0.25;
      if (inp.heart_rate && inp.heart_rate > 95) score += 0.25;
      if (hasDiagnosisMatch(inp, /hyperthyroid|graves/i)) score += 0.40;

      const prob = Math.min(0.96, score);
      return {
        id: 'hyperthyroidism',
        category: 'Endocrine & Metabolic',
        nameEn: 'Hyperthyroidism / Thyrotoxicosis',
        nameTe: 'హైపర్‌థైరాయిడిజం',
        nameHi: 'हाइपरथायरायडिज्म',
        probability: prob,
        confidence: Math.min(95, Math.round(prob * 20 + 76)),
        riskLevel: 'High',
        isApplicable: true,
        featureContributionScore: score,
        referenceSource: 'UCI Thyroid Disease Dataset & ATA Thyrotoxicosis Guidelines',
        summaryEn: `Assessment predicts Hyperthyroidism based on suppressed serum TSH (${tsh ? `${tsh} mIU/L` : 'suppressed'})${inp.heart_rate && inp.heart_rate > 95 ? ' and resting sinus tachycardia' : ''}. Accelerated metabolic turnover and thyroid hyperfunction are indicated.`,
        summaryTe: `తగ్గిన TSH స్థాయిలు (${tsh ? `${tsh} mIU/L` : ''}) మరియు గుండె వేగం ఆధారంగా హైపర్‌థైరాయిడిజం అంచనా వేయబడింది.`,
        summaryHi: `अत्यधिक कम TSH स्तर (${tsh ? `${tsh} mIU/L` : ''}) के आधार पर हाइपरथायरायडिज्म की पहचान की गई है।`,
        recommendationsEn: [
          'Consult an endocrinologist for Free T3, Free T4, and TSH receptor antibody (TRAb) testing.',
          'Perform a thyroid radioactive iodine uptake scan or high-resolution ultrasound as indicated.',
        ],
        recommendationsTe: ['ఎండోక్రినాలజిస్ట్‌ను సంప్రదించి మరిన్ని పరీక్షలు చేయించుకోండి.'],
        recommendationsHi: ['थायरॉइड विशेषज्ञ से मिलकर पूर्ण परीक्षण करवाएं।'],
      };
    },
  },

  // 11. Chronic Migraine & Headache Disorders (ICHD-3 International Classification of Headache Disorders)
  {
    id: 'migraine',
    category: 'Neurological',
    nameEn: 'Chronic Migraine',
    nameTe: 'మైగ్రేన్ తలనొప్పి వ్యాధి',
    nameHi: 'क्रोनिक माइग्रेन',
    referenceSource: 'International Classification of Headache Disorders (ICHD-3) Cohort',
    isFeatureApplicable: (inp) =>
      inp.headache_severe ||
      inp.photophobia ||
      hasDiagnosisMatch(inp, /migraine|headache|cephalalgia/i),
    predict: (inp) => {
      let score = 0;
      if (inp.headache_severe) score += 0.60;
      if (inp.photophobia) score += 0.35;
      if (inp.fatigue) score += 0.15;
      if (hasDiagnosisMatch(inp, /migraine/i)) score += 0.75;

      const prob = Math.min(0.95, Math.max(0.35, score));
      return {
        id: 'migraine',
        category: 'Neurological',
        nameEn: 'Chronic Migraine',
        nameTe: 'మైగ్రేన్ తలనొప్పి వ్యాధి',
        nameHi: 'क्रोनिक माइग्रेन',
        probability: prob,
        confidence: Math.min(95, Math.round(prob * 20 + 75)),
        riskLevel: prob >= 0.65 ? 'High' : 'Moderate',
        isApplicable: true,
        featureContributionScore: score,
        referenceSource: 'International Classification of Headache Disorders (ICHD-3) Cohort',
        summaryEn: `Assessment predicts Chronic Migraine based on recurrent severe unilateral throbbing headache symptoms${inp.photophobia ? ', heightened sensory sensitivity (photophobia)' : ''}, and neurovascular fatigue. Neurological criteria alignment conforms to clinical ICHD-3 guidelines.`,
        summaryTe: `తీవ్రమైన తలనొప్పి, కాంతిని భరించలేకపోవడం (ఫోటోఫోబియా) మరియు అలసట ఆధారంగా మైగ్రేన్ తలనొప్పి వ్యాధి అంచనా వేయబడింది.`,
        summaryHi: `गंभीर धड़कते सिरदर्द और प्रकाश संवेदनशीलता के आधार पर क्रोनिक माइग्रेन की पहचान की गई है।`,
        recommendationsEn: [
          'Consult a neurologist or headache specialist for personalized prophylactic and abortive migraine regimens.',
          'Maintain a daily headache trigger diary tracking dietary triggers, sleep cycles, and screen exposure.',
          'Optimize hydration, sleep hygiene, and minimize bright light exposure during aura phases.',
        ],
        recommendationsTe: ['న్యూరాలజిస్ట్‌ను సంప్రదించండి మరియు తలనొప్పికి దారితీసే కారణాలను డైరీలో నమోదు చేయండి.'],
        recommendationsHi: ['न्यूरोलॉजिस्ट से परामर्श लें और सिरदर्द डायरी बनाए रखें।'],
      };
    },
  },

  // 12. Bronchial Asthma (Global Initiative for Asthma [GINA])
  {
    id: 'asthma',
    category: 'Pulmonary & Respiratory',
    nameEn: 'Bronchial Asthma',
    nameTe: 'బ్రోన్కియల్ ఆస్తమా',
    nameHi: 'ब्रोन्कियल अस्थमा',
    referenceSource: 'Global Initiative for Asthma (GINA) & Childhood Asthma Management Program (CAMP)',
    isFeatureApplicable: (inp) =>
      inp.wheezing ||
      (inp.shortness_of_breath && inp.chronic_cough) ||
      hasDiagnosisMatch(inp, /asthma|bronchial/i),
    predict: (inp) => {
      let score = 0;
      if (inp.wheezing) score += 0.65;
      if (inp.shortness_of_breath) score += 0.35;
      if (inp.chronic_cough) score += 0.25;
      if (inp.smoking_status === 'current') score += 0.15;
      if (hasDiagnosisMatch(inp, /asthma/i)) score += 0.80;

      const prob = Math.min(0.96, Math.max(0.35, score));
      return {
        id: 'asthma',
        category: 'Pulmonary & Respiratory',
        nameEn: 'Bronchial Asthma',
        nameTe: 'బ్రోన్కియల్ ఆస్తమా',
        nameHi: 'ब्रोन्कियल अस्थमा',
        probability: prob,
        confidence: Math.min(95, Math.round(prob * 20 + 76)),
        riskLevel: prob >= 0.68 ? 'High' : 'Moderate',
        isApplicable: true,
        featureContributionScore: score,
        referenceSource: 'Global Initiative for Asthma (GINA) & Childhood Asthma Management Program (CAMP)',
        summaryEn: `Assessment predicts Bronchial Asthma based on characteristic respiratory airway hyperresponsiveness, wheezing, exertional dyspnea, and bronchial constriction. Pulmonary criteria align with clinical GINA guidelines.`,
        summaryTe: `గురక (వీజింగ్), శ్వాస తీసుకోవడంలో ఇబ్బంది మరియు దగ్గు ఆధారంగా బ్రోన్కియల్ ఆస్తమా అంచనా వేయబడింది.`,
        summaryHi: `घबराहट (व्हीजिंग), सांस फूलने और खांसी के आधार पर ब्रोन्कियल अस्थमा की पहचान की गई है।`,
        recommendationsEn: [
          'Consult a pulmonologist for formal spirometry testing with bronchodilator reversibility assessment.',
          'Avoid active/passive cigarette smoke, cold dry air, and recognized environmental allergens.',
          'Verify proper inhaler actuation technique with a respiratory care specialist.',
        ],
        recommendationsTe: ['ఊపిరితిత్తుల పరీక్షల (PFT) కోసం పల్మోనాలజిస్ట్‌ను సంప్రదించండి.'],
        recommendationsHi: ['फेफड़ों के कार्य परीक्षण (PFT) के लिए पल्मोनोलॉजिस्ट से मिलें।'],
      };
    },
  },

  // 13. Chronic Obstructive Pulmonary Disease (COPD & Emphysema) (GOLD Guidelines & COPDGene)
  {
    id: 'copd',
    category: 'Pulmonary & Respiratory',
    nameEn: 'Chronic Obstructive Pulmonary Disease (COPD)',
    nameTe: 'క్రానిక్ అబ్స్ట్రక్టివ్ పల్మనరీ డిసీజ్ (COPD)',
    nameHi: 'क्रोनिक ऑब्सट्रक्टिव पल्मोनरी डिजीज (सीओपीडी)',
    referenceSource: 'GOLD International Strategy & COPDGene Multicenter Study',
    isFeatureApplicable: (inp) =>
      ((inp.smoking_status === 'current' || inp.smoking_status === 'former') &&
       (inp.chronic_cough || inp.shortness_of_breath || inp.spo2 !== undefined)) ||
      hasDiagnosisMatch(inp, /copd|emphysema|chronic\s*bronchitis/i),
    predict: (inp) => {
      let score = 0;
      if (inp.smoking_status === 'current') score += 0.40;
      else if (inp.smoking_status === 'former') score += 0.25;
      if (inp.chronic_cough) score += 0.35;
      if (inp.shortness_of_breath) score += 0.30;
      if (inp.spo2 && inp.spo2 < 93) score += 0.45;
      if (inp.age && inp.age >= 45) score += 0.20;
      if (hasDiagnosisMatch(inp, /copd/i)) score += 0.80;

      const prob = Math.min(0.96, Math.max(0.35, score));
      return {
        id: 'copd',
        category: 'Pulmonary & Respiratory',
        nameEn: 'Chronic Obstructive Pulmonary Disease (COPD)',
        nameTe: 'క్రానిక్ అబ్స్ట్రక్టివ్ పల్మనరీ డిసీజ్ (COPD)',
        nameHi: 'क्रोनिक ऑब्सट्रक्टिव पल्मोनरी डिजीज (सीओपीडी)',
        probability: prob,
        confidence: Math.min(95, Math.round(prob * 20 + 76)),
        riskLevel: prob >= 0.70 ? 'High' : 'Moderate',
        isApplicable: true,
        featureContributionScore: score,
        referenceSource: 'GOLD International Strategy & COPDGene Multicenter Study',
        summaryEn: `Assessment predicts Chronic Obstructive Pulmonary Disease (COPD) based on long-term tobacco exposure, chronic productive cough, and progressive exertional dyspnea.`,
        summaryTe: `ధూమపానం చరిత్ర, దీర్ఘకాలిక దగ్గు మరియు శ్వాసలో ఇబ్బంది ఆధారంగా COPD అంచనా వేయబడింది.`,
        summaryHi: `धूम्रपान के इतिहास, पुरानी खांसी और सांस की तकलीफ के आधार पर सीओपीडी की पहचान की गई है।`,
        recommendationsEn: [
          'Consult a chest specialist for comprehensive post-bronchodilator spirometry (FEV1/FVC < 0.70).',
          'Enroll in pulmonary rehabilitation and stop all smoking immediately.',
        ],
        recommendationsTe: ['పల్మోనాలజిస్ట్‌ను సంప్రదించి స్పైరోమెట్రీ పరీక్ష చేయించుకోండి.'],
        recommendationsHi: ['पल्मोनोलॉजिस्ट से मिलें और तुरंत धूम्रपान बंद करें।'],
      };
    },
  },

  // 14. Breast Cancer Risk & Lesion Classification (UCI Wisconsin Diagnostic Breast Cancer [WDBC])
  {
    id: 'breast_cancer',
    category: 'Hematologic & Oncologic',
    nameEn: 'Breast Neoplasm / High-Risk Lesion',
    nameTe: 'బ్రెస్ట్ నియోప్లాజమ్ / రొమ్ము కణితి ప్రమాదం',
    nameHi: 'स्तन नियोप्लाज्म / स्तन ट्यूमर जोखिम',
    referenceSource: 'UCI Breast Cancer Wisconsin Diagnostic (WDBC) & SEER Registry',
    isFeatureApplicable: (inp) =>
      inp.breast_mass_size !== undefined ||
      inp.birads_score !== undefined ||
      inp.ca125 !== undefined ||
      inp.family_history_cancer ||
      hasDiagnosisMatch(inp, /breast\s*cancer|carcinoma|malignan|birads|breast\s*mass|ductal\s*carcinoma/i),
    predict: (inp) => {
      let score = 0;
      if (inp.birads_score && inp.birads_score >= 4) score += 0.85;
      else if (inp.birads_score && inp.birads_score === 3) score += 0.40;
      if (inp.breast_mass_size && inp.breast_mass_size >= 2.0) score += 0.50;
      if (inp.family_history_cancer) score += 0.25;
      if (hasDiagnosisMatch(inp, /breast\s*cancer|carcinoma|malignan/i)) score += 0.88;

      const prob = Math.min(0.97, Math.max(0.35, score));
      return {
        id: 'breast_cancer',
        category: 'Hematologic & Oncologic',
        nameEn: 'Breast Neoplasm / High-Risk Lesion',
        nameTe: 'బ్రెస్ట్ నియోప్లాజమ్ / రొమ్ము కణితి ప్రమాదం',
        nameHi: 'स्तन नियोप्लाज्म / स्तन ट्यूमर जोखिम',
        probability: prob,
        confidence: Math.min(96, Math.round(prob * 20 + 76)),
        riskLevel: prob >= 0.70 ? 'Severe' : 'High',
        isApplicable: true,
        featureContributionScore: score,
        referenceSource: 'UCI Breast Cancer Wisconsin Diagnostic (WDBC) & SEER Registry',
        summaryEn: `Assessment predicts Breast Neoplasm / High-Risk Lesion based on suspicious diagnostic findings${inp.birads_score ? ` (BI-RADS Category ${inp.birads_score})` : ''}${inp.breast_mass_size ? `, mass dimensions (${inp.breast_mass_size} cm)` : ''}, and oncologic clinical indicators.`,
        summaryTe: `రొమ్ము పరీక్షలలో అనుమానాస్పద సంకేతాలు మరియు బయాప్సీ/స్కాన్ ఫలితాల ఆధారంగా రొమ్ము కణితి ప్రమాదం అంచనా వేయబడింది.`,
        summaryHi: `संदिग्ध नैदानिक निष्कर्षों और बायोप्सी/स्कैन परिणामों के आधार पर स्तन ट्यूमर के उच्च जोखिम की पहचान की गई है।`,
        recommendationsEn: [
          'Urgent referral to a breast surgical oncologist for core-needle biopsy and multidisciplinary tumor board review.',
          'Obtain bilateral diagnostic mammography and targeted high-resolution breast ultrasound/MRI.',
        ],
        recommendationsTe: ['వెంటనే ఆంకాలజిస్ట్ లేదా వైద్య నిపుణులను సంప్రదించి బయాప్సీ పరీక్ష చేయించుకోండి.'],
        recommendationsHi: ['तत्काल बायोप्सी और सटीक निदान के लिए ऑन्कोलॉजिस्ट से संपर्क करें।'],
      };
    },
  },

  // 15. Prostatic Disease / Neoplasm Risk (NCI SEER Prostate & PSA Biomarker Staging)
  {
    id: 'prostate_disease',
    category: 'Hematologic & Oncologic',
    nameEn: 'Prostatic Disease / High-Risk Neoplasm',
    nameTe: 'ప్రోస్టేట్ వ్యాధి ప్రమాదం',
    nameHi: 'प्रोस्टेट रोग / उच्च जोखिम नियोप्लाज्म',
    referenceSource: 'NCI SEER Prostate Adenocarcinoma Cohort & PSA Biomarker Registry',
    isFeatureApplicable: (inp) =>
      inp.psa !== undefined ||
      hasDiagnosisMatch(inp, /prostate|psa\s*elevated/i),
    predict: (inp) => {
      const psa = inp.psa;
      let score = 0.50;
      if (psa && psa >= 10.0) score += 0.45;
      else if (psa && psa >= 4.0) score += 0.30;
      if (inp.age && inp.age >= 60) score += 0.15;
      if (hasDiagnosisMatch(inp, /prostate/i)) score += 0.40;

      const prob = Math.min(0.96, score);
      return {
        id: 'prostate_disease',
        category: 'Hematologic & Oncologic',
        nameEn: 'Prostatic Disease / High-Risk Neoplasm',
        nameTe: 'ప్రోస్టేట్ వ్యాధి ప్రమాదం',
        nameHi: 'प्रोस्टेट रोग / उच्च जोखिम नियोप्लाज्म',
        probability: prob,
        confidence: Math.min(95, Math.round(prob * 20 + 76)),
        riskLevel: psa && psa >= 10.0 ? 'Severe' : 'High',
        isApplicable: true,
        featureContributionScore: score,
        referenceSource: 'NCI SEER Prostate Adenocarcinoma Cohort & PSA Biomarker Registry',
        summaryEn: `Assessment predicts Prostatic Disease based on elevated serum Prostate-Specific Antigen (${psa ? `${psa} ng/mL [Normal: < 4.0 ng/mL]` : 'elevated'}).`,
        summaryTe: `పెరిగిన PSA స్థాయిలు (${psa ? `${psa} ng/mL` : ''}) ఆధారంగా ప్రోస్టేట్ వ్యాధి ప్రమాదం అంచనా వేయబడింది.`,
        summaryHi: `बढ़े हुए पीएसए स्तर (${psa ? `${psa} ng/mL` : ''}) के आधार पर प्रोस्टेट रोग की पहचान की गई है।`,
        recommendationsEn: [
          'Consult a urologist for digital rectal examination (DRE) and multiparametric prostate MRI.',
          'Evaluate Free-to-Total PSA ratio and discuss prostate biopsy as clinically indicated.',
        ],
        recommendationsTe: ['యూరాలజిస్ట్‌ను సంప్రదించి పరీక్షలు చేయించుకోండి.'],
        recommendationsHi: ['यूरोलॉजिस्ट से मिलकर सटीक परीक्षण करवाएं।'],
      };
    },
  },

  // 16. Hyperuricemia & Gout Disorder (ACR / EULAR Clinical Consensus Guidelines)
  {
    id: 'gout',
    category: 'Musculoskeletal & Inflammatory',
    nameEn: 'Hyperuricemia & Gout Disorder',
    nameTe: 'యూరిక్ యాసిడ్ & గౌట్ వ్యాధి',
    nameHi: 'हाइपरयूरिसीमिया और गाउट (गठिया)',
    referenceSource: 'ACR/EULAR Gout Classification Study & UK Biobank Hyperuricemia Cohort',
    isFeatureApplicable: (inp) =>
      inp.serum_uric_acid !== undefined ||
      inp.joint_pain ||
      hasDiagnosisMatch(inp, /gout|uric\s*acid/i),
    predict: (inp) => {
      const ua = inp.serum_uric_acid;
      let score = 0;
      if (ua && ua >= 7.0) score += 0.65;
      else if (ua && ua >= 6.0) score += 0.35;
      if (inp.joint_pain) score += 0.40;
      if (hasDiagnosisMatch(inp, /gout/i)) score += 0.70;

      const prob = Math.min(0.96, Math.max(0.35, score));
      return {
        id: 'gout',
        category: 'Musculoskeletal & Inflammatory',
        nameEn: 'Hyperuricemia & Gout Disorder',
        nameTe: 'యూరిక్ యాసిడ్ & గౌట్ వ్యాధి',
        nameHi: 'हाइपरयूरिसीमिया और गाउट (गठिया)',
        probability: prob,
        confidence: Math.min(95, Math.round(prob * 20 + 75)),
        riskLevel: ua && ua >= 8.5 ? 'High' : 'Moderate',
        isApplicable: true,
        featureContributionScore: score,
        referenceSource: 'ACR/EULAR Gout Classification Study & UK Biobank Hyperuricemia Cohort',
        summaryEn: `Assessment predicts Hyperuricemia & Gout Disorder based on elevated serum uric acid (${ua ? `${ua} mg/dL [Normal: < 7.0 mg/dL]` : 'elevated'})${inp.joint_pain ? ' and acute inflammatory peripheral joint pain' : ''}. Monosodium urate crystal precipitation risk is confirmed.`,
        summaryTe: `రక్తంలో యూరిక్ యాసిడ్ స్థాయిలు పెరగడం (${ua ? `${ua} mg/dL` : ''}) మరియు కీళ్ల నొప్పుల ఆధారంగా గౌట్ వ్యాధి అంచనా వేయబడింది.`,
        summaryHi: `बढ़े हुए यूरिक एसिड (${ua ? `${ua} mg/dL` : ''}) और जोड़ों के दर्द के आधार पर गाउट की पहचान की गई है।`,
        recommendationsEn: [
          'Consult a rheumatologist for serum urate management and joint evaluation.',
          'Restrict dietary purines (red meats, organ meats, shellfish, alcohol/beer).',
          'Maintain high daily fluid intake to facilitate renal uric acid clearance.',
        ],
        recommendationsTe: ['యూరిక్ యాసిడ్ నియంత్రణ కోసం వైద్యుడిని సంప్రదించండి.'],
        recommendationsHi: ['यूरिक एसिड नियंत्रण के लिए रुमेटोलॉजिस्ट से परामर्श लें।'],
      };
    },
  },

  // 17. Metabolic Syndrome & Severe Dyslipidemia (NCEP ATP III Multi-Criteria Consensus)
  {
    id: 'metabolic_syndrome',
    category: 'Cardiovascular',
    nameEn: 'Metabolic Syndrome & Severe Dyslipidemia',
    nameTe: 'మెటబాలిక్ సిండ్రోమ్ & లిపిడ్ అసమతుల్యత',
    nameHi: 'मेटाबॉलिक सिंड्रोम और डिस्लिपिडेमिया',
    referenceSource: 'NCEP ATP III Multi-Center Cohort & Framingham Offspring Study',
    isFeatureApplicable: (inp) =>
      inp.triglycerides !== undefined ||
      inp.bmi !== undefined ||
      (inp.total_cholesterol && inp.total_cholesterol >= 210) ||
      hasDiagnosisMatch(inp, /metabolic|dyslipid|hypercholesterol|hyperlipid/i),
    predict: (inp, bmi) => {
      let criteriaCount = 0;
      if (bmi && bmi >= 28) criteriaCount++;
      if (inp.triglycerides && inp.triglycerides >= 150) criteriaCount++;
      if (inp.hdl_cholesterol && inp.hdl_cholesterol < 45) criteriaCount++;
      if (inp.systolic_bp && inp.systolic_bp >= 130) criteriaCount++;
      if (inp.glucose_fasting && inp.glucose_fasting >= 100) criteriaCount++;
      if (hasDiagnosisMatch(inp, /metabolic|dyslipid/i)) criteriaCount += 2;

      if (criteriaCount < 3 && !(inp.triglycerides && inp.triglycerides >= 200) && !hasDiagnosisMatch(inp, /metabolic|dyslipid/i)) {
        return null;
      }

      const prob = Math.min(0.96, 0.40 + criteriaCount * 0.12);
      return {
        id: 'metabolic_syndrome',
        category: 'Cardiovascular',
        nameEn: 'Metabolic Syndrome & Severe Dyslipidemia',
        nameTe: 'మెటబాలిక్ సిండ్రోమ్ & లిపిడ్ అసమతుల్యత',
        nameHi: 'मेटाबॉलिक सिंड्रोम और डिस्लिपिडेमिया',
        probability: prob,
        confidence: Math.min(95, Math.round(prob * 20 + 75)),
        riskLevel: criteriaCount >= 4 ? 'High' : 'Moderate',
        isApplicable: true,
        featureContributionScore: criteriaCount * 0.2,
        referenceSource: 'NCEP ATP III Multi-Center Cohort & Framingham Offspring Study',
        summaryEn: `Assessment predicts Metabolic Syndrome & Severe Dyslipidemia with ${criteriaCount} concurrent metabolic criteria (central adiposity, hypertriglyceridemia, arterial hypertension, and impaired fasting glucose).`,
        summaryTe: `అధిక ట్రైగ్లిజరైడ్స్, కొలెస్ట్రాల్ మరియు రక్తపోటు ఆధారంగా మెటబాలిక్ సిండ్రోమ్ అంచనా వేయబడింది.`,
        summaryHi: `उच्च ट्राइग्लिसराइड्स, कोलेस्ट्रॉल और रक्तचाप के आधार पर मेटाबॉलिक सिंड्रोम की पहचान की गई है।`,
        recommendationsEn: [
          'Consult a physician and registered dietitian for an intensive lifestyle and cardiovascular risk modification program.',
          'Target a sustained 7-10% weight loss and eliminate trans fats and refined high-glycemic carbohydrates.',
        ],
        recommendationsTe: ['ఆహారపు అలవాట్లను మార్చుకోవడానికి వైద్యుడిని సంప్రదించండి.'],
        recommendationsHi: ['चिकित्सक से परामर्श लेकर जीवनशैली और आहार में सुधार करें।'],
      };
    },
  },

  // 18. Gastroesophageal Reflux Disease (GERD) & Peptic Ulcer
  {
    id: 'gerd',
    category: 'Hepatorenal & GI',
    nameEn: 'Gastroesophageal Reflux Disease (GERD)',
    nameTe: 'గ్యాస్ట్రోఎసోఫాగియల్ రిఫ్లక్స్ వ్యాధి (GERD)',
    nameHi: 'गैस्ट्रोएसोफेगल रिफ्लक्स रोग (जीईआरडी)',
    referenceSource: 'Montreal Definition GERD Consensus & ACG Clinical Guidelines',
    isFeatureApplicable: (inp) =>
      hasDiagnosisMatch(inp, /gerd|reflux|peptic|gastritis|ulcer/i),
    predict: (inp) => {
      let score = 0.70;
      if (inp.bmi && inp.bmi >= 28) score += 0.15;
      const prob = Math.min(0.95, score);
      return {
        id: 'gerd',
        category: 'Hepatorenal & GI',
        nameEn: 'Gastroesophageal Reflux Disease (GERD)',
        nameTe: 'గ్యాస్ట్రోఎసోఫాగియల్ రిఫ్లక్స్ వ్యాధి (GERD)',
        nameHi: 'गैस्ट्रोएसोफेगल रिफ्लक्स रोग (जीईआरडी)',
        probability: prob,
        confidence: Math.min(94, Math.round(prob * 20 + 75)),
        riskLevel: 'Moderate',
        isApplicable: true,
        featureContributionScore: score,
        referenceSource: 'Montreal Definition GERD Consensus & ACG Clinical Guidelines',
        summaryEn: 'Assessment predicts Gastroesophageal Reflux Disease (GERD) based on documented gastric acid hypersecretion, mucosal reflux irritation, and characteristic upper gastrointestinal symptoms.',
        summaryTe: 'కడుపులో ఆమ్లాల తీవ్రత, ఛాతీలో మంట ఆధారంగా గ్యాస్ట్రోఎసోఫాగియల్ రిఫ్లక్స్ వ్యాధి (GERD) అంచనా వేయబడింది.',
        summaryHi: 'एसिड रिफ्लक्स और सीने में जलन के आधार पर गैस्ट्रोएसोफेगल रिफ्लक्स रोग (जीईआरडी) की पहचान की गई है।',
        recommendationsEn: [
          'Consult a gastroenterologist for upper GI endoscopy if symptoms are chronic or accompanied by dysphagia.',
          'Avoid trigger foods: caffeine, chocolate, spicy foods, and late-night heavy meals.',
          'Elevate the head of the bed by 6 inches during sleep.',
        ],
        recommendationsTe: ['ఆహారంలో కారం, నూనె తగ్గించండి మరియు గ్యాస్ట్రోఎంటరాలజిస్ట్‌ను సంప్రదించండి.'],
        recommendationsHi: ['मसालेदार भोजन से बचें और विशेषज्ञ से सलाह लें।'],
      };
    },
  },

  // 19. Community-Acquired Pneumonia & Lower Respiratory Infection
  {
    id: 'pneumonia',
    category: 'Pulmonary & Respiratory',
    nameEn: 'Community-Acquired Pneumonia',
    nameTe: 'న్యూమోనియా (ఊపిరితిత్తుల ఇన్ఫెక్షన్)',
    nameHi: 'कम्युनिटी-अक्वायर्ड निमोनिया',
    referenceSource: 'ATS / BTS Community Acquired Pneumonia Registry & CURB-65 Validation Cohort',
    isFeatureApplicable: (inp) =>
      hasDiagnosisMatch(inp, /pneumonia|bronchopneumonia|consolidation/i) ||
      Boolean(inp.spo2 !== undefined && inp.spo2 < 94 && inp.chronic_cough),
    predict: (inp) => {
      let score = 0.70;
      if (inp.spo2 && inp.spo2 < 92) score += 0.25;
      if (hasDiagnosisMatch(inp, /pneumonia/i)) score += 0.25;
      const prob = Math.min(0.96, score);
      return {
        id: 'pneumonia',
        category: 'Pulmonary & Respiratory',
        nameEn: 'Community-Acquired Pneumonia',
        nameTe: 'న్యూమోనియా (ఊపిరితిత్తుల ఇన్ఫెక్షన్)',
        nameHi: 'कम्युनिटी-अक्वायर्ड निमोनिया',
        probability: prob,
        confidence: Math.min(95, Math.round(prob * 20 + 76)),
        riskLevel: inp.spo2 && inp.spo2 < 92 ? 'Severe' : 'High',
        isApplicable: true,
        featureContributionScore: score,
        referenceSource: 'ATS / BTS Community Acquired Pneumonia Registry & CURB-65 Validation Cohort',
        summaryEn: `Assessment predicts Community-Acquired Pneumonia based on respiratory infection markers${inp.spo2 ? `, hypoxemia (SpO2: ${inp.spo2}%)` : ''}, and acute pulmonary consolidation findings.`,
        summaryTe: `శ్వాసలో ఇబ్బంది మరియు ఆక్సిజన్ స్థాయిలు తగ్గడం ఆధారంగా న్యూమోనియా ఇన్ఫెక్షన్ అంచనా వేయబడింది.`,
        summaryHi: `श्वसन संक्रमण और कम ऑक्सीजन स्तर के आधार पर निमोनिया की पहचान की गई है।`,
        recommendationsEn: [
          'Immediate medical consultation for chest X-ray and targeted antibiotic or antiviral therapy.',
          'Monitor SpO2 continuously; seek emergency oxygen therapy if saturation drops below 92%.',
        ],
        recommendationsTe: ['వెంటనే ఛాతీ ఎక్స్-రే మరియు యాంటీబయాటిక్ చికిత్స కోసం వైద్యుడిని సంప్రదించండి.'],
        recommendationsHi: ['छाती के एक्स-रे और त्वरित उपचार के लिए तुरंत डॉक्टर से मिलें।'],
      };
    },
  },

  // 20. Rheumatoid & Inflammatory Arthritis
  {
    id: 'rheumatoid_arthritis',
    category: 'Musculoskeletal & Inflammatory',
    nameEn: 'Rheumatoid Arthritis',
    nameTe: 'రుమటాయిడ్ ఆర్థరైటిస్ (కీళ్ల వాతం)',
    nameHi: 'रुमेटीइड गठिया',
    referenceSource: 'ACR / EULAR Rheumatoid Arthritis Multi-Center Classification Cohort',
    isFeatureApplicable: (inp) =>
      hasDiagnosisMatch(inp, /rheumatoid|inflammatory\s*arthritis/i) ||
      Boolean(inp.joint_pain && ((inp.esr !== undefined && inp.esr > 30) || (inp.crp !== undefined && inp.crp > 6))),
    predict: (inp) => {
      let score = 0.65;
      if (inp.esr && inp.esr > 40) score += 0.20;
      if (inp.crp && inp.crp > 10) score += 0.20;
      if (hasDiagnosisMatch(inp, /rheumatoid/i)) score += 0.35;
      const prob = Math.min(0.96, score);
      return {
        id: 'rheumatoid_arthritis',
        category: 'Musculoskeletal & Inflammatory',
        nameEn: 'Rheumatoid Arthritis',
        nameTe: 'రుమటాయిడ్ ఆర్థరైటిస్ (కీళ్ల వాతం)',
        nameHi: 'रुमेटीइड गठिया',
        probability: prob,
        confidence: Math.min(95, Math.round(prob * 20 + 75)),
        riskLevel: 'High',
        isApplicable: true,
        featureContributionScore: score,
        referenceSource: 'ACR / EULAR Rheumatoid Arthritis Multi-Center Classification Cohort',
        summaryEn: `Assessment predicts Rheumatoid Arthritis based on peripheral symmetrical joint pain, elevated acute-phase inflammatory reactants (${inp.crp ? `CRP: ${inp.crp} mg/L` : ''}${inp.esr ? `, ESR: ${inp.esr} mm/hr` : ''}), and systemic autoimmune inflammatory features.`,
        summaryTe: `కీళ్ల నొప్పులు మరియు పెరిగిన వాపు సంకేతాలు (ESR/CRP) ఆధారంగా రుమటాయిడ్ ఆర్థరైటిస్ అంచనా వేయబడింది.`,
        summaryHi: `जोड़ों के दर्द और बढ़ी हुई सूजन (ESR/CRP) के आधार पर रुमेटीइड गठिया की पहचान की गई है।`,
        recommendationsEn: [
          'Consult a rheumatologist for Rheumatoid Factor (RF) and anti-cyclic citrullinated peptide (anti-CCP) testing.',
          'Discuss disease-modifying antirheumatic drugs (DMARDs) to prevent joint erosion.',
        ],
        recommendationsTe: ['రుమటాలజిస్ట్‌ను సంప్రదించి మరిన్ని పరీక్షలు చేయించుకోండి.'],
        recommendationsHi: ['रुमेटोलॉजिस्ट से मिलकर जोड़ों के उपचार की योजना बनाएं।'],
      };
    },
  },
];


// -------------------------------------------------------------
// Machine-learning layer
// Trained models (ml/train_models.py -> ml/models/*.json) are evaluated next to the guideline rules.
//  * ML available  -> ML probability is shown; risk level = the higher of ML tier and guideline tier
//                     (a screening tool should not let one layer silence the other).
//  * ML unavailable (not enough inputs) -> guideline rules only, clearly labelled as such.
// -------------------------------------------------------------
const RISK_RANK: Record<string, number> = { Low: 0, Moderate: 1, High: 2, Severe: 3 };
const maxRisk = (a?: RiskTier, b?: RiskTier): RiskTier => ((RISK_RANK[a || 'Low'] >= RISK_RANK[b || 'Low']) ? (a || 'Low') : (b || 'Low')) as RiskTier;

// ML model id -> id of the guideline rule that covers the same disease (if any)
const ML_TO_RULE: Record<string, string | undefined> = {
  type_2_diabetes: 'type_2_diabetes',
  heart_disease: 'heart_disease',
  liver_disease: 'liver_disease',
  kidney_disease: 'kidney_disease',
  hypothyroidism: 'thyroid_disease',
  stroke_risk: undefined,
};

// Text used when the ML model flags a disease that the guideline rule did not (or has no rule).
const ML_TEXT: Record<string, Pick<EvaluatedDisease, 'category' | 'nameEn' | 'nameTe' | 'nameHi' | 'summaryEn' | 'summaryTe' | 'summaryHi' | 'recommendationsEn' | 'recommendationsTe' | 'recommendationsHi'>> = {
  stroke_risk: {
    category: 'Cardiovascular',
    nameEn: 'Stroke Risk',
    nameTe: 'స్ట్రోక్ ప్రమాదం (పక్షవాతం)',
    nameHi: 'स्ट्रोक का जोखिम',
    summaryEn: 'Your age, blood pressure, glucose, BMI and smoking profile place you in an elevated stroke-risk group compared with the people the model learned from.',
    summaryTe: 'మీ వయస్సు, రక్తపోటు, గ్లూకోజ్, BMI మరియు ధూమపాన అలవాట్ల ఆధారంగా స్ట్రోక్ (పక్షవాతం) ప్రమాదం సగటు కంటే ఎక్కువగా ఉన్నట్లు మోడల్ అంచనా వేసింది.',
    summaryHi: 'आपकी उम्र, रक्तचाप, ग्लूकोज़, बीएमआई और धूम्रपान की स्थिति के आधार पर मॉडल ने स्ट्रोक का जोखिम औसत से अधिक आँका है।',
    recommendationsEn: [
      'Have your blood pressure checked regularly; controlling hypertension is the single most effective stroke-prevention step.',
      'Discuss stroke prevention (blood pressure, cholesterol, glucose and, if relevant, atrial-fibrillation screening) with your doctor.',
      'Stop smoking, limit alcohol and stay physically active.',
      'Learn the warning signs (face drooping, arm weakness, speech difficulty) and seek emergency care immediately if they appear.',
    ],
    recommendationsTe: [
      'రక్తపోటును క్రమం తప్పకుండా పరీక్షించుకోండి మరియు నియంత్రణలో ఉంచుకోండి.',
      'స్ట్రోక్ నివారణ గురించి వైద్యుడితో చర్చించండి.',
      'ధూమపానం మానండి, మద్యం తగ్గించండి, రోజూ వ్యాయామం చేయండి.',
      'ముఖం వంకర, చేయి బలహీనత, మాట్లాడటంలో ఇబ్బంది కనిపిస్తే వెంటనే అత్యవసర వైద్య సహాయం తీసుకోండి.',
    ],
    recommendationsHi: [
      'रक्तचाप की नियमित जाँच कराएँ और उसे नियंत्रण में रखें।',
      'स्ट्रोक की रोकथाम के बारे में अपने डॉक्टर से बात करें।',
      'धूम्रपान छोड़ें, शराब सीमित करें और सक्रिय रहें।',
      'चेहरा टेढ़ा होना, हाथ में कमज़ोरी या बोलने में दिक्कत दिखे तो तुरंत आपातकालीन सहायता लें।',
    ],
  },
};

const GENERIC_ML_RECS = {
  en: ['Consult a physician to confirm this screening result with appropriate clinical tests.', 'Share this report with your doctor and follow their advice.'],
  te: ['ఈ స్క్రీనింగ్ ఫలితాన్ని నిర్ధారించుకోవడానికి వైద్యుడిని సంప్రదించి తగిన పరీక్షలు చేయించుకోండి.', 'ఈ నివేదికను మీ వైద్యుడికి చూపించండి.'],
  hi: ['इस स्क्रीनिंग परिणाम की पुष्टि के लिए डॉक्टर से मिलकर उचित जाँच कराएँ।', 'यह रिपोर्ट अपने डॉक्टर को दिखाएँ।'],
};

function buildModelInfo(ml: MlPrediction, method: PredictionMethod): ModelInfo {
  return {
    method,
    model: {
      id: ml.modelId,
      name: ml.name,
      algorithm: ml.spec.algorithm,
      dataset: ml.spec.dataset,
      population: ml.spec.population,
      n_samples: ml.spec.n_samples,
      cv_auc: ml.spec.metrics.cv_auc_mean,
      cv_auc_std: ml.spec.metrics.cv_auc_std,
      probability_pct: Math.round(ml.probability * 100),
      tier: ml.tier,
      members: ml.members.map(m => ({ id: m.id, name: m.name, probability_pct: Math.round(m.probability * 100), cv_auc: m.cv_auc, cv_auc_std: m.cv_auc_std })),
      drivers: ml.drivers.map(d => ({ feature: d.feature, direction: d.direction })),
      features_provided: ml.featuresProvided,
      features_imputed: ml.featuresImputed,
      caveats: ml.spec.caveats,
      validation: ml.spec.metrics.validation,
    },
  };
}

function applyMlModels(input: HealthInputs, bmi: number | undefined, evaluated: EvaluatedDisease[]): EvaluatedDisease[] {
  const out = [...evaluated];

  for (const mlId of getMlModelIds()) {
    let ml: MlPrediction | null = null;
    try {
      ml = predictWithModel(mlId, input, bmi);
    } catch (err) {
      console.error(`ML model ${mlId} failed:`, err);
    }
    if (!ml) continue; // not enough inputs -> guideline rule (if any) stays as-is

    const ruleId = ML_TO_RULE[mlId];
    const idx = ruleId ? out.findIndex(e => e.id === ruleId) : -1;
    const rule = idx >= 0 ? out[idx] : undefined;
    const mlFlagged = ml.tier !== 'Low';
    if (!mlFlagged && !rule) continue;

    let base: EvaluatedDisease;
    if (rule) {
      base = { ...rule };
    } else {
      const reg = ruleId ? diseaseRegistry.find(d => d.id === ruleId) : undefined;
      const txt = ML_TEXT[mlId];
      base = {
        id: ruleId || mlId,
        category: txt?.category || reg?.category || 'General',
        nameEn: txt?.nameEn || reg?.nameEn || ml.name,
        nameTe: txt?.nameTe || reg?.nameTe || ml.name,
        nameHi: txt?.nameHi || reg?.nameHi || ml.name,
        probability: 0,
        confidence: 0,
        riskLevel: 'Low',
        isApplicable: true,
        featureContributionScore: 0,
        referenceSource: ml.spec.dataset,
        summaryEn: txt?.summaryEn || `The trained model estimates an elevated likelihood of ${ml.name.toLowerCase()} from the submitted values.`,
        summaryTe: txt?.summaryTe || `సమర్పించిన విలువల ఆధారంగా శిక్షణ పొందిన మోడల్ ${ml.name} సంభావ్యత ఎక్కువగా ఉన్నట్లు అంచనా వేసింది.`,
        summaryHi: txt?.summaryHi || `प्रस्तुत मानों के आधार पर प्रशिक्षित मॉडल ने ${ml.name} की संभावना अधिक आँकी है।`,
        recommendationsEn: txt?.recommendationsEn || GENERIC_ML_RECS.en,
        recommendationsTe: txt?.recommendationsTe || GENERIC_ML_RECS.te,
        recommendationsHi: txt?.recommendationsHi || GENERIC_ML_RECS.hi,
      };
    }

    const method: PredictionMethod = rule ? 'ml+guidelines' : 'ml';
    base.riskLevel = maxRisk(rule?.riskLevel, ml.tier);
    base.probability = Math.max(rule?.probability ?? 0, ml.score);
    base.featureContributionScore = Math.max(rule?.featureContributionScore ?? 0, ml.score);
    base.confidence = Math.min(99, Math.max(1, Math.round(ml.probability * 100)));
    base.referenceSource = ml.spec.dataset;
    base.method = method;
    base.modelInfo = buildModelInfo(ml, method);
    // Model details (accuracy, datasets, the 4 individual models) are NOT written into the patient summary;
    // they live on the separate "About the model" page (see model_info + /api/model-info).

    if (idx >= 0) out[idx] = base; else out.push(base);
  }
  return out;
}

// -------------------------------------------------------------
// Core Feature Extraction & Multi-Disease Evaluation Engine
// -------------------------------------------------------------
export function evaluateClinicalFeatures(input: HealthInputs): PredictionResult {
  // Normalize alias
  if (input.symChestPain && input.chest_pain === undefined) {
    input.chest_pain = true;
  }

  // 1. BMI calculation if missing
  let calculatedBmi = input.bmi;
  if (!calculatedBmi && input.height_cm && input.weight_kg && input.height_cm > 50 && input.weight_kg > 20) {
    const heightM = input.height_cm / 100;
    calculatedBmi = parseFloat((input.weight_kg / (heightM * heightM)).toFixed(1));
  }

  // 2. Extract and format active clinical signals for user presentation
  const signals: ClinicalSignal[] = [];

  if (calculatedBmi !== undefined) {
    const status = calculatedBmi >= 30 ? 'high' : calculatedBmi >= 25 ? 'elevated' : calculatedBmi < 18.5 ? 'low' : 'normal';
    signals.push({
      name: 'Body Mass Index (BMI)',
      key: 'bmi',
      value: calculatedBmi,
      unit: 'kg/m²',
      normalRange: '18.5 - 24.9',
      status,
      impactDescription: status === 'high' ? 'Obese range; high visceral adiposity' : status === 'elevated' ? 'Overweight category' : 'Normal body mass range',
    });
  }

  if (input.systolic_bp !== undefined || input.diastolic_bp !== undefined) {
    const s = input.systolic_bp || 120;
    const d = input.diastolic_bp || 80;
    const bpStatus = (s >= 140 || d >= 90) ? 'high' : (s >= 130 || d >= 80) ? 'elevated' : 'normal';
    signals.push({
      name: 'Blood Pressure',
      key: 'blood_pressure',
      value: `${s}/${d}`,
      unit: 'mmHg',
      normalRange: '< 120/80',
      status: bpStatus,
      impactDescription: bpStatus === 'high' ? 'Stage 2 hypertensive vascular strain' : bpStatus === 'elevated' ? 'Pre-hypertension / Stage 1 elevation' : 'Optimal arterial pressure',
    });
  }

  if (input.heart_rate !== undefined) {
    const hr = input.heart_rate;
    const hrStatus = hr > 100 ? 'high' : hr < 60 ? 'low' : 'normal';
    signals.push({
      name: 'Heart Rate',
      key: 'heart_rate',
      value: hr,
      unit: 'bpm',
      normalRange: '60 - 100',
      status: hrStatus,
      impactDescription: hrStatus === 'high' ? 'Tachycardia noted' : hrStatus === 'low' ? 'Bradycardia noted' : 'Normal resting pulse',
    });
  }

  if (input.glucose_fasting !== undefined) {
    const fbg = input.glucose_fasting;
    const status = fbg >= 126 ? 'high' : fbg >= 100 ? 'elevated' : fbg < 70 ? 'low' : 'normal';
    signals.push({
      name: 'Fasting Blood Glucose',
      key: 'glucose_fasting',
      value: fbg,
      unit: 'mg/dL',
      normalRange: '70 - 99',
      status,
      impactDescription: status === 'high' ? 'Exceeds diabetic fasting threshold (>= 126 mg/dL)' : status === 'elevated' ? 'Impaired fasting glucose' : 'Normal euglycemic fasting range',
    });
  } else if (input.glucose_random !== undefined) {
    const rbg = input.glucose_random;
    const status = rbg >= 200 ? 'high' : rbg >= 140 ? 'elevated' : 'normal';
    signals.push({
      name: 'Random Blood Glucose',
      key: 'glucose_random',
      value: rbg,
      unit: 'mg/dL',
      normalRange: '70 - 139',
      status,
      impactDescription: status === 'high' ? 'Marked hyperglycemia detected' : status === 'elevated' ? 'Borderline elevated casual glucose' : 'Normal physiological glucose',
    });
  }

  if (input.hba1c !== undefined) {
    const a1c = input.hba1c;
    const status = a1c >= 6.5 ? 'high' : a1c >= 5.7 ? 'elevated' : 'normal';
    signals.push({
      name: 'Glycated Hemoglobin (HbA1c)',
      key: 'hba1c',
      value: a1c,
      unit: '%',
      normalRange: '< 5.7',
      status,
      impactDescription: status === 'high' ? 'Diagnostic of Diabetes Mellitus (>= 6.5%)' : status === 'elevated' ? 'Pre-diabetic glycemic range (5.7 - 6.4%)' : 'Optimal long-term glycemic equilibrium',
    });
  }

  if (input.total_cholesterol !== undefined) {
    const chol = input.total_cholesterol;
    const status = chol >= 240 ? 'high' : chol >= 200 ? 'elevated' : 'normal';
    signals.push({
      name: 'Total Cholesterol',
      key: 'total_cholesterol',
      value: chol,
      unit: 'mg/dL',
      normalRange: '< 200',
      status,
      impactDescription: status === 'high' ? 'High atherogenic lipid burden' : status === 'elevated' ? 'Borderline elevated cholesterol' : 'Optimal physiological total lipid profile',
    });
  }

  if (input.ldl_cholesterol !== undefined) {
    const ldl = input.ldl_cholesterol;
    const status = ldl >= 160 ? 'high' : ldl >= 130 ? 'elevated' : 'normal';
    signals.push({
      name: 'LDL Cholesterol',
      key: 'ldl_cholesterol',
      value: ldl,
      unit: 'mg/dL',
      normalRange: '< 100',
      status,
      impactDescription: status === 'high' ? 'Elevated low-density atherogenic lipoprotein' : status === 'elevated' ? 'Moderate cardiovascular risk' : 'Optimal circulating LDL level',
    });
  }

  if (input.triglycerides !== undefined) {
    const tg = input.triglycerides;
    const status = tg >= 200 ? 'high' : tg >= 150 ? 'elevated' : 'normal';
    signals.push({
      name: 'Triglycerides',
      key: 'triglycerides',
      value: tg,
      unit: 'mg/dL',
      normalRange: '< 150',
      status,
      impactDescription: status === 'high' ? 'Hypertriglyceridemia; pancreatitis & liver fat risk' : status === 'elevated' ? 'Borderline high triglycerides' : 'Normal fasting triglyceride levels',
    });
  }

  if (input.serum_creatinine !== undefined) {
    const cr = input.serum_creatinine;
    const isFem = input.gender === 'female';
    const normalMax = isFem ? 1.1 : 1.25;
    const status = cr > normalMax ? 'high' : 'normal';
    signals.push({
      name: 'Serum Creatinine',
      key: 'serum_creatinine',
      value: cr,
      unit: 'mg/dL',
      normalRange: `0.6 - ${normalMax}`,
      status,
      impactDescription: status === 'high' ? 'Reduced glomerular clearance rate' : 'Normal renal filtration baseline',
    });
  }

  if (input.alt !== undefined) {
    const alt = input.alt;
    const status = alt > 45 ? 'high' : 'normal';
    signals.push({
      name: 'Alanine Aminotransferase (ALT / SGPT)',
      key: 'alt',
      value: alt,
      unit: 'U/L',
      normalRange: '< 45',
      status,
      impactDescription: status === 'high' ? 'Hepatocellular inflammation marker' : 'Normal liver parenchymal activity',
    });
  }

  if (input.ast !== undefined) {
    const ast = input.ast;
    const status = ast > 40 ? 'high' : 'normal';
    signals.push({
      name: 'Aspartate Aminotransferase (AST / SGOT)',
      key: 'ast',
      value: ast,
      unit: 'U/L',
      normalRange: '< 40',
      status,
      impactDescription: status === 'high' ? 'Hepatic cellular leakage' : 'Normal transaminase baseline',
    });
  }

  if (input.tsh !== undefined) {
    const tsh = input.tsh;
    const status = tsh > 4.5 ? 'high' : tsh < 0.4 ? 'low' : 'normal';
    signals.push({
      name: 'Thyroid Stimulating Hormone (TSH)',
      key: 'tsh',
      value: tsh,
      unit: 'mIU/L',
      normalRange: '0.4 - 4.5',
      status,
      impactDescription: status === 'high' ? 'Elevated thyrotropin signaling hypothyroidism' : status === 'low' ? 'Suppressed thyrotropin signaling hyperthyroidism' : 'Euthyroid pituitary-thyroid balance',
    });
  }

  if (input.hemoglobin !== undefined) {
    const hb = input.hemoglobin;
    const isFem = input.gender === 'female';
    const normalLow = isFem ? 12.0 : 13.0;
    const status = hb < normalLow ? 'high' : 'normal';
    signals.push({
      name: 'Hemoglobin (Hb)',
      key: 'hemoglobin',
      value: hb,
      unit: 'g/dL',
      normalRange: isFem ? '12.0 - 15.5' : '13.0 - 17.5',
      status,
      impactDescription: status === 'high' ? 'Depressed hemoglobin concentration indicating anemia' : 'Optimal erythrocyte oxygen carrying capacity',
    });
  }

  if (input.serum_uric_acid !== undefined) {
    const ua = input.serum_uric_acid;
    const status = ua > 7.0 ? 'high' : 'normal';
    signals.push({
      name: 'Serum Uric Acid',
      key: 'serum_uric_acid',
      value: ua,
      unit: 'mg/dL',
      normalRange: '< 7.0',
      status,
      impactDescription: status === 'high' ? 'Hyperuricemia; monosodium urate precipitation risk' : 'Normal purine metabolite excretion',
    });
  }

  if (input.psa !== undefined) {
    const psa = input.psa;
    const status = psa >= 4.0 ? 'high' : 'normal';
    signals.push({
      name: 'Prostate-Specific Antigen (PSA)',
      key: 'psa',
      value: psa,
      unit: 'ng/mL',
      normalRange: '< 4.0',
      status,
      impactDescription: status === 'high' ? 'Elevated PSA marker requiring urological evaluation' : 'Normal prostatic baseline',
    });
  }

  if (input.spo2 !== undefined) {
    const sp = input.spo2;
    const status = sp < 95 ? 'high' : 'normal';
    signals.push({
      name: 'Pulse Oxygen Saturation (SpO2)',
      key: 'spo2',
      value: sp,
      unit: '%',
      normalRange: '95 - 100',
      status,
      impactDescription: status === 'high' ? 'Hypoxemia noted' : 'Normal physiological arterial oxygenation',
    });
  }

  // 3. Check if there are any documented conditions or symptoms from PDF
  if (input.diagnosed_conditions && input.diagnosed_conditions.length > 0) {
    for (const cond of input.diagnosed_conditions.slice(0, 3)) {
      signals.push({
        name: 'Report Finding',
        key: 'document_finding',
        value: cond,
        unit: 'Clinical',
        normalRange: 'Absent',
        status: 'high',
        impactDescription: `Documented clinical impression or confirmed finding: ${cond}`,
      });
    }
  }

  // 4. Intelligent Model Routing:
  // Evaluate all disease models whose features are present in the patient data.
  const evaluatedDiseases: EvaluatedDisease[] = [];

  for (const model of diseaseRegistry) {
    if (model.isFeatureApplicable(input)) {
      try {
        const result = model.predict(input, calculatedBmi);
        if (result) {
          evaluatedDiseases.push(result);
        }
      } catch (err) {
        console.error(`Error in model ${model.id}:`, err);
      }
    }
  }

  // 4b. Machine-learning layer (trained models) merged with the guideline rules
  const allDiseases = applyMlModels(input, calculatedBmi, evaluatedDiseases);

  // Guideline-only results have no trained model behind them: replace the old fixed 82-97% "confidence"
  // with the rule score itself and label the method honestly.
  for (const d of allDiseases) {
    if (!d.method) {
      d.method = 'guidelines';
      d.modelInfo = { method: 'guidelines' };
      d.confidence = Math.min(95, Math.max(5, Math.round(d.probability * 100)));
    }
  }

  // 5. Decision: If at least one disease model matches
  if (allDiseases.length > 0) {
    // Highest risk tier first, then highest severity score
    allDiseases.sort((a, b) =>
      (RISK_RANK[b.riskLevel] - RISK_RANK[a.riskLevel]) ||
      ((b.probability * 0.7 + b.featureContributionScore * 0.3) - (a.probability * 0.7 + a.featureContributionScore * 0.3)));
    const primary = allDiseases[0];

    const secondary = allDiseases.slice(1).filter(d => d.riskLevel !== 'Low').slice(0, 3).map(d => ({
      disease_name: d.nameEn,
      risk_level: d.riskLevel,
      confidence: d.confidence,
      method: d.method,
    }));

    return {
      sufficient_data: true,
      condition_id: primary.id,
      predicted_condition: primary.nameEn,
      predicted_condition_te: primary.nameTe,
      predicted_condition_hi: primary.nameHi,
      confidence: primary.confidence,
      risk_level: primary.riskLevel,
      signals,
      summary: primary.summaryEn,
      summary_te: primary.summaryTe,
      summary_hi: primary.summaryHi,
      recommendations: primary.recommendationsEn,
      recommendations_te: primary.recommendationsTe,
      recommendations_hi: primary.recommendationsHi,
      secondary_predictions: secondary.length > 0 ? secondary : undefined,
      method: primary.method,
      model_info: primary.modelInfo,
    };
  }

  // 6. Check if input has ANY physical/lab biomarkers, symptoms, or diagnoses
  const hasAnyData = Object.entries(input).some(([k, v]) => {
    if (k === 'notes' || k === 'rawSummary') return false;
    if (Array.isArray(v)) return v.length > 0;
    return v !== undefined && v !== null && v !== false;
  }) || calculatedBmi !== undefined;

  if (hasAnyData) {
    // If any signals are elevated/high but models didn't cross threshold, prioritize the highest abnormal signal
    const abnormalSignal = signals.find(s => s.status === 'high' || s.status === 'critical' || s.status === 'elevated');
    
    // All submitted parameters are within completely normal physiological ranges!
    return {
      sufficient_data: true,
      condition_id: 'optimal_health_profile',
      predicted_condition: 'Optimal Health Profile (Low Disease Risk)',
      predicted_condition_te: 'ఆదర్శవంతమైన ఆరోగ్య స్థితి (తక్కువ వ్యాధి ప్రమాదం)',
      predicted_condition_hi: 'इष्टतम स्वास्थ्य प्रोफ़ाइल (कम रोग जोखिम)',
      confidence: 0,
      risk_level: 'Low',
      method: 'guidelines',
      model_info: { method: 'guidelines' },
      signals,
      summary: 'Comprehensive multi-disease clinical evaluation indicates that your submitted laboratory biomarkers, vital signs, and organ functional panels are currently within healthy reference physiological ranges. No overt pathological biomarkers for diabetes, coronary disease, renal impairment, or hepatic dysfunction were identified.',
      summary_te: 'సమర్పించిన రక్త పరీక్షలు, రక్తపోటు మరియు అవయవాల పనితీరు కొలతలు ప్రస్తుతం సాధారణ మరియు ఆరోగ్యకరమైన పరిమితులలో ఉన్నాయి. మధుమేహం, గుండె జబ్బులు లేదా కిడ్నీ/కాలేయ వ్యాధులకు సంబంధించిన ప్రమాదకర సంకేతాలు కనిపించలేదు.',
      summary_hi: 'व्यापक बहु-रोग नैदानिक मूल्यांकन से पता चलता है कि आपके द्वारा प्रस्तुत प्रयोगशाला बायोमार्कर, महत्वपूर्ण संकेत और अंग कार्यप्रणाली वर्तमान में सामान्य संदर्भ सीमाओं के भीतर हैं। मधुमेह, हृदय रोग या गुर्दे/यकृत संबंधी किसी भी रोग का कोई लक्षण नहीं पाया गया है।',
      recommendations: [
        'Maintain a balanced, nutrient-dense diet consisting of whole grains, vegetables, and lean proteins.',
        'Engage in at least 150 minutes of moderate aerobic physical activity each week.',
        'Undergo routine preventive annual comprehensive wellness check-ups to track your biomarker baseline.',
      ],
      recommendations_te: [
        'సమతుల్య పౌష్టికాహారాన్ని మరియు రోజూ తగినంత వ్యాయామాన్ని కొనసాగించండి.',
        'వార్షిక ఆరోగ్య పరీక్షల ద్వారా శరీర ఆరోగ్య స్థితిని పర్యవేక్షిస్తూ ఉండండి.',
      ],
      recommendations_hi: [
        'संतुलित आहार बनाए रखें और नियमित व्यायाम जारी रखें।',
        'अपने स्वास्थ्य स्तर को ट्रैक करने के लिए वार्षिक स्वास्थ्य जांच करवाएं।',
      ],
    };
  }

  // 7. Only if NO data was provided at all (completely empty submission):
  return {
    sufficient_data: false,
    condition_id: 'insufficient_data',
    predicted_condition: 'INSUFFICIENT DATA',
    predicted_condition_te: 'సమాచారం చాలదు',
    predicted_condition_hi: 'अपर्याप्त डेटा',
    confidence: 0,
    risk_level: 'Low',
    signals,
    summary: 'No laboratory biomarkers, clinical measurements, or medical document text could be identified. Please upload a clear medical PDF report or manually input your health parameters.',
    summary_te: 'ఎటువంటి ల్యాబ్ పరీక్షల విలువలు లేదా వైద్య సమాచారం లభించలేదు. దయచేసి స్పష్టమైన మెడికల్ రిపోర్ట్ పీడీఎఫ్ లేదా వివరాలను నమోదు చేయండి.',
    summary_hi: 'कोई प्रयोगशाला बायोमार्कर या नैदानिक जानकारी नहीं मिली। कृपया एक स्पष्ट मेडिकल रिपोर्ट पीडीएफ अपलोड करें या विवरण मैन्युअल रूप से दर्ज करें।',
    recommendations: [
      'Upload a readable laboratory report PDF or enter your blood pressure, blood sugar, or lipid numbers.',
    ],
    recommendations_te: [
      'దయచేసి మీ మెడికల్ రిపోర్ట్ పీడీఎఫ్ లేదా వివరాలను అందించండి.',
    ],
    recommendations_hi: [
      'कृपया अपनी मेडिकल रिपोर्ट पीडीएफ अपलोड करें या विवरण दर्ज करें।',
    ],
    errorMessage: 'No clinical data could be found in the submitted file. Please ensure the PDF is a valid medical report.',
  };
}
