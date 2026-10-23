import React, { useState, useEffect, useRef } from 'react';
import {
  Heart,
  LayoutDashboard,
  FilePlus,
  History as HistoryIcon,
  User as UserIcon,
  LogOut,
  UploadCloud,
  FileEdit,
  Sparkles,
  Cpu,
} from 'lucide-react';
import { AuthScreen } from './components/AuthScreen.js';
import { DashboardView } from './components/DashboardView.js';
import { UploadView } from './components/UploadView.js';
import { ManualEntryView } from './components/ManualEntryView.js';
import { ResultView } from './components/ResultView.js';
import { HistoryView } from './components/HistoryView.js';
import { ProfileView } from './components/ProfileView.js';
import { ModelInfoView } from './components/ModelInfoView.js';
import { LanguageSelector } from './components/LanguageSelector.js';
import { Language, translations } from './translations.js';
import { api, User, PredictionRecord, authStorage } from './api.js';

type Tab = 'dashboard' | 'upload' | 'manual' | 'result' | 'history' | 'profile' | 'model';
const VIEW_KEY = 'sdps_view';
const VALID_TABS: Tab[] = ['dashboard', 'upload', 'manual', 'result', 'history', 'profile', 'model'];

// Remember which screen / result the person was on so a page refresh brings them back to it.
function loadSavedView(): { tab: Tab; recordId?: string } {
  try {
    const raw = localStorage.getItem(VIEW_KEY);
    if (raw) {
      const v = JSON.parse(raw);
      if (VALID_TABS.includes(v.tab)) {
        // A result screen can only be restored if we know which record it was
        if (v.tab === 'result' && !v.recordId) return { tab: 'dashboard' };
        return { tab: v.tab, recordId: v.recordId };
      }
    }
  } catch { /* ignore corrupt storage */ }
  return { tab: 'dashboard' };
}

