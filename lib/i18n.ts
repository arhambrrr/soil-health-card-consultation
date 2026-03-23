// Internationalisation for the SHC Consultation app.
// UI strings + localized opening-text builder for all supported languages/dialects.

export type LangKey =
  | "hi-IN::Standard"
  | "hi-IN::Bhojpuri"
  | "hi-IN::Avadhi"
  | "te-IN::Standard"
  | "te-IN::Telangana"
  | "kn-IN::Standard"
  | "mr-IN::Standard"
  | "ta-IN::Standard"
  | "bn-IN::Standard"
  | "gu-IN::Standard";

export interface Translations {
  // Language picker
  selectLanguage: string;
  appTitle: string;
  appSubtitle: string;
  // Intake form
  fertilizerTypeLabel: string;
  stateLabel: string;
  cropLabel: string;
  selectState: string;
  selectCrop: string;
  selectStateFirst: string;
  photoLabel: string;
  photoUploadHint: string;
  photoFormats: string;
  startConsultation: string;
  imageTooDark: string;
  imageOverexposed: string;
  // Extraction progress
  processingCard: string;
  readingCard: string;
  extractingData: string;
  preparingConsultation: string;
  extractionFailed: string;
  tryAgain: string;
  // Consultation UI
  perAcre: string;
  endSession: string;
  starting: string;
  listening: string;
  thinking: string;
  speaking: string;
  waitForSystem: string;
  generatingResponse: string;
  releaseToSend: string;
  holdAndSpeak: string;
  endSessionTitle: string;
  endSessionBody: string;
  cancel: string;
  // Push-to-talk
  holdToSpeak: string;
  releaseToSendShort: string;
  // Auto-end
  endingSession: string;
  // Demo
  tryDemoCard: string;
  // Tap to start
  startSpeaking: string;
  tapToStartHint: string;
  // Transcript
  farmerLabel: string;
  systemLabel: string;
}

// Language picker metadata (shown on the picker card)
export interface LangOption {
  key: LangKey;
  native: string;    // language name in its own script
  english: string;   // English label
  code: string;      // BCP-47 language code
  dialect: string;
}

export const LANG_OPTIONS: LangOption[] = [
  { key: "hi-IN::Standard",   native: "हिंदी",             english: "Hindi",              code: "hi-IN",  dialect: "Standard"  },
  { key: "hi-IN::Bhojpuri",   native: "भोजपुरी",           english: "Bhojpuri",            code: "bho-IN", dialect: "Bhojpuri"  },
  { key: "hi-IN::Avadhi",     native: "अवधी",               english: "Awadhi",              code: "hi-IN",  dialect: "Avadhi"    },
  { key: "mr-IN::Standard",   native: "मराठी",              english: "Marathi",             code: "mr-IN",  dialect: "Standard"  },
  { key: "te-IN::Standard",   native: "తెలుగు",             english: "Telugu",              code: "te-IN",  dialect: "Standard"  },
  { key: "te-IN::Telangana",  native: "తెలంగాణ తెలుగు",    english: "Telugu (Telangana)",  code: "te-IN",  dialect: "Telangana" },
  { key: "kn-IN::Standard",   native: "ಕನ್ನಡ",              english: "Kannada",             code: "kn-IN",  dialect: "Standard"  },
  { key: "ta-IN::Standard",   native: "தமிழ்",              english: "Tamil",               code: "ta-IN",  dialect: "Standard"  },
  { key: "bn-IN::Standard",   native: "বাংলা",              english: "Bengali",             code: "bn-IN",  dialect: "Standard"  },
  { key: "gu-IN::Standard",   native: "ગુજરાતી",            english: "Gujarati",            code: "gu-IN",  dialect: "Standard"  },
];

// ── Translations ──────────────────────────────────────────────────────────────

