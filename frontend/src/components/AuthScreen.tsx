import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, ShieldCheck, FileText, Users, Heart, AlertCircle, CheckCircle2 } from 'lucide-react';
import { MedicalVisual } from './MedicalVisual.js';
import { LanguageSelector } from './LanguageSelector.js';
import { Language, translations } from '../translations.js';
import { api, User as UserType } from '../api.js';

interface Props {
  lang: Language;
  onSelectLanguage: (lang: Language) => void;
  onLoginSuccess: (user: UserType) => void;
}

export const AuthScreen: React.FC<Props> = ({ lang, onSelectLanguage, onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Form states - strictly blank as required (no demo accounts)
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [preferredLang, setPreferredLang] = useState<Language>(lang);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const t = translations[lang];

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (mode === 'register') {
      if (!fullName.trim()) {
        setErrorMessage(t.auth.fullNamePlaceholder);
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setErrorMessage(t.auth.emailPlaceholder);
        return;
      }
      if (password.length < 8) {
        setErrorMessage(t.errors.shortPassword);
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage(t.errors.passwordMismatch);
        return;
      }

      setIsLoading(true);
      try {
        const res = await api.register({
          name: fullName,
          email,
          password,
          confirm_password: confirmPassword,
          preferred_language: preferredLang,
        });
        setSuccessMessage('Account registered successfully! Redirecting...');
        onSelectLanguage(preferredLang);
        setTimeout(() => {
          onLoginSuccess(res.user);
        }, 500);
      } catch (err: any) {
        setErrorMessage(err.message || t.errors.serverError);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Login mode
      if (!email.trim() || !password) {
        setErrorMessage(t.errors.invalidLogin);
        return;
      }

      setIsLoading(true);
      try {
        const res = await api.login({ email, password });
        onSelectLanguage(res.user.preferred_language || lang);
        onLoginSuccess(res.user);
      } catch (err: any) {
        setErrorMessage(err.message || t.errors.invalidLogin);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#eff6ff] via-[#f8fafc] to-[#e0f2fe] flex flex-col justify-between relative overflow-hidden">
      {/* Decorative gentle background curves */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-3xl pointer-events-none -mr-40 -mt-40" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan-100/30 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      {/* Top Bar with Language Selector */}
      <header className="w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 shadow-md shadow-blue-500/20 flex items-center justify-center text-white">
            <Heart className="w-5 h-5 fill-white" />
          </div>
          <span className="font-extrabold text-slate-800 text-lg sm:text-xl tracking-tight hidden sm:inline">
            Smart Disease <span className="text-blue-600">Prediction</span> System
          </span>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSelector currentLang={lang} onSelectLanguage={onSelectLanguage} />
        </div>
      </header>

      {/* Main Content Area: Split View matching image.png */}
      <main className="w-full max-w-7xl mx-auto px-6 py-6 lg:py-8 flex-1 flex items-center justify-center z-20">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          
          {/* Left Column: Branding, Benefits & Visual */}
          <div className="lg:col-span-6 flex flex-col justify-center space-y-7">
            {/* Title Section */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-semibold tracking-wide">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                {t.brand.engineBadge}
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1e3a8a] tracking-tight leading-tight">
                {t.brand.title}
              </h1>
              <p className="text-base sm:text-lg text-slate-600 font-medium">
                {t.brand.tagline}
              </p>
            </div>

            {/* Feature List Cards */}
            <div className="space-y-3.5 max-w-md">
              {/* Feature 1 */}
              <div className="flex items-start gap-3.5 p-3 rounded-xl bg-white/70 backdrop-blur-xs border border-white shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">{t.brand.earlyRiskTitle}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{t.brand.earlyRiskDesc}</p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex items-start gap-3.5 p-3 rounded-xl bg-white/70 backdrop-blur-xs border border-white shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">{t.brand.multiConditionTitle}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{t.brand.multiConditionDesc}</p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex items-start gap-3.5 p-3 rounded-xl bg-white/70 backdrop-blur-xs border border-white shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">{t.brand.securePrivateTitle}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{t.brand.securePrivateDesc}</p>
                </div>
              </div>
            </div>

            {/* Central Graphic & Cursive Accent */}
            <div className="pt-2 flex flex-col items-center sm:items-start space-y-4">
              <div className="w-full max-w-sm">
                <MedicalVisual />
              </div>
              
              <div className="relative pt-2 pl-2">
                <span className="font-['Caveat',cursive] text-2xl sm:text-3xl text-blue-700 tracking-wide font-bold inline-block">
                  "{t.brand.healthierTomorrow}"
                </span>
                <div className="w-24 h-1.5 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full mt-1" />
              </div>
            </div>
          </div>

          {/* Right Column: Auth Card */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 p-7 sm:p-9 transition-all">
              
              {/* Card Header */}
              <div className="text-center sm:text-left mb-6">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {mode === 'login' ? t.auth.welcomeBack : t.auth.createAccountTitle}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
                  {mode === 'login' ? t.auth.loginSubtitle : t.auth.registerSubtitle}
                </p>
              </div>

              {/* Status / Alert Messages */}
              {errorMessage && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span className="leading-snug">{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  <span className="leading-snug">{successMessage}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                
                {/* Full Name (Registration only) */}
                {mode === 'register' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {t.auth.fullName}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={t.auth.fullNamePlaceholder}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {t.auth.email}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t.auth.emailPlaceholder}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {t.auth.password}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t.auth.passwordPlaceholder}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password (Registration only) */}
                {mode === 'register' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {t.auth.confirmPassword}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={t.auth.confirmPasswordPlaceholder}
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 font-medium">
                      {t.auth.passwordReqs}
                    </p>
                  </div>
                )}

                {/* Preferred Language for Register */}
                {mode === 'register' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {t.auth.preferredLanguage}
                    </label>
                    <select
                      value={preferredLang}
                      onChange={(e) => setPreferredLang(e.target.value as Language)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer"
                    >
                      <option value="en">English (English)</option>
                      <option value="te">తెలుగు (Telugu)</option>
                      <option value="hi">हिन्दी (Hindi)</option>
                    </select>
                  </div>
                )}

                {/* Forgot Password Link (Login only) */}
                {mode === 'login' && (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                    >
                      {t.auth.forgotPassword}
                    </button>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-bold shadow-lg shadow-blue-600/25 transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{mode === 'login' ? t.auth.loginBtn : t.auth.registerBtn}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* OR Divider */}
              <div className="relative my-6 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative inline-block px-3 bg-white text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {t.auth.orDivider}
                </div>
              </div>

              {/* Mode Toggle Button */}
              <div className="text-center space-y-2">
                <p className="text-xs text-slate-500">
                  {mode === 'login' ? t.auth.dontHaveAccount : t.auth.alreadyHaveAccount}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setSuccessMessage(null);
                    setMode(mode === 'login' ? 'register' : 'login');
                  }}
                  className="w-full py-2.5 px-4 rounded-xl border border-blue-500 text-blue-600 hover:bg-blue-50 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  {mode === 'login' ? t.auth.createAccountBtn : t.auth.loginHereBtn}
                </button>
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-2">{t.auth.forgotPassword}</h3>
            <p className="text-xs sm:text-sm text-slate-600 mb-4 leading-relaxed">
              To securely reset your password or access account recovery, please verify your registered email address or contact your designated system administrator.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clean Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-4 text-center text-xs text-slate-400 font-medium">
        &copy; {new Date().getFullYear()} Smart Disease Prediction System &bull; Intelligent Clinical Decision Support
      </footer>
    </div>
  );
};
