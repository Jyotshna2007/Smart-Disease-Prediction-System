import { GoogleGenAI, Type } from '@google/genai';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParseModule = require('pdf-parse');

// pdf-parse v1 exports a function; v2 exports a `PDFParse` class. Support both so uploads never
// silently return empty text (which caused "couldn't find enough information" for every PDF).
async function pdfToText(buffer: Buffer): Promise<string> {
  if (typeof pdfParseModule === 'function') {
    const r = await pdfParseModule(buffer);
    return r.text || '';
  }
  const PDFParseCls = pdfParseModule.PDFParse || pdfParseModule.default?.PDFParse;
  if (!PDFParseCls) throw new Error('pdf-parse: unsupported module shape');
  const parser = new PDFParseCls({ data: new Uint8Array(buffer) });
  try {
    const r = await parser.getText();
    return r.text || '';
  } finally {
    try { await parser.destroy(); } catch { /* ignore */ }
  }
}
import { HealthInputs } from './predictionEngine.js';

let aiInstance: GoogleGenAI | null = null;
function getAi(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiInstance;
}

// ============================================================================
// 1. MEDICAL TEXT NORMALIZATION & PREPROCESSING
// ============================================================================
export function normalizeMedicalText(text: string): string {
  if (!text) return '';
  return text
    // Replace non-breaking spaces and zero-width spaces
    .replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ')
    // Replace unicode dashes/hyphens with ASCII hyphen
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, '-')
    // Replace unicode quotes
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    // Standardize column delimiters like vertical bars
    .replace(/[|¦]/g, ' ')
    // Normalize consecutive spaces (preserve newlines)
    .replace(/[^\S\r\n]+/g, ' ')
    .trim();
}

// Helper: parse numbers that may contain commas (e.g. 280,000 or 11,500)
function parseFormattedNumber(str: string): number | undefined {
  if (!str) return undefined;
  const cleaned = str.replace(/,/g, '').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? undefined : n;
}

// ============================================================================
// 2. COMPREHENSIVE CLINICAL TABLE & LINE-ITEM EXTRACTION
// ============================================================================
interface TestPattern {
  key: keyof HealthInputs;
  aliases: RegExp[];
  unitNormalizer?: (val: number, unit?: string) => number;
}

