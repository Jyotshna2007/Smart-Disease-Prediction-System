import React, { useState } from 'react';
import { History, Download, Eye, Trash2, Calendar, FileText, Activity, AlertCircle } from 'lucide-react';
import { Language, translations } from '../translations.js';
import { PredictionRecord, api } from '../api.js';

interface Props {
  lang: Language;
  predictions: PredictionRecord[];
  onSelectPrediction: (record: PredictionRecord) => void;
  onRefreshHistory: () => void;
  onStartNew: () => void;
}

export const HistoryView: React.FC<Props> = ({
  lang,
  predictions,
  onSelectPrediction,
  onRefreshHistory,
  onStartNew,
}) => {
  const t = translations[lang];
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(t.history.deleteConfirm)) return;

    setDeletingId(id);
    try {
      await api.deletePrediction(id);
      onRefreshHistory();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete assessment record.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    api.downloadReportFile(id, lang).catch(() => {
      window.open(api.getReportDownloadUrl(id, lang), '_blank');
    });
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {t.history.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {t.history.subtitle}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onStartNew}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Activity className="w-4 h-4" />
          <span>New Assessment</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Reports Table / Card List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {predictions.length === 0 ? (
          <div className="py-16 px-4 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 text-slate-300 mx-auto flex items-center justify-center">
              <FileText className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-slate-800">{t.history.noHistory}</h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                {t.history.noHistorySub}
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={onStartNew}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md transition-colors cursor-pointer"
              >
                <span>{t.history.startFirstBtn}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {predictions.map((record) => {
              const conditionName =
                lang === 'te' ? record.predicted_condition_te :
                lang === 'hi' ? record.predicted_condition_hi :
                record.predicted_condition;

              const riskBadgeColor =
                record.risk_level === 'Low' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                record.risk_level === 'Moderate' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                'bg-rose-50 text-rose-700 border-rose-200';

              const riskLabel =
                record.risk_level === 'Low' ? t.risk.low :
                record.risk_level === 'Moderate' ? t.risk.moderate :
                record.risk_level === 'High' ? t.risk.high : t.risk.severe;

              return (
                <div
                  key={record.id}
                  onClick={() => onSelectPrediction(record)}
                  className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors cursor-pointer group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-base font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {conditionName}
                      </span>
                      <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${riskBadgeColor}`}>
                        {riskLabel}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 font-medium">
                      <span className="flex items-center gap-1.5 text-slate-600">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(record.created_at).toLocaleString()}
                      </span>
                      <span>&bull;</span>
                      <span>
                        Confidence: <strong className="text-slate-800 font-mono">{record.confidence}%</strong>
                      </span>
                      <span>&bull;</span>
                      <span className="capitalize text-slate-600">
                        {record.input_type === 'pdf' ? `Document (${record.file_name || 'PDF'})` : 'Manual Entry'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 self-end md:self-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPrediction(record);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-blue-400 text-slate-700 hover:text-blue-600 text-xs font-semibold bg-white shadow-2xs transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{t.history.viewDetails}</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDownload(record.id, e)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-blue-400 text-slate-700 hover:text-blue-600 text-xs font-semibold bg-white shadow-2xs transition-colors cursor-pointer"
                      title={t.history.download}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{t.history.download}</span>
                    </button>

                    <button
                      type="button"
                      disabled={deletingId === record.id}
                      onClick={(e) => handleDelete(record.id, e)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                      title={t.history.delete}
                    >
                      <Trash2 className="w-4 h-4" />
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
