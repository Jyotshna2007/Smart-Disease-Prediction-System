export interface ClinicalSignal {
  name: string;
  key: string;
  value: string | number;
  unit: string;
  normalRange: string;
  status: 'normal' | 'elevated' | 'high' | 'critical' | 'low';
  impactDescription: string;
}

export interface HealthInputs {
  age?: number;
  gender?: 'male' | 'female' | 'other';
  height_cm?: number;
  weight_kg?: number;
  bmi?: number;
  systolic_bp?: number;
  diastolic_bp?: number;
  heart_rate?: number;
  glucose_fasting?: number;
  glucose_random?: number;
  hba1c?: number;
  total_cholesterol?: number;
  hdl_cholesterol?: number;
  ldl_cholesterol?: number;
  triglycerides?: number;
  serum_creatinine?: number;
  egfr?: number;
  alt?: number;
  ast?: number;
  bilirubin?: number;
  tsh?: number;
  smoking_status?: 'never' | 'former' | 'current';
  family_history_diabetes?: boolean;
  family_history_heart?: boolean;
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
  notes?: string;
  symChestPain?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  preferred_language: 'en' | 'te' | 'hi';
  created_at: string;
}

export interface PredictionRecord {
  id: string;
  user_id: string;
  input_type: 'manual' | 'pdf';
  file_name?: string;
  condition_id: string;
  predicted_condition: string;
  predicted_condition_te: string;
  predicted_condition_hi: string;
  confidence: number;
  risk_level: 'Low' | 'Moderate' | 'High' | 'Severe';
  signals: ClinicalSignal[];
  summary: string;
  summary_te: string;
  summary_hi: string;
  recommendations: string[];
  recommendations_te: string[];
  recommendations_hi: string[];
  raw_input: Record<string, any>;
  method?: 'ml+guidelines' | 'ml' | 'guidelines';
  model_info?: {
    method: 'ml+guidelines' | 'ml' | 'guidelines';
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
      members?: Array<{ id: string; name: string; probability_pct: number; cv_auc: number; cv_auc_std: number }>;
      tier: 'Low' | 'Moderate' | 'High' | 'Severe';
      drivers: Array<{ feature: string; direction: 'raises' | 'lowers' }>;
      features_provided: string[];
      features_imputed: string[];
      caveats: string[];
      validation: string;
    };
  };
  secondary_predictions?: Array<{ disease_name: string; risk_level: string; confidence: number; method?: string }>;
  created_at: string;
}

const TOKEN_KEY = 'sdps_auth_token';

export const authStorage = {
  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  setToken(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch (e) {
      console.error('Failed to store token:', e);
    }
  },
  clearToken(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      console.error('Failed to clear token:', e);
    }
  },
};

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = authStorage.getToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Do not set Content-Type if body is FormData
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  let data: any = null;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = data?.error || (typeof data === 'string' ? data : 'An unexpected error occurred.');
    throw new Error(errorMsg);
  }

  return data as T;
}

export interface ModelCatalogEntry {
  id: string;
  name: string;
  dataset: string;
  population: string;
  outcome: string;
  n_samples: number;
  prevalence: number;
  cv_auc: number;
  cv_auc_std: number;
  sensitivity: number;
  specificity: number;
  validation: string;
  caveats: string[];
  members: Array<{ id: string; name: string; cv_auc: number }>;
}

export const api = {
  async getModelInfo() {
    return apiRequest<{ models: ModelCatalogEntry[] }>('/api/model-info');
  },

  // Auth
  async register(body: {
    name: string;
    email: string;
    password: string;
    confirm_password: string;
    preferred_language: 'en' | 'te' | 'hi';
  }) {
    const res = await apiRequest<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    authStorage.setToken(res.token);
    return res;
  },

  async login(body: { email: string; password: string }) {
    const res = await apiRequest<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    authStorage.setToken(res.token);
    return res;
  },

  async logout() {
    try {
      await apiRequest<{ success: boolean }>('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    } finally {
      authStorage.clearToken();
    }
  },

  async getCurrentUser() {
    return apiRequest<{ user: User }>('/api/auth/me');
  },

  async updateProfile(updates: {
    name?: string;
    preferred_language?: 'en' | 'te' | 'hi';
    current_password?: string;
    new_password?: string;
  }) {
    return apiRequest<{ user: User; message: string }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  // Predictions
  async predictManual(inputs: HealthInputs) {
    return apiRequest<{ record: PredictionRecord }>('/api/predict/manual', {
      method: 'POST',
      body: JSON.stringify(inputs),
    });
  },

  async uploadReport(file: File) {
    const formData = new FormData();
    formData.append('report', file);
    return apiRequest<{ record: PredictionRecord; extracted: HealthInputs }>('/api/predict/upload', {
      method: 'POST',
      body: formData,
    });
  },

  async getPredictions() {
    return apiRequest<{ predictions: PredictionRecord[] }>('/api/predictions');
  },

  async getPredictionById(id: string) {
    return apiRequest<{ record: PredictionRecord }>(`/api/predictions/${id}`);
  },

  async deletePrediction(id: string) {
    return apiRequest<{ success: boolean }>(`/api/predictions/${id}`, {
      method: 'DELETE',
    });
  },

  getReportDownloadUrl(id: string, lang: 'en' | 'te' | 'hi', mode?: 'download' | 'print') {
    const token = authStorage.getToken() || '';
    const extra = mode === 'download' ? '&download=1' : mode === 'print' ? '&print=1' : '';
    return `/api/reports/${id}/download?lang=${lang}${extra}&token=${encodeURIComponent(token)}`;
  },

  // Saves the report to the device as a file (works for English, Telugu and Hindi)
  async downloadReportFile(id: string, lang: 'en' | 'te' | 'hi') {
    const token = authStorage.getToken() || '';
    const res = await fetch(`/api/reports/${id}/download?lang=${lang}&download=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Could not download the report. Please try again.');
    const blob = await res.blob();
    const cd = res.headers.get('content-disposition') || '';
    const name = /filename="([^"]+)"/.exec(cd)?.[1] || `health-report-${id.slice(0, 8)}-${lang}.html`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  },
};