const HI: Translations = {
  selectLanguage:       "अपनी भाषा चुनें",
  appTitle:             "मृदा स्वास्थ्य कार्ड",
  appSubtitle:          "संवादात्मक परामर्श",
  fertilizerTypeLabel:  "उपलब्ध खाद का प्रकार",
  stateLabel:           "राज्य",
  cropLabel:            "इस मौसम की फसल",
  selectState:          "राज्य चुनें...",
  selectCrop:           "फसल चुनें...",
  selectStateFirst:     "पहले राज्य चुनें",
  photoLabel:           "मृदा स्वास्थ्य कार्ड की फोटो",
  photoUploadHint:      "फोटो अपलोड करने के लिए क्लिक करें या खींचें",
  photoFormats:         "JPG, PNG या HEIC",
  startConsultation:    "परामर्श शुरू करें",
  imageTooDark:         "फोटो बहुत अंधेरी है। बेहतर रोशनी में दोबारा लें।",
  imageOverexposed:     "फोटो बहुत चमकीली है। दोबारा लें।",
  processingCard:       "मृदा स्वास्थ्य कार्ड प्रक्रिया",
  readingCard:          "कार्ड पढ़ रहे हैं...",
  extractingData:       "डेटा निकाल रहे हैं...",
  preparingConsultation:"परामर्श तैयार हो रही है...",
  extractionFailed:     "डेटा निकालने में त्रुटि",
  tryAgain:             "फिर से प्रयास करें",
  perAcre:              "प्रति एकड़:",
  endSession:           "सत्र समाप्त करें",
  starting:             "शुरू हो रहा है...",
  listening:            "सुन रहा है...",
  thinking:             "सोच रहा है...",
  speaking:             "बोल रहा है...",
  waitForSystem:        "सिस्टम के बोलने का इंतज़ार करें",
  generatingResponse:   "जवाब तैयार हो रहा है...",
  releaseToSend:        "भेजने के लिए छोड़ें",
  holdAndSpeak:         "बटन दबाकर बोलें, भेजने के लिए छोड़ें",
  endSessionTitle:      "यह सत्र समाप्त करें?",
  endSessionBody:       "बातचीत सहेजी जाएगी और सत्र बंद हो जाएगा।",
  cancel:               "रद्द करें",
  holdToSpeak:          "बोलने के लिए दबाएं",
  releaseToSendShort:   "भेजने के लिए छोड़ें",
  endingSession:        "सत्र समाप्त हो रहा है...",
  tryDemoCard:          "या नमूना मृदा स्वास्थ्य कार्ड आज़माएं",
  startSpeaking:        "🔊 परामर्श शुरू करें",
  tapToStartHint:       "ऑडियो बजना शुरू होगा",
  farmerLabel:          "किसान",
  systemLabel:          "सिस्टम",
};

const MR: Translations = {
  selectLanguage:       "तुमची भाषा निवडा",
  appTitle:             "माती आरोग्य कार्ड",
  appSubtitle:          "संवादी सल्लामसलत",
  fertilizerTypeLabel:  "उपलब्ध खताचा प्रकार",
  stateLabel:           "राज्य",
  cropLabel:            "या हंगामातील पीक",
  selectState:          "राज्य निवडा...",
  selectCrop:           "पीक निवडा...",
  selectStateFirst:     "आधी राज्य निवडा",
  photoLabel:           "माती आरोग्य कार्डचा फोटो",
  photoUploadHint:      "फोटो अपलोड करण्यासाठी क्लिक करा किंवा ड्रॅग करा",
  photoFormats:         "JPG, PNG किंवा HEIC",
  startConsultation:    "सल्लामसलत सुरू करा",
  imageTooDark:         "फोटो खूप गडद आहे. चांगल्या प्रकाशात पुन्हा घ्या.",
  imageOverexposed:     "फोटो जास्त उजळलेला आहे. पुन्हा घ्या.",
  processingCard:       "माती आरोग्य कार्ड प्रक्रिया",
  readingCard:          "कार्ड वाचत आहे...",
  extractingData:       "माहिती काढत आहे...",
  preparingConsultation:"सल्लामसलत तयार होत आहे...",
  extractionFailed:     "माहिती काढणे अयशस्वी",
  tryAgain:             "पुन्हा प्रयत्न करा",
  perAcre:              "प्रति एकर:",
  endSession:           "सत्र संपवा",
  starting:             "सुरू होत आहे...",
  listening:            "ऐकत आहे...",
  thinking:             "विचार करत आहे...",
  speaking:             "बोलत आहे...",
  waitForSystem:        "प्रणाली बोलणे संपण्याची वाट पहा",
  generatingResponse:   "उत्तर तयार होत आहे...",
  releaseToSend:        "पाठवण्यासाठी सोडा",
  holdAndSpeak:         "बटण दाबून बोला, पाठवण्यासाठी सोडा",
  endSessionTitle:      "हे सत्र संपवायचे?",
  endSessionBody:       "संभाषण जतन केले जाईल आणि सत्र बंद होईल.",
  cancel:               "रद्द करा",
  holdToSpeak:          "बोलण्यासाठी दाबा",
  releaseToSendShort:   "पाठवण्यासाठी सोडा",
  endingSession:        "सत्र संपत आहे...",
  tryDemoCard:          "किंवा नमुना माती आरोग्य कार्ड वापरा",
  startSpeaking:        "🔊 सल्लामसलत सुरू करा",
  tapToStartHint:       "ऑडिओ सुरू होईल",
  farmerLabel:          "शेतकरी",
  systemLabel:          "प्रणाली",
};

