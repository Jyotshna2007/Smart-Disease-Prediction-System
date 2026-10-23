import React, { useEffect, useState } from 'react';
import { Cpu, ShieldCheck, ChevronDown, ChevronUp, Info, ArrowLeft, Sparkles, Layers, HeartPulse } from 'lucide-react';
import { Language } from '../translations.js';
import { PredictionRecord, ModelCatalogEntry, api } from '../api.js';

interface Props {
  lang: Language;
  /** When opened from a result screen, the details of that particular prediction are shown first. */
  record?: PredictionRecord | null;
  onBack?: () => void;
}

const TEXT = {
  en: {
    title: 'About the prediction model',
    subtitle: 'A calm, plain-language look at how your result was prepared and how reliable it is.',
    reassure: 'This page is for information only. These numbers describe the tool, not your health. A screening result is a prompt for a conversation with your doctor, never a diagnosis.',
    back: 'Back to my result',
    thisTitle: 'How your result was prepared',
    thisIntro: 'Four different computer models looked at your values separately. Their answers were then averaged, and checked against standard medical guideline limits.',
    thisCol: 'Each model\'s estimate',
    thisFinal: 'Combined estimate',
    factors: 'What mattered most',
    raises: 'pushed the estimate up',
    lowers: 'pulled the estimate down',
    assumed: 'You did not enter these values, so typical healthy values were used',
    howTitle: 'How it works',
    steps: [
      ['You share your values', 'From a lab report or typed in by hand.'],
      ['Four models check them', 'Each one learned from thousands of real, anonymised patient records.'],
      ['Answers are combined', 'The four estimates are averaged and compared with doctor-approved guideline limits.'],
    ],
    relTitle: 'How reliable is it?',
    relIntro: 'Reliability score = how well the model separates people who have a condition from people who do not, tested on patients it had never seen (100 = perfect, 50 = no better than chance).',
    score: 'Reliability score',
    rating: { excellent: 'Excellent', great: 'Very good', good: 'Good' },
    details: 'Technical details',
    hide: 'Hide details',
    trainedOn: 'Learned from',
    people: 'people',
    individual: 'Individual models (reliability score)',
    catch: 'Catches (sensitivity)',
    clear: 'Correctly cleared (specificity)',
    catchHelp: 'of people with the condition were flagged',
    clearHelp: 'of healthy people were correctly not flagged',
    limits: 'Good to know',
    models: { svm: 'SVM', random_forest: 'Random Forest', xgboost: 'XGBoost', ann: 'ANN' },
    modelHelp: {
      svm: 'Finds the best dividing line between healthy and at-risk patterns.',
      random_forest: 'Many decision trees that vote together.',
      xgboost: 'Decision trees that learn from each other\'s mistakes.',
      ann: 'A neural network inspired by the brain.',
    },
    loading: 'Loading model information...',
    error: 'Could not load model information right now. Please try again later.',
  },
  te: {
    title: 'అంచనా మోడల్ గురించి',
    subtitle: 'మీ ఫలితం ఎలా తయారైంది, ఎంత నమ్మదగినది అనేది సులభమైన భాషలో.',
    reassure: 'ఈ పేజీ కేవలం సమాచారం కోసమే. ఈ సంఖ్యలు సాధనం గురించి చెబుతాయి, మీ ఆరోగ్యం గురించి కాదు. స్క్రీనింగ్ ఫలితం అంటే డాక్టర్‌తో మాట్లాడటానికి ఒక సూచన మాత్రమే, రోగనిర్ధారణ కాదు.',
    back: 'నా ఫలితానికి తిరిగి వెళ్ళండి',
    thisTitle: 'మీ ఫలితం ఎలా తయారైంది',
    thisIntro: 'నాలుగు వేర్వేరు కంప్యూటర్ మోడల్స్ మీ విలువలను విడివిడిగా పరిశీలించాయి. వాటి సమాధానాల సగటు తీసుకుని, వైద్య మార్గదర్శక పరిమితులతో సరిపోల్చారు.',
    thisCol: 'ప్రతి మోడల్ అంచనా',
    thisFinal: 'కలిపిన అంచనా',
    factors: 'ఎక్కువ ప్రభావం చూపినవి',
    raises: 'అంచనాను పెంచింది',
    lowers: 'అంచనాను తగ్గించింది',
    assumed: 'ఈ విలువలు మీరు ఇవ్వలేదు, కాబట్టి సాధారణ ఆరోగ్యకరమైన విలువలు ఉపయోగించబడ్డాయి',
    howTitle: 'ఇది ఎలా పనిచేస్తుంది',
    steps: [
      ['మీరు విలువలు ఇస్తారు', 'ల్యాబ్ రిపోర్ట్ నుండి లేదా చేతితో నమోదు చేసినవి.'],
      ['నాలుగు మోడల్స్ పరిశీలిస్తాయి', 'ప్రతి ఒక్కటి వేలాది అసలు, పేరులేని రోగుల రికార్డుల నుండి నేర్చుకుంది.'],
      ['సమాధానాలు కలుపుతారు', 'నాలుగు అంచనాల సగటును వైద్య మార్గదర్శక పరిమితులతో పోలుస్తారు.'],
    ],
    relTitle: 'ఇది ఎంత నమ్మదగినది?',
    relIntro: 'నమ్మకత్వ స్కోర్ = వ్యాధి ఉన్నవారిని, లేనివారిని మోడల్ ఎంత బాగా వేరు చేస్తుంది (ఇంతకు ముందు చూడని రోగులపై పరీక్షించబడింది). 100 = పరిపూర్ణం, 50 = అంచనా వేసినట్లే.',
    score: 'నమ్మకత్వ స్కోర్',
    rating: { excellent: 'అద్భుతం', great: 'చాలా బాగుంది', good: 'బాగుంది' },
    details: 'సాంకేతిక వివరాలు',
    hide: 'వివరాలు దాచండి',
    trainedOn: 'నేర్చుకున్న డేటా',
    people: 'మంది',
    individual: 'వ్యక్తిగత మోడల్స్ (నమ్మకత్వ స్కోర్)',
    catch: 'గుర్తించేది (సెన్సిటివిటీ)',
    clear: 'సరిగ్గా తోసిపుచ్చేది (స్పెసిఫిసిటీ)',
    catchHelp: 'వ్యాధి ఉన్నవారిని గుర్తించింది',
    clearHelp: 'ఆరోగ్యవంతులకు తప్పుగా హెచ్చరిక రాలేదు',
    limits: 'తెలుసుకోవాల్సినవి',
    models: { svm: 'SVM', random_forest: 'Random Forest', xgboost: 'XGBoost', ann: 'ANN' },
    modelHelp: {
      svm: 'ఆరోగ్యకరమైన మరియు ప్రమాద నమూనాల మధ్య ఉత్తమ విభజన రేఖను కనుగొంటుంది.',
      random_forest: 'కలిసి ఓటు వేసే అనేక నిర్ణయ వృక్షాలు.',
      xgboost: 'ఒకదాని తప్పుల నుండి మరొకటి నేర్చుకునే నిర్ణయ వృక్షాలు.',
      ann: 'మెదడు ప్రేరణతో రూపొందిన న్యూరల్ నెట్‌వర్క్.',
    },
    loading: 'మోడల్ సమాచారం లోడ్ అవుతోంది...',
    error: 'ఇప్పుడు మోడల్ సమాచారాన్ని లోడ్ చేయలేకపోయాం. దయచేసి తర్వాత ప్రయత్నించండి.',
  },
  hi: {
    title: 'पूर्वानुमान मॉडल के बारे में',
    subtitle: 'आपका परिणाम कैसे तैयार हुआ और वह कितना भरोसेमंद है, सरल भाषा में।',
    reassure: 'यह पृष्ठ केवल जानकारी के लिए है। ये संख्याएँ टूल के बारे में हैं, आपके स्वास्थ्य के बारे में नहीं। स्क्रीनिंग परिणाम डॉक्टर से बात करने का संकेत मात्र है, निदान नहीं।',
    back: 'मेरे परिणाम पर वापस जाएँ',
    thisTitle: 'आपका परिणाम कैसे तैयार हुआ',
    thisIntro: 'चार अलग-अलग कंप्यूटर मॉडल ने आपके मानों को अलग-अलग देखा। फिर उनके उत्तरों का औसत लिया गया और मानक चिकित्सा दिशानिर्देश सीमाओं से मिलान किया गया।',
    thisCol: 'हर मॉडल का अनुमान',
    thisFinal: 'संयुक्त अनुमान',
    factors: 'सबसे ज़्यादा असर किसका रहा',
    raises: 'अनुमान बढ़ाया',
    lowers: 'अनुमान घटाया',
    assumed: 'ये मान आपने नहीं दिए, इसलिए सामान्य स्वस्थ मान लिए गए',
    howTitle: 'यह कैसे काम करता है',
    steps: [
      ['आप अपने मान देते हैं', 'लैब रिपोर्ट से या हाथ से दर्ज किए हुए।'],
      ['चार मॉडल जाँच करते हैं', 'हर एक ने हज़ारों असली, गुमनाम मरीज़ रिकॉर्ड से सीखा है।'],
      ['उत्तर मिलाए जाते हैं', 'चारों अनुमानों का औसत डॉक्टर-मान्य दिशानिर्देश सीमाओं से मिलाया जाता है।'],
    ],
    relTitle: 'यह कितना भरोसेमंद है?',
    relIntro: 'विश्वसनीयता स्कोर = मॉडल बीमारी वाले और बिना बीमारी वाले लोगों को कितनी अच्छी तरह अलग करता है (ऐसे मरीज़ों पर जाँचा गया जो उसने पहले नहीं देखे)। 100 = सटीक, 50 = अंदाज़े जैसा।',
    score: 'विश्वसनीयता स्कोर',
    rating: { excellent: 'उत्कृष्ट', great: 'बहुत अच्छा', good: 'अच्छा' },
    details: 'तकनीकी विवरण',
    hide: 'विवरण छिपाएँ',
    trainedOn: 'सीखा गया डेटा',
    people: 'लोग',
    individual: 'अलग-अलग मॉडल (विश्वसनीयता स्कोर)',
    catch: 'पहचान (सेंसिटिविटी)',
    clear: 'सही तरह से बाहर रखना (स्पेसिफ़िसिटी)',
    catchHelp: 'बीमारी वाले लोगों की पहचान हुई',
    clearHelp: 'स्वस्थ लोगों को सही तरह से अलर्ट नहीं मिला',
    limits: 'जानने योग्य बातें',
    models: { svm: 'SVM', random_forest: 'Random Forest', xgboost: 'XGBoost', ann: 'ANN' },
    modelHelp: {
      svm: 'स्वस्थ और जोखिम वाले पैटर्न के बीच सबसे अच्छी विभाजक रेखा ढूँढता है।',
      random_forest: 'कई निर्णय वृक्ष जो मिलकर वोट करते हैं।',
      xgboost: 'निर्णय वृक्ष जो एक-दूसरे की गलतियों से सीखते हैं।',
      ann: 'मस्तिष्क से प्रेरित न्यूरल नेटवर्क।',
    },
    loading: 'मॉडल की जानकारी लोड हो रही है...',
    error: 'अभी मॉडल की जानकारी लोड नहीं हो सकी। कृपया बाद में प्रयास करें।',
  },
} as const;

