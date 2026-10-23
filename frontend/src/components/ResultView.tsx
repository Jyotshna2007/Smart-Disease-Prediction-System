import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Download,
  Printer,
  RotateCcw,
  History,
  AlertTriangle,
  Info,
  CheckCircle2,
  TrendingUp,
  FileText,
  Activity,
  Cpu,
} from 'lucide-react';
import { Language, translations } from '../translations.js';
import { PredictionRecord, api } from '../api.js';

interface Props {
  lang: Language;
  record: PredictionRecord;
  onStartNew: () => void;
  onViewHistory: () => void;
  onViewModelInfo?: () => void;
}

const METHOD_TEXT = {
  en: {
    guidelineScore: 'Guideline score',
    modelTitle: 'Curious how this result was prepared?',
    modelDesc: 'See how reliable the tool is and how your values were checked. Entirely optional.',
    modelCta: 'About the model',
    disclaimer: 'This is a screening estimate, not a diagnosis. Please confirm with a qualified doctor.',
  },
  te: {
    guidelineScore: 'గైడ్‌లైన్ స్కోర్',
    modelTitle: 'ఈ ఫలితం ఎలా తయారైందో తెలుసుకోవాలనుందా?',
    modelDesc: 'ఈ సాధనం ఎంత నమ్మదగినదో, మీ విలువలను ఎలా పరిశీలించారో చూడండి. ఇది పూర్తిగా ఐచ్ఛికం.',
    modelCta: 'మోడల్ గురించి',
    disclaimer: 'ఇది స్క్రీనింగ్ అంచనా మాత్రమే, రోగనిర్ధారణ కాదు. దయచేసి వైద్యుడిని సంప్రదించండి.',
  },
  hi: {
    guidelineScore: 'दिशानिर्देश स्कोर',
    modelTitle: 'जानना चाहते हैं कि यह परिणाम कैसे तैयार हुआ?',
    modelDesc: 'देखें कि टूल कितना भरोसेमंद है और आपके मानों की जाँच कैसे हुई। यह पूरी तरह वैकल्पिक है।',
    modelCta: 'मॉडल के बारे में',
    disclaimer: 'यह केवल स्क्रीनिंग अनुमान है, निदान नहीं। कृपया डॉक्टर से पुष्टि करें।',
  },
} as const;