const TE: Translations = {
  selectLanguage:       "మీ భాష ఎంచుకోండి",
  appTitle:             "మట్టి ఆరోగ్య కార్డు",
  appSubtitle:          "సంవాద సంప్రదింపు",
  fertilizerTypeLabel:  "అందుబాటులో ఉన్న ఎరువు రకం",
  stateLabel:           "రాష్ట్రం",
  cropLabel:            "ఈ సీజన్‌లో పంట",
  selectState:          "రాష్ట్రం ఎంచుకోండి...",
  selectCrop:           "పంట ఎంచుకోండి...",
  selectStateFirst:     "మొదలు రాష్ట్రం ఎంచుకోండి",
  photoLabel:           "మట్టి ఆరోగ్య కార్డు ఫోటో",
  photoUploadHint:      "ఫోటో అప్‌లోడ్ చేయడానికి క్లిక్ చేయండి లేదా లాగండి",
  photoFormats:         "JPG, PNG లేదా HEIC",
  startConsultation:    "సంప్రదింపు ప్రారంభించండి",
  imageTooDark:         "ఫోటో చాలా చీకటిగా ఉంది. మంచి వెలుతురులో మళ్ళీ తీయండి.",
  imageOverexposed:     "ఫోటో చాలా ప్రకాశవంతంగా ఉంది. మళ్ళీ తీయండి.",
  processingCard:       "మట్టి ఆరోగ్య కార్డు ప్రాసెస్",
  readingCard:          "కార్డు చదువుతోంది...",
  extractingData:       "డేటా సేకరిస్తోంది...",
  preparingConsultation:"సంప్రదింపు తయారవుతోంది...",
  extractionFailed:     "సేకరణ విఫలమైంది",
  tryAgain:             "మళ్ళీ ప్రయత్నించండి",
  perAcre:              "ఎకరాకు:",
  endSession:           "సెషన్ ముగించండి",
  starting:             "ప్రారంభమవుతోంది...",
  listening:            "వింటోంది...",
  thinking:             "ఆలోచిస్తోంది...",
  speaking:             "మాట్లాడుతోంది...",
  waitForSystem:        "సిస్టమ్ మాట్లాడడం ముగించే వరకు వేచి ఉండండి",
  generatingResponse:   "సమాధానం తయారవుతోంది...",
  releaseToSend:        "పంపడానికి వదలండి",
  holdAndSpeak:         "మాట్లాడటానికి బటన్ పట్టుకోండి, పంపడానికి వదలండి",
  endSessionTitle:      "ఈ సెషన్ ముగించాలా?",
  endSessionBody:       "సంభాషణ సేవ్ చేయబడుతుంది మరియు సెషన్ మూసివేయబడుతుంది.",
  cancel:               "రద్దు చేయండి",
  holdToSpeak:          "మాట్లాడటానికి పట్టుకోండి",
  releaseToSendShort:   "పంపడానికి వదలండి",
  endingSession:        "సెషన్ ముగుస్తోంది...",
  tryDemoCard:          "లేదా నమూనా మట్టి ఆరోగ్య కార్డుతో ప్రయత్నించండి",
  startSpeaking:        "🔊 సంప్రదింపు ప్రారంభించండి",
  tapToStartHint:       "ఆడియో ప్లే అవుతుంది",
  farmerLabel:          "రైతు",
  systemLabel:          "సిస్టమ్",
};

