export type Language = 'en' | 'te' | 'hi';

export interface TranslationDictionary {
  brand: {
    title: string;
    tagline: string;
    earlyRiskTitle: string;
    earlyRiskDesc: string;
    multiConditionTitle: string;
    multiConditionDesc: string;
    securePrivateTitle: string;
    securePrivateDesc: string;
    healthierTomorrow: string;
    engineBadge: string;
  };
  nav: {
    dashboard: string;
    newPrediction: string;
    history: string;
    profile: string;
    modelInfo: string;
    logout: string;
    language: string;
  };
  auth: {
    welcomeBack: string;
    loginSubtitle: string;
    createAccountTitle: string;
    registerSubtitle: string;
    fullName: string;
    fullNamePlaceholder: string;
    email: string;
    emailPlaceholder: string;
    password: string;
    passwordPlaceholder: string;
    confirmPassword: string;
    confirmPasswordPlaceholder: string;
    preferredLanguage: string;
    forgotPassword: string;
    loginBtn: string;
    registerBtn: string;
    orDivider: string;
    dontHaveAccount: string;
    createAccountBtn: string;
    alreadyHaveAccount: string;
    loginHereBtn: string;
    passwordReqs: string;
    loggingIn: string;
    creatingAccount: string;
  };
  dashboard: {
    welcomeGreeting: string;
    welcomeSub: string;
    startAssessment: string;
    or: string;
    uploadCardTitle: string;
    uploadCardDesc: string;
    manualCardTitle: string;
    manualCardDesc: string;
    uploadBtn: string;
    manualBtn: string;
    recentTitle: string;
    noAssessmentsTitle: string;
    noAssessmentsDesc: string;
    statTotal: string;
    statOptimal: string;
    statHighRisk: string;
  };
  upload: {
    title: string;
    desc: string;
    dragDrop: string;
    orBrowse: string;
    fileLimit: string;
    multilingualNotice: string;
    analyzing: string;
    processing: string;
    evaluating: string;
    changeFile: string;
    removeFile: string;
    analyzeBtn: string;
    selectedFile: string;
  };
  manual: {
    title: string;
    desc: string;
    personalSection: string;
    age: string;
    gender: string;
    genderMale: string;
    genderFemale: string;
    genderOther: string;
    physicalSection: string;
    height: string;
    weight: string;
    bmi: string;
    vitalsSection: string;
    systolicBp: string;
    diastolicBp: string;
    heartRate: string;
    labsSection: string;
    fastingGlucose: string;
    randomGlucose: string;
    hba1c: string;
    totalCholesterol: string;
    hdlCholesterol: string;
    ldlCholesterol: string;
    triglycerides: string;
    serumCreatinine: string;
    egfr: string;
    symptomsSection: string;
    smokingStatus: string;
    smokingNever: string;
    smokingFormer: string;
    smokingCurrent: string;
    symChestPain: string;
    symShortnessBreath: string;
    symFrequentUrination: string;
    symExcessiveThirst: string;
    symFatigue: string;
    symSwellingLegs: string;
    histDiabetes: string;
    histHeart: string;
    submitBtn: string;
    submitting: string;
    clearBtn: string;
  };
  result: {
    title: string;
    badge: string;
    predictedCondition: string;
    confidence: string;
    riskLevel: string;
    whyGenerated: string;
    clinicalSignals: string;
    signalName: string;
    observedValue: string;
    referenceRange: string;
    status: string;
    impact: string;
    recommendations: string;
    disclaimerTitle: string;
    disclaimerText: string;
    downloadReport: string;
    printReport: string;
    startNew: string;
    viewHistory: string;
  };
  history: {
    title: string;
    subtitle: string;
    date: string;
    source: string;
    condition: string;
    risk: string;
    confidence: string;
    actions: string;
    viewDetails: string;
    download: string;
    delete: string;
    noHistory: string;
    noHistorySub: string;
    startFirstBtn: string;
    deleteConfirm: string;
  };
  profile: {
    title: string;
    subtitle: string;
    accountDetails: string;
    name: string;
    email: string;
    preferredLanguage: string;
    securityTitle: string;
    currentPassword: string;
    newPassword: string;
    saveChanges: string;
    saving: string;
    successMessage: string;
  };
  risk: {
    low: string;
    moderate: string;
    high: string;
    severe: string;
  };
  errors: {
    invalidLogin: string;
    noAccount: string;
    invalidPdf: string;
    insufficientData: string;
    serverError: string;
    passwordMismatch: string;
    shortPassword: string;
  };
}

