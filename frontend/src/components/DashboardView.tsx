import React from 'react';
import { UploadCloud, FileEdit, Activity, Clock, ShieldCheck, AlertTriangle, ArrowRight, Eye, Download } from 'lucide-react';
import { Language, translations } from '../translations.js';
import { User, PredictionRecord, api } from '../api.js';

interface Props {
  lang: Language;
  user: User;
  predictions: PredictionRecord[];
  onSelectUpload: () => void;
  onSelectManual: () => void;
  onSelectPrediction: (record: PredictionRecord) => void;
}

export const DashboardView: React.FC<Props> = ({
  lang,
  user,
  predictions,
  onSelectUpload,
  onSelectManual,
  onSelectPrediction,
}) => {
  const t = translations[lang];

  const totalCount = predictions.length;
  const optimalCount = predictions.filter((p) => p.condition_id !== 'disease_prediction_unavailable').length;
  const highRiskCount = predictions.filter((p) => p.risk_level === 'High' || p.risk_level === 'Severe').length;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 rounded-3xl p-7 sm:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl space-y-2.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-blue-100 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>AI-Assisted Clinical Support</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            {t.dashboard.welcomeGreeting}, <span className="text-cyan-200">{user.name}</span>
          </h2>
          <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
            {t.dashboard.welcomeSub}
          </p>
        </div>
      </div>

      {/* Two Main Input Options Matching PPT & Specification */}
      <div className="space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
          {t.dashboard.startAssessment}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Upload Medical Report */}
          <div
            onClick={onSelectUpload}
            className="group relative bg-white rounded-2xl p-7 sm:p-8 border border-slate-200/80 hover:border-blue-400 shadow-sm hover:shadow-xl transition-all duration-200 flex flex-col justify-between cursor-pointer"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 group-hover:bg-blue-600 text-blue-600 group-hover:text-white transition-colors flex items-center justify-center shadow-xs">
                <UploadCloud className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 group-hover:text-blue-700 transition-colors">
                  {t.dashboard.uploadCardTitle}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                  {t.dashboard.uploadCardDesc}
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-blue-600 font-bold text-xs sm:text-sm">
              <span>{t.dashboard.uploadBtn}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 2: Enter Details Manually */}
          <div
            onClick={onSelectManual}
            className="group relative bg-white rounded-2xl p-7 sm:p-8 border border-slate-200/80 hover:border-blue-400 shadow-sm hover:shadow-xl transition-all duration-200 flex flex-col justify-between cursor-pointer"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 group-hover:bg-indigo-600 text-indigo-600 group-hover:text-white transition-colors flex items-center justify-center shadow-xs">
                <FileEdit className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 group-hover:text-indigo-700 transition-colors">
                  {t.dashboard.manualCardTitle}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                  {t.dashboard.manualCardDesc}
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-indigo-600 font-bold text-xs sm:text-sm">
              <span>{t.dashboard.manualBtn}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Statistics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 font-mono">{totalCount}</div>
            <div className="text-xs font-semibold text-slate-500">{t.dashboard.statTotal}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-emerald-700 font-mono">{optimalCount}</div>
            <div className="text-xs font-semibold text-slate-500">{t.dashboard.statOptimal}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-rose-700 font-mono">{highRiskCount}</div>
            <div className="text-xs font-semibold text-slate-500">{t.dashboard.statHighRisk}</div>
          </div>
        </div>
      </div>

      {/* Recent Assessments Section */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>{t.dashboard.recentTitle}</span>
          </h3>
          <span className="text-xs font-medium text-slate-400">
            {predictions.length} {predictions.length === 1 ? 'assessment' : 'assessments'}
          </span>
        </div>

        {predictions.length === 0 ? (
          /* Strictly empty state for new users as required */
          <div className="py-12 px-4 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-300 mx-auto flex items-center justify-center">
              <Clock className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm sm:text-base font-bold text-slate-800">
                {t.dashboard.noAssessmentsTitle}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {t.dashboard.noAssessmentsDesc}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {predictions.slice(0, 5).map((pred) => {
              const condition =
                lang === 'te' ? pred.predicted_condition_te :
                lang === 'hi' ? pred.predicted_condition_hi :
                pred.predicted_condition;

              const badgeColor =
                pred.risk_level === 'Low' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                pred.risk_level === 'Moderate' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                'bg-rose-50 text-rose-700 border-rose-200';

              return (
                <div
                  key={pred.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 px-3 rounded-xl transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900">{condition}</span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${badgeColor}`}>
                        {pred.risk_level}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2">
                      <span>{new Date(pred.created_at).toLocaleDateString()}</span>
                      <span>&bull;</span>
                      <span>Confidence: {pred.confidence}%</span>
                      <span>&bull;</span>
                      <span className="capitalize">{pred.input_type === 'pdf' ? 'Report PDF' : 'Manual Entry'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => onSelectPrediction(pred)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const url = api.getReportDownloadUrl(pred.id, lang);
                        window.open(url, '_blank');
                      }}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white text-xs transition-colors cursor-pointer"
                      title="Download Report"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
