import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, X, ArrowRight, ShieldCheck, Languages } from 'lucide-react';
import { Language, translations } from '../translations.js';
import { api, PredictionRecord } from '../api.js';

interface Props {
  lang: Language;
  onPredictionComplete: (record: PredictionRecord) => void;
  onSwitchToManual: () => void;
}

export const UploadView: React.FC<Props> = ({ lang, onPredictionComplete, onSwitchToManual }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = translations[lang];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const validateAndSetFile = (selectedFile: File) => {
    setErrorMessage(null);
    if (!selectedFile.name.toLowerCase().endsWith('.pdf') && selectedFile.type !== 'application/pdf') {
      setErrorMessage(t.errors.invalidPdf);
      return;
    }
    if (selectedFile.size > 15 * 1024 * 1024) {
      setErrorMessage('The uploaded file exceeds the 15MB limit.');
      return;
    }
    setFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async () => {
    if (!file) {
      setErrorMessage(t.errors.invalidPdf);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setLoadingStep(t.upload.analyzing);

    // Provide progressive status updates
    const t1 = setTimeout(() => setLoadingStep(t.upload.processing), 1200);
    const t2 = setTimeout(() => setLoadingStep(t.upload.evaluating), 2400);

    try {
      const res = await api.uploadReport(file);
      clearTimeout(t1);
      clearTimeout(t2);
      onPredictionComplete(res.record);
    } catch (err: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      setErrorMessage(err.message || t.errors.insufficientData);
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {t.upload.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {t.upload.desc}
            </p>
          </div>
        </div>

        {/* Multilingual Notice */}
        <div className="mt-4 p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start gap-2.5 text-xs text-blue-800 font-medium">
          <Languages className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <span>{t.upload.multilingualNotice}</span>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">{errorMessage}</p>
            {errorMessage.includes('enough information') && (
              <button
                type="button"
                onClick={onSwitchToManual}
                className="text-blue-600 hover:text-blue-800 underline font-semibold cursor-pointer"
              >
                Switch to manual entry to input values directly &rarr;
              </button>
            )}
          </div>
        </div>
      )}

      {/* Upload Drop Zone */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-sm">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {!file ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-150 flex flex-col items-center justify-center gap-3 ${
              isDragging
                ? 'border-blue-500 bg-blue-50/50 scale-[1.01]'
                : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50/50'
            }`}
          >
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
              <UploadCloud className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <p className="text-sm sm:text-base font-bold text-slate-800">
                {t.upload.dragDrop}{' '}
                <span className="text-blue-600 hover:underline">{t.upload.orBrowse}</span>
              </p>
              <p className="text-xs text-slate-400">{t.upload.fileLimit}</p>
            </div>

            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>HIPAA Compliant &bull; Secure Encrypted Processing</span>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-800 break-all">{file.name}</div>
                  <div className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB &bull; PDF Document</div>
                </div>
              </div>

              {!isLoading && (
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title={t.upload.removeFile}
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Loading Indicator */}
            {isLoading ? (
              <div className="py-6 flex flex-col items-center justify-center space-y-3">
                <div className="w-10 h-10 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-800">{loadingStep}</p>
                  <p className="text-xs text-slate-400 mt-1">Please do not close this window</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleUploadSubmit}
                  className="w-full sm:flex-1 py-3 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{t.upload.analyzeBtn}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full sm:w-auto py-3 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs transition-colors cursor-pointer"
                >
                  {t.upload.changeFile}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