const CLINICAL_TEST_PATTERNS: TestPattern[] = [
  // Fasting Blood Glucose
  {
    key: 'glucose_fasting',
    aliases: [
      /\b(?:fasting\s*(?:blood\s*)?(?:sugar|glucose)|fbs|fbg|glucose\s*fasting|sugar\s*fasting|blood\s*sugar\s*fasting|ఉపవాస\s*గ్లూకోజ్|రక్తంలో\s*చక్కెర\s*\(?ఉపవాసం\)?|फास्टिंग\s*(?:ब्लड\s*)?शुगर|फास्टिंग\s*ग्लूकोज)\b/i,
    ],
    unitNormalizer: (val, unit) => {
      // If mmol/L, convert to mg/dL
      if (unit && /mmol/i.test(unit) && val < 30) return Math.round(val * 18.018);
      return val;
    },
  },
  // Postprandial Blood Glucose
  {
    key: 'glucose_postprandial',
    aliases: [
      /\b(?:post\s*prandial\s*(?:blood\s*)?(?:sugar|glucose)|ppbs|ppbg|glucose\s*pp|post\s*prandial|sugar\s*pp|blood\s*sugar\s*pp|భోజనం\s*తర్వాత\s*చక్కెర|పీపీ\s*షుగర్|पीपी\s*(?:ब्लड\s*)?शुगर)\b/i,
    ],
    unitNormalizer: (val, unit) => {
      if (unit && /mmol/i.test(unit) && val < 30) return Math.round(val * 18.018);
      return val;
    },
  },
  // Random Blood Glucose
  {
    key: 'glucose_random',
    aliases: [
      /\b(?:random\s*(?:blood\s*)?(?:sugar|glucose)|rbs|rbg|glucose\s*random|casual\s*glucose|రక్తంలో\s*యాదృచ్ఛిక\s*చక్కెర|रैंडम\s*(?:ब्लड\s*)?शुगर)\b/i,
    ],
    unitNormalizer: (val, unit) => {
      if (unit && /mmol/i.test(unit) && val < 30) return Math.round(val * 18.018);
      return val;
    },
  },
  // HbA1c
  {
    key: 'hba1c',
    aliases: [
      /\b(?:hba1c|glycated\s*hemoglobin|glycohemoglobin|glycosylated\s*hemoglobin|a1c|గ్లైకేటెడ్\s*హిమోగ్లోబిన్|एचबीए1सी)\b/i,
    ],
  },
  // Total Cholesterol
  {
    key: 'total_cholesterol',
    aliases: [
      /\b(?:total\s*cholesterol|cholesterol\s*total|serum\s*cholesterol|s\.?\s*cholesterol|మొత్తం\s*కొలెస్ట్రాల్|కొలెస్ట్రాల్|कुल\s*कोलेस्ट्रॉल|कोलेस्ट्रॉल)\b/i,
    ],
    unitNormalizer: (val, unit) => {
      if (unit && /mmol/i.test(unit) && val < 15) return Math.round(val * 38.67);
      return val;
    },
  },
  // HDL Cholesterol
  {
    key: 'hdl_cholesterol',
    aliases: [
      /\b(?:hdl\s*cholesterol|hdl-c|hdl\s*direct|hdl|high\s*density\s*lipoprotein|హెచ్‌డిఎల్\s*కొలెస్ట్రాల్)\b/i,
    ],
  },
  // LDL Cholesterol
  {
    key: 'ldl_cholesterol',
    aliases: [
      /\b(?:ldl\s*cholesterol|ldl-c|ldl\s*direct|ldl|calculated\s*ldl|low\s*density\s*lipoprotein|ఎల్డిఎల్\s*కొలెస్ట్రాల్)\b/i,
    ],
  },
  // VLDL Cholesterol
  {
    key: 'vldl_cholesterol',
    aliases: [
      /\b(?:vldl\s*cholesterol|vldl-c|vldl|very\s*low\s*density\s*lipoprotein)\b/i,
    ],
  },
  // Triglycerides
  {
    key: 'triglycerides',
    aliases: [
      /\b(?:triglycerides?|serum\s*triglycerides|s\.?\s*triglycerides|tgl|tg|ట్రైగ్లిజరైడ్స్|ट्राईग्लिसराइड्स)\b/i,
    ],
    unitNormalizer: (val, unit) => {
      if (unit && /mmol/i.test(unit) && val < 20) return Math.round(val * 88.57);
      return val;
    },
  },
  // Serum Creatinine
  {
    key: 'serum_creatinine',
    aliases: [
      /\b(?:serum\s*creatinine|s\.?\s*creatinine|sr\.?\s*creatinine|creatinine|క్రియాటినిన్|सीरम\s*क्रिएटिनिन|क्रिएटिनिन)\b/i,
    ],
    unitNormalizer: (val, unit) => {
      // If umol/L, convert to mg/dL
      if (unit && /umol|µmol/i.test(unit) && val > 15) return parseFloat((val / 88.4).toFixed(2));
      return val;
    },
  },
  // eGFR
  {
    key: 'egfr',
    aliases: [
      /\b(?:egfr|estimated\s*gfr|estimated\s*glomerular\s*filtration\s*rate|gfr)\b/i,
    ],
  },
  // Blood Urea / BUN
  {
    key: 'blood_urea',
    aliases: [
      /\b(?:blood\s*urea|serum\s*urea|s\.?\s*urea|urea|యూరియా|यूरिया)\b/i,
    ],
  },
  {
    key: 'bun',
    aliases: [
      /\b(?:bun|blood\s*urea\s*nitrogen)\b/i,
    ],
  },
  // Serum Uric Acid
  {
    key: 'serum_uric_acid',
    aliases: [
      /\b(?:serum\s*uric\s*acid|s\.?\s*uric\s*acid|uric\s*acid|యూరిక్\s*యాసిడ్|यूरिक\s*एसिड)\b/i,
    ],
  },
  // ALT (SGPT)
  {
    key: 'alt',
    aliases: [
      /\b(?:alt\s*\(sgpt\)|sgpt\s*\(alt\)|alanine\s*aminotransferase|alanine\s*transaminase|alt|sgpt|s\.g\.p\.t\.|ఎస్\s*జి\s*పి\s*టి|एसजीपीटी|एएलटी)\b/i,
    ],
  },
  // AST (SGOT)
  {
    key: 'ast',
    aliases: [
      /\b(?:ast\s*\(sgot\)|sgot\s*\(ast\)|aspartate\s*aminotransferase|aspartate\s*transaminase|ast|sgot|s\.g\.o\.t\.|ఎస్\s*జి\s*ఓ\s*టి|एसजीओटी|एएसटी)\b/i,
    ],
  },
  // Alkaline Phosphatase (ALP)
  {
    key: 'alp',
    aliases: [
      /\b(?:alkaline\s*phosphatase|alk\s*phos|alp|s\.?\s*alp)\b/i,
    ],
  },
  // Bilirubin Total
  {
    key: 'bilirubin',
    aliases: [
      /\b(?:total\s*bilirubin|bilirubin\s*total|serum\s*bilirubin|s\.?\s*bilirubin|bilirubin|బిలిరుబిన్|बिलीरुबिन)\b/i,
    ],
    unitNormalizer: (val, unit) => {
      if (unit && /umol|µmol/i.test(unit) && val > 5) return parseFloat((val / 17.1).toFixed(2));
      return val;
    },
  },
  // Direct Bilirubin
  {
    key: 'bilirubin_direct',
    aliases: [
      /\b(?:direct\s*bilirubin|bilirubin\s*direct|conjugated\s*bilirubin)\b/i,
    ],
  },
  // Serum Albumin
  {
    key: 'albumin',
    aliases: [
      /\b(?:serum\s*albumin|s\.?\s*albumin|albumin)\b/i,
    ],
  },
  // Total Protein
  {
    key: 'total_protein',
    aliases: [
      /\b(?:total\s*protein|protein\s*total|serum\s*protein|s\.?\s*protein)\b/i,
    ],
  },
  // GGT
  {
    key: 'ggt',
    aliases: [
      /\b(?:gamma\s*gt|ggt|gamma\s*glutamyl\s*transferase|gamma-gt)\b/i,
    ],
  },
  // Hemoglobin (Hb)
  {
    key: 'hemoglobin',
    aliases: [
      /\b(?:hemoglobin\s*\(hb\)|haemoglobin\s*\(hb\)|hemoglobin|haemoglobin|hb|hgb|హిమోగ్లోబిన్|हीमोग्लोबिन)\b/i,
    ],
    unitNormalizer: (val, unit) => {
      // If g/L, convert to g/dL
      if ((unit && /g\/l\b/i.test(unit)) || val > 30) return parseFloat((val / 10).toFixed(1));
      return val;
    },
  },
  // Hematocrit / PCV
  {
    key: 'hematocrit',
    aliases: [
      /\b(?:hematocrit|haematocrit|packed\s*cell\s*volume|pcv)\b/i,
    ],
  },
  // RBC Count
  {
    key: 'rbc_count',
    aliases: [
      /\b(?:rbc\s*count|total\s*rbc|red\s*blood\s*cell(?:\s*count)?|red\s*blood\s*cells|erythrocyte\s*count|rbc)\b/i,
    ],
  },
  // WBC Count / TLC
  {
    key: 'wbc_count',
    aliases: [
      /\b(?:wbc\s*count|total\s*leukocyte\s*count|tlc|total\s*wbc|white\s*blood\s*cell(?:\s*count)?|white\s*blood\s*cells|wbc)\b/i,
    ],
  },
  // Platelet Count
  {
    key: 'platelet_count',
    aliases: [
      /\b(?:platelet\s*count|total\s*platelet(?:\s*count)?|platelets?|plt|ప్లేట్‌లెట్స్|प्लेटलेट्स)\b/i,
    ],
  },
  // MCV
  {
    key: 'mcv',
    aliases: [
      /\b(?:mean\s*corpuscular\s*volume|mcv)\b/i,
    ],
  },
  // MCH
  {
    key: 'mch',
    aliases: [
      /\b(?:mean\s*corpuscular\s*hemoglobin|mch)\b/i,
    ],
  },
  // MCHC
  {
    key: 'mchc',
    aliases: [
      /\b(?:mean\s*corpuscular\s*hemoglobin\s*concentration|mchc)\b/i,
    ],
  },
  // Serum Ferritin
  {
    key: 'ferritin',
    aliases: [
      /\b(?:serum\s*ferritin|s\.?\s*ferritin|ferritin|ఫెర్రిటిన్|फेरिटिन)\b/i,
    ],
  },
  // Serum Iron
  {
    key: 'serum_iron',
    aliases: [
      /\b(?:serum\s*iron|s\.?\s*iron|iron)\b/i,
    ],
  },
  // TSH
  {
    key: 'tsh',
    aliases: [
      /\b(?:thyroid\s*stimulating\s*hormone|tsh\s*ultrasensitive|s\.?\s*tsh|tsh|థైరాయిడ్|थायरॉइड)\b/i,
    ],
  },
  // Free T3 / Free T4
  {
    key: 'free_t3',
    aliases: [
      /\b(?:free\s*t3|ft3|free\s*triiodothyronine)\b/i,
    ],
  },
  {
    key: 'free_t4',
    aliases: [
      /\b(?:free\s*t4|ft4|free\s*thyroxine)\b/i,
    ],
  },
  // Troponin
  {
    key: 'troponin',
    aliases: [
      /\b(?:troponin-?i|troponin-?t|trop-?i|trop-?t|troponin)\b/i,
    ],
  },
  // BNP
  {
    key: 'bnp',
    aliases: [
      /\b(?:nt-?probnp|pro-?bnp|bnp|brain\s*natriuretic\s*peptide)\b/i,
    ],
  },
  // CRP
  {
    key: 'crp',
    aliases: [
      /\b(?:c-reactive\s*protein|hs-crp|crp)\b/i,
    ],
  },
  // ESR
  {
    key: 'esr',
    aliases: [
      /\b(?:erythrocyte\s*sedimentation\s*rate|esr)\b/i,
    ],
  },
  // PSA
  {
    key: 'psa',
    aliases: [
      /\b(?:prostate\s*specific\s*antigen|total\s*psa|s\.?\s*psa|psa)\b/i,
    ],
  },
  // Heart Rate / Pulse
  {
    key: 'heart_rate',
    aliases: [
      /\b(?:heart\s*rate|pulse\s*rate|pulse|resting\s*pulse|గుండె\s*వేగం|हृदय\s*गति|नाड़ी\s*दर)\b/i,
    ],
  },
  // Oxygen Saturation / SpO2
  {
    key: 'spo2',
    aliases: [
      /\b(?:oxygen\s*saturation|spo2|pulse\s*oximetry|ఆక్సిజన్|ऑक्सीजन)\b/i,
    ],
  },
  // BMI
  {
    key: 'bmi',
    aliases: [
      /\b(?:body\s*mass\s*index|bmi)\b/i,
    ],
  },
  // Weight
  {
    key: 'weight_kg',
    aliases: [
      /\b(?:body\s*weight|weight|wt|బరువు|वजन)\b/i,
    ],
  },
  // Height
  {
    key: 'height_cm',
    aliases: [
      /\b(?:body\s*height|height|ht|ఎత్తు|ऊंचाई)\b/i,
    ],
  },
];