const KN: Translations = {
  selectLanguage:       "ನಿಮ್ಮ ಭಾಷೆ ಆಯ್ಕೆ ಮಾಡಿ",
  appTitle:             "ಮಣ್ಣಿನ ಆರೋಗ್ಯ ಕಾರ್ಡ್",
  appSubtitle:          "ಸಂವಾದ ಸಲಹಾ ವ್ಯವಸ್ಥೆ",
  fertilizerTypeLabel:  "ಲಭ್ಯವಿರುವ ರಸಗೊಬ್ಬರದ ಪ್ರಕಾರ",
  stateLabel:           "ರಾಜ್ಯ",
  cropLabel:            "ಈ ಋತುವಿನ ಬೆಳೆ",
  selectState:          "ರಾಜ್ಯ ಆಯ್ಕೆ ಮಾಡಿ...",
  selectCrop:           "ಬೆಳೆ ಆಯ್ಕೆ ಮಾಡಿ...",
  selectStateFirst:     "ಮೊದಲು ರಾಜ್ಯ ಆಯ್ಕೆ ಮಾಡಿ",
  photoLabel:           "ಮಣ್ಣಿನ ಆರೋಗ್ಯ ಕಾರ್ಡ್ ಫೋಟೋ",
  photoUploadHint:      "ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಮಾಡಲು ಕ್ಲಿಕ್ ಮಾಡಿ ಅಥವಾ ಎಳೆಯಿರಿ",
  photoFormats:         "JPG, PNG ಅಥವಾ HEIC",
  startConsultation:    "ಸಲಹೆ ಪ್ರಾರಂಭಿಸಿ",
  imageTooDark:         "ಫೋಟೋ ತುಂಬಾ ಕತ್ತಲೆಯಾಗಿದೆ. ಉತ್ತಮ ಬೆಳಕಿನಲ್ಲಿ ಮತ್ತೆ ತೆಗೆಯಿರಿ.",
  imageOverexposed:     "ಫೋಟೋ ತುಂಬಾ ಪ್ರಕಾಶಮಾನವಾಗಿದೆ. ಮತ್ತೆ ತೆಗೆಯಿರಿ.",
  processingCard:       "ಮಣ್ಣಿನ ಆರೋಗ್ಯ ಕಾರ್ಡ್ ಪ್ರಕ್ರಿಯೆ",
  readingCard:          "ಕಾರ್ಡ್ ಓದುತ್ತಿದೆ...",
  extractingData:       "ಡೇಟಾ ಹೊರತೆಗೆಯುತ್ತಿದೆ...",
  preparingConsultation:"ಸಲಹೆ ತಯಾರಾಗುತ್ತಿದೆ...",
  extractionFailed:     "ಹೊರತೆಗೆಯುವಿಕೆ ವಿಫಲವಾಯಿತು",
  tryAgain:             "ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ",
  perAcre:              "ಪ್ರತಿ ಎಕರೆಗೆ:",
  endSession:           "ಅಧಿವೇಶನ ಮುಗಿಸಿ",
  starting:             "ಪ್ರಾರಂಭವಾಗುತ್ತಿದೆ...",
  listening:            "ಕೇಳುತ್ತಿದೆ...",
  thinking:             "ಯೋಚಿಸುತ್ತಿದೆ...",
  speaking:             "ಮಾತನಾಡುತ್ತಿದೆ...",
  waitForSystem:        "ಸಿಸ್ಟಮ್ ಮಾತನಾಡುವುದು ಮುಗಿಯುವವರೆಗೆ ಕಾಯಿರಿ",
  generatingResponse:   "ಉತ್ತರ ತಯಾರಾಗುತ್ತಿದೆ...",
  releaseToSend:        "ಕಳುಹಿಸಲು ಬಿಡಿ",
  holdAndSpeak:         "ಮಾತನಾಡಲು ಬಟನ್ ಹಿಡಿಯಿರಿ, ಕಳುಹಿಸಲು ಬಿಡಿ",
  endSessionTitle:      "ಈ ಅಧಿವೇಶನ ಮುಗಿಸಲೇ?",
  endSessionBody:       "ಸಂಭಾಷಣೆ ಉಳಿಸಲಾಗುವುದು ಮತ್ತು ಅಧಿವೇಶನ ಮುಚ್ಚಲಾಗುವುದು.",
  cancel:               "ರದ್ದುಮಾಡಿ",
  holdToSpeak:          "ಮಾತನಾಡಲು ಹಿಡಿಯಿರಿ",
  releaseToSendShort:   "ಕಳುಹಿಸಲು ಬಿಡಿ",
  endingSession:        "ಅಧಿವೇಶನ ಮುಗಿಯುತ್ತಿದೆ...",
  tryDemoCard:          "ಅಥವಾ ಮಾದರಿ ಮಣ್ಣಿನ ಆರೋಗ್ಯ ಕಾರ್ಡ್ ಬಳಸಿ ಪ್ರಯತ್ನಿಸಿ",
  startSpeaking:        "🔊 ಸಮಾಲೋಚನೆ ಪ್ರಾರಂಭಿಸಿ",
  tapToStartHint:       "ಆಡಿಯೋ ಪ್ಲೇ ಆಗುತ್ತದೆ",
  farmerLabel:          "ರೈತ",
  systemLabel:          "ಸಿಸ್ಟಮ್",
};

