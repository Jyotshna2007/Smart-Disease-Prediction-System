import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { Language } from '../translations.js';

interface Props {
  currentLang: Language;
  onSelectLanguage: (lang: Language) => void;
  className?: string;
  variant?: 'light' | 'dark' | 'outline';
}

const LANGUAGES: { code: Language; name: string; nativeName: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
];

export const LanguageSelector: React.FC<Props> = ({
  currentLang,
  onSelectLanguage,
  className = '',
  variant = 'light',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeLang = LANGUAGES.find((l) => l.code === currentLang) || LANGUAGES[0];

  const variantStyles =
    variant === 'outline'
      ? 'bg-white border border-slate-200 text-slate-700 shadow-sm hover:border-blue-400'
      : variant === 'dark'
      ? 'bg-slate-800 text-slate-100 border border-slate-700 hover:bg-slate-700'
      : 'bg-white/90 backdrop-blur-sm border border-slate-200/80 text-slate-800 shadow-sm hover:bg-white hover:border-blue-300';

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer ${variantStyles}`}
        aria-expanded={isOpen}
      >
        <Globe className="w-3.5 h-3.5 text-blue-600" />
        <span>{activeLang.nativeName}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-44 rounded-xl bg-white shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Choose Language / భాష
          </div>
          {LANGUAGES.map((lang) => {
            const isSelected = lang.code === currentLang;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => {
                  onSelectLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2 text-xs text-left cursor-pointer transition-colors ${
                  isSelected ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="font-medium">{lang.nativeName}</div>
                  <div className="text-[11px] text-slate-400 font-normal">{lang.name}</div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-blue-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
