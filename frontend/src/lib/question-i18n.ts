import type { LanguageCode, Question } from "./kiosk-data";

type QuestionCopy = {
  prompt?: string;
  hint?: string;
  section?: string;
  fieldLabel?: string;
  options?: Record<string, { label?: string; sublabel?: string }>;
};

const copy: Partial<Record<LanguageCode, Record<string, QuestionCopy>>> = {
  hi: {
    chief_complaint: {
      prompt: "आज आपको सबसे ज्यादा क्या परेशानी है?",
      hint: "अपने शब्दों में बताएं या कोई चित्र छुएं।",
      section: "मुख्य शिकायत",
      fieldLabel: "मुख्य शिकायत",
      options: {
        chest: { label: "सीने में दर्द या भारीपन" },
        breath: { label: "सांस लेने में परेशानी" },
        fever: { label: "बुखार" },
        stomach: { label: "पेट में दर्द" },
        joints: { label: "जोड़ों या पीठ में दर्द" },
        weak: { label: "कमजोरी या चक्कर" },
      },
    },
    onset: {
      prompt: "यह परेशानी आपको कब से है?",
      section: "वर्तमान बीमारी का इतिहास",
      options: {
        today: { label: "आज शुरू हुआ" },
        week: { label: "कुछ दिन से" },
        month: { label: "लगभग एक महीने से" },
        long: { label: "कई महीने या साल से" },
      },
    },
    severity: {
      prompt: "अभी यह परेशानी कितनी गंभीर है?",
      hint: "अपने अनुभव से मिलता चेहरा छुएं।",
      section: "वर्तमान बीमारी का इतिहास",
      options: {
        mild: { label: "हल्की", sublabel: "मैं अपना काम कर सकता हूं" },
        moderate: { label: "मध्यम", sublabel: "यह मुझे परेशान करती है" },
        severe: { label: "बहुत तेज", sublabel: "मैं सह नहीं सकता" },
      },
    },
    chest_alarm: {
      prompt: "सीने की परेशानी के साथ अभी इनमें से कुछ है?",
      hint: "जरूरत होने पर डॉक्टर को जल्दी बुलाने में इससे मदद मिलेगी।",
      section: "वर्तमान बीमारी का इतिहास",
      options: {
        arm: { label: "बाएं हाथ या जबड़े तक जाता दर्द" },
        sweat: { label: "ठंडा पसीना" },
        faint: { label: "बेहोशी जैसा लगना" },
        none: { label: "इनमें से कुछ नहीं" },
      },
    },
    general_alarm: {
      prompt: "क्या आज आपको इनमें से कोई गंभीर संकेत है?",
      section: "वर्तमान बीमारी का इतिहास",
      options: {
        bleeding: { label: "खून बहना बंद नहीं हो रहा" },
        unconscious: { label: "बेहोश हो गए" },
        speech: { label: "शरीर के एक तरफ अचानक कमजोरी" },
        none: { label: "इनमें से कुछ नहीं" },
      },
    },
  },
  bn: {
    chief_complaint: {
      prompt: "আজ আপনাকে সবচেয়ে বেশি কী কষ্ট দিচ্ছে?",
      hint: "নিজের ভাষায় বলুন অথবা একটি ছবি স্পর্শ করুন।",
      section: "প্রধান সমস্যা",
      fieldLabel: "প্রধান সমস্যা",
      options: {
        chest: { label: "বুকে ব্যথা বা ভারী লাগা" },
        breath: { label: "শ্বাস নিতে কষ্ট" },
        fever: { label: "জ্বর" },
        stomach: { label: "পেটে ব্যথা" },
        joints: { label: "জয়েন্ট বা পিঠে ব্যথা" },
        weak: { label: "দুর্বলতা বা মাথা ঘোরা" },
      },
    },
    onset: {
      prompt: "এই সমস্যা কবে থেকে হচ্ছে?",
      section: "বর্তমান অসুস্থতার ইতিহাস",
      options: {
        today: { label: "আজ শুরু হয়েছে" },
        week: { label: "কয়েক দিন" },
        month: { label: "প্রায় এক মাস" },
        long: { label: "অনেক মাস বা বছর" },
      },
    },
    severity: {
      prompt: "এখন সমস্যাটি কতটা খারাপ?",
      hint: "আপনার অনুভূতির সঙ্গে মেলে এমন মুখটি স্পর্শ করুন।",
      section: "বর্তমান অসুস্থতার ইতিহাস",
      options: {
        mild: { label: "হালকা", sublabel: "আমি কাজ করতে পারি" },
        moderate: { label: "মাঝারি", sublabel: "এতে আমি বিরক্ত হই" },
        severe: { label: "তীব্র", sublabel: "আমি সহ্য করতে পারছি না" },
      },
    },
    chest_alarm: {
      prompt: "বুকের সমস্যার সঙ্গে এখন কি এগুলোর কোনোটি আছে?",
      hint: "প্রয়োজনে দ্রুত ডাক্তার ডাকতে এটি সাহায্য করবে।",
      section: "বর্তমান অসুস্থতার ইতিহাস",
      options: {
        arm: { label: "বাম হাত বা চোয়ালে ছড়ানো ব্যথা" },
        sweat: { label: "ঠান্ডা ঘাম" },
        faint: { label: "অজ্ঞান হওয়ার অনুভূতি" },
        none: { label: "এর কোনোটিই নয়" },
      },
    },
    general_alarm: {
      prompt: "আজ কি আপনার এই গুরুতর লক্ষণগুলোর কোনোটি আছে?",
      section: "বর্তমান অসুস্থতার ইতিহাস",
      options: {
        bleeding: { label: "রক্তপাত বন্ধ হচ্ছে না" },
        unconscious: { label: "অজ্ঞান হয়ে গিয়েছিলেন" },
        speech: { label: "শরীরের এক পাশে হঠাৎ দুর্বলতা" },
        none: { label: "এর কোনোটিই নয়" },
      },
    },
  },
  mr: {
    chief_complaint: {
      prompt: "आज तुम्हाला सर्वात जास्त काय त्रास होत आहे?",
      hint: "तुमच्या शब्दांत सांगा किंवा चित्राला स्पर्श करा.",
      section: "मुख्य तक्रार",
      fieldLabel: "मुख्य तक्रार",
      options: {
        chest: { label: "छातीत दुखणे किंवा जडपणा" },
        breath: { label: "श्वास घेण्यास त्रास" },
        fever: { label: "ताप" },
        stomach: { label: "पोटदुखी" },
        joints: { label: "सांधे किंवा पाठदुखी" },
        weak: { label: "अशक्तपणा किंवा चक्कर" },
      },
    },
    onset: {
      prompt: "हा त्रास तुम्हाला कधीपासून आहे?",
      section: "सध्याच्या आजाराचा इतिहास",
      options: {
        today: { label: "आज सुरू झाला" },
        week: { label: "काही दिवसांपासून" },
        month: { label: "सुमारे महिन्याभरापासून" },
        long: { label: "अनेक महिने किंवा वर्षे" },
      },
    },
    severity: {
      prompt: "सध्या हा त्रास किती आहे?",
      hint: "तुमच्या भावनेशी जुळणाऱ्या चेहऱ्याला स्पर्श करा.",
      section: "सध्याच्या आजाराचा इतिहास",
      options: {
        mild: { label: "कमी", sublabel: "मी माझे काम करू शकतो" },
        moderate: { label: "मध्यम", sublabel: "यामुळे मला त्रास होतो" },
        severe: { label: "तीव्र", sublabel: "मला सहन होत नाही" },
      },
    },
    chest_alarm: {
      prompt: "छातीच्या त्रासासोबत सध्या यापैकी काही आहे का?",
      section: "सध्याच्या आजाराचा इतिहास",
      options: {
        arm: { label: "डाव्या हातात किंवा जबड्यात जाणारे दुखणे" },
        sweat: { label: "थंड घाम" },
        faint: { label: "बेशुद्ध पडल्यासारखे वाटणे" },
        none: { label: "यापैकी काहीही नाही" },
      },
    },
    general_alarm: {
      prompt: "आज यापैकी काही गंभीर लक्षणे आहेत का?",
      section: "सध्याच्या आजाराचा इतिहास",
      options: {
        bleeding: { label: "रक्तस्राव थांबत नाही" },
        unconscious: { label: "बेशुद्ध पडणे" },
        speech: { label: "शरीराच्या एका बाजूला अचानक अशक्तपणा" },
        none: { label: "यापैकी काहीही नाही" },
      },
    },
  },
  ta: {
    chief_complaint: {
      prompt: "இன்று உங்களை மிகவும் தொந்தரவு செய்வது என்ன?",
      hint: "உங்கள் சொந்த வார்த்தைகளில் சொல்லுங்கள் அல்லது படத்தைத் தொடுங்கள்.",
      section: "முக்கியப் புகார்",
      options: {
        chest: { label: "மார்பு வலி அல்லது கனத்த உணர்வு" },
        breath: { label: "மூச்சு விடுவதில் சிரமம்" },
        fever: { label: "காய்ச்சல்" },
        stomach: { label: "வயிற்று வலி" },
        joints: { label: "மூட்டு அல்லது முதுகு வலி" },
        weak: { label: "பலவீனம் அல்லது தலைச்சுற்றல்" },
      },
    },
    onset: {
      prompt: "இந்தப் பிரச்சனை எப்போது தொடங்கியது?",
      section: "தற்போதைய நோய் வரலாறு",
      options: {
        today: { label: "இன்று தொடங்கியது" },
        week: { label: "சில நாட்களாக" },
        month: { label: "சுமார் ஒரு மாதமாக" },
        long: { label: "பல மாதங்கள் அல்லது ஆண்டுகள்" },
      },
    },
    severity: {
      prompt: "இப்போது இது எவ்வளவு மோசமாக உள்ளது?",
      hint: "உங்கள் உணர்வுடன் பொருந்தும் முகத்தைத் தொடுங்கள்.",
      section: "தற்போதைய நோய் வரலாறு",
      options: {
        mild: { label: "லேசானது" },
        moderate: { label: "மிதமானது" },
        severe: { label: "கடுமையானது" },
      },
    },
  },
  te: {
    chief_complaint: {
      prompt: "ఈ రోజు మిమ్మల్ని ఎక్కువగా బాధిస్తున్నది ఏమిటి?",
      hint: "మీ మాటల్లో చెప్పండి లేదా చిత్రాన్ని తాకండి.",
      section: "ప్రధాన సమస్య",
      options: {
        chest: { label: "ఛాతీ నొప్పి లేదా బరువు" },
        breath: { label: "శ్వాస తీసుకోవడంలో ఇబ్బంది" },
        fever: { label: "జ్వరం" },
        stomach: { label: "కడుపు నొప్పి" },
        joints: { label: "కీళ్ళు లేదా వెన్నునొప్పి" },
        weak: { label: "బలహీనత లేదా తల తిరగడం" },
      },
    },
    onset: {
      prompt: "ఈ సమస్య ఎప్పటి నుంచి ఉంది?",
      section: "ప్రస్తుత అనారోగ్య చరిత్ర",
      options: {
        today: { label: "ఈ రోజు మొదలైంది" },
        week: { label: "కొన్ని రోజులుగా" },
        month: { label: "సుమారు ఒక నెలగా" },
        long: { label: "చాలా నెలలు లేదా సంవత్సరాలు" },
      },
    },
    severity: {
      prompt: "ఇప్పుడు ఇది ఎంత తీవ్రంగా ఉంది?",
      hint: "మీ అనుభూతికి సరిపోయే ముఖాన్ని తాకండి.",
      section: "ప్రస్తుత అనారోగ్య చరిత్ర",
      options: {
        mild: { label: "తక్కువ" },
        moderate: { label: "మధ్యస్థం" },
        severe: { label: "తీవ్రం" },
      },
    },
  },
  kn: {
    chief_complaint: {
      prompt: "ಇಂದು ನಿಮಗೆ ಹೆಚ್ಚು ತೊಂದರೆ ನೀಡುತ್ತಿರುವುದು ಏನು?",
      hint: "ನಿಮ್ಮ ಮಾತಿನಲ್ಲಿ ಹೇಳಿ ಅಥವಾ ಚಿತ್ರವನ್ನು ಸ್ಪರ್ಶಿಸಿ.",
      section: "ಮುಖ್ಯ ದೂರು",
      options: {
        chest: { label: "ಎದೆ ನೋವು ಅಥವಾ ಭಾರ" },
        breath: { label: "ಉಸಿರಾಟದ ತೊಂದರೆ" },
        fever: { label: "ಜ್ವರ" },
        stomach: { label: "ಹೊಟ್ಟೆ ನೋವು" },
        joints: { label: "ಸಂಧಿ ಅಥವಾ ಬೆನ್ನು ನೋವು" },
        weak: { label: "ದೌರ್ಬಲ್ಯ ಅಥವಾ ತಲೆಸುತ್ತು" },
      },
    },
    onset: {
      prompt: "ಈ ಸಮಸ್ಯೆ ಯಾವಾಗಿನಿಂದ ಇದೆ?",
      section: "ಪ್ರಸ್ತುತ ಕಾಯಿಲೆಯ ಇತಿಹಾಸ",
      options: {
        today: { label: "ಇಂದು ಪ್ರಾರಂಭವಾಯಿತು" },
        week: { label: "ಕೆಲವು ದಿನಗಳಿಂದ" },
        month: { label: "ಸುಮಾರು ಒಂದು ತಿಂಗಳಿಂದ" },
        long: { label: "ಹಲವು ತಿಂಗಳು ಅಥವಾ ವರ್ಷಗಳಿಂದ" },
      },
    },
    severity: {
      prompt: "ಈಗ ಇದು ಎಷ್ಟು ತೀವ್ರವಾಗಿದೆ?",
      hint: "ನಿಮ್ಮ ಭಾವನೆಗೆ ಹೊಂದುವ ಮುಖವನ್ನು ಸ್ಪರ್ಶಿಸಿ.",
      section: "ಪ್ರಸ್ತುತ ಕಾಯಿಲೆಯ ಇತಿಹಾಸ",
      options: {
        mild: { label: "ಕಡಿಮೆ" },
        moderate: { label: "ಮಧ್ಯಮ" },
        severe: { label: "ತೀವ್ರ" },
      },
    },
  },
  gu: {
    chief_complaint: {
      prompt: "આજે તમને સૌથી વધુ શું તકલીફ છે?",
      hint: "તમારા શબ્દોમાં કહો અથવા ચિત્રને સ્પર્શ કરો.",
      section: "મુખ્ય ફરિયાદ",
      options: {
        chest: { label: "છાતીમાં દુખાવો અથવા ભારેપણું" },
        breath: { label: "શ્વાસ લેવામાં તકલીફ" },
        fever: { label: "તાવ" },
        stomach: { label: "પેટમાં દુખાવો" },
        joints: { label: "સાંધા અથવા કમરનો દુખાવો" },
        weak: { label: "નબળાઈ અથવા ચક્કર" },
      },
    },
    onset: {
      prompt: "આ તકલીફ તમને ક્યારથી છે?",
      section: "વર્તમાન બીમારીનો ઇતિહાસ",
      options: {
        today: { label: "આજે શરૂ થયું" },
        week: { label: "થોડા દિવસોથી" },
        month: { label: "લગભગ એક મહિનાથી" },
        long: { label: "ઘણા મહિનાઓ કે વર્ષોથી" },
      },
    },
    severity: {
      prompt: "હમણાં આ તકલીફ કેટલી ગંભીર છે?",
      hint: "તમારી લાગણી સાથે મેળ ખાતા ચહેરાને સ્પર્શ કરો.",
      section: "વર્તમાન બીમારીનો ઇતિહાસ",
      options: {
        mild: { label: "હળવી" },
        moderate: { label: "મધ્યમ" },
        severe: { label: "તીવ્ર" },
      },
    },
  },
};

export function localizeQuestion(question: Question, language: LanguageCode): Question {
  const localized = copy[language]?.[question.id];
  if (!localized) return question;
  return {
    ...question,
    prompt: localized.prompt ?? question.prompt,
    ...((localized.hint ?? question.hint) ? { hint: localized.hint ?? question.hint } : {}),
    section: localized.section ?? question.section,
    fieldLabel: localized.fieldLabel ?? question.fieldLabel,
    options: question.options.map((option) => ({
      ...option,
      label: localized.options?.[option.id]?.label ?? option.label,
      ...((localized.options?.[option.id]?.sublabel ?? option.sublabel)
        ? { sublabel: localized.options?.[option.id]?.sublabel ?? option.sublabel }
        : {}),
    })),
  };
}