const TA: Translations = {
  selectLanguage:       "உங்கள் மொழியை தேர்ந்தெடுக்கவும்",
  appTitle:             "மண் சுகாதார அட்டை",
  appSubtitle:          "உரையாடல் ஆலோசனை",
  fertilizerTypeLabel:  "கிடைக்கும் உர வகை",
  stateLabel:           "மாநிலம்",
  cropLabel:            "இந்த பருவத்தில் பயிர்",
  selectState:          "மாநிலம் தேர்ந்தெடுக்கவும்...",
  selectCrop:           "பயிர் தேர்ந்தெடுக்கவும்...",
  selectStateFirst:     "முதலில் மாநிலம் தேர்ந்தெடுக்கவும்",
  photoLabel:           "மண் சுகாதார அட்டை புகைப்படம்",
  photoUploadHint:      "புகைப்படத்தை பதிவேற்ற கிளிக் செய்யவும் அல்லது இழுக்கவும்",
  photoFormats:         "JPG, PNG அல்லது HEIC",
  startConsultation:    "ஆலோசனை தொடங்கவும்",
  imageTooDark:         "படம் மிகவும் இருட்டாக உள்ளது. நல்ல வெளிச்சத்தில் மீண்டும் எடுக்கவும்.",
  imageOverexposed:     "படம் மிகவும் பிரகாசமாக உள்ளது. மீண்டும் எடுக்கவும்.",
  processingCard:       "மண் சுகாதார அட்டை செயலாக்கம்",
  readingCard:          "அட்டை படிக்கிறது...",
  extractingData:       "தரவு பிரித்தெடுக்கிறது...",
  preparingConsultation:"ஆலோசனை தயாரிக்கிறது...",
  extractionFailed:     "பிரித்தெடுத்தல் தோல்வியடைந்தது",
  tryAgain:             "மீண்டும் முயற்சிக்கவும்",
  perAcre:              "ஒரு ஏக்கருக்கு:",
  endSession:           "அமர்வை முடிக்கவும்",
  starting:             "தொடங்குகிறது...",
  listening:            "கேட்கிறது...",
  thinking:             "யோசிக்கிறது...",
  speaking:             "பேசுகிறது...",
  waitForSystem:        "கணினி பேசி முடிக்கும் வரை காத்திருக்கவும்",
  generatingResponse:   "பதில் தயாரிக்கப்படுகிறது...",
  releaseToSend:        "அனுப்ப விடுங்கள்",
  holdAndSpeak:         "பேச பட்டனை அழுத்திப் பிடிக்கவும், அனுப்ப விடுங்கள்",
  endSessionTitle:      "இந்த அமர்வை முடிக்கவா?",
  endSessionBody:       "உரையாடல் சேமிக்கப்படும், அமர்வு மூடப்படும்.",
  cancel:               "ரத்துசெய்",
  holdToSpeak:          "பேச அழுத்திப் பிடிக்கவும்",
  releaseToSendShort:   "அனுப்ப விடுங்கள்",
  endingSession:        "அமர்வு முடிகிறது...",
  tryDemoCard:          "அல்லது மாதிரி மண் சுகாதார அட்டையை முயற்சிக்கவும்",
  startSpeaking:        "🔊 ஆலோசனையைத் தொடங்கு",
  tapToStartHint:       "ஆடியோ இயங்கும்",
  farmerLabel:          "விவசாயி",
  systemLabel:          "கணினி",
};

const BN: Translations = {
  selectLanguage:       "আপনার ভাষা বেছে নিন",
  appTitle:             "মাটির স্বাস্থ্য কার্ড",
  appSubtitle:          "কথোপকথন পরামর্শ",
  fertilizerTypeLabel:  "উপলব্ধ সারের ধরন",
  stateLabel:           "রাজ্য",
  cropLabel:            "এই মৌসুমে ফসল",
  selectState:          "রাজ্য বেছে নিন...",
  selectCrop:           "ফসল বেছে নিন...",
  selectStateFirst:     "আগে রাজ্য বেছে নিন",
  photoLabel:           "মাটির স্বাস্থ্য কার্ডের ছবি",
  photoUploadHint:      "ছবি আপলোড করতে ক্লিক করুন বা টেনে আনুন",
  photoFormats:         "JPG, PNG বা HEIC",
  startConsultation:    "পরামর্শ শুরু করুন",
  imageTooDark:         "ছবি অনেক অন্ধকার। ভালো আলোয় আবার তুলুন।",
  imageOverexposed:     "ছবি অনেক উজ্জ্বল। আবার তুলুন।",
  processingCard:       "মাটির স্বাস্থ্য কার্ড প্রক্রিয়াকরণ",
  readingCard:          "কার্ড পড়ছে...",
  extractingData:       "তথ্য বের করছে...",
  preparingConsultation:"পরামর্শ তৈরি হচ্ছে...",
  extractionFailed:     "তথ্য বের করা ব্যর্থ হয়েছে",
  tryAgain:             "আবার চেষ্টা করুন",
  perAcre:              "প্রতি একরে:",
  endSession:           "সেশন শেষ করুন",
  starting:             "শুরু হচ্ছে...",
  listening:            "শুনছে...",
  thinking:             "ভাবছে...",
  speaking:             "বলছে...",
  waitForSystem:        "সিস্টেম বলা শেষ করার অপেক্ষা করুন",
  generatingResponse:   "উত্তর তৈরি হচ্ছে...",
  releaseToSend:        "পাঠাতে ছাড়ুন",
  holdAndSpeak:         "বলতে বাটন ধরুন, পাঠাতে ছাড়ুন",
  endSessionTitle:      "এই সেশন শেষ করবেন?",
  endSessionBody:       "কথোপকথন সংরক্ষিত হবে এবং সেশন বন্ধ হবে।",
  cancel:               "বাতিল",
  holdToSpeak:          "বলতে ধরুন",
  releaseToSendShort:   "পাঠাতে ছাড়ুন",
  endingSession:        "সেশন শেষ হচ্ছে...",
  tryDemoCard:          "অথবা নমুনা মাটির স্বাস্থ্য কার্ড ব্যবহার করুন",
  startSpeaking:        "🔊 পরামর্শ শুরু করুন",
  tapToStartHint:       "অডিও বাজবে",
  farmerLabel:          "কৃষক",
  systemLabel:          "সিস্টেম",
};