const DISEASE_NAMES: Record<string, { te: string; hi: string }> = {
  type_2_diabetes: { te: 'టైప్ 2 మధుమేహం', hi: 'टाइप 2 मधुमेह' },
  heart_disease: { te: 'గుండె జబ్బు (10 ఏళ్ల ప్రమాదం)', hi: 'हृदय रोग (10 वर्ष का जोखिम)' },
  liver_disease: { te: 'కాలేయ వ్యాధి', hi: 'यकृत रोग' },
  kidney_disease: { te: 'దీర్ఘకాలిక మూత్రపిండ వ్యాధి', hi: 'क्रोनिक किडनी रोग' },
  stroke_risk: { te: 'స్ట్రోక్ ప్రమాదం', hi: 'स्ट्रोक जोखिम' },
  hypothyroidism: { te: 'హైపోథైరాయిడిజం', hi: 'हाइपोथायरायडिज्म' },
};

type MemberKey = 'svm' | 'random_forest' | 'xgboost' | 'ann';

export const ModelInfoView: React.FC<Props> = ({ lang, record, onBack }) => {
  const tx = TEXT[lang];
  const [catalog, setCatalog] = useState<ModelCatalogEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api.getModelInfo().then(r => alive && setCatalog(r.models)).catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, []);

  const diseaseName = (m: { id: string; name: string }) => (lang === 'en' ? m.name : DISEASE_NAMES[m.id]?.[lang] || m.name);

  const rate = (auc: number) =>
    auc >= 0.9 ? { label: tx.rating.excellent, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', bar: 'bg-emerald-500' }
    : auc >= 0.8 ? { label: tx.rating.great, cls: 'bg-blue-50 text-blue-700 border-blue-200', bar: 'bg-blue-500' }
    : { label: tx.rating.good, cls: 'bg-sky-50 text-sky-700 border-sky-200', bar: 'bg-sky-500' };

  const thisModel = record?.model_info?.model;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {onBack && (
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900 cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> {tx.back}
        </button>
      )}

      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 text-white p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <Cpu className="w-6 h-6" />
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">{tx.title}</h2>
        </div>
        <p className="text-sm sm:text-base text-white/90 leading-relaxed">{tx.subtitle}</p>
      </div>

      <div className="flex gap-3 items-start rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-sm text-emerald-900 leading-relaxed">
        <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
        <p>{tx.reassure}</p>
      </div>

      {/* This particular result */}
      {thisModel && thisModel.members && (
        <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base sm:text-lg border-b border-slate-100 pb-3">
            <HeartPulse className="w-5 h-5 text-violet-600" />
            <span>{tx.thisTitle}: {diseaseName({ id: thisModel.id, name: thisModel.name })}</span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">{tx.thisIntro}</p>
          <div className="space-y-2.5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{tx.thisCol}</p>
            {thisModel.members.map(m => (
              <div key={m.id} className="flex items-center gap-3 text-sm">
                <span className="w-28 sm:w-36 shrink-0 text-slate-700 font-medium">{tx.models[m.id as MemberKey] || m.name}</span>
                <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-500 rounded-full" style={{ width: `${Math.min(100, Math.max(2, m.probability_pct))}%` }} />
                </div>
                <span className="w-12 text-right tabular-nums text-slate-700">{m.probability_pct}%</span>
              </div>
            ))}
            <div className="flex items-center gap-3 text-sm pt-2.5 border-t border-slate-100 font-bold text-slate-900">
              <span className="w-28 sm:w-36 shrink-0">{tx.thisFinal}</span>
              <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.min(100, Math.max(2, thisModel.probability_pct))}%` }} />
              </div>
              <span className="w-12 text-right tabular-nums">{thisModel.probability_pct}%</span>
            </div>
          </div>
          {thisModel.drivers.length > 0 && (
            <div className="text-sm text-slate-700">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1.5">{tx.factors}</p>
              <ul className="space-y-1">
                {thisModel.drivers.map((d, i) => (
                  <li key={i} className="flex gap-2"><Sparkles className="w-4 h-4 mt-0.5 text-violet-500 shrink-0" /><span><span className="font-semibold capitalize">{d.feature}</span> {d.direction === 'raises' ? tx.raises : tx.lowers}</span></li>
                ))}
              </ul>
            </div>
          )}
          {thisModel.features_imputed.length > 0 && (
            <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
              {tx.assumed}: {thisModel.features_imputed.map(f => f.replace(/_/g, ' ')).join(', ')}.
            </p>
          )}
        </section>
      )}

      {/* How it works */}
      <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base sm:text-lg border-b border-slate-100 pb-3">
          <Layers className="w-5 h-5 text-blue-600" />
          <span>{tx.howTitle}</span>
        </div>
        <ol className="grid sm:grid-cols-3 gap-4">
          {tx.steps.map(([h, d], i) => (
            <li key={i} className="rounded-xl bg-slate-50 p-4">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center mb-2">{i + 1}</div>
              <p className="font-bold text-slate-900 text-sm mb-1">{h}</p>
              <p className="text-xs text-slate-600 leading-relaxed">{d}</p>
            </li>
          ))}
        </ol>
        <div className="grid sm:grid-cols-2 gap-3 pt-1">
          {(Object.keys(tx.models) as MemberKey[]).map(k => (
            <div key={k} className="rounded-xl border border-slate-100 p-3">
              <p className="text-sm font-bold text-slate-900">{tx.models[k]}</p>
              <p className="text-xs text-slate-600">{tx.modelHelp[k]}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Reliability per disease */}
      <section className="space-y-3">
        <div className="px-1">
          <h3 className="text-base sm:text-lg font-bold text-slate-900">{tx.relTitle}</h3>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mt-1">{tx.relIntro}</p>
        </div>

        {!catalog && !failed && <p className="text-sm text-slate-500 px-1">{tx.loading}</p>}
        {failed && <p className="text-sm text-slate-500 px-1">{tx.error}</p>}

        {catalog?.map(m => {
          const r = rate(m.cv_auc);
          const score = Math.round(m.cv_auc * 100);
          const isOpen = open === m.id;
          return (
            <div key={m.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold text-slate-900">{diseaseName(m)}</p>
                <span className={`px-3 py-1 rounded-full border text-xs font-bold ${r.cls}`}>{r.label}</span>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${r.bar}`} style={{ width: `${score}%` }} />
                </div>
                <span className="text-sm font-bold text-slate-800 tabular-nums">{tx.score}: {score}/100</span>
              </div>
              <button type="button" onClick={() => setOpen(isOpen ? null : m.id)} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 cursor-pointer">
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {isOpen ? tx.hide : tx.details}
              </button>
              {isOpen && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  <p><span className="font-semibold text-slate-800">{tx.trainedOn}:</span> {m.dataset} ({m.n_samples.toLocaleString()} {tx.people})</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="rounded-lg bg-slate-50 p-3"><p className="font-bold text-slate-800 text-base">{Math.round(m.sensitivity * 100)}%</p><p className="font-semibold">{tx.catch}</p><p className="text-slate-500">{tx.catchHelp}</p></div>
                    <div className="rounded-lg bg-slate-50 p-3"><p className="font-bold text-slate-800 text-base">{Math.round(m.specificity * 100)}%</p><p className="font-semibold">{tx.clear}</p><p className="text-slate-500">{tx.clearHelp}</p></div>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 mb-1">{tx.individual}</p>
                    <div className="flex flex-wrap gap-2">
                      {m.members.map(x => (
                        <span key={x.id} className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">{tx.models[x.id as MemberKey] || x.name}: {Math.round(x.cv_auc * 100)}</span>
                      ))}
                    </div>
                  </div>
                  {m.caveats.length > 0 && (
                    <div>
                      <p className="font-semibold text-slate-800 mb-1 flex items-center gap-1.5"><Info className="w-3.5 h-3.5" /> {tx.limits}</p>
                      <ul className="list-disc pl-5 space-y-1 text-slate-500">{m.caveats.map((c, i) => <li key={i}>{c}</li>)}</ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
};