export default function App() {
  const [lang, setLang] = useState<Language>('en');
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Active view
  const savedView = useRef(loadSavedView());
  const [activeTab, setActiveTab] = useState<Tab>(savedView.current.tab);

  // Active prediction record for ResultView
  const [selectedRecord, setSelectedRecord] = useState<PredictionRecord | null>(null);
  // When the model page is opened from a result, that result's details are shown on it
  const [modelRecord, setModelRecord] = useState<PredictionRecord | null>(null);
  const [restoring, setRestoring] = useState(savedView.current.tab === 'result');

  // User's prediction history
  const [predictions, setPredictions] = useState<PredictionRecord[]>([]);

  // Check existing session on load
  useEffect(() => {
    async function initAuth() {
      const token = authStorage.getToken();
      if (token) {
        try {
          const res = await api.getCurrentUser();
          setUser(res.user);
          if (res.user.preferred_language) {
            setLang(res.user.preferred_language);
          }
        } catch (e) {
          authStorage.clearToken();
          setUser(null);
          setRestoring(false);
          setActiveTab('dashboard');
        }
      } else {
        setRestoring(false);
        setActiveTab('dashboard');
      }
      setIsInitializing(false);
    }
    initAuth();
  }, []);

  // Persist the current screen + open result (survives refresh until the person changes it)
  useEffect(() => {
    if (isInitializing) return;
    try {
      if (!user) {
        localStorage.removeItem(VIEW_KEY);
        return;
      }
      // While the saved result is still being re-fetched, keep the saved id
      const recordId = selectedRecord?.id ?? (restoring ? savedView.current.recordId : undefined);
      localStorage.setItem(VIEW_KEY, JSON.stringify({ tab: activeTab, recordId }));
    } catch { /* storage unavailable */ }
  }, [activeTab, selectedRecord, user, isInitializing, restoring]);

  // After login/refresh: re-load the result the person was looking at
  useEffect(() => {
    if (!user || !restoring) return;
    const id = savedView.current.recordId;
    if (!id) {
      setRestoring(false);
      setActiveTab('dashboard');
      return;
    }
    let cancelled = false;
    api.getPredictionById(id)
      .then(res => { if (!cancelled) setSelectedRecord(res.record); })
      .catch(() => { if (!cancelled) setActiveTab('history'); }) // deleted / other account
      .finally(() => { if (!cancelled) setRestoring(false); });
    return () => { cancelled = true; };
  }, [user, restoring]);

  // Fetch predictions whenever user logs in or updates
  const loadPredictions = async () => {
    if (!user) return;
    try {
      const res = await api.getPredictions();
      setPredictions(res.predictions);
    } catch (e) {
      console.error('Failed to load predictions:', e);
    }
  };

  useEffect(() => {
    if (user) {
      loadPredictions();
    } else {
      setPredictions([]);
    }
  }, [user]);

  // Handle Logout
  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    setSelectedRecord(null);
    setPredictions([]);
    setRestoring(false);
    setActiveTab('dashboard');
    try { localStorage.removeItem(VIEW_KEY); } catch { /* ignore */ }
  };

  // When prediction is generated
  const handlePredictionComplete = (record: PredictionRecord) => {
    // Save the open result immediately so even an unexpected reload returns to it
    try { localStorage.setItem(VIEW_KEY, JSON.stringify({ tab: 'result', recordId: record.id })); } catch { /* ignore */ }
    setRestoring(false);
    setSelectedRecord(record);
    setActiveTab('result');
    loadPredictions();
  };

  const t = translations[lang];

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 animate-pulse">
          <Heart className="w-6 h-6 fill-white" />
        </div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Smart Disease Prediction System
        </p>
      </div>
    );
  }

  // If not logged in, show AuthScreen (matching user's provided mockup)
  if (!user) {
    return (
      <AuthScreen
        lang={lang}
        onSelectLanguage={(newLang) => setLang(newLang)}
        onLoginSuccess={(loggedInUser) => {
          setRestoring(false);
          setUser(loggedInUser);
          if (loggedInUser.preferred_language) {
            setLang(loggedInUser.preferred_language);
          }
          setActiveTab('dashboard');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Logo & Brand */}
          <div
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-3 cursor-pointer shrink-0"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Heart className="w-5 h-5 fill-white" />
            </div>
            <div className="hidden sm:block">
              <div className="font-extrabold text-slate-900 text-base tracking-tight leading-tight">
                Smart Disease <span className="text-blue-600">Prediction</span> System
              </div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                Clinical Decision Support
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>{t.nav.dashboard}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'upload' || activeTab === 'manual' || activeTab === 'result'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <FilePlus className="w-3.5 h-3.5" />
              <span>{t.nav.newPrediction}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <HistoryIcon className="w-3.5 h-3.5" />
              <span>{t.nav.history}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>{t.nav.profile}</span>
            </button>
            <button
              type="button"
              onClick={() => { setModelRecord(null); setActiveTab('model'); }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'model'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>{t.nav.modelInfo}</span>
            </button>
          </nav>

          {/* Right Tools: Language Picker & Profile Badge & Logout */}
          <div className="flex items-center gap-2.5">
            <LanguageSelector
              currentLang={lang}
              onSelectLanguage={(newLang) => {
                setLang(newLang);
                if (user) {
                  api.updateProfile({ preferred_language: newLang }).catch(() => {});
                }
              }}
            />

            {/* Profile Avatar / Name */}
            <div
              onClick={() => setActiveTab('profile')}
              className="flex items-center gap-2 pl-1 cursor-pointer"
              title={user.email}
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-extrabold text-xs border border-blue-200">
                {user.name.slice(0, 1).toUpperCase()}
              </div>
              <span className="hidden xl:inline text-xs font-bold text-slate-700 max-w-[120px] truncate">
                {user.name}
              </span>
            </div>

            {/* Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title={t.nav.logout}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="lg:hidden border-t border-slate-100 px-4 py-2 flex items-center justify-around bg-slate-50/80">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-1 text-[11px] font-semibold ${
              activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-500'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>{t.nav.dashboard}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex flex-col items-center gap-1 text-[11px] font-semibold ${
              activeTab === 'upload' || activeTab === 'manual' ? 'text-blue-600' : 'text-slate-500'
            }`}
          >
            <FilePlus className="w-4 h-4" />
            <span>{t.nav.newPrediction}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center gap-1 text-[11px] font-semibold ${
              activeTab === 'history' ? 'text-blue-600' : 'text-slate-500'
            }`}
          >
            <HistoryIcon className="w-4 h-4" />
            <span>{t.nav.history}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-1 text-[11px] font-semibold ${
              activeTab === 'profile' ? 'text-blue-600' : 'text-slate-500'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>{t.nav.profile}</span>
          </button>
          <button
            type="button"
            onClick={() => { setModelRecord(null); setActiveTab('model'); }}
            className={`flex flex-col items-center gap-1 text-[11px] font-semibold ${
              activeTab === 'model' ? 'text-blue-600' : 'text-slate-500'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>{t.nav.modelInfo}</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* Secondary Sub-Bar when inside New Prediction mode */}
        {(activeTab === 'upload' || activeTab === 'manual') && (
          <div className="max-w-3xl mx-auto mb-6 flex items-center justify-center">
            <div className="bg-slate-200/80 p-1 rounded-xl flex items-center gap-1 shadow-inner">
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`inline-flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'upload'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UploadCloud className="w-4 h-4" />
                <span>{t.dashboard.uploadCardTitle}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('manual')}
                className={`inline-flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'manual'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileEdit className="w-4 h-4" />
                <span>{t.dashboard.manualCardTitle}</span>
              </button>
            </div>
          </div>
        )}

        {/* View Router */}
        {activeTab === 'dashboard' && (
          <DashboardView
            lang={lang}
            user={user}
            predictions={predictions}
            onSelectUpload={() => setActiveTab('upload')}
            onSelectManual={() => setActiveTab('manual')}
            onSelectPrediction={(rec) => {
              setRestoring(false);
              setSelectedRecord(rec);
              setActiveTab('result');
            }}
          />
        )}

        {activeTab === 'upload' && (
          <UploadView
            lang={lang}
            onPredictionComplete={handlePredictionComplete}
            onSwitchToManual={() => setActiveTab('manual')}
          />
        )}

        {activeTab === 'manual' && (
          <ManualEntryView
            lang={lang}
            onPredictionComplete={handlePredictionComplete}
          />
        )}

        {activeTab === 'result' && !selectedRecord && restoring && (
          <div className="flex justify-center py-24">
            <div className="w-10 h-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
          </div>
        )}

        {activeTab === 'result' && selectedRecord && (
          <ResultView
            lang={lang}
            record={selectedRecord}
            onStartNew={() => setActiveTab('upload')}
            onViewHistory={() => setActiveTab('history')}
            onViewModelInfo={() => { setModelRecord(selectedRecord); setActiveTab('model'); }}
          />
        )}

        {activeTab === 'model' && (
          <ModelInfoView
            lang={lang}
            record={modelRecord}
            onBack={modelRecord ? () => setActiveTab('result') : undefined}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            lang={lang}
            predictions={predictions}
            onSelectPrediction={(rec) => {
              setRestoring(false);
              setSelectedRecord(rec);
              setActiveTab('result');
            }}
            onRefreshHistory={loadPredictions}
            onStartNew={() => setActiveTab('upload')}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            lang={lang}
            user={user}
            onUpdateUser={(updated) => setUser(updated)}
            onLogout={handleLogout}
            onSelectLanguage={(newLang) => setLang(newLang)}
          />
        )}

      </main>

      {/* Global Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600">Smart Disease Prediction System</span>
            <span>&bull;</span>
            <span>AI-Powered Multi-Model Clinical Engine</span>
          </div>

          <div className="text-center sm:text-right">
            <span>&copy; {new Date().getFullYear()} All rights reserved. Clinical decision support only.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