const GU: Translations = {
  selectLanguage:       "તમારી ભાષા પસંદ કરો",
  appTitle:             "માટી આરોગ્ય કાર્ડ",
  appSubtitle:          "સંવાદ સલાહ",
  fertilizerTypeLabel:  "ઉપલબ્ધ ખાતરનો પ્રકાર",
  stateLabel:           "રાજ્ય",
  cropLabel:            "આ સીઝનનો પાક",
  selectState:          "રાજ્ય પસંદ કરો...",
  selectCrop:           "પાક પસંદ કરો...",
  selectStateFirst:     "પહેલા રાજ્ય પસંદ કરો",
  photoLabel:           "માટી આરોગ્ય કાર્ડ ફોટો",
  photoUploadHint:      "ફોટો અપલોડ કરવા ક્લિક કરો અથવા ખેંચો",
  photoFormats:         "JPG, PNG અથવા HEIC",
  startConsultation:    "સલાહ શરૂ કરો",
  imageTooDark:         "ફોટો ખૂબ અંધારો છે. સારા પ્રકાશમાં ફરીથી લો.",
  imageOverexposed:     "ફોટો ખૂબ ઝળઝળતો છે. ફરીથી લો.",
  processingCard:       "માટી આરોગ્ય કાર્ડ પ્રક્રિયા",
  readingCard:          "કાર્ડ વાંચી રહ્યું છે...",
  extractingData:       "ડેટા કાઢી રહ્યું છે...",
  preparingConsultation:"સલાહ તૈયાર થઈ રહી છે...",
  extractionFailed:     "નિષ્કર્ષણ નિષ્ફળ",
  tryAgain:             "ફરી પ્રયાસ કરો",
  perAcre:              "દર એકર:",
  endSession:           "સત્ર સમાપ્ત કરો",
  starting:             "શરૂ થઈ રહ્યું છે...",
  listening:            "સાંભળી રહ્યું છે...",
  thinking:             "વિચારી રહ્યું છે...",
  speaking:             "બોલી રહ્યું છે...",
  waitForSystem:        "સિસ્ટમ બોલવાનું સમાપ્ત થવાની રાહ જુઓ",
  generatingResponse:   "જવાબ તૈયાર થઈ રહ્યો છે...",
  releaseToSend:        "મોકલવા છોડો",
  holdAndSpeak:         "બોલવા બટન દબાવો, મોકલવા છોડો",
  endSessionTitle:      "આ સત્ર સમાપ્ત કરો?",
  endSessionBody:       "વાર્તાલાપ સાચવવામાં આવશે અને સત્ર બંધ થશે.",
  cancel:               "રદ કરો",
  holdToSpeak:          "બોલવા દબાવો",
  releaseToSendShort:   "મોકલવા છોડો",
  endingSession:        "સત્ર સમાપ્ત થઈ રહ્યું છે...",
  tryDemoCard:          "અથવા નમૂના માટી આરોગ્ય કાર્ડ અજમાવો",
  startSpeaking:        "🔊 પરામર્શ શરૂ કરો",
  tapToStartHint:       "ઑડિયો વાગશે",
  farmerLabel:          "ખેડૂત",
  systemLabel:          "સિસ્ટમ",
};

export const TRANSLATIONS: Record<LangKey, Translations> = {
  "hi-IN::Standard":  HI,
  "hi-IN::Bhojpuri":  HI, // same script/language
  "hi-IN::Avadhi":    HI,
  "mr-IN::Standard":  MR,
  "te-IN::Standard":  TE,
  "te-IN::Telangana": TE,
  "kn-IN::Standard":  KN,
  "ta-IN::Standard":  TA,
  "bn-IN::Standard":  BN,
  "gu-IN::Standard":  GU,
};