export const translations: Record<Language, TranslationDictionary> = {
  en: {
    brand: {
      title: 'Smart Disease Prediction System',
      tagline: 'Your Health Insights, Powered by AI',
      earlyRiskTitle: 'Early Risk Detection',
      earlyRiskDesc: 'Get AI-powered health insights',
      multiConditionTitle: 'Multiple Health Conditions',
      multiConditionDesc: 'Supports various diseases and risk assessments',
      securePrivateTitle: 'Secure & Private',
      securePrivateDesc: 'Your data is always protected',
      healthierTomorrow: 'A Healthier Tomorrow, Together',
      engineBadge: 'AI-Powered Clinical Prediction Engine',
    },
    nav: {
      dashboard: 'Dashboard',
      newPrediction: 'New Prediction',
      history: 'Reports & History',
      profile: 'Profile & Settings',
      modelInfo: 'About the Model',
      logout: 'Logout',
      language: 'Language',
    },
    auth: {
      welcomeBack: 'Welcome Back',
      loginSubtitle: 'Sign in to securely access your health prediction dashboard.',
      createAccountTitle: 'Create an Account',
      registerSubtitle: 'Start your secure, AI-assisted health monitoring journey.',
      fullName: 'Full Name',
      fullNamePlaceholder: 'Enter your full legal name',
      email: 'Email',
      emailPlaceholder: 'name@example.com',
      password: 'Password',
      passwordPlaceholder: 'Enter your password',
      confirmPassword: 'Confirm Password',
      confirmPasswordPlaceholder: 'Re-enter your password',
      preferredLanguage: 'Preferred Application Language',
      forgotPassword: 'Forgot Password?',
      loginBtn: 'Login',
      registerBtn: 'Create Account',
      orDivider: 'OR',
      dontHaveAccount: "Don't have an account?",
      createAccountBtn: 'Create an Account',
      alreadyHaveAccount: 'Already have an account?',
      loginHereBtn: 'Sign In',
      passwordReqs: 'Must be at least 8 characters long.',
      loggingIn: 'Signing in...',
      creatingAccount: 'Creating account...',
    },
    dashboard: {
      welcomeGreeting: 'Welcome back',
      welcomeSub: 'Start a comprehensive clinical health risk assessment.',
      startAssessment: 'Start a New Health Assessment',
      or: 'OR',
      uploadCardTitle: 'Upload Medical Report',
      uploadCardDesc: 'Upload a medical or laboratory PDF report in any language for intelligent clinical extraction and risk analysis.',
      manualCardTitle: 'Enter Details Manually',
      manualCardDesc: 'Input vital signs, laboratory values, and symptoms directly into our multi-disease prediction engine.',
      uploadBtn: 'Upload Medical Report',
      manualBtn: 'Enter Details Manually',
      recentTitle: 'Recent Assessments',
      noAssessmentsTitle: 'No assessments yet',
      noAssessmentsDesc: 'Start your first health assessment to see your clinical results and reports here.',
      statTotal: 'Total Assessments',
      statOptimal: 'Diseases Identified',
      statHighRisk: 'Attention Advised',
    },
    upload: {
      title: 'Upload Medical Report',
      desc: 'Upload a medical or health-related PDF report for analysis.',
      dragDrop: 'Drag and drop your PDF report here, or',
      orBrowse: 'browse files',
      fileLimit: 'Supported format: PDF up to 15MB',
      multilingualNotice: 'Multilingual Support: Reports in English, Telugu, or Hindi are automatically extracted and analyzed.',
      analyzing: 'Analyzing your report...',
      processing: 'Extracting clinical biomarkers...',
      evaluating: 'Running clinical prediction engine...',
      changeFile: 'Change PDF',
      removeFile: 'Remove',
      analyzeBtn: 'Analyze Report & Predict Risk',
      selectedFile: 'Selected Document:',
    },
    manual: {
      title: 'Manual Clinical Assessment',
      desc: 'Enter your health parameters, laboratory test values, and symptoms for evaluation.',
      personalSection: '1. Personal Information',
      age: 'Age (Years)',
      gender: 'Gender',
      genderMale: 'Male',
      genderFemale: 'Female',
      genderOther: 'Other',
      physicalSection: '2. Physical & Body Metrics',
      height: 'Height (cm)',
      weight: 'Weight (kg)',
      bmi: 'Body Mass Index (BMI)',
      vitalsSection: '3. Vital Signs & Blood Pressure',
      systolicBp: 'Systolic Blood Pressure (mmHg)',
      diastolicBp: 'Diastolic Blood Pressure (mmHg)',
      heartRate: 'Heart Rate (bpm)',
      labsSection: '4. Laboratory & Metabolic Tests',
      fastingGlucose: 'Fasting Blood Glucose (mg/dL)',
      randomGlucose: 'Random Blood Glucose (mg/dL)',
      hba1c: 'HbA1c Glycated Hemoglobin (%)',
      totalCholesterol: 'Total Cholesterol (mg/dL)',
      hdlCholesterol: 'HDL Cholesterol (mg/dL)',
      ldlCholesterol: 'LDL Cholesterol (mg/dL)',
      triglycerides: 'Triglycerides (mg/dL)',
      serumCreatinine: 'Serum Creatinine (mg/dL)',
      egfr: 'eGFR (mL/min/1.73m²)',
      symptomsSection: '5. Symptoms & Clinical History',
      smokingStatus: 'Smoking Status',
      smokingNever: 'Never Smoked',
      smokingFormer: 'Former Smoker',
      smokingCurrent: 'Current Smoker',
      symChestPain: 'Chest discomfort / tightness / pain',
      symShortnessBreath: 'Shortness of breath on exertion',
      symFrequentUrination: 'Frequent urination (especially at night)',
      symExcessiveThirst: 'Persistent excessive thirst or dry mouth',
      symFatigue: 'Unexplained chronic fatigue or lethargy',
      symSwellingLegs: 'Peripheral edema (swelling in ankles/legs)',
      histDiabetes: 'Family history of diabetes (parents/siblings)',
      histHeart: 'Family history of premature cardiovascular disease',
      submitBtn: 'Generate Clinical Assessment',
      submitting: 'Processing health information...',
      clearBtn: 'Clear Form',
    },
    result: {
      title: 'Clinical Assessment Result',
      badge: 'AI-Powered Clinical Prediction Engine',
      predictedCondition: 'PREDICTED DISEASE',
      confidence: 'Model Probability',
      riskLevel: 'Risk Assessment',
      whyGenerated: 'Why this result was generated',
      clinicalSignals: 'Key Contributing Clinical Signals',
      signalName: 'Clinical Marker',
      observedValue: 'Observed Value',
      referenceRange: 'Normal Reference Range',
      status: 'Status',
      impact: 'Clinical Impact',
      recommendations: 'Actionable Clinical Recommendations',
      disclaimerTitle: 'Medical Safety Notice',
      disclaimerText: 'This assessment is intended for informational and decision-support purposes only. It does not replace professional medical diagnosis, clinical judgment, or consultation with a qualified healthcare professional.',
      downloadReport: 'Download Report',
      printReport: 'Print Report',
      startNew: 'New Assessment',
      viewHistory: 'View History',
    },
    history: {
      title: 'Prediction History / Reports',
      subtitle: 'View and download previous clinical assessment reports.',
      date: 'Assessment Date',
      source: 'Input Method',
      condition: 'Condition Evaluated',
      risk: 'Risk Level',
      confidence: 'Probability',
      actions: 'Actions',
      viewDetails: 'View Details',
      download: 'Download Report',
      delete: 'Delete',
      noHistory: 'No assessments found',
      noHistorySub: 'You have not completed any health assessments yet.',
      startFirstBtn: 'Start First Assessment',
      deleteConfirm: 'Are you sure you want to delete this assessment record?',
    },
    profile: {
      title: 'Profile & Settings',
      subtitle: 'Manage your personal account information and language preference.',
      accountDetails: 'Account Information',
      name: 'Full Name',
      email: 'Email Address',
      preferredLanguage: 'Application Language',
      securityTitle: 'Security & Password',
      currentPassword: 'Current Password',
      newPassword: 'New Password (min. 8 characters)',
      saveChanges: 'Save Changes',
      saving: 'Updating...',
      successMessage: 'Settings updated successfully.',
    },
    risk: {
      low: 'Low Risk',
      moderate: 'Moderate Risk',
      high: 'High Risk',
      severe: 'Severe Risk',
    },
    errors: {
      invalidLogin: 'Incorrect email or password. Please try again.',
      noAccount: "We couldn't find an account with these details. Create an account to continue.",
      invalidPdf: 'Please upload a valid PDF medical report.',
      insufficientData: "We couldn't find enough information to complete this assessment. Please provide the required medical details.",
      serverError: 'Something went wrong while processing your request. Please try again.',
      passwordMismatch: 'Passwords do not match. Please verify your password.',
      shortPassword: 'Password must be at least 8 characters long.',
    },
  },
  te: {
    brand: {
      title: 'స్మార్ట్ డిసీజ్ ప్రిడిక్షన్ సిస్టమ్',
      tagline: 'మీ ఆరోగ్య సమాచారం, ఏఐ శక్తితో',
      earlyRiskTitle: 'ప్రారంభ ప్రమాద గుర్తింపు',
      earlyRiskDesc: 'ఏఐ ఆధారిత ఆరోగ్య సమాచారాన్ని పొందండి',
      multiConditionTitle: 'బహుళ ఆరోగ్య పరిస్థితులు',
      multiConditionDesc: 'వివిధ వ్యాధులు మరియు ప్రమాద అంచనాలకు మద్దతు ఇస్తుంది',
      securePrivateTitle: 'సురక్షితమైనది & ప్రైవేట్',
      securePrivateDesc: 'మీ డేటా ఎల్లప్పుడూ భద్రంగా ఉంటుంది',
      healthierTomorrow: 'ఆరోగ్యకరమైన రేపటి కోసం, కలిసికట్టుగా',
      engineBadge: 'ఏఐ ఆధారిత క్లినికల్ ప్రిడిక్షన్ ఇంజిన్',
    },
    nav: {
      dashboard: 'డాష్‌బోర్డ్',
      newPrediction: 'కొత్త అంచనా',
      history: 'నివేదికలు & చరిత్ర',
      profile: 'ప్రొఫైల్ & సెట్టింగ్‌లు',
      modelInfo: 'మోడల్ గురించి',
      logout: 'లాగౌట్',
      language: 'భాష',
    },
    auth: {
      welcomeBack: 'పునఃస్వాగతం',
      loginSubtitle: 'మీ ఆరోగ్య అంచనా డాష్‌బోర్డ్‌ను సురక్షితంగా యాక్సెస్ చేయడానికి లాగిన్ అవ్వండి.',
      createAccountTitle: 'ఖాతాను సృష్టించండి',
      registerSubtitle: 'మీ సురక్షితమైన, ఏఐ ఆధారిత ఆరోగ్య పర్యవేక్షణ ప్రయాణాన్ని ప్రారంభించండి.',
      fullName: 'పూర్తి పేరు',
      fullNamePlaceholder: 'మీ పూర్తి పేరును నమోదు చేయండి',
      email: 'ఈమెయిల్',
      emailPlaceholder: 'name@example.com',
      password: 'పాస్‌వర్డ్',
      passwordPlaceholder: 'మీ పాస్‌వర్డ్‌ను నమోదు చేయండి',
      confirmPassword: 'పాస్‌వర్డ్‌ను నిర్ధారించండి',
      confirmPasswordPlaceholder: 'పాస్‌వర్డ్‌ను మళ్లీ నమోదు చేయండి',
      preferredLanguage: 'ప్రాధాన్యత గల అప్లికేషన్ భాష',
      forgotPassword: 'పాస్‌వర్డ్ మర్చిపోయారా?',
      loginBtn: 'లాగిన్',
      registerBtn: 'ఖాతా సృష్టించండి',
      orDivider: 'లేదా',
      dontHaveAccount: 'ఖాతా లేదా?',
      createAccountBtn: 'ఖాతాను సృష్టించండి',
      alreadyHaveAccount: 'ఇప్పటికే ఖాతా ఉందా?',
      loginHereBtn: 'సైన్ ఇన్ చేయండి',
      passwordReqs: 'కనీసం 8 అక్షరాలు ఉండాలి.',
      loggingIn: 'లాగిన్ అవుతోంది...',
      creatingAccount: 'ఖాతా సృష్టించబడుతోంది...',
    },
    dashboard: {
      welcomeGreeting: 'స్వాగతం',
      welcomeSub: 'సమగ్రమైన క్లినికల్ ఆరోగ్య ప్రమాద అంచనాను ప్రారంభించండి.',
      startAssessment: 'కొత్త ఆరోగ్య అంచనాను ప్రారంభించండి',
      or: 'లేదా',
      uploadCardTitle: 'వైద్య నివేదికను అప్‌లోడ్ చేయండి',
      uploadCardDesc: 'తెలివైన క్లినికల్ వెలికితీత మరియు ప్రమాద విశ్లేషణ కోసం ఏదైనా భాషలో మెడికల్ లేదా ల్యాబ్ PDF నివేదికను అప్‌లోడ్ చేయండి.',
      manualCardTitle: 'వివరాలను మాన్యువల్‌గా నమోదు చేయండి',
      manualCardDesc: 'మా బహుళ వ్యాధి అంచనా ఇంజిన్‌లో ముఖ్యమైన సంకేతాలు, ప్రయోగశాల విలువలు మరియు లక్షణాలను నమోదు చేయండి.',
      uploadBtn: 'మెడికల్ రిపోర్ట్ అప్‌లోడ్ చేయండి',
      manualBtn: 'వివరాలను నమోదు చేయండి',
      recentTitle: 'ఇటీవలి అంచనాలు',
      noAssessmentsTitle: 'ఇంకా ఎటువంటి అంచనాలు లేవు',
      noAssessmentsDesc: 'మీ క్లినికల్ ఫలితాలు మరియు నివేదికలను ఇక్కడ చూడటానికి మీ మొదటి ఆరోగ్య అంచనాను ప్రారంభించండి.',
      statTotal: 'మొత్తం అంచనాలు',
      statOptimal: 'వ్యాధి నిర్ధారణలు',
      statHighRisk: 'శ్రద్ధ వహించాల్సినవి',
    },
    upload: {
      title: 'వైద్య నివేదికను అప్‌లోడ్ చేయండి',
      desc: 'విశ్లేషణ కోసం వైద్య లేదా ఆరోగ్య సంబంధిత PDF నివేదికను అప్‌లోడ్ చేయండి.',
      dragDrop: 'మీ PDF నివేదికను ఇక్కడ డ్రాగ్ & డ్రాప్ చేయండి, లేదా',
      orBrowse: 'ఫైళ్ళను బ్రౌజ్ చేయండి',
      fileLimit: 'మద్దతు ఉన్న ఫార్మాట్: 15MB వరకు PDF',
      multilingualNotice: 'బహుభాషా మద్దతు: ఇంగ్లీష్, తెలుగు లేదా హిందీలో ఉన్న నివేదికలు స్వయంచాలకంగా విశ్లేషించబడతాయి.',
      analyzing: 'మీ నివేదికను విశ్లేషిస్తోంది...',
      processing: 'క్లినికల్ బయోమార్కర్లను సంగ్రహిస్తోంది...',
      evaluating: 'క్లినికల్ ప్రిడిక్షన్ ఇంజిన్‌ను అమలు చేస్తోంది...',
      changeFile: 'PDF మార్చండి',
      removeFile: 'తొలగించండి',
      analyzeBtn: 'నివేదికను విశ్లేషించండి & ప్రమాదాన్ని అంచనా వేయండి',
      selectedFile: 'ఎంచుకున్న పత్రం:',
    },
    manual: {
      title: 'మాన్యువల్ క్లినికల్ అంచనా',
      desc: 'మూల్యాంకనం కోసం మీ ఆరోగ్య కొలతలు, ప్రయోగశాల పరీక్ష విలువలు మరియు లక్షణాలను నమోదు చేయండి.',
      personalSection: '1. వ్యక్తిగత సమాచారం',
      age: 'వయస్సు (సంవత్సరాలు)',
      gender: 'లింగం',
      genderMale: 'పురుషుడు',
      genderFemale: 'స్త్రీ',
      genderOther: 'ఇతర',
      physicalSection: '2. శరీర కొలతలు',
      height: 'ఎత్తు (సెం.మీ.)',
      weight: 'బరువు (కిలోలు)',
      bmi: 'బాడీ మాస్ ఇండెక్స్ (BMI)',
      vitalsSection: '3. ముఖ్యమైన సంకేతాలు & రక్తపోటు',
      systolicBp: 'సిస్టోలిక్ రక్తపోటు (mmHg)',
      diastolicBp: 'డయాస్టోలిక్ రక్తపోటు (mmHg)',
      heartRate: 'గుండె వేగం (bpm)',
      labsSection: '4. ప్రయోగశాల & జీవక్రియ పరీక్షలు',
      fastingGlucose: 'ఉపవాస రక్త గ్లూకోజ్ (mg/dL)',
      randomGlucose: 'రాండమ్ రక్త గ్లూకోజ్ (mg/dL)',
      hba1c: 'HbA1c గ్లైకేటెడ్ హిమోగ్లోబిన్ (%)',
      totalCholesterol: 'మొత్తం కొలెస్ట్రాల్ (mg/dL)',
      hdlCholesterol: 'HDL కొలెస్ట్రాల్ (mg/dL)',
      ldlCholesterol: 'LDL కొలెస్ట్రాల్ (mg/dL)',
      triglycerides: 'ట్రైగ్లిజరైడ్స్ (mg/dL)',
      serumCreatinine: 'సీరం క్రియాటినిన్ (mg/dL)',
      egfr: 'eGFR (mL/min/1.73m²)',
      symptomsSection: '5. లక్షణాలు & క్లినికల్ చరిత్ర',
      smokingStatus: 'ధూమపాన అలవాటు',
      smokingNever: 'ఎప్పుడూ చేయలేదు',
      smokingFormer: 'గతంలో చేసేవారు',
      smokingCurrent: 'ప్రస్తుతం చేస్తున్నారు',
      symChestPain: 'ఛాతీలో అసౌకర్యం లేదా నొప్పి',
      symShortnessBreath: 'నడిచినప్పుడు శ్వాస ఆడకపోవడం',
      symFrequentUrination: 'తరచుగా మూత్రవిసర్జన (రాత్రి సమయంలో)',
      symExcessiveThirst: 'అధిక దాహం లేదా గొంతు ఎండిపోవడం',
      symFatigue: 'వివరించలేని తీవ్ర అలసట',
      symSwellingLegs: 'పాదాలు లేదా కాళ్ళలో వాపు',
      histDiabetes: 'కుటుంబంలో మధుమేహం చరిత్ర (తల్లిదండ్రులు/తోబుట్టువులు)',
      histHeart: 'కుటుంబంలో గుండె జబ్బుల చరిత్ర',
      submitBtn: 'క్లినికల్ అంచనాను రూపొందించండి',
      submitting: 'ఆరోగ్య సమాచారాన్ని ప్రాసెస్ చేస్తోంది...',
      clearBtn: 'ఫారమ్‌ను క్లియర్ చేయండి',
    },
    result: {
      title: 'క్లినికల్ అంచనా ఫలితం',
      badge: 'ఏఐ ఆధారిత క్లినికల్ ప్రిడిక్షన్ ఇంజిన్',
      predictedCondition: 'PREDICTED DISEASE (అంచనా వేయబడిన వ్యాధి)',
      confidence: 'మోడల్ సంభావ్యత',
      riskLevel: 'ప్రమాద అంచనా',
      whyGenerated: 'ఈ ఫలితం ఎందుకు వెలువడింది',
      clinicalSignals: 'ప్రధాన క్లినికల్ సంకేతాలు & బయోమార్కర్లు',
      signalName: 'క్లినికల్ మార్కర్',
      observedValue: 'గుర్తించిన విలువ',
      referenceRange: 'సాధారణ ఆరోగ్య పరిధి',
      status: 'స్థితి',
      impact: 'క్లినికల్ ప్రభావం',
      recommendations: 'ఆచరణాత్మక ఆరోగ్య సిఫార్సులు',
      disclaimerTitle: 'ముఖ్యమైన వైద్య ప్రకటన',
      disclaimerText: 'ఈ అంచనా సమాచార మరియు నిర్ణయ మద్దతు ప్రయోజనాల కోసం మాత్రమే రూపొందించబడింది. ఇది అర్హత కలిగిన వైద్యుల సంప్రదింపులను లేదా క్లినికల్ రోగనిర్ధారణను భర్తీ చేయదు.',
      downloadReport: 'నివేదికను డౌన్‌లోడ్ చేయండి',
      printReport: 'నివేదికను ప్రింట్ చేయండి',
      startNew: 'మరొక అంచనా ప్రారంభించండి',
      viewHistory: 'పూర్తి చరిత్రను చూడండి',
    },
    history: {
      title: 'ప్రిడిక్షన్ చరిత్ర / నివేదికలు',
      subtitle: 'మునుపటి క్లినికల్ అసెస్‌మెంట్ రిపోర్టులను వీక్షించండి మరియు డౌన్‌లోడ్ చేయండి.',
      date: 'అంచనా తేదీ',
      source: 'ఇన్‌పుట్ విధానం',
      condition: 'వ్యాధి పరిస్థితి',
      risk: 'ప్రమాద స్థాయి',
      confidence: 'సంభావ్యత',
      actions: 'చర్యలు',
      viewDetails: 'వివరాలు చూడండి',
      download: 'డౌన్‌లోడ్ రిపోర్ట్',
      delete: 'తొలగించండి',
      noHistory: 'ఎటువంటి నివేదికలు కనుగొనబడలేదు',
      noHistorySub: 'మీరు ఇంకా ఎటువంటి ఆరోగ్య అంచనాలను పూర్తి చేయలేదు.',
      startFirstBtn: 'మొదటి అంచనాను ప్రారంభించండి',
      deleteConfirm: 'మీరు ఖచ్చితంగా ఈ అంచనా రికార్డును తొలగించాలనుకుంటున్నారా?',
    },
    profile: {
      title: 'ప్రొఫైల్ & సెట్టింగ్‌లు',
      subtitle: 'మీ వ్యక్తిగత ఖాతా సమాచారం మరియు భాష ప్రాధాన్యతను నిర్వహించండి.',
      accountDetails: 'ఖాతా వివరాలు',
      name: 'పూర్తి పేరు',
      email: 'ఈమెయిల్ చిరునామా',
      preferredLanguage: 'అప్లికేషన్ భాష',
      securityTitle: 'భద్రత & పాస్‌వర్డ్',
      currentPassword: 'ప్రస్తుత పాస్‌వర్డ్',
      newPassword: 'కొత్త పాస్‌వర్డ్ (కనీసం 8 అక్షరాలు)',
      saveChanges: 'మార్పులను భద్రపరచండి',
      saving: 'నవీకరిస్తోంది...',
      successMessage: 'సెట్టింగ్‌లు విజయవంతంగా నవీకరించబడ్డాయి.',
    },
    risk: {
      low: 'తక్కువ ప్రమాదం',
      moderate: 'మధ్యస్థ ప్రమాదం',
      high: 'అధిక ప్రమాదం',
      severe: 'తీవ్రమైన ప్రమాదం',
    },
    errors: {
      invalidLogin: 'తప్పు ఈమెయిల్ లేదా పాస్‌వర్డ్. దయచేసి మళ్లీ ప్రయత్నించండి.',
      noAccount: 'ఈ వివరాలతో ఖాతా కనుగొనబడలేదు. కొనసాగడానికి ఖాతాను సృష్టించండి.',
      invalidPdf: 'దయచేసి సరైన PDF వైద్య నివేదికను అప్‌లోడ్ చేయండి.',
      insufficientData: 'ఈ అంచనాను పూర్తి చేయడానికి తగినంత సమాచారం కనుగొనలేకపోయాము. దయచేసి అవసరమైన వైద్య వివరాలను అందించండి.',
      serverError: 'మీ అభ్యర్థనను ప్రాసెస్ చేయడంలో లోపం ఏర్పడింది. దయచేసి మళ్లీ ప్రయత్నించండి.',
      passwordMismatch: 'పాస్‌వర్డ్‌లు సరిపోలడం లేదు. దయచేసి మీ పాస్‌వర్డ్‌ను సరిచూసుకోండి.',
      shortPassword: 'పాస్‌వర్డ్ కనీసం 8 అక్షరాల పొడవు ఉండాలి.',
    },
  },
  hi: {
    brand: {
      title: 'स्मार्ट रोग भविष्यवाणी प्रणाली',
      tagline: 'आपका स्वास्थ्य अंतर्दृष्टि, एआई द्वारा संचालित',
      earlyRiskTitle: 'प्रारंभिक जोखिम का पता लगाना',
      earlyRiskDesc: 'एआई-संचालित स्वास्थ्य अंतर्दृष्टि प्राप्त करें',
      multiConditionTitle: 'एकाधिक स्वास्थ्य स्थितियां',
      multiConditionDesc: 'विभिन्न रोगों और जोखिम आकलनों का समर्थन करता है',
      securePrivateTitle: 'सुरक्षित और निजी',
      securePrivateDesc: 'आपका डेटा हमेशा सुरक्षित रहता है',
      healthierTomorrow: 'एक स्वस्थ कल, मिलकर',
      engineBadge: 'एआई-संचालित नैदानिक भविष्यवाणी इंजन',
    },
    nav: {
      dashboard: 'डैशबोर्ड',
      newPrediction: 'नया मूल्यांकन',
      history: 'रिपोर्ट और इतिहास',
      profile: 'प्रोफाइल और सेटिंग्स',
      modelInfo: 'मॉडल के बारे में',
      logout: 'लॉग आउट',
      language: 'भाषा',
    },
    auth: {
      welcomeBack: 'वापसी पर स्वागत है',
      loginSubtitle: 'अपने स्वास्थ्य मूल्यांकन डैशबोर्ड को सुरक्षित रूप से एक्सेस करने के लिए साइन इन करें।',
      createAccountTitle: 'खाता बनाएं',
      registerSubtitle: 'अपनी सुरक्षित, एआई-संचालित स्वास्थ्य निगरानी यात्रा शुरू करें।',
      fullName: 'पूरा नाम',
      fullNamePlaceholder: 'अपना पूरा कानूनी नाम दर्ज करें',
      email: 'ईमेल',
      emailPlaceholder: 'name@example.com',
      password: 'पासवर्ड',
      passwordPlaceholder: 'अपना पासवर्ड दर्ज करें',
      confirmPassword: 'पासवर्ड की पुष्टि करें',
      confirmPasswordPlaceholder: 'पासवर्ड पुनः दर्ज करें',
      preferredLanguage: 'पसंदीदा एप्लिकेशन भाषा',
      forgotPassword: 'पासवर्ड भूल गए?',
      loginBtn: 'लॉग इन करें',
      registerBtn: 'खाता बनाएं',
      orDivider: 'या',
      dontHaveAccount: 'क्या आपके पास खाता नहीं है?',
      createAccountBtn: 'खाता बनाएं',
      alreadyHaveAccount: 'क्या आपके पास पहले से एक खाता मौजूद है?',
      loginHereBtn: 'साइन इन करें',
      passwordReqs: 'कम से कम 8 अक्षर लंबा होना चाहिए।',
      loggingIn: 'लॉग इन हो रहा है...',
      creatingAccount: 'खाता बनाया जा रहा है...',
    },
    dashboard: {
      welcomeGreeting: 'स्वागत है',
      welcomeSub: 'एक व्यापक नैदानिक स्वास्थ्य जोखिम मूल्यांकन शुरू करें।',
      startAssessment: 'एक नया स्वास्थ्य मूल्यांकन शुरू करें',
      or: 'या',
      uploadCardTitle: 'मेडिकल रिपोर्ट अपलोड करें',
      uploadCardDesc: 'बुद्धिमान नैदानिक निष्कर्षण और जोखिम विश्लेषण के लिए किसी भी भाषा में मेडिकल या लैब पीडीएफ रिपोर्ट अपलोड करें।',
      manualCardTitle: 'विवरण मैन्युअल रूप से दर्ज करें',
      manualCardDesc: 'हमारे बहु-रोग मूल्यांकन इंजन में सीधे महत्वपूर्ण संकेत, लैब मान और लक्षण दर्ज करें।',
      uploadBtn: 'मेडिकल रिपोर्ट अपलोड करें',
      manualBtn: 'विवरण दर्ज करें',
      recentTitle: 'हाल के मूल्यांकन',
      noAssessmentsTitle: 'अभी तक कोई मूल्यांकन नहीं',
      noAssessmentsDesc: 'अपने नैदानिक परिणाम और रिपोर्ट यहाँ देखने के लिए अपना पहला स्वास्थ्य मूल्यांकन शुरू करें।',
      statTotal: 'कुल मूल्यांकन',
      statOptimal: 'पहचाने गए रोग',
      statHighRisk: 'सावधानी अनुशंसित',
    },
    upload: {
      title: 'मेडिकल रिपोर्ट अपलोड करें',
      desc: 'विश्लेषण के लिए एक मेडिकल या स्वास्थ्य संबंधी पीडीएफ रिपोर्ट अपलोड करें।',
      dragDrop: 'अपनी पीडीएफ रिपोर्ट यहाँ खींचें और छोड़ें, या',
      orBrowse: 'फ़ाइलें ब्राउज़ करें',
      fileLimit: 'समर्थित प्रारूप: 15MB तक पीडीएफ',
      multilingualNotice: 'बहुभाषी समर्थन: अंग्रेजी, तेलुगु या हिंदी में रिपोर्ट स्वचालित रूप से निकाली और विश्लेषित की जाती हैं।',
      analyzing: 'आपकी रिपोर्ट का विश्लेषण किया जा रहा है...',
      processing: 'नैदानिक बायोमार्कर निकाले जा रहे हैं...',
      evaluating: 'नैदानिक भविष्यवाणी इंजन चलाया जा रहा है...',
      changeFile: 'पीडीएफ बदलें',
      removeFile: 'हटाएं',
      analyzeBtn: 'रिपोर्ट का विश्लेषण करें और जोखिम की भविष्यवाणी करें',
      selectedFile: 'चयनित दस्तावेज़:',
    },
    manual: {
      title: 'मैन्युअल नैदानिक मूल्यांकन',
      desc: 'मूल्यांकन के लिए अपने स्वास्थ्य पैरामीटर, प्रयोगशाला परीक्षण मान और लक्षण दर्ज करें।',
      personalSection: '1. व्यक्तिगत जानकारी',
      age: 'आयु (वर्ष)',
      gender: 'लिंग',
      genderMale: 'पुरुष',
      genderFemale: 'महिला',
      genderOther: 'अन्य',
      physicalSection: '2. शारीरिक और शारीरिक माप',
      height: 'ऊंचाई (सेमी)',
      weight: 'वजन (किलो)',
      bmi: 'बॉडी मास इंडेक्स (BMI)',
      vitalsSection: '3. महत्वपूर्ण संकेत और रक्तचाप',
      systolicBp: 'सिस्टोलिक रक्तचाप (mmHg)',
      diastolicBp: 'डायस्टोलिक रक्तचाप (mmHg)',
      heartRate: 'हृदय गति (bpm)',
      labsSection: '4. प्रयोगशाला और चयापचय परीक्षण',
      fastingGlucose: 'फास्टिंग ब्लड ग्लूकोज (mg/dL)',
      randomGlucose: 'रैंडम ब्लड ग्लूकोज (mg/dL)',
      hba1c: 'HbA1c ग्लाइकेटेड हीमोग्लोबिन (%)',
      totalCholesterol: 'कुल कोलेस्ट्रॉल (mg/dL)',
      hdlCholesterol: 'एचडीएल कोलेस्ट्रॉल (mg/dL)',
      ldlCholesterol: 'एलडीएल कोलेस्ट्रॉल (mg/dL)',
      triglycerides: 'ट्राइग्लिसराइड्स (mg/dL)',
      serumCreatinine: 'सीरम क्रिएटिनिन (mg/dL)',
      egfr: 'eGFR (mL/min/1.73m²)',
      symptomsSection: '5. लक्षण और नैदानिक इतिहास',
      smokingStatus: 'धूम्रपान की स्थिति',
      smokingNever: 'कभी धूम्रपान नहीं किया',
      smokingFormer: 'पूर्व धूम्रपान करने वाला',
      smokingCurrent: 'वर्तमान धूम्रपान करने वाला',
      symChestPain: 'सीने में तकलीफ / भारीपन / दर्द',
      symShortnessBreath: 'परिश्रम करने पर सांस फूलना',
      symFrequentUrination: 'बार-बार पेशाब आना (विशेषकर रात में)',
      symExcessiveThirst: 'अत्यधिक प्यास या सूखा मुंह',
      symFatigue: 'अस्पष्टीकृत पुरानी थकान',
      symSwellingLegs: 'टखनों या पैरों में सूजन',
      histDiabetes: 'मधुमेह का पारिवारिक इतिहास',
      histHeart: 'हृदय रोग का पारिवारिक इतिहास',
      submitBtn: 'नैदानिक मूल्यांकन उत्पन्न करें',
      submitting: 'स्वास्थ्य जानकारी संसाधित की जा रही है...',
      clearBtn: 'फ़ॉर्म साफ़ करें',
    },
    result: {
      title: 'नैदानिक मूल्यांकन परिणाम',
      badge: 'एआई-संचालित नैदानिक भविष्यवाणी इंजन',
      predictedCondition: 'PREDICTED DISEASE (अनुमानित रोग)',
      confidence: 'मॉडल संभावना',
      riskLevel: 'जोखिम मूल्यांकन',
      whyGenerated: 'यह परिणाम क्यों उत्पन्न हुआ',
      clinicalSignals: 'प्रमुख योगदानकर्ता नैदानिक संकेत',
      signalName: 'नैदानिक मार्कर',
      observedValue: 'देखा गया मान',
      referenceRange: 'सामान्य संदर्भ सीमा',
      status: 'स्थिति',
      impact: 'नैदानिक प्रभाव',
      recommendations: 'कार्रवाई योग्य स्वास्थ्य सिफारिशें',
      disclaimerTitle: 'महत्वपूर्ण चिकित्सा सूचना',
      disclaimerText: 'यह मूल्यांकन केवल सूचनात्मक और निर्णय-सहायता उद्देश्यों के लिए है। यह पेशेवर चिकित्सा निदान, नैदानिक निर्णय या योग्य चिकित्सक के परामर्श का स्थान नहीं लेता है।',
      downloadReport: 'रिपोर्ट डाउनलोड करें',
      printReport: 'रिपोर्ट प्रिंट करें',
      startNew: 'नया मूल्यांकन शुरू करें',
      viewHistory: 'संपूर्ण इतिहास देखें',
    },
    history: {
      title: 'भविष्यवाणी इतिहास / रिपोर्ट',
      subtitle: 'पिछली नैदानिक मूल्यांकन रिपोर्ट देखें और डाउनलोड करें।',
      date: 'मूल्यांकन तिथि',
      source: 'इनपुट विधि',
      condition: 'रोग की स्थिति',
      risk: 'जोखिम स्तर',
      confidence: 'संभावना',
      actions: 'कार्रवाइयां',
      viewDetails: 'विवरण देखें',
      download: 'रिपोर्ट डाउनलोड करें',
      delete: 'हटाएं',
      noHistory: 'कोई रिपोर्ट नहीं मिली',
      noHistorySub: 'आपने अभी तक कोई स्वास्थ्य मूल्यांकन पूरा नहीं किया है।',
      startFirstBtn: 'पहला मूल्यांकन शुरू करें',
      deleteConfirm: 'क्या आप निश्चित रूप से इस मूल्यांकन रिकॉर्ड को हटाना चाहते हैं?',
    },
    profile: {
      title: 'प्रोफाइल और सेटिंग्स',
      subtitle: 'अपनी व्यक्तिगत खाता जानकारी और भाषा वरीयता प्रबंधित करें।',
      accountDetails: 'खाता विवरण',
      name: 'पूरा नाम',
      email: 'ईमेल पता',
      preferredLanguage: 'एप्लिकेशन भाषा',
      securityTitle: 'सुरक्षा और पासवर्ड',
      currentPassword: 'वर्तमान पासवर्ड',
      newPassword: 'नया पासवर्ड (कम से कम 8 अक्षर)',
      saveChanges: 'परिवर्तन सहेजें',
      saving: 'अद्यतन किया जा रहा है...',
      successMessage: 'सेटिंग्स सफलतापूर्वक सहेजी गईं।',
    },
    risk: {
      low: 'कम जोखिम',
      moderate: 'मध्यम जोखिम',
      high: 'उच्च जोखिम',
      severe: 'गंभीर जोखिम',
    },
    errors: {
      invalidLogin: 'गलत ईमेल या पासवर्ड। कृपया पुनः प्रयास करें।',
      noAccount: 'इस विवरण के साथ कोई खाता नहीं मिला। जारी रखने के लिए खाता बनाएं।',
      invalidPdf: 'कृपया एक वैध पीडीएफ मेडिकल रिपोर्ट अपलोड करें।',
      insufficientData: 'इस मूल्यांकन को पूरा करने के लिए पर्याप्त जानकारी नहीं मिली। कृपया आवश्यक चिकित्सा विवरण प्रदान करें।',
      serverError: 'आपके अनुरोध को संसाधित करते समय कुछ गलत हो गया। कृपया पुनः प्रयास करें।',
      passwordMismatch: 'पासवर्ड मेल नहीं खाते। कृपया पुष्टि करें।',
      shortPassword: 'पासवर्ड कम से कम 8 अक्षरों का होना चाहिए।',
    },
  },
};