// Extract clinical parameters from line-by-line and tabular text representations
export function parseClinicalTableAndLines(text: string): HealthInputs {
  const inputs: HealthInputs = {};
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 3) continue;

    // Check for Blood Pressure in format: "140/90", "140 / 90", "BP: 130/85"
    if (!inputs.systolic_bp) {
      const bpMatch = trimmed.match(/(?:blood\s*pressure|b\.?p\.?|బిపి|బీపీ|रक्तचाप)?(?:\s*\([^)]*\))?[\s:=]*(\d{2,3})\s*[\/\\-]\s*(\d{2,3})/i);
      if (bpMatch && (trimmed.toLowerCase().includes('bp') || trimmed.toLowerCase().includes('pressure') || trimmed.includes('/') || trimmed.toLowerCase().includes('బిపి'))) {
        const sys = parseInt(bpMatch[1], 10);
        const dia = parseInt(bpMatch[2], 10);
        if (sys >= 70 && sys <= 260 && dia >= 40 && dia <= 160) {
          inputs.systolic_bp = sys;
          inputs.diastolic_bp = dia;
        }
      }
    }

    // Check for Age
    if (!inputs.age) {
      const ageMatch = trimmed.match(/(?:\bage|yr|years?\s*old|వయస్సు|आयु|वर्ष)[\s:=]*(\d{1,3})\b/i);
      if (ageMatch) {
        const a = parseInt(ageMatch[1], 10);
        if (a > 0 && a <= 120) inputs.age = a;
      }
    }

    // Check for Gender
    if (!inputs.gender) {
      if (/(?:gender|sex|లింగం|लिंग)[\s:=]*(male|మగ|पुरुष|man|m)\b/i.test(trimmed) || /\b(?:male\s*patient|gentleman)\b/i.test(trimmed)) {
        inputs.gender = 'male';
      } else if (/(?:gender|sex|లింగం|लिंग)[\s:=]*(female|ఆడ|महिला|स्त्री|woman|f)\b/i.test(trimmed) || /\b(?:female\s*patient|lady)\b/i.test(trimmed)) {
        inputs.gender = 'female';
      }
    }

    // Test each clinical pattern against table rows
    for (const test of CLINICAL_TEST_PATTERNS) {
      if (inputs[test.key] !== undefined) continue;

      for (const aliasRegex of test.aliases) {
        const aliasMatch = trimmed.match(aliasRegex);
        if (!aliasMatch) continue;

        // Found the test name on this line! Extract the numerical value that follows it.
        // It could be separated by whitespace, colon, equals, hyphens, or words like 'Result', 'Value'.
        const afterAlias = trimmed.slice(aliasMatch.index! + aliasMatch[0].length);

        // Match the first valid number (with optional comma like 280,000)
        const valMatch = afterAlias.match(/[\s:=-]*(?:result|value|observed|finding)?[\s:=-]*([\d,]+(?:\.\d+)?)(?:\s*([a-zA-Z%µ/^_]+))?/i);
        if (valMatch && valMatch[1]) {
          const rawNum = parseFormattedNumber(valMatch[1]);
          if (rawNum !== undefined && !isNaN(rawNum)) {
            // Avoid matching years like 2024 or reference ranges like 0 if test is not zero
            if (rawNum > 0 || test.key === 'systolic_bp') {
              const unit = valMatch[2] || '';
              const finalVal = test.unitNormalizer ? test.unitNormalizer(rawNum, unit) : rawNum;
              (inputs as Record<string, unknown>)[test.key] = finalVal;
              break;
            }
          }
        }
      }
    }
  }

  return inputs;
}