export function getTranslations(langKey: string): Translations {
  return TRANSLATIONS[langKey as LangKey] ?? TRANSLATIONS["hi-IN::Standard"];
}

// ── Localized opening text (used server-side in extract route) ────────────────

const DEFICIENCY_NAMES: Record<LangKey, Record<string, string>> = {
  "hi-IN::Standard":  { N:"नाइट्रोजन", P:"फास्फोरस", K:"पोटाश", S:"सल्फर", Zn:"जिंक", B:"बोरोन", Fe:"लोहा", Mn:"मैंगनीज", Cu:"तांबा", OC:"जैविक कार्बन" },
  "hi-IN::Bhojpuri":  { N:"नाइट्रोजन", P:"फास्फोरस", K:"पोटाश", S:"सल्फर", Zn:"जिंक", B:"बोरोन", Fe:"लोहा", Mn:"मैंगनीज", Cu:"तांबा", OC:"जैविक कार्बन" },
  "hi-IN::Avadhi":    { N:"नाइट्रोजन", P:"फास्फोरस", K:"पोटाश", S:"सल्फर", Zn:"जिंक", B:"बोरोन", Fe:"लोहा", Mn:"मैंगनीज", Cu:"तांबा", OC:"जैविक कार्बन" },
  "mr-IN::Standard":  { N:"नायट्रोजन", P:"फॉस्फरस", K:"पोटॅश", S:"सल्फर", Zn:"झिंक", B:"बोरॉन", Fe:"लोह", Mn:"मँगेनीज", Cu:"तांबे", OC:"सेंद्रिय कार्बन" },
  "te-IN::Standard":  { N:"నైట్రోజన్", P:"ఫాస్ఫరస్", K:"పొటాష్", S:"సల్ఫర్", Zn:"జింక్", B:"బోరాన్", Fe:"ఐరన్", Mn:"మాంగనీస్", Cu:"కాపర్", OC:"సేంద్రియ కార్బన్" },
  "te-IN::Telangana": { N:"నైట్రోజన్", P:"ఫాస్ఫరస్", K:"పొటాష్", S:"సల్ఫర్", Zn:"జింక్", B:"బోరాన్", Fe:"ఐరన్", Mn:"మాంగనీస్", Cu:"కాపర్", OC:"సేంద్రియ కార్బన్" },
  "kn-IN::Standard":  { N:"ನೈಟ್ರೋಜನ್", P:"ಫಾಸ್ಫರಸ್", K:"ಪೊಟ್ಯಾಶ್", S:"ಸಲ್ಫರ್", Zn:"ಜಿಂಕ್", B:"ಬೋರಾನ್", Fe:"ಕಬ್ಬಿಣ", Mn:"ಮ್ಯಾಂಗನೀಸ್", Cu:"ತಾಮ್ರ", OC:"ಸಾವಯವ ಇಂಗಾಲ" },
  "ta-IN::Standard":  { N:"நைட்ரஜன்", P:"பாஸ்பரஸ்", K:"பொட்டாஷ்", S:"கந்தகம்", Zn:"துத்தநாகம்", B:"போரான்", Fe:"இரும்பு", Mn:"மாங்கனீஸ்", Cu:"செம்பு", OC:"கரிம கார்பன்" },
  "bn-IN::Standard":  { N:"নাইট্রোজেন", P:"ফসফরাস", K:"পটাশ", S:"সালফার", Zn:"জিঙ্ক", B:"বোরন", Fe:"আয়রন", Mn:"ম্যাঙ্গানিজ", Cu:"কপার", OC:"জৈব কার্বন" },
  "gu-IN::Standard":  { N:"નાઈટ્રોજન", P:"ફોસ્ફરસ", K:"પોટૅશ", S:"સલ્ફર", Zn:"ઝિંક", B:"બોરોન", Fe:"આયર્ન", Mn:"મેંગેનીઝ", Cu:"કૉપર", OC:"ઓર્ગેનિક કાર્બન" },
};

