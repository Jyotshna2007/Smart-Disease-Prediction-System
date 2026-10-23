import React, { useState, useEffect } from 'react';
import { Activity, User, Heart, FlaskConical, Stethoscope, ArrowRight, RotateCcw, AlertCircle } from 'lucide-react';
import { Language, translations } from '../translations.js';
import { api, PredictionRecord, HealthInputs } from '../api.js';

interface Props {
  lang: Language;
  onPredictionComplete: (record: PredictionRecord) => void;
}

export const ManualEntryView: React.FC<Props> = ({ lang, onPredictionComplete }) => {
  const t = translations[lang];

  // Form State
  const [formData, setFormData] = useState<HealthInputs>({
    gender: 'male',
    smoking_status: 'never',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Automatically compute BMI when height and weight change
  useEffect(() => {
    if (formData.height_cm && formData.weight_kg && formData.height_cm > 50 && formData.weight_kg > 20) {
      const heightM = formData.height_cm / 100;
      const computedBmi = parseFloat((formData.weight_kg / (heightM * heightM)).toFixed(1));
      setFormData((prev: HealthInputs) => ({ ...prev, bmi: computedBmi }));
    }
  }, [formData.height_cm, formData.weight_kg]);

  const updateField = (key: keyof HealthInputs, value: any) => {
    setFormData((prev: HealthInputs) => ({
      ...prev,
      [key]: value === '' ? undefined : value,
    }));
  };

  const handleReset = () => {
    setFormData({
      gender: 'male',
      smoking_status: 'never',
    });
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Check that at least some clinical parameters are provided
    const hasData = formData.age !== undefined || formData.systolic_bp !== undefined ||
      formData.glucose_fasting !== undefined || formData.glucose_random !== undefined ||
      formData.hba1c !== undefined || formData.total_cholesterol !== undefined;

    if (!hasData) {
      setErrorMessage(t.errors.insufficientData);
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.predictManual(formData);
      onPredictionComplete(res.record);
    } catch (err: any) {
      setErrorMessage(err.message || t.errors.insufficientData);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {t.manual.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {t.manual.desc}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{t.manual.clearBtn}</span>
        </button>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Section 1: Personal Information */}
        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm sm:text-base border-b border-slate-100 pb-3">
            <User className="w-4 h-4 text-blue-600" />
            <span>{t.manual.personalSection}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.manual.age} *
              </label>
              <input
                type="number"
                min="1"
                max="120"
                value={formData.age ?? ''}
                onChange={(e) => updateField('age', e.target.value ? parseInt(e.target.value, 10) : '')}
                placeholder="e.g. 48"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.manual.gender}
              </label>
              <select
                value={formData.gender || 'male'}
                onChange={(e) => updateField('gender', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer"
              >
                <option value="male">{t.manual.genderMale}</option>
                <option value="female">{t.manual.genderFemale}</option>
                <option value="other">{t.manual.genderOther}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Physical & Body Metrics */}
        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm sm:text-base border-b border-slate-100 pb-3">
            <Activity className="w-4 h-4 text-blue-600" />
            <span>{t.manual.physicalSection}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.manual.height}
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.height_cm ?? ''}
                onChange={(e) => updateField('height_cm', e.target.value ? parseFloat(e.target.value) : '')}
                placeholder="e.g. 172"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.manual.weight}
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.weight_kg ?? ''}
                onChange={(e) => updateField('weight_kg', e.target.value ? parseFloat(e.target.value) : '')}
                placeholder="e.g. 78"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.manual.bmi} <span className="text-[10px] text-slate-400 font-normal">(Normal: 18.5 - 24.9)</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.bmi ?? ''}
                onChange={(e) => updateField('bmi', e.target.value ? parseFloat(e.target.value) : '')}
                placeholder="Auto or manual"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Vital Signs & Blood Pressure */}
        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm sm:text-base border-b border-slate-100 pb-3">
            <Heart className="w-4 h-4 text-rose-500" />
            <span>{t.manual.vitalsSection}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.manual.systolicBp} <span className="text-[10px] text-slate-400 font-normal">(&lt; 120)</span>
              </label>
              <input
                type="number"
                value={formData.systolic_bp ?? ''}
                onChange={(e) => updateField('systolic_bp', e.target.value ? parseInt(e.target.value, 10) : '')}
                placeholder="e.g. 138"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.manual.diastolicBp} <span className="text-[10px] text-slate-400 font-normal">(&lt; 80)</span>
              </label>
              <input
                type="number"
                value={formData.diastolic_bp ?? ''}
                onChange={(e) => updateField('diastolic_bp', e.target.value ? parseInt(e.target.value, 10) : '')}
                placeholder="e.g. 88"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.manual.heartRate} <span className="text-[10px] text-slate-400 font-normal">(60 - 100)</span>
              </label>
              <input
                type="number"
                value={formData.heart_rate ?? ''}
                onChange={(e) => updateField('heart_rate', e.target.value ? parseInt(e.target.value, 10) : '')}
                placeholder="e.g. 74"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Laboratory & Metabolic Tests */}
        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm sm:text-base border-b border-slate-100 pb-3">
            <FlaskConical className="w-4 h-4 text-emerald-600" />
            <span>{t.manual.labsSection}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.manual.fastingGlucose} <span className="text-[10px] text-slate-400 font-normal">(70 - 99)</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.glucose_fasting ?? ''}
                onChange={(e) => updateField('glucose_fasting', e.target.value ? parseFloat(e.target.value) : '')}
                placeholder="e.g. 142"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.manual.randomGlucose} <span className="text-[10px] text-slate-400 font-normal">(&lt; 140)</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.glucose_random ?? ''}
                onChange={(e) => updateField('glucose_random', e.target.value ? parseFloat(e.target.value) : '')}
                placeholder="e.g. 165"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.manual.hba1c} <span className="text-[10px] text-slate-400 font-normal">(&lt; 5.7%)</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.hba1c ?? ''}
                onChange={(e) => updateField('hba1c', e.target.value ? parseFloat(e.target.value) : '')}
                placeholder="e.g. 7.4"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.manual.totalCholesterol} <span className="text-[10px] text-slate-400 font-normal">(&lt; 200)</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.total_cholesterol ?? ''}
                onChange={(e) => updateField('total_cholesterol', e.target.value ? parseFloat(e.target.value) : '')}
                placeholder="e.g. 235"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.manual.ldlCholesterol} <span className="text-[10px] text-slate-400 font-normal">(&lt; 100)</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.ldl_cholesterol ?? ''}
                onChange={(e) => updateField('ldl_cholesterol', e.target.value ? parseFloat(e.target.value) : '')}
                placeholder="e.g. 145"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.manual.serumCreatinine} <span className="text-[10px] text-slate-400 font-normal">(0.7 - 1.3)</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.serum_creatinine ?? ''}
                onChange={(e) => updateField('serum_creatinine', e.target.value ? parseFloat(e.target.value) : '')}
                placeholder="e.g. 1.05"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ALT / SGPT Liver Enzyme (U/L) <span className="text-[10px] text-slate-400 font-normal">(7 - 45)</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.alt ?? ''}
                onChange={(e) => updateField('alt', e.target.value ? parseFloat(e.target.value) : '')}
                placeholder="e.g. 52"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                TSH Thyroid Hormone (mIU/L) <span className="text-[10px] text-slate-400 font-normal">(0.4 - 4.5)</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.tsh ?? ''}
                onChange={(e) => updateField('tsh', e.target.value ? parseFloat(e.target.value) : '')}
                placeholder="e.g. 6.8"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Section 5: Symptoms & Clinical History */}
        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm sm:text-base border-b border-slate-100 pb-3">
            <Stethoscope className="w-4 h-4 text-indigo-600" />
            <span>{t.manual.symptomsSection}</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.manual.smokingStatus}
              </label>
              <select
                value={formData.smoking_status || 'never'}
                onChange={(e) => updateField('smoking_status', e.target.value)}
                className="w-full sm:w-1/2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer"
              >
                <option value="never">{t.manual.smokingNever}</option>
                <option value="former">{t.manual.smokingFormer}</option>
                <option value="current">{t.manual.smokingCurrent}</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!formData.symChestPain}
                  onChange={(e) => updateField('chest_pain', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="text-xs font-medium text-slate-700">{t.manual.symChestPain}</span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!formData.shortness_of_breath}
                  onChange={(e) => updateField('shortness_of_breath', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="text-xs font-medium text-slate-700">{t.manual.symShortnessBreath}</span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!formData.frequent_urination}
                  onChange={(e) => updateField('frequent_urination', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="text-xs font-medium text-slate-700">{t.manual.symFrequentUrination}</span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!formData.excessive_thirst}
                  onChange={(e) => updateField('excessive_thirst', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="text-xs font-medium text-slate-700">{t.manual.symExcessiveThirst}</span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!formData.family_history_diabetes}
                  onChange={(e) => updateField('family_history_diabetes', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="text-xs font-medium text-slate-700">{t.manual.histDiabetes}</span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!formData.family_history_heart}
                  onChange={(e) => updateField('family_history_heart', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="text-xs font-medium text-slate-700">{t.manual.histHeart}</span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!formData.headache_severe}
                  onChange={(e) => updateField('headache_severe', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="text-xs font-medium text-slate-700">Recurrent throbbing migraine headache / photophobia</span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!formData.wheezing}
                  onChange={(e) => updateField('wheezing', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="text-xs font-medium text-slate-700">Wheezing / respiratory airway constriction</span>
              </label>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{t.manual.submitBtn}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