// ============================================================================
// 3. GLOBAL MULTI-WORD & REGEX EXTRACTION PASS
// ============================================================================
export function extractFromGlobalText(text: string): HealthInputs {
  const inputs: HealthInputs = {};
  const diagnosed: string[] = [];

  // Age
  const ageMatch = text.match(/(?:\bage|years?\s*old|వయస్సు|आयु|वर्ष)[\s:=]+(\d{1,3})\b/i);
  if (ageMatch) inputs.age = parseInt(ageMatch[1], 10);

  // Gender
  if (/(?:gender|sex|లింగం|लिंग)[\s:=]+(male|మగ|पुरुष|man|m)\b/i.test(text) || /\b(?:male\s*patient|gentleman)\b/i.test(text)) {
    inputs.gender = 'male';
  } else if (/(?:gender|sex|లింగం|लिंग)[\s:=]+(female|ఆడ|महिला|स्त्री|woman|f)\b/i.test(text) || /\b(?:female\s*patient|lady)\b/i.test(text)) {
    inputs.gender = 'female';
  }

  // Blood Pressure
  const bpMatch = text.match(/(?:blood\s*pressure|b\.?p\.?|బిపి|బీపీ|రక్తचाप)(?:\s*\([^)]*\))?[\s:=]+(\d{2,3})\s*[\/\\-]\s*(\d{2,3})/i);
  if (bpMatch) {
    inputs.systolic_bp = parseInt(bpMatch[1], 10);
    inputs.diastolic_bp = parseInt(bpMatch[2], 10);
  }

  // Symptoms extraction
  if (/chest\s*pain|angina|chest\s*tightness|छाती\s*में\s*दर्द|ఛాతీ\s*నొప్పి/i.test(text)) inputs.chest_pain = true;
  if (/shortness\s*of\s*breath|dyspnea|breathlessness|సాంస\s*फूलना|శ్వాస ఆడకపోవడం/i.test(text)) inputs.shortness_of_breath = true;
  if (/frequent\s*urination|polyuria|बार-बार\s*पेशाब|తరచుగా\s*మూత్రవిసర్జన/i.test(text)) inputs.frequent_urination = true;
  if (/excessive\s*thirst|polydipsia|अधिक\s*प्यास|అధిక\s*దాహం/i.test(text)) inputs.excessive_thirst = true;
  if (/fatigue|lethargy|exhaustion|थकान|అలసట/i.test(text)) inputs.fatigue = true;
  if (/swelling\s*of\s*(?:legs|feet|pedal)|pedal\s*edema|కాళ్ళ\s*వాపు|पैरों\s*में\s*सूजन/i.test(text)) inputs.swelling_legs = true;
  if (/migraine|severe\s*headache|throbbing\s*headache|మైగ్రేన్|माइग्रेन|सिरदर्द/i.test(text)) inputs.headache_severe = true;
  if (/photophobia|sensitivity\s*to\s*light|కాంతి\s*సున్నితత్వం/i.test(text)) inputs.photophobia = true;
  if (/wheezing|audible\s*wheeze|గురక|घरघराहट/i.test(text)) inputs.wheezing = true;
  if (/chronic\s*cough|persistent\s*cough|పురాతన\s*దగ్గు|पुरानी\s*खांसी/i.test(text)) inputs.chronic_cough = true;
  if (/joint\s*pain|arthralgia|కీళ్ల\s*నొప్పి|जोड़ों\s*का\s*दर्द/i.test(text)) inputs.joint_pain = true;
  if (/pallor|pale\s*conjunctiva|రక్తహీనత\s*ఛాయ/i.test(text)) inputs.pallor = true;

  // Oncology / Imaging specifics
  const biradsMatch = text.match(/bi-?rads?\s*(?:category)?[\s:=]*([1-6])/i);
  if (biradsMatch) inputs.birads_score = parseInt(biradsMatch[1], 10);

  const massMatch = text.match(/(?:breast\s*mass|tumor|lesion|nodule)\s*(?:size)?[\s:=]*(\d{1,2}(?:\.\d+)?)\s*(?:cm|mm)/i);
  if (massMatch) inputs.breast_mass_size = parseFloat(massMatch[1]);

  // Diagnosed conditions / Medical findings explicitly documented in text:
  const conditionPatterns = [
    { pattern: /\b(?:fatty\s*liver|hepatic\s*steatosis|steatohepatitis|nafld|nash)\b/i, name: 'Fatty Liver Disease (Hepatic Steatosis)' },
    { pattern: /\b(?:cirrhosis|liver\s*cirrhosis|chronic\s*liver\s*disease)\b/i, name: 'Chronic Liver Disease & Cirrhosis' },
    { pattern: /\b(?:hepatitis\s*[bc]|viral\s*hepatitis)\b/i, name: 'Viral Hepatitis' },
    { pattern: /\b(?:chronic\s*kidney\s*disease|ckd|renal\s*failure|renal\s*insufficiency)\b/i, name: 'Chronic Kidney Disease' },
    { pattern: /\b(?:diabetic\s*nephropathy|glomerulopathy)\b/i, name: 'Diabetic Nephropathy' },
    { pattern: /\b(?:type\s*2\s*diabetes|diabetes\s*mellitus|t2dm|hyperglycemia)\b/i, name: 'Type 2 Diabetes' },
    { pattern: /\b(?:type\s*1\s*diabetes|t1dm|diabetic\s*ketoacidosis)\b/i, name: 'Type 1 Diabetes' },
    { pattern: /\b(?:pre-?diabetes|impaired\s*fasting\s*glucose)\b/i, name: 'Pre-Diabetes' },
    { pattern: /\b(?:essential\s*hypertension|hypertension|high\s*blood\s*pressure)\b/i, name: 'Essential Hypertension' },
    { pattern: /\b(?:coronary\s*artery\s*disease|ischemic\s*heart\s*disease|cad|myocardial\s*ischemia|angina)\b/i, name: 'Coronary Artery Disease' },
    { pattern: /\b(?:heart\s*failure|congestive\s*heart\s*failure|chf)\b/i, name: 'Heart Failure' },
    { pattern: /\b(?:arrhythmia|atrial\s*fibrillation|afib|tachyarrhythmia)\b/i, name: 'Cardiac Arrhythmia' },
    { pattern: /\b(?:iron\s*deficiency\s*anemia|microcytic\s*anemia|anemia|anaemia)\b/i, name: 'Iron Deficiency & Chronic Anemia' },
    { pattern: /\b(?:hypothyroidism|hashimoto)\b/i, name: 'Primary Hypothyroidism' },
    { pattern: /\b(?:hyperthyroidism|graves|thyrotoxicosis)\b/i, name: 'Hyperthyroidism / Thyrotoxicosis' },
    { pattern: /\b(?:migraine|cluster\s*headache|tension\s*headache)\b/i, name: 'Chronic Migraine' },
    { pattern: /\b(?:bronchial\s*asthma|asthma)\b/i, name: 'Bronchial Asthma' },
    { pattern: /\b(?:copd|chronic\s*obstructive\s*pulmonary|emphysema|chronic\s*bronchitis)\b/i, name: 'Chronic Obstructive Pulmonary Disease (COPD)' },
    { pattern: /\b(?:breast\s*(?:cancer|carcinoma|neoplasm|malignancy|tumor|lesion)|invasive\s*ductal\s*carcinoma)\b/i, name: 'Breast Neoplasm / High-Risk Lesion' },
    { pattern: /\b(?:prostate\s*(?:cancer|carcinoma|adenocarcinoma)|bph|prostatic\s*hypertrophy)\b/i, name: 'Prostatic Disease / High-Risk Neoplasm' },
    { pattern: /\b(?:colorectal\s*(?:cancer|carcinoma|neoplasm)|colon\s*cancer)\b/i, name: 'Colorectal Malignancy' },
    { pattern: /\b(?:hyperuricemia|gout|gouty\s*arthritis)\b/i, name: 'Hyperuricemia & Gout Disorder' },
    { pattern: /\b(?:metabolic\s*syndrome|dyslipidemia|hypercholesterolemia|hyperlipidemia)\b/i, name: 'Metabolic Syndrome & Severe Dyslipidemia' },
    { pattern: /\b(?:gerd|gastroesophageal\s*reflux|peptic\s*ulcer|gastritis)\b/i, name: 'Gastroesophageal Reflux Disease (GERD)' },
    { pattern: /\b(?:cholelithiasis|gallstones|gall\s*bladder\s*calculi)\b/i, name: 'Cholelithiasis & Gallstone Disease' },
    { pattern: /\b(?:pneumonia|bronchopneumonia|consolidation)\b/i, name: 'Community-Acquired Pneumonia' },
    { pattern: /\b(?:rheumatoid\s*arthritis|inflammatory\s*arthritis)\b/i, name: 'Rheumatoid Arthritis' },
    { pattern: /\b(?:osteoporosis|osteopenia)\b/i, name: 'Osteopenia & Osteoporosis Disorder' },
    { pattern: /\b(?:peripheral\s*neuropathy|diabetic\s*neuropathy)\b/i, name: 'Peripheral Neuropathy' },
  ];

  for (const { pattern, name } of conditionPatterns) {
    if (pattern.test(text)) {
      diagnosed.push(name);
    }
  }

  if (diagnosed.length > 0) {
    inputs.diagnosed_conditions = diagnosed;
  }

  return inputs;
}