// Templates indexed by base language (dialects share template)
const OPENING_TEMPLATES: Partial<Record<string, (n: string, defs: string, crop: string, urea: number, fert: string, fertQty: number, potash: number) => string>> = {
  "hi-IN": (n, d, crop, urea, fert, fq, pot) =>
    `नमस्ते ${n}आपकी मिट्टी में ${d} की कमी है। आपके ${crop} के लिए, प्रत्येक एकड़ में ${Math.round(urea)} किलो यूरिया, ${Math.round(fq)} किलो ${fert}, और ${Math.round(pot)} किलो पोटाश चाहिए। कोई सवाल पूछ सकते हैं।`,
  "bho-IN": (n, d, crop, urea, fert, fq, pot) =>
    `नमस्ते ${n}आपकी मिट्टी में ${d} की कमी है। आपके ${crop} के लिए, प्रत्येक एकड़ में ${Math.round(urea)} किलो यूरिया, ${Math.round(fq)} किलो ${fert}, और ${Math.round(pot)} किलो पोटाश चाहिए। कोई सवाल पूछ सकते हैं।`,
  "mr-IN": (n, d, crop, urea, fert, fq, pot) =>
    `नमस्ते ${n}तुमच्या मातीत ${d} ची कमतरता आहे। तुमच्या ${crop} साठी, प्रत्येक एकरात ${Math.round(urea)} किलो युरिया, ${Math.round(fq)} किलो ${fert}, आणि ${Math.round(pot)} किलो पोटॅश लागेल। काही प्रश्न विचारा।`,
  "te-IN": (n, d, crop, urea, fert, fq, pot) =>
    `నమస్తే ${n}మీ మట్టిలో ${d} లోపం ఉంది. మీ ${crop} కోసం, ప్రతి ఎకరానికి ${Math.round(urea)} కిలో యూరియా, ${Math.round(fq)} కిలో ${fert}, మరియు ${Math.round(pot)} కిలో పొటాష్ అవసరం. ఏమైనా అడగవచ్చు.`,
  "kn-IN": (n, d, crop, urea, fert, fq, pot) =>
    `ನಮಸ್ತೆ ${n}ನಿಮ್ಮ ಮಣ್ಣಿನಲ್ಲಿ ${d} ಕೊರತೆ ಇದೆ. ನಿಮ್ಮ ${crop} ಗೆ, ಪ್ರತಿ ಎಕರೆಗೆ ${Math.round(urea)} ಕಿಲೋ ಯೂರಿಯಾ, ${Math.round(fq)} ಕಿಲೋ ${fert}, ಮತ್ತು ${Math.round(pot)} ಕಿಲೋ ಪೊಟ್ಯಾಶ್ ಬೇಕು. ಏನಾದರೂ ಕೇಳಬಹುದು.`,
  "ta-IN": (n, d, crop, urea, fert, fq, pot) =>
    `வணக்கம் ${n}உங்கள் மண்ணில் ${d} குறைபாடு உள்ளது. உங்கள் ${crop} க்காக, ஒரு ஏக்கருக்கு ${Math.round(urea)} கிலோ யூரியா, ${Math.round(fq)} கிலோ ${fert}, மற்றும் ${Math.round(pot)} கிலோ பொட்டாஷ் தேவை. கேள்விகள் கேட்கலாம்.`,
  "bn-IN": (n, d, crop, urea, fert, fq, pot) =>
    `নমস্কার ${n}আপনার মাটিতে ${d} এর ঘাটতি আছে। আপনার ${crop} এর জন্য, প্রতি একরে ${Math.round(urea)} কিলো ইউরিয়া, ${Math.round(fq)} কিলো ${fert}, এবং ${Math.round(pot)} কিলো পটাশ দরকার। প্রশ্ন করতে পারেন।`,
  "gu-IN": (n, d, crop, urea, fert, fq, pot) =>
    `નમસ્તે ${n}તમારી માટીમાં ${d} ની ઉણપ છે. તમારા ${crop} માટે, દરેક એકરે ${Math.round(urea)} કિલો યુરિયા, ${Math.round(fq)} કિલો ${fert}, અને ${Math.round(pot)} કિલો પોટૅશ જોઈએ. કોઈ સવાલ પૂછી શકો.`,
};

export function buildLocalizedOpeningText(
  langKey: string,
  params: { name: string; defs: string[]; crop: string; urea: number; fert: string; fertQty: number; potash: number },
): string {
  const key = langKey as LangKey;
  const defNames = DEFICIENCY_NAMES[key] ?? DEFICIENCY_NAMES["hi-IN::Standard"];
  const code = langKey.split("::")[0]; // e.g. "mr-IN"

  const defStr = params.defs.length > 0
    ? params.defs.map((d) => defNames[d] ?? d).join(", ")
    : (code === "hi-IN" || code === "bho-IN" ? "कोई बड़ी कमी नहीं" : "");

  const namePrefix = params.name ? `${params.name}, ` : "";
  const tpl = OPENING_TEMPLATES[code];
  if (tpl) {
    return tpl(namePrefix, defStr, params.crop, params.urea, params.fert, params.fertQty, params.potash);
  }

  // Fallback to Hindi if language not in templates
  return OPENING_TEMPLATES["hi-IN"]!(namePrefix, defStr, params.crop, params.urea, params.fert, params.fertQty, params.potash);
}