export const ResultView: React.FC<Props> = ({ lang, record, onStartNew, onViewHistory, onViewModelInfo }) => {
  const t = translations[lang];
  const mt = METHOD_TEXT[lang];
  const method = record.model_info?.method || record.method;

  const conditionName =
    lang === 'te' ? record.predicted_condition_te :
    lang === 'hi' ? record.predicted_condition_hi :
    record.predicted_condition;

  const summaryText =
    lang === 'te' ? record.summary_te :
    lang === 'hi' ? record.summary_hi :
    record.summary;

  const recommendationsList =
    lang === 'te' ? record.recommendations_te :
    lang === 'hi' ? record.recommendations_hi :
    record.recommendations;

  const riskBadgeStyles = {
    Low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Moderate: 'bg-amber-50 text-amber-700 border-amber-200',
    High: 'bg-rose-50 text-rose-700 border-rose-200',
    Severe: 'bg-red-100 text-red-800 border-red-300',
  }[record.risk_level];

  const riskLabel = {
    Low: t.risk.low,
    Moderate: t.risk.moderate,
    High: t.risk.high,
    Severe: t.risk.severe,
  }[record.risk_level];

  const handleDownload = async () => {
    try {
      await api.downloadReportFile(record.id, lang);
    } catch {
      // Fallback: open the report in a new tab
      window.open(api.getReportDownloadUrl(record.id, lang), '_blank');
    }
  };

  // Opens the report and triggers the print dialog (choose "Save as PDF")
  const handlePrint = () => {
    const win = window.open(api.getReportDownloadUrl(record.id, lang, 'print'), '_blank');
    if (!win) window.location.href = api.getReportDownloadUrl(record.id, lang, 'print');
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      
      {/* Top Banner with Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-6 sm:p-7 border border-slate-100 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-2">
            <Activity className="w-3.5 h-3.5 text-blue-600" />
            <span>{t.result.badge}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t.result.title}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Reference ID: <span className="font-mono font-semibold text-slate-700">{record.id.slice(0, 8).toUpperCase()}</span> &bull;{' '}
            {new Date(record.created_at).toLocaleString()}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{t.result.downloadReport}</span>
          </button>
          
          <button
            type="button"
            onClick={handlePrint}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title={t.result.printReport}
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Condition Result Card */}
      <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="text-xs sm:text-sm font-semibold text-blue-200 uppercase tracking-wider">
            {t.result.predictedCondition}
          </div>

          <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            {conditionName}
          </h3>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {/* Risk Badge */}
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs sm:text-sm font-bold shadow-sm ${riskBadgeStyles}`}>
              {record.risk_level === 'Low' ? (
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-rose-600" />
              )}
              <span>{t.result.riskLevel}: {riskLabel}</span>
            </div>

            {/* Confidence Badge */}
            {record.confidence > 0 && (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs sm:text-sm font-bold">
                <TrendingUp className="w-4 h-4 text-cyan-300" />
                <span>{method === 'guidelines' ? mt.guidelineScore : t.result.confidence}: {record.confidence}%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Why This Result Was Generated */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-3">
        <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base sm:text-lg border-b border-slate-100 pb-3">
          <Info className="w-5 h-5 text-blue-600" />
          <span>{t.result.whyGenerated}</span>
        </div>
        <p className="text-sm text-slate-700 leading-relaxed pt-1">
          {summaryText}
        </p>
      </div>

      {/* Gentle pointer to the separate "About the model" page (technical details are kept off the report) */}
      {record.condition_id !== 'insufficient_data' && (
        <div className="bg-violet-50/60 rounded-2xl p-5 border border-violet-100 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
          <Cpu className="w-6 h-6 text-violet-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-900">{mt.modelTitle}</p>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{mt.modelDesc}</p>
          </div>
          {onViewModelInfo && (
            <button type="button" onClick={onViewModelInfo} className="px-4 py-2 rounded-xl bg-white border border-violet-200 text-violet-700 text-xs sm:text-sm font-bold hover:bg-violet-100 transition-colors cursor-pointer">
              {mt.modelCta}
            </button>
          )}
        </div>
      )}
      <p className="text-xs text-slate-500 text-center px-2">{mt.disclaimer}</p>

      {/* Clinical Signals Grid */}
      {record.signals && record.signals.length > 0 && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base sm:text-lg border-b border-slate-100 pb-3">
            <Activity className="w-5 h-5 text-blue-600" />
            <span>{t.result.clinicalSignals}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {record.signals.map((sig, idx) => {
              const statusBadge = sig.status === 'normal'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : sig.status === 'elevated'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-rose-50 text-rose-700 border-rose-200';

              return (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 flex flex-col justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">{sig.name}</span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${statusBadge}`}>
                        {sig.status}
                      </span>
                    </div>
                    <div className="text-lg font-extrabold text-slate-900 font-mono">
                      {sig.value}{' '}
                      <span className="text-xs font-normal text-slate-500">{sig.unit}</span>
                    </div>
                  </div>

                  <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-200/60 mt-2">
                    <div>Ref: <span className="font-semibold text-slate-700">{sig.normalRange} {sig.unit}</span></div>
                    <p className="text-slate-600 mt-1 line-clamp-2">{sig.impactDescription}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Clinical Recommendations */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base sm:text-lg border-b border-slate-100 pb-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>{t.result.recommendations}</span>
        </div>

        <ul className="space-y-2.5 pt-1">
          {recommendationsList.map((rec, i) => (
            <li key={i} className="flex items-start gap-3 text-xs sm:text-sm text-slate-700">
              <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              <span className="leading-snug">{rec}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Medical Safety Disclaimer */}
      <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed space-y-1">
          <p className="font-bold text-amber-950">{t.result.disclaimerTitle}</p>
          <p>{t.result.disclaimerText}</p>
        </div>
      </div>

      {/* Bottom Navigation Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onStartNew}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>{t.result.startNew}</span>
        </button>

        <button
          type="button"
          onClick={onViewHistory}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
        >
          <History className="w-4 h-4 text-slate-500" />
          <span>{t.result.viewHistory}</span>
        </button>
      </div>

    </div>
  );
};