// Master deterministic parser combining normalization, line/table parsing, and global regexes
export function extractFromRawText(text: string): HealthInputs {
  const normalized = normalizeMedicalText(text);
  const tableInputs = parseClinicalTableAndLines(normalized);
  const globalInputs = extractFromGlobalText(normalized);

  // Merge table inputs and global inputs
  const mergedDiagnoses = Array.from(new Set([
    ...(tableInputs.diagnosed_conditions || []),
    ...(globalInputs.diagnosed_conditions || []),
  ]));

  const merged: HealthInputs = {
    ...globalInputs,
    ...tableInputs,
    diagnosed_conditions: mergedDiagnoses.length > 0 ? mergedDiagnoses : undefined,
  };

  return merged;
}

// ============================================================================
// 4. MAIN EXTRACTION ENTRYPOINT (HYBRID AI + DETERMINISTIC)
// ============================================================================
export async function extractHealthDataFromPdf(buffer: Buffer): Promise<{ inputs: HealthInputs; rawSummary?: string }> {
  // Step 1: Instant, robust text extraction from PDF using pdfParse
  let rawPdfText = '';
  let deterministicInputs: HealthInputs = {};
  try {
    rawPdfText = await pdfToText(buffer);
    deterministicInputs = extractFromRawText(rawPdfText);
  } catch (parseErr) {
    console.warn('pdf-parse raw extraction error:', parseErr);
  }

  // Step 2: If we have text and Gemini is configured, use text-mode Gemini for fast, resilient extraction
  const ai = getAi();
  if (ai && rawPdfText.length > 10) {
    try {
      const promptText = `You are a clinical laboratory extraction assistant.
Extract all numerical clinical values, vital signs, and diagnosed conditions from this medical report text into JSON.
If a parameter is not explicitly found, omit it.

REPORT TEXT:
${rawPdfText.slice(0, 10000)}

Extract into this JSON structure:
- age: number
- gender: "male" | "female"
- systolic_bp: number
- diastolic_bp: number
- heart_rate: number
- spo2: number
- bmi: number
- glucose_fasting: number
- glucose_random: number
- glucose_postprandial: number
- hba1c: number
- total_cholesterol: number
- hdl_cholesterol: number
- ldl_cholesterol: number
- triglycerides: number
- serum_creatinine: number
- egfr: number
- blood_urea: number
- bun: number
- serum_uric_acid: number
- alt: number
- ast: number
- alp: number
- bilirubin: number
- tsh: number
- free_t4: number
- hemoglobin: number
- hematocrit: number
- rbc_count: number
- wbc_count: number
- platelet_count: number
- mcv: number
- ferritin: number
- chest_pain: boolean
- shortness_of_breath: boolean
- wheezing: boolean
- headache_severe: boolean
- photophobia: boolean
- frequent_urination: boolean
- excessive_thirst: boolean
- fatigue: boolean
- swelling_legs: boolean
- joint_pain: boolean
- diagnosed_conditions: array of string names of any disease/condition/impression mentioned in the text
- summary_notes: short clinical summary`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [{ text: promptText }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              age: { type: Type.NUMBER },
              gender: { type: Type.STRING },
              systolic_bp: { type: Type.NUMBER },
              diastolic_bp: { type: Type.NUMBER },
              heart_rate: { type: Type.NUMBER },
              spo2: { type: Type.NUMBER },
              bmi: { type: Type.NUMBER },
              glucose_fasting: { type: Type.NUMBER },
              glucose_random: { type: Type.NUMBER },
              glucose_postprandial: { type: Type.NUMBER },
              hba1c: { type: Type.NUMBER },
              total_cholesterol: { type: Type.NUMBER },
              hdl_cholesterol: { type: Type.NUMBER },
              ldl_cholesterol: { type: Type.NUMBER },
              triglycerides: { type: Type.NUMBER },
              serum_creatinine: { type: Type.NUMBER },
              egfr: { type: Type.NUMBER },
              blood_urea: { type: Type.NUMBER },
              bun: { type: Type.NUMBER },
              serum_uric_acid: { type: Type.NUMBER },
              alt: { type: Type.NUMBER },
              ast: { type: Type.NUMBER },
              alp: { type: Type.NUMBER },
              bilirubin: { type: Type.NUMBER },
              tsh: { type: Type.NUMBER },
              free_t4: { type: Type.NUMBER },
              hemoglobin: { type: Type.NUMBER },
              hematocrit: { type: Type.NUMBER },
              rbc_count: { type: Type.NUMBER },
              wbc_count: { type: Type.NUMBER },
              platelet_count: { type: Type.NUMBER },
              mcv: { type: Type.NUMBER },
              ferritin: { type: Type.NUMBER },
              chest_pain: { type: Type.BOOLEAN },
              shortness_of_breath: { type: Type.BOOLEAN },
              wheezing: { type: Type.BOOLEAN },
              headache_severe: { type: Type.BOOLEAN },
              photophobia: { type: Type.BOOLEAN },
              frequent_urination: { type: Type.BOOLEAN },
              excessive_thirst: { type: Type.BOOLEAN },
              fatigue: { type: Type.BOOLEAN },
              swelling_legs: { type: Type.BOOLEAN },
              joint_pain: { type: Type.BOOLEAN },
              diagnosed_conditions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              summary_notes: { type: Type.STRING },
            },
          },
        },
      });

      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text);
        const { summary_notes, diagnosed_conditions, ...extracted } = parsed;
        const normalizedGender = (extracted.gender || '').toLowerCase();
        const validGender = normalizedGender.includes('fem') ? 'female' : normalizedGender.includes('mal') ? 'male' : undefined;

        const mergedConditions = Array.from(new Set([
          ...(diagnosed_conditions || []),
          ...(deterministicInputs.diagnosed_conditions || []),
        ]));

        const combinedInputs: HealthInputs = {
          ...deterministicInputs,
          ...extracted,
          gender: validGender || deterministicInputs.gender,
          diagnosed_conditions: mergedConditions.length > 0 ? mergedConditions : undefined,
          notes: summary_notes,
        };

        return { inputs: combinedInputs, rawSummary: summary_notes || rawPdfText.slice(0, 600) };
      }
    } catch (aiErr) {
      console.warn('Gemini text extraction fell back cleanly to deterministic parser:', aiErr);
    }
  }

  // Fallback / primary deterministic output
  return { inputs: deterministicInputs, rawSummary: rawPdfText.slice(0, 600) };
}
