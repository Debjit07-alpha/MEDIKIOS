import type { LanguageCode, Question } from "./kiosk-data";
import { AYUSH_FLOW_QUESTION_IDS, QUESTIONS } from "./kiosk-data";

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
      fieldLabel: "शुरुआत और अवधि",
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
      fieldLabel: "गंभीरता",
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
      fieldLabel: "चेतावनी संकेत",
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
      fieldLabel: "चेतावनी संकेत",
      options: {
        bleeding: { label: "खून बहना बंद नहीं हो रहा" },
        unconscious: { label: "बेहोश हो गए" },
        speech: { label: "शरीर के एक तरफ अचानक कमजोरी" },
        none: { label: "इनमें से कुछ नहीं" },
      },
    },
    past_history: {
      prompt: "क्या किसी डॉक्टर ने आपको बताया है कि आपको इनमें से कोई बीमारी है?",
      section: "पिछली बीमारी",
      fieldLabel: "पिछली चिकित्सा और ऑपरेशन का इतिहास",
      options: {
        dm: { label: "शुगर (मधुमेह)" },
        htn: { label: "ब्लड प्रेशर" },
        asthma: { label: "दमा" },
        tb: { label: "पहले कभी टीबी" },
        surgery: { label: "पहले कोई ऑपरेशन" },
        none: { label: "इनमें से कुछ नहीं" },
      },
    },
    drug_history: {
      prompt: "क्या आप रोज कोई दवा लेते हैं?",
      section: "दवा और एलर्जी",
      fieldLabel: "दवा का इतिहास",
      options: {
        yes_regular: { label: "हां, रोज" },
        sometimes: { label: "केवल कभी-कभी" },
        no: { label: "कोई दवा नहीं" },
      },
    },
    allergy: {
      prompt: "क्या किसी दवा से कभी दाने, सूजन या सांस फूलने की तकलीफ हुई है?",
      section: "दवा और एलर्जी",
      fieldLabel: "एलर्जी का इतिहास",
      options: {
        penicillin: { label: "हां, दर्द या बुखार की दवा से" },
        other: { label: "हां, पर नाम नहीं पता" },
        no: { label: "नहीं, कभी नहीं" },
      },
    },
    family_history: {
      prompt: "आपके परिवार में क्या किसी को ये बीमारियां हैं?",
      section: "पारिवारिक इतिहास",
      fieldLabel: "पारिवारिक इतिहास",
      options: {
        dm: { label: "शुगर" },
        htn: { label: "ब्लड प्रेशर" },
        heart: { label: "दिल की बीमारी" },
        cancer: { label: "कैंसर" },
        none: { label: "किसी को नहीं" },
      },
    },
    personal_history: {
      prompt: "क्या आप तंबाकू, बीड़ी, सिगरेट या शराब लेते हैं?",
      section: "व्यक्तिगत इतिहास",
      fieldLabel: "व्यक्तिगत इतिहास",
      options: {
        tobacco: { label: "चबाने वाला तंबाकू" },
        smoke: { label: "बीड़ी या सिगरेट" },
        alcohol: { label: "शराब" },
        none: { label: "कुछ नहीं" },
      },
    },
    ros: {
      prompt: "पिछले एक महीने में क्या आपने इनमें से कुछ देखा है?",
      section: "अंगों की समीक्षा",
      fieldLabel: "अंगों की समीक्षा",
      options: {
        weight: { label: "वजन घटना" },
        appetite: { label: "भूख कम लगना" },
        urine: { label: "बार-बार पेशाब आना" },
        sleep: { label: "नींद ठीक न आना" },
        swelling: { label: "पैरों में सूजन" },
        none: { label: "ऐसा कुछ नहीं" },
      },
    },
    prior_investigations: {
      prompt: "क्या हाल में आपकी कोई खून जांच या स्कैन हुआ है?",
      section: "पिछली जांच",
      fieldLabel: "पिछली जांच",
      options: {
        blood: { label: "हां, खून जांच" },
        scan: { label: "हां, एक्स-रे या स्कैन" },
        no: { label: "कोई जांच नहीं हुई" },
      },
    },
    prakriti: {
      prompt: "बचपन से आपका शरीर प्रायः कैसा रहा है?",
      section: "प्रकृति",
      fieldLabel: "प्रकृति (शरीर की प्रकृति)",
      options: {
        vata: { label: "दुबला-पतला, त्वचा सूखी, जल्दी ठंड लगती है" },
        pitta: { label: "शरीर गर्म, पसीना आता है, जल्दी गुस्सा आता है" },
        kapha: { label: "शरीर भारी, शांत स्वभाव, धीमा" },
      },
    },
    vikriti: {
      prompt: "इन दिनों आपके शरीर में क्या बदलाव आया है?",
      section: "विकृति",
      fieldLabel: "विकृति (वर्तमान विकार)",
      options: {
        gas: { label: "गैस और फूलन" },
        burning: { label: "जलन या एसिडिटी" },
        heavy: { label: "भारीपन और खांसी" },
        pain: { label: "शरीर में दर्द और अकड़न" },
      },
    },
    sara: {
      prompt: "आपकी त्वचा, बाल और मांसपेशियों की ताकत कैसी है?",
      section: "दशविध परीक्षा",
      fieldLabel: "सार (धातु की गुणवत्ता)",
      options: {
        uttama: { label: "बहुत अच्छा, चमकदार" },
        madhyama: { label: "सामान्य" },
        avara: { label: "शुष्क और कमजोर" },
      },
    },
    samhanana: {
      prompt: "आपका शरीर किस प्रकार का है?",
      section: "दशविध परीक्षा",
      fieldLabel: "संहनन (शरीर की बनावट)",
      options: {
        firm: { label: "मजबूत और सुगठित" },
        medium: { label: "मध्यम" },
        loose: { label: "ढीला और कमजोर" },
      },
    },
    pramana: {
      prompt: "हाल ही में आपके शरीर का वजन बदला है?",
      section: "दशविध परीक्षा",
      fieldLabel: "प्रमाण (शरीर का माप)",
      options: {
        gain: { label: "मेरा वजन बढ़ा है" },
        same: { label: "पहले जैसा ही है" },
        loss: { label: "मेरा वजन घटा है" },
      },
    },
    satmya: {
      prompt: "कौन सा भोजन आपको सबसे अच्छा पचता/सूट करता है?",
      section: "दशविध परीक्षा",
      fieldLabel: "सात्म्य (अनुकूलता)",
      options: {
        all: { label: "सभी प्रकार का भोजन मुझे सूट करता है" },
        light: { label: "केवल हल्का, सादा भोजन" },
        spicy: { label: "मैं मसालेदार भोजन का आदी हूं" },
      },
    },
    sattva: {
      prompt: "आप चिंता और दर्द को कैसे संभालते हैं?",
      section: "दशविध परीक्षा",
      fieldLabel: "सत्त्व (मानसिक बल)",
      options: {
        strong: { label: "मैं शांत रहता हूं" },
        medium: { label: "कभी-कभी मैं विचलित हो जाता हूं" },
        weak: { label: "मैं जल्दी डर जाता हूं" },
      },
    },
    ahara_shakti: {
      prompt: "आपकी भूख और पाचन कैसा है?",
      section: "दशविध परीक्षा",
      fieldLabel: "आहार शक्ति (पाचन क्षमता)",
      options: {
        good: { label: "अच्छी भूख, खाना अच्छे से पचता है" },
        irregular: { label: "भूख कभी आती है कभी नहीं" },
        poor: { label: "बहुत कम भूख लगती है" },
      },
    },
    vyayama_shakti: {
      prompt: "बिना थके आप कितना चल पाते हैं?",
      section: "दशविध परीक्षा",
      fieldLabel: "व्यायाम शक्ति (शारीरिक क्षमता)",
      options: {
        high: { label: "एक किलोमीटर से अधिक" },
        medium: { label: "थोड़ी दूर ही" },
        low: { label: "घर में ही थक जाता हूं" },
      },
    },
    vaya: {
      prompt: "आप जीवन की किस अवस्था में हैं?",
      section: "दशविध परीक्षा",
      fieldLabel: "वय (आयु अवस्था)",
      options: {
        bala: { label: "युवा" },
        madhyama: { label: "मध्य आयु" },
        vriddha: { label: "वृद्ध" },
      },
    },
    nidana: {
      prompt: "आपके अनुसार इस समस्या की शुरुआत किस कारण से हुई?",
      section: "निदान और संप्राप्ति",
      fieldLabel: "निदान (प्रेरक कारण)",
      options: {
        food: { label: "गलत या भारी भोजन" },
        cold: { label: "ठंड या मौसम बदलना" },
        stress: { label: "चिंता या तनाव" },
        work: { label: "भारी शारीरिक काम" },
        sleep: { label: "देर रात तक जागना" },
      },
    },
    samprapti: {
      prompt: "समय के साथ यह समस्या किस तरह बढ़ी?",
      section: "निदान और संप्राप्ति",
      fieldLabel: "संप्राप्ति (रोग की प्रक्रिया)",
      options: {
        slow: { label: "धीरे-धीरे" },
        fast: { label: "बहुत तेजी से" },
        wave: { label: "आती-जाती रहती है" },
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
      fieldLabel: "শুরুর সময় ও সময়কাল",
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
      fieldLabel: "তীব্রতা",
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
      fieldLabel: "সতর্কীকরণ লক্ষণ",
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
      fieldLabel: "সতর্কীকরণ লক্ষণ",
      options: {
        bleeding: { label: "রক্তপাত বন্ধ হচ্ছে না" },
        unconscious: { label: "অজ্ঞান হয়ে গিয়েছিলেন" },
        speech: { label: "শরীরের এক পাশে হঠাৎ দুর্বলতা" },
        none: { label: "এর কোনোটিই নয়" },
      },
    },
    past_history: {
      prompt: "ডাক্তার কি আপনাকে বলেছেন যে আপনার এগুলোর কোনোটি আছে?",
      section: "আগের অসুস্থতা",
      fieldLabel: "আগের চিকিৎসা ও অপারেশনের ইতিহাস",
      options: {
        dm: { label: "সুগার (ডায়াবেটিস)" },
        htn: { label: "ব্লাড প্রেশার" },
        asthma: { label: "হাঁপানি" },
        tb: { label: "আগে কখনো টিবি" },
        surgery: { label: "আগে কোনো অপারেশন" },
        none: { label: "এর কোনোটিই নয়" },
      },
    },
    drug_history: {
      prompt: "আপনি কি প্রতিদিন কোনো ওষুধ খান?",
      section: "ওষুধ ও অ্যালার্জি",
      fieldLabel: "ওষুধের ইতিহাস",
      options: {
        yes_regular: { label: "হ্যাঁ, প্রতিদিন" },
        sometimes: { label: "শুধু মাঝে মাঝে" },
        no: { label: "কোনো ওষুধ নয়" },
      },
    },
    allergy: {
      prompt: "কোনো ওষুধে কি কখনো ফুসকুড়ি, ফোলা বা শ্বাসকষ্ট হয়েছে?",
      section: "ওষুধ ও অ্যালার্জি",
      fieldLabel: "অ্যালার্জির ইতিহাস",
      options: {
        penicillin: { label: "হ্যাঁ, ব্যথা বা জ্বরের ওষুধে" },
        other: { label: "হ্যাঁ, কিন্তু নাম জানি না" },
        no: { label: "না, কখনো নয়" },
      },
    },
    family_history: {
      prompt: "আপনার পরিবারে কি কারো এই অসুখগুলো আছে?",
      section: "পারিবারিক ইতিহাস",
      fieldLabel: "পারিবারিক ইতিহাস",
      options: {
        dm: { label: "সুগার" },
        htn: { label: "ব্লাড প্রেশার" },
        heart: { label: "হার্টের সমস্যা" },
        cancer: { label: "ক্যান্সার" },
        none: { label: "কারো নেই" },
      },
    },
    personal_history: {
      prompt: "আপনি কি তামাক, বিড়ি, সিগারেট বা মদ খান?",
      section: "ব্যক্তিগত ইতিহাস",
      fieldLabel: "ব্যক্তিগত ইতিহাস",
      options: {
        tobacco: { label: "চিবানোর তামাক" },
        smoke: { label: "বিড়ি বা সিগারেট" },
        alcohol: { label: "মদ" },
        none: { label: "কিছুই নয়" },
      },
    },
    ros: {
      prompt: "গত এক মাসে কি এগুলোর কোনোটি লক্ষ্য করেছেন?",
      section: "শরীরের পর্যালোচনা",
      fieldLabel: "শরীরের পর্যালোচনা",
      options: {
        weight: { label: "ওজন কমে যাওয়া" },
        appetite: { label: "ক্ষুধা কম লাগা" },
        urine: { label: "বারবার প্রস্রাব হওয়া" },
        sleep: { label: "ঘুম ঠিকমতো না হওয়া" },
        swelling: { label: "পায়ে ফোলা" },
        none: { label: "এরকম কিছুই নয়" },
      },
    },
    prior_investigations: {
      prompt: "সম্প্রতি কি আপনার কোনো রক্ত পরীক্ষা বা স্ক্যান হয়েছে?",
      section: "আগের পরীক্ষা",
      fieldLabel: "আগের পরীক্ষা",
      options: {
        blood: { label: "হ্যাঁ, রক্ত পরীক্ষা" },
        scan: { label: "হ্যাঁ, এক্স-রে বা স্ক্যান" },
        no: { label: "কোনো পরীক্ষা হয়নি" },
      },
    },
    prakriti: {
      prompt: "শৈশব থেকে আপনার শরীরের প্রকৃতি কেমন?",
      section: "প্রকৃতি",
      fieldLabel: "প্রকৃতি (শরীরের প্রকৃতি)",
      options: {
        vata: { label: "পাতলা শরীর, শুষ্ক ত্বক, ঠান্ডা লাগে" },
        pitta: { label: "শরীর গরম, ঘাম হয়, তাড়াতাড়ি রাগ হয়" },
        kapha: { label: "ভারী শরীর, শান্ত, ধীর" },
      },
    },
    vikriti: {
      prompt: "এসব দিনে আপনার শরীরে কী পরিবর্তন হয়েছে?",
      section: "বিকৃতি",
      fieldLabel: "বিকৃতি (বর্তমান অসাম্য)",
      options: {
        gas: { label: "গ্যাস ও পেট ফাঁপা" },
        burning: { label: "জ্বালা বা অম্লতা" },
        heavy: { label: "ভারী ভাব ও কাশি" },
        pain: { label: "শরীরে ব্যথা ও জড়তা" },
      },
    },
    sara: {
      prompt: "আপনার ত্বক, চুল ও পেশির শক্তি কেমন?",
      section: "দশবিধ পরীক্ষা",
      fieldLabel: "সার (ধাতুর গুণমান)",
      options: {
        uttama: { label: "খুব ভালো, উজ্জ্বল" },
        madhyama: { label: "স্বাভাবিক" },
        avara: { label: "শুষ্ক ও দুর্বল" },
      },
    },
    samhanana: {
      prompt: "আপনার শরীরের গড়ন কেমন?",
      section: "দশবিধ পরীক্ষা",
      fieldLabel: "সংহনন (শরীরের গঠন)",
      options: {
        firm: { label: "কঠিন ও শক্ত" },
        medium: { label: "মাঝারি" },
        loose: { label: "ঢিলে ও দুর্বল" },
      },
    },
    pramana: {
      prompt: "সম্প্রতি আপনার শরীরের ওজন বদলেছে কি?",
      section: "দশবিধ পরীক্ষা",
      fieldLabel: "প্রমাণ (শরীরের পরিমাপ)",
      options: {
        gain: { label: "আমার ওজন বেড়েছে" },
        same: { label: "আগের মতোই আছে" },
        loss: { label: "আমার ওজন কমেছে" },
      },
    },
    satmya: {
      prompt: "কোন খাবার আপনার সবচেয়ে ভালো হজম হয়?",
      section: "দশবিধ পরীক্ষা",
      fieldLabel: "সাত্ম্য (সহনশীলতা)",
      options: {
        all: { label: "সব ধরনের খাবারই সহ্য হয়" },
        light: { label: "শুধু হালকা, সহজ খাবার" },
        spicy: { label: "ঝাল খাবারে অভ্যস্ত" },
      },
    },
    sattva: {
      prompt: "আপনি দুশ্চিন্তা ও যন্ত্রণা কীভাবে সামলান?",
      section: "দশবিধ পরীক্ষা",
      fieldLabel: "সত্ত্ব (মানসিক শক্তি)",
      options: {
        strong: { label: "আমি শান্ত থাকি" },
        medium: { label: "মাঝেমধ্যে বিচলিত হই" },
        weak: { label: "আমি সহজেই ভয় পাই" },
      },
    },
    ahara_shakti: {
      prompt: "আপনার ক্ষুধা ও হজম কেমন?",
      section: "দশবিধ পরীক্ষা",
      fieldLabel: "আহার শক্তি (পাচন ক্ষমতা)",
      options: {
        good: { label: "ভালো ক্ষুধা, খাবার ভালো হজম হয়" },
        irregular: { label: "ক্ষুধা কখনো লাগে কখনো না" },
        poor: { label: "খুব কম ক্ষুধা লাগে" },
      },
    },
    vyayama_shakti: {
      prompt: "ক্লান্ত না হয়ে আপনি কতটা হাঁটতে পারেন?",
      section: "দশবিধ পরীক্ষা",
      fieldLabel: "ব্যায়াম শক্তি (শারীরিক ক্ষমতা)",
      options: {
        high: { label: "এক কিলোমিটারের বেশি" },
        medium: { label: "একটু দূরত্বই" },
        low: { label: "ঘরের ভেতরেই ক্লান্ত হয়ে যাই" },
      },
    },
    vaya: {
      prompt: "আপনি জীবনের কোন পর্যায়ে আছেন?",
      section: "দশবিধ পরীক্ষা",
      fieldLabel: "বয়স (আয়ু পর্যায়)",
      options: {
        bala: { label: "তরুণ" },
        madhyama: { label: "মধ্যবয়স" },
        vriddha: { label: "বৃদ্ধ" },
      },
    },
    nidana: {
      prompt: "আপনার মতে এই সমস্যা কেন শুরু হয়েছে?",
      section: "নিদান ও সম্প্রাপ্তি",
      fieldLabel: "নিদান (প্ররোচক কারণ)",
      options: {
        food: { label: "ভুল বা ভারী খাবার" },
        cold: { label: "ঠান্ডা বা ঋতু পরিবর্তন" },
        stress: { label: "দুশ্চিন্তা বা মানসিক চাপ" },
        work: { label: "ভারী শারীরিক পরিশ্রম" },
        sleep: { label: "রাতে দেরিতে ঘুমানো" },
      },
    },
    samprapti: {
      prompt: "সময়ের সঙ্গে এই সমস্যা কীভাবে বেড়েছে?",
      section: "নিদান ও সম্প্রাপ্তি",
      fieldLabel: "সম্প্রাপ্তি (রোগের গতি)",
      options: {
        slow: { label: "ধীরে ধীরে" },
        fast: { label: "খুব দ্রুত" },
        wave: { label: "আসে ও যায়" },
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
      fieldLabel: "सुरुवात आणि कालावधी",
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
      fieldLabel: "तीव्रता",
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
      hint: "जरूरत पडल्यास डॉक्टरांना लवकर बोलावण्यास हे मदत करेल.",
      section: "सध्याच्या आजाराचा इतिहास",
      fieldLabel: "धोक्याची लक्षणे",
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
      fieldLabel: "धोक्याची लक्षणे",
      options: {
        bleeding: { label: "रक्तस्राव थांबत नाही" },
        unconscious: { label: "बेशुद्ध पडणे" },
        speech: { label: "शरीराच्या एका बाजूला अचानक अशक्तपणा" },
        none: { label: "यापैकी काहीही नाही" },
      },
    },
    past_history: {
      prompt: "डॉक्टरांनी तुम्हाला सांगितले आहे का की तुम्हाला यांपैकी काही आजार आहे?",
      section: "मागील आजार",
      fieldLabel: "मागील उपचार व शस्त्रक्रियांचा इतिहास",
      options: {
        dm: { label: "साखर (मधुमेह)" },
        htn: { label: "रक्तदाब" },
        asthma: { label: "दमा" },
        tb: { label: "पूर्वी कधी टीबी" },
        surgery: { label: "पूर्वी कोणतेही ऑपरेशन" },
        none: { label: "यांपैकी काही नाही" },
      },
    },
    drug_history: {
      prompt: "तुम्ही रोज कोणतेही औषध घेता का?",
      section: "औषधे व ऍलर्जी",
      fieldLabel: "औषधांचा इतिहास",
      options: {
        yes_regular: { label: "होय, रोज" },
        sometimes: { label: "फक्त कधीकधी" },
        no: { label: "कोणतेही औषध नाही" },
      },
    },
    allergy: {
      prompt: "कोणत्याही औषधामुळे कधी पुरळ, सूज किंवा धाप लागली आहे का?",
      section: "औषधे व ऍलर्जी",
      fieldLabel: "ऍलर्जीचा इतिहास",
      options: {
        penicillin: { label: "होय, दुखणे किंवा तापाच्या औषधामुळे" },
        other: { label: "होय, पण नाव माहित नाही" },
        no: { label: "नाही, कधीही नाही" },
      },
    },
    family_history: {
      prompt: "तुमच्या कुटुंबात कोणाला हे आजार आहेत का?",
      section: "कौटुंबिक इतिहास",
      fieldLabel: "कौटुंबिक इतिहास",
      options: {
        dm: { label: "साखर" },
        htn: { label: "रक्तदाब" },
        heart: { label: "हृदयाचा त्रास" },
        cancer: { label: "कर्करोग" },
        none: { label: "कोणालाही नाही" },
      },
    },
    personal_history: {
      prompt: "तुम्ही तंबाखू, बिडी, सिगारेट किंवा दारू घेता का?",
      section: "वैयक्तिक इतिहास",
      fieldLabel: "वैयक्तिक इतिहास",
      options: {
        tobacco: { label: "चघळण्याचा तंबाखू" },
        smoke: { label: "बिडी किंवा सिगारेट" },
        alcohol: { label: "दारू" },
        none: { label: "काहीही नाही" },
      },
    },
    ros: {
      prompt: "गेल्या एक महिन्यात तुम्हाला यांपैकी काही जाणवले का?",
      section: "शरीराची तपासणी",
      fieldLabel: "शरीराची तपासणी",
      options: {
        weight: { label: "वजन कमी होणे" },
        appetite: { label: "भूक कमी लागणे" },
        urine: { label: "वारंवार लघवी होणे" },
        sleep: { label: "झोप नीट न लागणे" },
        swelling: { label: "पायांना सूज" },
        none: { label: "असे काहीही नाही" },
      },
    },
    prior_investigations: {
      prompt: "अलीकडे तुमची रक्ततपासणी किंवा स्कॅन झाला आहे का?",
      section: "मागील तपासण्या",
      fieldLabel: "मागील तपासण्या",
      options: {
        blood: { label: "होय, रक्ततपासणी" },
        scan: { label: "होय, एक्स-रे किंवा स्कॅन" },
        no: { label: "कोणतीही तपासणी झालेली नाही" },
      },
    },
    prakriti: {
      prompt: "लहानपणापासून तुमचा शरीरप्रकृती कशा प्रकारची आहे?",
      section: "प्रकृती",
      fieldLabel: "प्रकृती (शरीराची प्रकृती)",
      options: {
        vata: { label: "कृश शरीर, कोरडी त्वचा, लवकर थंड वाजते" },
        pitta: { label: "शरीर गरम, घाम येतो, लवकर राग येतो" },
        kapha: { label: "भरलेली काया, शांत, मंद" },
      },
    },
    vikriti: {
      prompt: "अलीकडे तुमच्या शरीरात काय बदल झाला आहे?",
      section: "विकृती",
      fieldLabel: "विकृती (सध्याचा विकार)",
      options: {
        gas: { label: "गॅस आणि फुगवणे" },
        burning: { label: "जळजळ किंवा आम्लपित्त" },
        heavy: { label: "जडपणा आणि खोकला" },
        pain: { label: "शरीरात दुखणे आणि कडकपणा" },
      },
    },
    sara: {
      prompt: "तुमची त्वचा, केस आणि स्नायूंची ताकद कशी आहे?",
      section: "दशविध परीक्षा",
      fieldLabel: "सार (धातूचा दर्जा)",
      options: {
        uttama: { label: "खूप चांगला, चमकदार" },
        madhyama: { label: "सामान्य" },
        avara: { label: "निस्तेज आणि कमकुवत" },
      },
    },
    samhanana: {
      prompt: "तुमची शरीरयष्टी कशी आहे?",
      section: "दशविध परीक्षा",
      fieldLabel: "संहनन (शरीराची घडी)",
      options: {
        firm: { label: "भक्कम आणि मजबूत" },
        medium: { label: "मध्यम" },
        loose: { label: "सैल आणि कमकुवत" },
      },
    },
    pramana: {
      prompt: "अलीकडे तुमच्या शरीराचे वजन बदलले आहे का?",
      section: "दशविध परीक्षा",
      fieldLabel: "प्रमाण (शरीराचे माप)",
      options: {
        gain: { label: "माझे वजन वाढले आहे" },
        same: { label: "पूर्वीइतकेच आहे" },
        loss: { label: "माझे वजन कमी झाले आहे" },
      },
    },
    satmya: {
      prompt: "कोणते अन्न तुम्हाला सर्वात जास्त चालते?",
      section: "दशविध परीक्षा",
      fieldLabel: "सात्म्य (अनुकूलता)",
      options: {
        all: { label: "सगळे अन्न मला चालते" },
        light: { label: "फक्त हलके, साधे अन्न" },
        spicy: { label: "मला मसालेदार अन्नाची सवय आहे" },
      },
    },
    sattva: {
      prompt: "तुम्ही चिंता आणि दुखणे कसे हाताळता?",
      section: "दशविध परीक्षा",
      fieldLabel: "सत्त्व (मानसिक बळ)",
      options: {
        strong: { label: "मी शांत राहतो" },
        medium: { label: "कधीकधी अस्वस्थ होतो" },
        weak: { label: "मी लवकर घाबरतो" },
      },
    },
    ahara_shakti: {
      prompt: "तुमची भूक आणि पचन कसे आहे?",
      section: "दशविध परीक्षा",
      fieldLabel: "आहारशक्ती (पचनक्षमता)",
      options: {
        good: { label: "चांगली भूक, अन्न व्यवस्थित पचते" },
        irregular: { label: "भूक कधी लागते कधी नाही" },
        poor: { label: "खूप कमी भूक लागते" },
      },
    },
    vyayama_shakti: {
      prompt: "थकल्याशिवाय तुम्ही किती चालू शकता?",
      section: "दशविध परीक्षा",
      fieldLabel: "व्यायामशक्ती (शारीरिक क्षमता)",
      options: {
        high: { label: "एक किलोमीटरपेक्षा अधिक" },
        medium: { label: "थोडे अंतरच" },
        low: { label: "घरातच थकतो" },
      },
    },
    vaya: {
      prompt: "तुम्ही आयुष्याच्या कोणत्या टप्प्यात आहात?",
      section: "दशविध परीक्षा",
      fieldLabel: "वय (आयु अवस्था)",
      options: {
        bala: { label: "तरुण" },
        madhyama: { label: "मध्यम वय" },
        vriddha: { label: "वृद्ध" },
      },
    },
    nidana: {
      prompt: "तुमच्या मते या समस्येला कशामुळे सुरुवात झाली?",
      section: "निदान व संप्राप्ती",
      fieldLabel: "निदान (प्रेरक घटक)",
      options: {
        food: { label: "चुकीचे किंवा जड अन्न" },
        cold: { label: "थंडी किंवा ऋतू बदल" },
        stress: { label: "काळजी किंवा तणाव" },
        work: { label: "जड शारीरिक काम" },
        sleep: { label: "रात्री उशिरा जागरण" },
      },
    },
    samprapti: {
      prompt: "कालांतराने ही समस्या कशी वाढली?",
      section: "निदान व संप्राप्ती",
      fieldLabel: "संप्राप्ती (रोगप्रक्रिया)",
      options: {
        slow: { label: "हळूहळू" },
        fast: { label: "खूप लवकर" },
        wave: { label: "येते-जाते" },
      },
    },
  },
  ta: {
    chief_complaint: {
      prompt: "இன்று உங்களை மிகவும் தொந்தரவு செய்வது என்ன?",
      hint: "உங்கள் சொந்த வார்த்தைகளில் சொல்லுங்கள் அல்லது படத்தைத் தொடுங்கள்.",
      section: "முக்கியப் புகார்",
      fieldLabel: "முக்கியப் புகார்",
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
      fieldLabel: "தொடக்கமும் கால அளவும்",
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
      fieldLabel: "தீவிரம்",
      hint: "உங்கள் உணர்வுடன் பொருந்தும் முகத்தைத் தொடுங்கள்.",
      section: "தற்போதைய நோய் வரலாறு",
      options: {
        mild: { label: "லேசானது" },
        moderate: { label: "மிதமானது" },
        severe: { label: "கடுமையானது" },
      },
    },
    chest_alarm: {
      prompt: "நெஞ்சுப் பிரச்சனையுடன் இவற்றில் ஏதேனும் இப்போது உள்ளதா?",
      hint: "தேவைப்பட்டால் மருத்துவரை விரைவாக அழைக்க இது உதவும்.",
      section: "தற்போதைய நோய் வரலாறு",
      fieldLabel: "எச்சரிக்கை அறிகுறிகள்",
      options: {
        arm: { label: "இடது கை அல்லது தாடை வரை பரவும் வலி" },
        sweat: { label: "குளிர் வியர்வை" },
        faint: { label: "மயக்கம் வருவது போன்ற உணர்வு" },
        none: { label: "இவை எதுவும் இல்லை" },
      },
    },
    general_alarm: {
      prompt: "இன்று இந்த கடுமையான அறிகுறிகள் ஏதேனும் உள்ளதா?",
      section: "தற்போதைய நோய் வரலாறு",
      fieldLabel: "எச்சரிக்கை அறிகுறிகள்",
      options: {
        bleeding: { label: "நிற்காத இரத்தப்போக்கு" },
        unconscious: { label: "மயக்கம் அடைந்தீர்கள்" },
        speech: { label: "உடலின் ஒரு பக்கம் திடீரென பலவீனம்" },
        none: { label: "இவை எதுவும் இல்லை" },
      },
    },
    past_history: {
      prompt: "இவற்றில் ஏதேனும் நோய் உங்களுக்கு இருப்பதாக மருத்துவர் கூறியுள்ளாரா?",
      section: "முந்தைய நோய்",
      fieldLabel: "முந்தைய மருத்துவ மற்றும் அறுவை சிகிச்சை வரலாறு",
      options: {
        dm: { label: "சர்க்கரை (நீரிழிவு)" },
        htn: { label: "இரத்த அழுத்தம்" },
        asthma: { label: "ஆஸ்துமா" },
        tb: { label: "முன்பு காசநோய்" },
        surgery: { label: "முன்பு அறுவை சிகிச்சை" },
        none: { label: "இவற்றில் எதுவும் இல்லை" },
      },
    },
    drug_history: {
      prompt: "தினமும் ஏதேனும் மருந்து சாப்பிடுகிறீர்களா?",
      section: "மருந்து மற்றும் ஒவ்வாமை",
      fieldLabel: "மருந்து வரலாறு",
      options: {
        yes_regular: { label: "ஆம், தினமும்" },
        sometimes: { label: "எப்போதாவது மட்டும்" },
        no: { label: "மருந்து இல்லை" },
      },
    },
    allergy: {
      prompt: "ஏதேனும் மருந்தால் தடிப்பு, வீக்கம் அல்லது மூச்சுத் திணறல் ஏற்பட்டதா?",
      section: "மருந்து மற்றும் ஒவ்வாமை",
      fieldLabel: "ஒவ்வாமை வரலாறு",
      options: {
        penicillin: { label: "ஆம், வலி அல்லது காய்ச்சல் மருந்தால்" },
        other: { label: "ஆம், ஆனால் பெயர் தெரியாது" },
        no: { label: "இல்லை, ஒருபோதும் இல்லை" },
      },
    },
    family_history: {
      prompt: "உங்கள் குடும்பத்தில் யாருக்கேனும் இந்த நோய்கள் உள்ளனவா?",
      section: "குடும்ப வரலாறு",
      fieldLabel: "குடும்ப வரலாறு",
      options: {
        dm: { label: "சர்க்கரை" },
        htn: { label: "இரத்த அழுத்தம்" },
        heart: { label: "இதய பிரச்சனை" },
        cancer: { label: "புற்றுநோய்" },
        none: { label: "யாருக்கும் இல்லை" },
      },
    },
    personal_history: {
      prompt: "புகையிலை, பீடி, சிகரெட் அல்லது மது அருந்துகிறீர்களா?",
      section: "தனிப்பட்ட வரலாறு",
      fieldLabel: "தனிப்பட்ட வரலாறு",
      options: {
        tobacco: { label: "மெல்லும் புகையிலை" },
        smoke: { label: "பீடி அல்லது சிகரெட்" },
        alcohol: { label: "மது" },
        none: { label: "எதுவும் இல்லை" },
      },
    },
    ros: {
      prompt: "கடந்த ஒரு மாதத்தில் இவற்றில் ஏதேனும் கவனித்தீர்களா?",
      section: "உடல் பரிசோதனை",
      fieldLabel: "உடல் பரிசோதனை",
      options: {
        weight: { label: "எடை குறைதல்" },
        appetite: { label: "பசி குறைதல்" },
        urine: { label: "அடிக்கடி சிறுநீர்" },
        sleep: { label: "தூக்கமின்மை" },
        swelling: { label: "கால்களில் வீக்கம்" },
        none: { label: "இப்படி எதுவும் இல்லை" },
      },
    },
    prior_investigations: {
      prompt: "சமீபத்தில் இரத்த பரிசோதனை அல்லது ஸ்கேன் செய்தீர்களா?",
      section: "முந்தைய பரிசோதனைகள்",
      fieldLabel: "முந்தைய பரிசோதனைகள்",
      options: {
        blood: { label: "ஆம், இரத்த பரிசோதனை" },
        scan: { label: "ஆம், எக்ஸ்-ரே அல்லது ஸ்கேன்" },
        no: { label: "பரிசோதனை செய்யவில்லை" },
      },
    },
    prakriti: {
      prompt: "சிறுவயது முதல் உங்கள் உடல் இயல்பு எப்படி இருந்தது?",
      section: "பிரகிருதி",
      fieldLabel: "பிரகிருதி (உடல் இயல்பு)",
      options: {
        vata: { label: "மெலிதான உடல், வறண்ட தோல், சீக்கிரம் குளிர்கிறது" },
        pitta: { label: "சூடான உடல், வியர்வை, சீக்கிரம் கோபம்" },
        kapha: { label: "கருத்த உடல், அமைதி, மெதுவான" },
      },
    },
    vikriti: {
      prompt: "இந்த நாட்களில் உங்கள் உடலில் என்ன மாற்றம் ஏற்பட்டுள்ளது?",
      section: "விகிருதி",
      fieldLabel: "விகிருதி (தற்போதைய நிலை)",
      options: {
        gas: { label: "வாயு மற்றும் வீக்கம்" },
        burning: { label: "எரிச்சல் அல்லது அமிலத்தன்மை" },
        heavy: { label: "கனம் மற்றும் இருமல்" },
        pain: { label: "உடல் வலி மற்றும் விறைப்பு" },
      },
    },
    sara: {
      prompt: "உங்கள் தோல், முடி மற்றும் தசைவலு எப்படி உள்ளது?",
      section: "தசவித பரீட்சை",
      fieldLabel: "சாரம் (திசுத் தரம்)",
      options: {
        uttama: { label: "மிக நன்றாக, ஒளிரும்" },
        madhyama: { label: "சாதாரணம்" },
        avara: { label: "மங்கலாகவும் பலவீனமாகவும்" },
      },
    },
    samhanana: {
      prompt: "உங்கள் உடல் அமைப்பு எப்படி உள்ளது?",
      section: "தசவித பரீட்சை",
      fieldLabel: "சம்ஹனனம் (உடல் அமைப்பு)",
      options: {
        firm: { label: "உறுதியும் வலிமையும்" },
        medium: { label: "நடுத்தரம்" },
        loose: { label: "தளர்வாகவும் பலவீனமாகவும்" },
      },
    },
    pramana: {
      prompt: "சமீபத்தில் உங்கள் உடல் எடை மாறியதா?",
      section: "தசவித பரீட்சை",
      fieldLabel: "பிரமாணம் (உடல் அளவு)",
      options: {
        gain: { label: "என் எடை அதிகரித்துள்ளது" },
        same: { label: "முன்பு போலவே உள்ளது" },
        loss: { label: "என் எடை குறைந்துள்ளது" },
      },
    },
    satmya: {
      prompt: "எந்த உணவு உங்களுக்கு மிகவும் ஏற்புடையது?",
      section: "தசவித பரீட்சை",
      fieldLabel: "சாத்மியம் (பழக்கம்)",
      options: {
        all: { label: "எல்லா உணவும் எனக்கு ஒத்துவரும்" },
        light: { label: "லேசான, எளிய உணவு மட்டுமே" },
        spicy: { label: "காரமான உணவுக்கு பழக்கமானதே" },
      },
    },
    sattva: {
      prompt: "கவலையையும் வலியையும் எப்படி சமாளிக்கிறீர்கள்?",
      section: "தசவித பரீட்சை",
      fieldLabel: "சத்துவம் (மன வலிமை)",
      options: {
        strong: { label: "நான் அமைதியாக இருக்கிறேன்" },
        medium: { label: "சில நேரம் கலங்குகிறேன்" },
        weak: { label: "எளிதில் பயந்துவிடுகிறேன்" },
      },
    },
    ahara_shakti: {
      prompt: "உங்கள் பசி மற்றும் செரிமானம் எப்படி உள்ளது?",
      section: "தசவித பரீட்சை",
      fieldLabel: "ஆகார சக்தி (செரிமானம்)",
      options: {
        good: { label: "நல்ல பசி, உணவு நன்றாகச் செரிக்கிறது" },
        irregular: { label: "பசி சில நேரம் மட்டுமே" },
        poor: { label: "மிகக் குறைந்த பசி" },
      },
    },
    vyayama_shakti: {
      prompt: "சோர்வடையாமல் எவ்வளவு தூரம் நடக்க முடியும்?",
      section: "தசவித பரீட்சை",
      fieldLabel: "வ்யாயாம சக்தி (உடல் வலிமை)",
      options: {
        high: { label: "ஒரு கிலோமீட்டருக்கும் மேல்" },
        medium: { label: "சிறிது தூரம் மட்டுமே" },
        low: { label: "வீட்டுக்குள்ளேயே சோர்ந்து விடுவேன்" },
      },
    },
    vaya: {
      prompt: "எந்த வயதுப் பருவத்தில் இருக்கிறீர்கள்?",
      section: "தசவித பரீட்சை",
      fieldLabel: "வயது (வயதுப் பருவம்)",
      options: {
        bala: { label: "இளமை" },
        madhyama: { label: "நடு வயது" },
        vriddha: { label: "முதுமை" },
      },
    },
    nidana: {
      prompt: "உங்கள் கருத்தில் இந்தப் பிரச்சனை எதனால் தொடங்கியது?",
      section: "நிதானம் & சம்ப்ராப்தி",
      fieldLabel: "நிதானம் (காரண காரியங்கள்)",
      options: {
        food: { label: "தவறான அல்லது கனமான உணவு" },
        cold: { label: "குளிர் அல்லது பருவமாற்றம்" },
        stress: { label: "கவலை அல்லது மன அழுத்தம்" },
        work: { label: "கடின உடல் வேலை" },
        sleep: { label: "இரவில் தாமதமாக தூங்குவது" },
      },
    },
    samprapti: {
      prompt: "காலப்போக்கில் இந்தப் பிரச்சனை எப்படி வளர்ந்தது?",
      section: "நிதானம் & சம்ப்ராப்தி",
      fieldLabel: "சம்ப்ராப்தி (நோய் பரவும் முறை)",
      options: {
        slow: { label: "மெதுவாக, படிப்படியாக" },
        fast: { label: "மிக வேகமாக" },
        wave: { label: "வந்து வந்து போகும்" },
      },
    },
  },
  te: {
    chief_complaint: {
      prompt: "ఈ రోజు మిమ్మల్ని ఎక్కువగా బాధిస్తున్నది ఏమిటి?",
      hint: "మీ మాటల్లో చెప్పండి లేదా చిత్రాన్ని తాకండి.",
      section: "ప్రధాన సమస్య",
      fieldLabel: "ప్రధాన సమస్య",
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
      fieldLabel: "ఆరంభం మరియు వ్యవధి",
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
      fieldLabel: "తీవ్రత",
      hint: "మీ అనుభూతికి సరిపోయే ముఖాన్ని తాకండి.",
      section: "ప్రస్తుత అనారోగ్య చరిత్ర",
      options: {
        mild: { label: "తక్కువ" },
        moderate: { label: "మధ్యస్థం" },
        severe: { label: "తీవ్రం" },
      },
    },
    chest_alarm: {
      prompt: "ఛాతీ సమస్యతో పాటు వీటిలో ఏదైనా ఇప్పుడు ఉందా?",
      hint: "అవసరమైతే డాక్టర్‌ను వెంటనే పిలవడానికి ఇది సహాయపడుతుంది.",
      section: "ప్రస్తుత అనారోగ్య చరిత్ర",
      fieldLabel: "హెచ్చరిక సంకేతాలు",
      options: {
        arm: { label: "ఎడమ చేయి లేదా దవడ వరకు వెళ్ళే నొప్పి" },
        sweat: { label: "చల్లటి చెమట" },
        faint: { label: "స్పృహ తప్పినట్లు అనిపించడం" },
        none: { label: "వీటిలో ఏదీ లేదు" },
      },
    },
    general_alarm: {
      prompt: "ఈ రోజు ఈ తీవ్రమైన లక్షణాలు ఏవైనా ఉన్నాయా?",
      section: "ప్రస్తుత అనారోగ్య చరిత్ర",
      fieldLabel: "హెచ్చరిక సంకేతాలు",
      options: {
        bleeding: { label: "ఆగని రక్తస్రావం" },
        unconscious: { label: "స్పృహ తప్పారు" },
        speech: { label: "శరీరం ఒక వైపు అకస్మాత్తుగా బలహీనత" },
        none: { label: "వీటిలో ఏదీ లేదు" },
      },
    },
    past_history: {
      prompt: "వీటిలో ఏదైనా జబ్బు మీకు ఉందని డాక్టర్ చెప్పారా?",
      section: "గత జబ్బులు",
      fieldLabel: "గత వైద్య మరియు ఆపరేషన్ల చరిత్ర",
      options: {
        dm: { label: "షుగర్ (మధుమేహం)" },
        htn: { label: "బీపీ" },
        asthma: { label: "ఆస్తమా" },
        tb: { label: "గతంలో టీబీ" },
        surgery: { label: "గతంలో ఏదైనా ఆపరేషన్" },
        none: { label: "వీటిలో ఏదీ లేదు" },
      },
    },
    drug_history: {
      prompt: "మీరు ప్రతిరోజూ ఏదైనా మందు వాడుతున్నారా?",
      section: "మందులు & అలెర్జీ",
      fieldLabel: "మందుల చరిత్ర",
      options: {
        yes_regular: { label: "అవును, ప్రతిరోజూ" },
        sometimes: { label: "అప్పుడప్పుడు మాత్రమే" },
        no: { label: "మందులు లేవు" },
      },
    },
    allergy: {
      prompt: "ఏదైనా మందు వల్ల దద్దుర్లు, వాపు లేదా ఆయాసం వచ్చిందా?",
      section: "మందులు & అలెర్జీ",
      fieldLabel: "అలెర్జీ చరిత్ర",
      options: {
        penicillin: { label: "అవును, నొప్పి లేదా జ్వరం మందు వల్ల" },
        other: { label: "అవును, కానీ పేరు తెలియదు" },
        no: { label: "లేదు, ఎప్పుడూ లేదు" },
      },
    },
    family_history: {
      prompt: "మీ కుటుంబంలో ఎవరికైనా ఈ జబ్బులు ఉన్నాయా?",
      section: "కుటుంబ చరిత్ర",
      fieldLabel: "కుటుంబ చరిత్ర",
      options: {
        dm: { label: "షుగర్" },
        htn: { label: "బీపీ" },
        heart: { label: "గుండె సమస్య" },
        cancer: { label: "క్యాన్సర్" },
        none: { label: "ఎవరికీ లేదు" },
      },
    },
    personal_history: {
      prompt: "మీరు పొగాకు, బీడీ, సిగరెట్ లేదా మద్యం వాడుతున్నారా?",
      section: "వ్యక్తిగత చరిత్ర",
      fieldLabel: "వ్యక్తిగత చరిత్ర",
      options: {
        tobacco: { label: "నమిలే పొగాకు" },
        smoke: { label: "బీడీ లేదా సిగరెట్" },
        alcohol: { label: "మద్యం" },
        none: { label: "ఏదీ లేదు" },
      },
    },
    ros: {
      prompt: "గత నెలలో వీటిలో ఏదైనా గమనించారా?",
      section: "శరీర పరిశీలన",
      fieldLabel: "శరీర పరిశీలన",
      options: {
        weight: { label: "బరువు తగ్గడం" },
        appetite: { label: "ఆకలి తగ్గడం" },
        urine: { label: "తరచూ మూత్రం" },
        sleep: { label: "సరిగా నిద్రపట్టకపోవడం" },
        swelling: { label: "కాళ్లలో వాపు" },
        none: { label: "ఇలాంటిదేమీ లేదు" },
      },
    },
    prior_investigations: {
      prompt: "ఇటీవల రక్త పరీక్ష లేదా స్కాన్ చేయించారా?",
      section: "గత పరీక్షలు",
      fieldLabel: "గత పరీక్షలు",
      options: {
        blood: { label: "అవును, రక్త పరీక్ష" },
        scan: { label: "అవును, ఎక్స్-రే లేదా స్కాన్" },
        no: { label: "పరీక్ష చేయించలేదు" },
      },
    },
    prakriti: {
      prompt: "చిన్నప్పటి నుంచి మీ శరీరం ఎక్కువగా ఎలా ఉంటుంది?",
      section: "ప్రకృతి",
      fieldLabel: "ప్రకృతి (శరీర స్వభావం)",
      options: {
        vata: { label: "సన్నని శరీరం, పొడి చర్మం, త్వరగా చలి వేస్తుంది" },
        pitta: { label: "వెచ్చని శరీరం, చెమట, త్వరగా కోపం" },
        kapha: { label: "పెద్ద శరీరం, ప్రశాంతత, నిదానం" },
      },
    },
    vikriti: {
      prompt: "ఈ మధ్య మీ శరీరంలో ఏం మారింది?",
      section: "వికృతి",
      fieldLabel: "వికృతి (ప్రస్తుత అసమతుల్యత)",
      options: {
        gas: { label: "గ్యాస్ మరియు ఉబ్బరం" },
        burning: { label: "మంట లేదా ఆమ్లత్వం" },
        heavy: { label: "బరువు మరియు దగ్గు" },
        pain: { label: "శరీర నొప్పి మరియు బిగుతు" },
      },
    },
    sara: {
      prompt: "మీ చర్మం, జుట్టు మరియు కండరాల బలం ఎలా ఉంది?",
      section: "దశవిధ పరీక్ష",
      fieldLabel: "సార (కణజాల నాణ్యత)",
      options: {
        uttama: { label: "చాలా బాగా, ప్రకాశవంతం" },
        madhyama: { label: "సాధారణం" },
        avara: { label: "మందకొడిగా మరియు బలహీనంగా" },
      },
    },
    samhanana: {
      prompt: "మీ శరీర నిర్మాణం ఎలా ఉంది?",
      section: "దశవిధ పరీక్ష",
      fieldLabel: "సంహనన (శరీర నిర్మాణం)",
      options: {
        firm: { label: "గట్టిగా మరియు బలంగా" },
        medium: { label: "మధ్యస్థం" },
        loose: { label: "సడలుగా మరియు బలహీనంగా" },
      },
    },
    pramana: {
      prompt: "ఇటీవల మీ శరీర బరువు మారిందా?",
      section: "దశవిధ పరీక్ష",
      fieldLabel: "ప్రమాణ (శరీర నిష్పత్తి)",
      options: {
        gain: { label: "నా బరువు పెరిగింది" },
        same: { label: "మునుపటిలాగే ఉంది" },
        loss: { label: "నా బరువు తగ్గింది" },
      },
    },
    satmya: {
      prompt: "ఏ ఆహారం మీకు బాగా సరిపోతుంది?",
      section: "దశవిధ పరీక్ష",
      fieldLabel: "సాత్మ్య (అలవాటు)",
      options: {
        all: { label: "అన్ని రకాల ఆహారం నాకు సరిపోతుంది" },
        light: { label: "తేలికపాటి, సాధారణ ఆహారం మాత్రమే" },
        spicy: { label: "కారం ఆహారానికి అలవాటు పడ్డాను" },
      },
    },
    sattva: {
      prompt: "ఆందోళన మరియు నొప్పిని ఎలా ఎదుర్కొంటారు?",
      section: "దశవిధ పరీక్ష",
      fieldLabel: "సత్త్వ (మానసిక బలం)",
      options: {
        strong: { label: "నేను ప్రశాంతంగా ఉంటాను" },
        medium: { label: "కొన్నిసార్లు కలవరపడతాను" },
        weak: { label: "త్వరగా భయపడతాను" },
      },
    },
    ahara_shakti: {
      prompt: "మీ ఆకలి మరియు జీర్ణశక్తి ఎలా ఉంది?",
      section: "దశవిధ పరీక్ష",
      fieldLabel: "ఆహార శక్తి (జీర్ణ సామర్థ్యం)",
      options: {
        good: { label: "మంచి ఆకలి, ఆహారం బాగా జీర్ణమవుతుంది" },
        irregular: { label: "ఆకలి వస్తుంది, పోతుంది" },
        poor: { label: "చాలా తక్కువ ఆకలి" },
      },
    },
    vyayama_shakti: {
      prompt: "అలసిపోకుండా ఎంత దూరం నడవగలరు?",
      section: "దశవిధ పరీక్ష",
      fieldLabel: "వ్యాయామ శక్తి (శారీరక సామర్థ్యం)",
      options: {
        high: { label: "ఒక కిలోమీటరు కంటే ఎక్కువ" },
        medium: { label: "కాస్త దూరం మాత్రమే" },
        low: { label: "ఇంట్లోనే అలసిపోతాను" },
      },
    },
    vaya: {
      prompt: "మీరు జీవితంలో ఏ దశలో ఉన్నారు?",
      section: "దశవిధ పరీక్ష",
      fieldLabel: "వయసు (వయసు దశ)",
      options: {
        bala: { label: "యువకులు" },
        madhyama: { label: "మధ్య వయసు" },
        vriddha: { label: "వృద్ధులు" },
      },
    },
    nidana: {
      prompt: "మీ అభిప్రాయం ప్రకారం ఈ సమస్య ఎందుకు మొదలైంది?",
      section: "నిదానం & సంప్రాప్తి",
      fieldLabel: "నిదానం (కారణ అంశాలు)",
      options: {
        food: { label: "తప్పుడు లేదా బరువైన ఆహారం" },
        cold: { label: "చలి లేదా ఋతువు మార్పు" },
        stress: { label: "ఆందోళన లేదా ఒత్తిడి" },
        work: { label: "బరువైన శారీరక పని" },
        sleep: { label: "రాత్రి ఆలస్యంగా నిద్ర" },
      },
    },
    samprapti: {
      prompt: "కాలక్రమేణా ఈ సమస్య ఎలా పెరిగింది?",
      section: "నిదానం & సంప్రాప్తి",
      fieldLabel: "సంప్రాప్తి (వ్యాధి ప్రక్రియ)",
      options: {
        slow: { label: "నెమ్మదిగా, కొద్దిగా" },
        fast: { label: "చాలా వేగంగా" },
        wave: { label: "వస్తూ పోతూ ఉంటుంది" },
      },
    },
  },
  kn: {
    chief_complaint: {
      prompt: "ಇಂದು ನಿಮಗೆ ಹೆಚ್ಚು ತೊಂದರೆ ನೀಡುತ್ತಿರುವುದು ಏನು?",
      hint: "ನಿಮ್ಮ ಮಾತಿನಲ್ಲಿ ಹೇಳಿ ಅಥವಾ ಚಿತ್ರವನ್ನು ಸ್ಪರ್ಶಿಸಿ.",
      section: "ಮುಖ್ಯ ದೂರು",
      fieldLabel: "ಮುಖ್ಯ ದೂರು",
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
      fieldLabel: "ಆರಂಭ ಮತ್ತು ಅವಧಿ",
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
      fieldLabel: "ತೀವ್ರತೆ",
      hint: "ನಿಮ್ಮ ಭಾವನೆಗೆ ಹೊಂದುವ ಮುಖವನ್ನು ಸ್ಪರ್ಶಿಸಿ.",
      section: "ಪ್ರಸ್ತುತ ಕಾಯಿಲೆಯ ಇತಿಹಾಸ",
      options: {
        mild: { label: "ಕಡಿಮೆ" },
        moderate: { label: "ಮಧ್ಯಮ" },
        severe: { label: "ತೀವ್ರ" },
      },
    },
    chest_alarm: {
      prompt: "ಎದೆಯ ಸಮಸ್ಯೆಯ ಜೊತೆ ಇವುಗಳಲ್ಲಿ ಯಾವುದಾದರೂ ಈಗ ಇದೆಯೇ?",
      hint: "ಅಗತ್ಯವಾದರೆ ವೈದ್ಯರನ್ನು ತಕ್ಷಣ ಕರೆಯಲು ಇದು ಸಹಾಯ ಮಾಡುತ್ತದೆ.",
      section: "ಪ್ರಸ್ತುತ ಕಾಯಿಲೆಯ ಇತಿಹಾಸ",
      fieldLabel: "ಎಚ್ಚರಿಕೆ ಲಕ್ಷಣಗಳು",
      options: {
        arm: { label: "ಎಡಗೈ ಅಥವಾ ದವಡೆಗೆ ಹರಡುವ ನೋವು" },
        sweat: { label: "ತಣ್ಣನೆಯ ಬೆವರು" },
        faint: { label: "ಮೂರ್ಛೆ ಬರುವ ಭಾವನೆ" },
        none: { label: "ಇವುಗಳಲ್ಲಿ ಯಾವುದೂ ಇಲ್ಲ" },
      },
    },
    general_alarm: {
      prompt: "ಇಂದು ಈ ಗಂಭೀರ ಲಕ್ಷಣಗಳಲ್ಲಿ ಯಾವುದಾದರೂ ಇದೆಯೇ?",
      section: "ಪ್ರಸ್ತುತ ಕಾಯಿಲೆಯ ಇತಿಹಾಸ",
      fieldLabel: "ಎಚ್ಚರಿಕೆ ಲಕ್ಷಣಗಳು",
      options: {
        bleeding: { label: "ನಿಲ್ಲದ ರಕ್ತಸ್ರಾವ" },
        unconscious: { label: "ಪ್ರಜ್ಞೆ ತಪ್ಪಿದ್ದೀರಿ" },
        speech: { label: "ದೇಹದ ಒಂದು ಬದಿಯಲ್ಲಿ ಹಠಾತ್ ದೌರ್ಬಲ್ಯ" },
        none: { label: "ಇವುಗಳಲ್ಲಿ ಯಾವುದೂ ಇಲ್ಲ" },
      },
    },
    past_history: {
      prompt: "ಇವುಗಳಲ್ಲಿ ಯಾವುದಾದರೂ ಕಾಯಿಲೆ ನಿಮಗಿದೆ ಎಂದು ವೈದ್ಯರು ಹೇಳಿದ್ದಾರೆಯೇ?",
      section: "ಹಿಂದಿನ ಕಾಯಿಲೆ",
      fieldLabel: "ಹಿಂದಿನ ವೈದ್ಯಕೀಯ ಮತ್ತು ಶಸ್ತ್ರಚಿಕಿತ್ಸಾ ಇತಿಹಾಸ",
      options: {
        dm: { label: "ಸಕ್ಕರೆ (ಮಧುಮೇಹ)" },
        htn: { label: "ಬಿಪಿ" },
        asthma: { label: "ಅಸ್ತಮಾ" },
        tb: { label: "ಹಿಂದೆ ಟಿಬಿ" },
        surgery: { label: "ಹಿಂದೆ ಯಾವುದಾದರೂ ಆಪರೇಷನ್" },
        none: { label: "ಇವುಗಳಲ್ಲಿ ಯಾವುದೂ ಇಲ್ಲ" },
      },
    },
    drug_history: {
      prompt: "ನೀವು ಪ್ರತಿದಿನ ಯಾವುದಾದರೂ ಔಷಧಿ ತೆಗೆದುಕೊಳ್ಳುತ್ತೀರಾ?",
      section: "ಔಷಧಿ ಮತ್ತು ಅಲರ್ಜಿ",
      fieldLabel: "ಔಷಧಿ ಇತಿಹಾಸ",
      options: {
        yes_regular: { label: "ಹೌದು, ಪ್ರತಿದಿನ" },
        sometimes: { label: "ಎಂದಾದರೂ ಮಾತ್ರ" },
        no: { label: "ಔಷಧಿ ಇಲ್ಲ" },
      },
    },
    allergy: {
      prompt: "ಯಾವುದಾದರೂ ಔಷಧಿಯಿಂದ ದದ್ದು, ಊತ ಅಥವಾ ಉಸಿರಾಟದ ತೊಂದರೆ ಆಗಿದೆಯೇ?",
      section: "ಔಷಧಿ ಮತ್ತು ಅಲರ್ಜಿ",
      fieldLabel: "ಅಲರ್ಜಿ ಇತಿಹಾಸ",
      options: {
        penicillin: { label: "ಹೌದು, ನೋವು ಅಥವಾ ಜ್ವರದ ಔಷಧಿಯಿಂದ" },
        other: { label: "ಹೌದು, ಆದರೆ ಹೆಸರು ಗೊತ್ತಿಲ್ಲ" },
        no: { label: "ಇಲ್ಲ, ಎಂದಿಗೂ ಇಲ್ಲ" },
      },
    },
    family_history: {
      prompt: "ನಿಮ್ಮ ಕುಟುಂಬದಲ್ಲಿ ಯಾರಿಗಾದರೂ ಈ ಕಾಯಿಲೆಗಳಿವೆಯೇ?",
      section: "ಕುಟುಂಬ ಇತಿಹಾಸ",
      fieldLabel: "ಕುಟುಂಬ ಇತಿಹಾಸ",
      options: {
        dm: { label: "ಸಕ್ಕರೆ" },
        htn: { label: "ಬಿಪಿ" },
        heart: { label: "ಹೃದಯ ಸಮಸ್ಯೆ" },
        cancer: { label: "ಕ್ಯಾನ್ಸರ್" },
        none: { label: "ಯಾರಿಗೂ ಇಲ್ಲ" },
      },
    },
    personal_history: {
      prompt: "ನೀವು ತಂಬಾಕು, ಬೀಡಿ, ಸಿಗರೇಟು ಅಥವಾ ಮದ್ಯ ಸೇವಿಸುತ್ತೀರಾ?",
      section: "ವೈಯಕ್ತಿಕ ಇತಿಹಾಸ",
      fieldLabel: "ವೈಯಕ್ತಿಕ ಇತಿಹಾಸ",
      options: {
        tobacco: { label: "ಜಗಿಯುವ ತಂಬಾಕು" },
        smoke: { label: "ಬೀಡಿ ಅಥವಾ ಸಿಗರೇಟು" },
        alcohol: { label: "ಮದ್ಯ" },
        none: { label: "ಏನೂ ಇಲ್ಲ" },
      },
    },
    ros: {
      prompt: "ಕಳೆದ ಒಂದು ತಿಂಗಳಲ್ಲಿ ಇವುಗಳಲ್ಲಿ ಏನಾದರೂ ಗಮನಿಸಿದ್ದೀರಾ?",
      section: "ದೇಹ ಪರಿಶೀಲನೆ",
      fieldLabel: "ದೇಹ ಪರಿಶೀಲನೆ",
      options: {
        weight: { label: "ತೂಕ ಇಳಿಕೆ" },
        appetite: { label: "ಹಸಿವು ಕಡಿಮೆ" },
        urine: { label: "ಪದೇಪದೇ ಮೂತ್ರ" },
        sleep: { label: "ಸರಿಯಾಗಿ ನಿದ್ರೆ ಬಾರದಿರುವುದು" },
        swelling: { label: "ಕಾಲುಗಳಲ್ಲಿ ಊತ" },
        none: { label: "ಹೀಗೇನೂ ಇಲ್ಲ" },
      },
    },
    prior_investigations: {
      prompt: "ಇತ್ತೀಚೆಗೆ ರಕ್ತ ಪರೀಕ್ಷೆ ಅಥವಾ ಸ್ಕ್ಯಾನ್ ಮಾಡಿಸಿದ್ದೀರಾ?",
      section: "ಹಿಂದಿನ ಪರೀಕ್ಷೆಗಳು",
      fieldLabel: "ಹಿಂದಿನ ಪರೀಕ್ಷೆಗಳು",
      options: {
        blood: { label: "ಹೌದು, ರಕ್ತ ಪರೀಕ್ಷೆ" },
        scan: { label: "ಹೌದು, ಎಕ್ಸ್-ರೇ ಅಥವಾ ಸ್ಕ್ಯಾನ್" },
        no: { label: "ಪರೀಕ್ಷೆ ಮಾಡಿಸಿಲ್ಲ" },
      },
    },
    prakriti: {
      prompt: "ಬಾಲ್ಯದಿಂದಲೂ ನಿಮ್ಮ ದೇಹ ಪ್ರಾಯಶಃ ಹೇಗಿದೆ?",
      section: "ಪ್ರಕೃತಿ",
      fieldLabel: "ಪ್ರಕೃತಿ (ದೇಹದ ಪ್ರಕೃತಿ)",
      options: {
        vata: { label: "ಸಣಕಲ ದೇಹ, ಒಣ ಚರ್ಮ, ಬೇಗ ಚಳಿ ಹಿಡಿಯುತ್ತದೆ" },
        pitta: { label: "ಬೆಚ್ಚಗಿನ ದೇಹ, ಬೆವರು, ಬೇಗ ಸಿಟ್ಟು" },
        kapha: { label: "ಗಟ್ಟಿಮುಟ್ಟಾದ ದೇಹ, ಶಾಂತ, ನಿಧಾನ" },
      },
    },
    vikriti: {
      prompt: "ಈ ದಿನಗಳಲ್ಲಿ ನಿಮ್ಮ ದೇಹದಲ್ಲಿ ಏನು ಬದಲಾಗಿದೆ?",
      section: "ವಿಕೃತಿ",
      fieldLabel: "ವಿಕೃತಿ (ಪ್ರಸ್ತುತ ಅಸಮತೋಲನ)",
      options: {
        gas: { label: "ಗ್ಯಾಸ್ ಮತ್ತು ಉಬ್ಬರ" },
        burning: { label: "ಉರಿ ಅಥವಾ ಹುಳಿತೆ (ಆಮ್ಲತೆ)" },
        heavy: { label: "ಭಾರ ಮತ್ತು ಕೆಮ್ಮು" },
        pain: { label: "ದೇಹ ನೋವು ಮತ್ತು ಬಿಗಿತ" },
      },
    },
    sara: {
      prompt: "ನಿಮ್ಮ ಚರ್ಮ, ಕೂದಲು ಮತ್ತು ಸ್ನಾಯು ಶಕ್ತಿ ಹೇಗಿದೆ?",
      section: "ದಶವಿಧ ಪರೀಕ್ಷೆ",
      fieldLabel: "ಸಾರ (ಧಾತು ಗುಣಮಟ್ಟ)",
      options: {
        uttama: { label: "ಬಹಳ ಚೆನ್ನಾಗಿ, ಹೊಳೆಯುತ್ತದೆ" },
        madhyama: { label: "ಸಾಮಾನ್ಯ" },
        avara: { label: "ಮಂದ ಮತ್ತು ದುರ್ಬಲ" },
      },
    },
    samhanana: {
      prompt: "ನಿಮ್ಮ ದೇಹದ ರಚನೆ ಹೇಗಿದೆ?",
      section: "ದಶವಿಧ ಪರೀಕ್ಷೆ",
      fieldLabel: "ಸಂಹನನ (ದೇಹದ ಘನತೆ)",
      options: {
        firm: { label: "ಗಟ್ಟಿ ಮತ್ತು ಬಲವಾದ" },
        medium: { label: "ಮಧ್ಯಮ" },
        loose: { label: "ಸಡಿಲ ಮತ್ತು ದುರ್ಬಲ" },
      },
    },
    pramana: {
      prompt: "ಇತ್ತೀಚೆಗೆ ನಿಮ್ಮ ದೇಹದ ತೂಕ ಬದಲಾಗಿದೆಯೇ?",
      section: "ದಶವಿಧ ಪರೀಕ್ಷೆ",
      fieldLabel: "ಪ್ರಮಾಣ (ದೇಹದ ಅನುಪಾತ)",
      options: {
        gain: { label: "ನನ್ನ ತೂಕ ಹೆಚ್ಚಾಗಿದೆ" },
        same: { label: "ಮೊದಲಿನಂತೆಯೇ ಇದೆ" },
        loss: { label: "ನನ್ನ ತೂಕ ಕಡಿಮೆಯಾಗಿದೆ" },
      },
    },
    satmya: {
      prompt: "ಯಾವ ಆಹಾರ ನಿಮಗೆ ಹೆಚ್ಚು ಒಪ್ಪುತ್ತದೆ?",
      section: "ದಶವಿಧ ಪರೀಕ್ಷೆ",
      fieldLabel: "ಸಾತ್ಮ್ಯ (ಅಭ್ಯಾಸ)",
      options: {
        all: { label: "ಎಲ್ಲಾ ಆಹಾರ ನನಗೆ ಒಪ್ಪುತ್ತದೆ" },
        light: { label: "ಹಗುರವಾದ, ಸರಳ ಆಹಾರ ಮಾತ್ರ" },
        spicy: { label: "ಖಾರದ ಆಹಾರಕ್ಕೆ ಅಭ್ಯಾಸ" },
      },
    },
    sattva: {
      prompt: "ಕಳವಳ ಮತ್ತು ನೋವನ್ನು ಹೇಗೆ ನಿಭಾಯಿಸುತ್ತೀರಿ?",
      section: "ದಶವಿಧ ಪರೀಕ್ಷೆ",
      fieldLabel: "ಸತ್ತ್ವ (ಮಾನಸಿಕ ಶಕ್ತಿ)",
      options: {
        strong: { label: "ನಾನು ಶಾಂತವಾಗಿರುತ್ತೇನೆ" },
        medium: { label: "ಕೆಲವೊಮ್ಮೆ ಕಳವಳಗೊಳ್ಳುತ್ತೇನೆ" },
        weak: { label: "ಸುಲಭವಾಗಿ ಹೆದರುತ್ತೇನೆ" },
      },
    },
    ahara_shakti: {
      prompt: "ನಿಮ್ಮ ಹಸಿವು ಮತ್ತು ಜೀರ್ಣಶಕ್ತಿ ಹೇಗಿದೆ?",
      section: "ದಶವಿಧ ಪರೀಕ್ಷೆ",
      fieldLabel: "ಆಹಾರ ಶಕ್ತಿ (ಜೀರ್ಣಶಕ್ತಿ)",
      options: {
        good: { label: "ಒಳ್ಳೆಯ ಹಸಿವು, ಆಹಾರ ಚೆನ್ನಾಗಿ ಜೀರ್ಣವಾಗುತ್ತದೆ" },
        irregular: { label: "ಹಸಿವು ಬಂದು ಹೋಗುತ್ತದೆ" },
        poor: { label: "ಬಹಳ ಕಡಿಮೆ ಹಸಿವು" },
      },
    },
    vyayama_shakti: {
      prompt: "ಸುಸ್ತಾಗದೆ ಎಷ್ಟು ದೂರ ನಡೆಯಬಲ್ಲಿರಿ?",
      section: "ದಶವಿಧ ಪರೀಕ್ಷೆ",
      fieldLabel: "ವ್ಯಾಯಾಮ ಶಕ್ತಿ (ಶಾರೀರಿಕ ಸಾಮರ್ಥ್ಯ)",
      options: {
        high: { label: "ಒಂದು ಕಿಲೋಮೀಟರಿಗಿಂತ ಹೆಚ್ಚು" },
        medium: { label: "ಸ್ವಲ್ಪ ದೂರ ಮಾತ್ರ" },
        low: { label: "ಮನೆಯೊಳಗೆ ಸುಸ್ತಾಗುತ್ತದೆ" },
      },
    },
    vaya: {
      prompt: "ನೀವು ಜೀವನದ ಯಾವ ಹಂತದಲ್ಲಿದ್ದೀರಿ?",
      section: "ದಶವಿಧ ಪರೀಕ್ಷೆ",
      fieldLabel: "ವಯಸ್ಸು (ವಯಸ್ಸಿನ ಹಂತ)",
      options: {
        bala: { label: "ಯುವಕ" },
        madhyama: { label: "ಮಧ್ಯ ವಯಸ್ಸು" },
        vriddha: { label: "ಹಿರಿಯ" },
      },
    },
    nidana: {
      prompt: "ನಿಮ್ಮ ಅಭಿಪ್ರಾಯದಲ್ಲಿ ಈ ಸಮಸ್ಯೆ ಯಾವುದರಿಂದ ಪ್ರಾರಂಭವಾಯಿತು?",
      section: "ನಿದಾನ ಮತ್ತು ಸಂಪ್ರಾಪ್ತಿ",
      fieldLabel: "ನಿದಾನ (ಕಾರಣ ಅಂಶಗಳು)",
      options: {
        food: { label: "ತಪ್ಪು ಅಥವಾ ಭಾರ ಆಹಾರ" },
        cold: { label: "ಚಳಿ ಅಥವಾ ಋತು ಬದಲಾವಣೆ" },
        stress: { label: "ಕಳವಳ ಅಥವಾ ಒತ್ತಡ" },
        work: { label: "ಭಾರೀ ದೈಹಿಕ ಕೆಲಸ" },
        sleep: { label: "ರಾತ್ರಿ ತಡವಾಗಿ ಮಲಗುವುದು" },
      },
    },
    samprapti: {
      prompt: "ಕಾಲಕ್ರಮೇಣ ಈ ಸಮಸ್ಯೆ ಹೇಗೆ ಬೆಳೆಯಿತು?",
      section: "ನಿದಾನ ಮತ್ತು ಸಂಪ್ರಾಪ್ತಿ",
      fieldLabel: "ಸಂಪ್ರಾಪ್ತಿ (ರೋಗ ಕ್ರಮ)",
      options: {
        slow: { label: "ನಿಧಾನವಾಗಿ, ಸ್ವಲ್ಪ ಸ್ವಲ್ಪ" },
        fast: { label: "ಬಹಳ ವೇಗವಾಗಿ" },
        wave: { label: "ಬಂದು ಹೋಗುತ್ತಿರುತ್ತದೆ" },
      },
    },
  },
  gu: {
    chief_complaint: {
      prompt: "આજે તમને સૌથી વધુ શું તકલીફ છે?",
      hint: "તમારા શબ્દોમાં કહો અથવા ચિત્રને સ્પર્શ કરો.",
      section: "મુખ્ય ફરિયાદ",
      fieldLabel: "મુખ્ય ફરિયાદ",
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
      fieldLabel: "શરૂઆત અને અવધિ",
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
      fieldLabel: "ગંભીરતા",
      hint: "તમારી લાગણી સાથે મેળ ખાતા ચહેરાને સ્પર્શ કરો.",
      section: "વર્તમાન બીમારીનો ઇતિહાસ",
      options: {
        mild: { label: "હળવી" },
        moderate: { label: "મધ્યમ" },
        severe: { label: "તીવ્ર" },
      },
    },
    chest_alarm: {
      prompt: "છાતીની તકલીફ સાથે આમાંથી કંઈ હવે છે?",
      hint: "જરૂર પડે તો ડૉક્ટરને ઝડપથી બોલાવવામાં આ મદદ કરશે.",
      section: "વર્તમાન બીમારીનો ઇતિહાસ",
      fieldLabel: "ચેતવણી લક્ષણો",
      options: {
        arm: { label: "ડાબા હાથ કે જડબા સુધી જતો દુખાવો" },
        sweat: { label: "ઠંડો પરસેવો" },
        faint: { label: "બેહોશ થવા જેવું લાગવું" },
        none: { label: "આમાંથી કંઈ નહીં" },
      },
    },
    general_alarm: {
      prompt: "આજે આમાંથી કોઈ ગંભીર લક્ષણ છે?",
      section: "વર્તમાન બીમારીનો ઇતિહાસ",
      fieldLabel: "ચેતવણી લક્ષણો",
      options: {
        bleeding: { label: "અટકતું નથી તેવું રક્તસ્ત્રાવ" },
        unconscious: { label: "બેહોશ થયા છો" },
        speech: { label: "શરીરની એક બાજુ અચાનક નબળાઈ" },
        none: { label: "આમાંથી કંઈ નહીં" },
      },
    },
    past_history: {
      prompt: "શું ડૉક્ટરે તમને કહ્યું છે કે તમને આમાંથી કોઈ બીમારી છે?",
      section: "અગાઉની બીમારી",
      fieldLabel: "અગાઉની સારવાર અને ઓપરેશનનો ઇતિહાસ",
      options: {
        dm: { label: "સુગર (ડાયાબિટીસ)" },
        htn: { label: "બીપી" },
        asthma: { label: "અસ્થમા" },
        tb: { label: "અગાઉ ક્યારેક ટીબી" },
        surgery: { label: "અગાઉ કોઈ ઓપરેશન" },
        none: { label: "આમાંથી કંઈ નહીં" },
      },
    },
    drug_history: {
      prompt: "શું તમે રોજ કોઈ દવા લો છો?",
      section: "દવા અને એલર્જી",
      fieldLabel: "દવાનો ઇતિહાસ",
      options: {
        yes_regular: { label: "હા, રોજ" },
        sometimes: { label: "ફક્ત ક્યારેક" },
        no: { label: "કોઈ દવા નહીં" },
      },
    },
    allergy: {
      prompt: "શું કોઈ દવાથી ક્યારેય ફોલ્લી, સોજો કે શ્વાસ ચડ્યો છે?",
      section: "દવા અને એલર્જી",
      fieldLabel: "એલર્જીનો ઇતિહાસ",
      options: {
        penicillin: { label: "હા, દુખાવા કે તાવની દવાથી" },
        other: { label: "હા, પણ નામ ખબર નથી" },
        no: { label: "ના, ક્યારેય નહીં" },
      },
    },
    family_history: {
      prompt: "તમારા કુટુંબમાં શું કોઈને આ બીમારીઓ છે?",
      section: "કૌટુંબિક ઇતિહાસ",
      fieldLabel: "કૌટુંબિક ઇતિહાસ",
      options: {
        dm: { label: "સુગર" },
        htn: { label: "બીપી" },
        heart: { label: "હૃદયની તકલીફ" },
        cancer: { label: "કેન્સર" },
        none: { label: "કોઈને નહીં" },
      },
    },
    personal_history: {
      prompt: "શું તમે તમાકુ, બીડી, સિગારેટ કે દારૂ લો છો?",
      section: "વ્યક્તિગત ઇતિહાસ",
      fieldLabel: "વ્યક્તિગત ઇતિહાસ",
      options: {
        tobacco: { label: "ચાવવાની તમાકુ" },
        smoke: { label: "બીડી કે સિગારેટ" },
        alcohol: { label: "દારૂ" },
        none: { label: "કંઈ નહીં" },
      },
    },
    ros: {
      prompt: "છેલ્લા એક મહિનામાં શું આમાંથી કંઈ જોયું છે?",
      section: "શરીરની તપાસ",
      fieldLabel: "શરીરની તપાસ",
      options: {
        weight: { label: "વજન ઘટવું" },
        appetite: { label: "ભૂખ ઓછી લાગવી" },
        urine: { label: "વારંવાર પેશાબ" },
        sleep: { label: "ઊંઘ બરાબર ન આવવી" },
        swelling: { label: "પગમાં સોજો" },
        none: { label: "આવું કંઈ નહીં" },
      },
    },
    prior_investigations: {
      prompt: "શું હાલમાં તમારું લોહી પરીક્ષણ કે સ્કેન થયું છે?",
      section: "અગાઉની તપાસ",
      fieldLabel: "અગાઉની તપાસ",
      options: {
        blood: { label: "હા, લોહી પરીક્ષણ" },
        scan: { label: "હા, એક્સ-રે કે સ્કેન" },
        no: { label: "કોઈ તપાસ થઈ નથી" },
      },
    },
    prakriti: {
      prompt: "બાળપણથી તમારું શરીર મોટે ભાગે કેવું રહ્યું છે?",
      section: "પ્રકૃતિ",
      fieldLabel: "પ્રકૃતિ (શરીરની પ્રકૃતિ)",
      options: {
        vata: { label: "પાતળું શરીર, શુષ્ક ત્વચા, જલદી ઠંડી લાગે છે" },
        pitta: { label: "ગરમ શરીર, પરસેવો, જલદી ગુસ્સો આવે છે" },
        kapha: { label: "ભારે બાંધો, શાંત, ધીમું" },
      },
    },
    vikriti: {
      prompt: "આ દિવસોમાં તમારા શરીરમાં શું બદલાયું છે?",
      section: "વિકૃતિ",
      fieldLabel: "વિકૃતિ (હાલનું અસંતુલન)",
      options: {
        gas: { label: "ગેસ અને ફૂલેલું પેટ" },
        burning: { label: "બળતરા અથવા અમ્લતા" },
        heavy: { label: "ભારેપણું અને ઉધરસ" },
        pain: { label: "શરીરમાં દુખાવો અને અકડાટ" },
      },
    },
    sara: {
      prompt: "તમારી ત્વચા, વાળ અને સ્નાયુની તાકાત કેવી છે?",
      section: "દશવિધ પરીક્ષા",
      fieldLabel: "સાર (ધાતુની ગુણવત્તા)",
      options: {
        uttama: { label: "ખૂબ સારું, ચમકદાર" },
        madhyama: { label: "સામાન્ય" },
        avara: { label: "નિસ્તેજ અને નબળું" },
      },
    },
    samhanana: {
      prompt: "તમારો શરીરનો બાંધો કેવો છે?",
      section: "દશવિધ પરીક્ષા",
      fieldLabel: "સંહનન (શરીરની ઘણતર)",
      options: {
        firm: { label: "મજબૂત અને ઘાટો" },
        medium: { label: "મધ્યમ" },
        loose: { label: "ઢીલું અને નબળું" },
      },
    },
    pramana: {
      prompt: "તાજેતરમાં તમારું વજન બદલાયું છે?",
      section: "દશવિધ પરીક્ષા",
      fieldLabel: "પ્રમાણ (શરીરનું માપ)",
      options: {
        gain: { label: "મારું વજન વધ્યું છે" },
        same: { label: "પહેલાં જેવું જ છે" },
        loss: { label: "મારું વજન ઘટ્યું છે" },
      },
    },
    satmya: {
      prompt: "કયું ભોજન તમને સૌથી વધુ અનુકૂળ આવે છે?",
      section: "દશવિધ પરીક્ષા",
      fieldLabel: "સાત્મ્ય (અનુકૂળતા)",
      options: {
        all: { label: "બધા પ્રકારનું ભોજન મને અનુકૂળ આવે છે" },
        light: { label: "માત્ર હળવું, સાદું ભોજન" },
        spicy: { label: "હું મસાલેદાર ભોજનનો ટેવાયેલો છું" },
      },
    },
    sattva: {
      prompt: "તમે ચિંતા અને દુખાવાને કેવી રીતે સંભાળો છો?",
      section: "દશવિધ પરીક્ષા",
      fieldLabel: "સત્ત્વ (માનસિક બળ)",
      options: {
        strong: { label: "હું શાંત રહું છું" },
        medium: { label: "ક્યારેક હું અસ્વસ્થ થઈ જાઉં છું" },
        weak: { label: "હું જલદી ભયભીત થઈ જાઉં છું" },
      },
    },
    ahara_shakti: {
      prompt: "તમારી ભૂખ અને પાચન કેવું છે?",
      section: "દશવિધ પરીક્ષા",
      fieldLabel: "આહાર શક્તિ (પાચનક્ષમતા)",
      options: {
        good: { label: "સારી ભૂખ, ભોજન સારું પચે છે" },
        irregular: { label: "ભૂખ આવે છે અને જાય છે" },
        poor: { label: "ખૂબ ઓછી ભૂખ લાગે છે" },
      },
    },
    vyayama_shakti: {
      prompt: "થાક્યા વગર તમે કેટલું ચાલી શકો છો?",
      section: "દશવિધ પરીક્ષા",
      fieldLabel: "વ્યાયામ શક્તિ (શારીરિક ક્ષમતા)",
      options: {
        high: { label: "એક કિલોમીટરથી વધુ" },
        medium: { label: "થોડું અંતર જ" },
        low: { label: "ઘરમાં જ થાકી જાઉં છું" },
      },
    },
    vaya: {
      prompt: "તમે જીવનના કયા તબક્કામાં છો?",
      section: "દશવિધ પરીક્ષા",
      fieldLabel: "વય (ઉંમરનો તબક્કો)",
      options: {
        bala: { label: "યુવાન" },
        madhyama: { label: "મધ્યમ વય" },
        vriddha: { label: "વૃદ્ધ" },
      },
    },
    nidana: {
      prompt: "તમારા મતે આ સમસ્યા શેના કારણે શરૂ થઈ?",
      section: "નિદાન અને સંપ્રાપ્તિ",
      fieldLabel: "નિદાન (કારક પરિબળો)",
      options: {
        food: { label: "ખોટું અથવા ભારે ભોજન" },
        cold: { label: "ઠંડી અથવા ઋતુ બદલાવ" },
        stress: { label: "ચિંતા અથવા તણાવ" },
        work: { label: "ભારે શારીરિક કામ" },
        sleep: { label: "રાત્રે મોડું જાગવું" },
      },
    },
    samprapti: {
      prompt: "સમય જતાં આ સમસ્યા કેવી રીતે વધી?",
      section: "નિદાન અને સંપ્રાપ્તિ",
      fieldLabel: "સંપ્રાપ્તિ (રોગની પ્રક્રિયા)",
      options: {
        slow: { label: "ધીમે ધીમે" },
        fast: { label: "ખૂબ ઝડપથી" },
        wave: { label: "આવતી-જતી રહે છે" },
      },
    },
  },
};

export function localizeQuestion(question: Question, language: LanguageCode): Question {
  const localized = copy[language]?.[question.id];
  if (!localized) {
    // Dev-only signal: the selected language is NEVER reset — the English
    // source is shown as a controlled fallback and the gap is logged with
    // the question key + language so it can be translated properly.
    if (language !== "en" && !import.meta.env?.PROD) {
      console.warn("[MISSING TRANSLATION]", language, question.id);
    }
    return question;
  }
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

/** True when the language actually ships a localized prompt for this question. */
export function hasLocalizedQuestionPrompt(language: LanguageCode, questionId: string): boolean {
  if (language === "en") return true;
  return Boolean(copy[language]?.[questionId]?.prompt);
}

/**
 * Dev-time completeness check for the AYUSH treatment history flow.
 * Logs `[MISSING TRANSLATION] language/key` for every prompt, section,
 * fieldLabel or option label that would still fall back to English.
 * Never shown to patients; silently returns empty in production builds.
 */
export function validateAyushTranslations(): {
  language: LanguageCode;
  missing: string[];
  complete: number;
  total: number;
}[] {
  if (import.meta.env?.PROD) return [];

  const results: { language: LanguageCode; missing: string[]; complete: number; total: number }[] =
    [];
  const languages = Object.keys(copy) as LanguageCode[];

  for (const language of languages) {
    const languageCopy = copy[language];
    const missing: string[] = [];
    let complete = 0;

    if (!languageCopy) {
      results.push({
        language,
        missing: ["no copy block"],
        complete: 0,
        total: AYUSH_FLOW_QUESTION_IDS.length,
      });
      console.warn("[MISSING TRANSLATION]", language, "no copy block");
      continue;
    }

    for (const id of AYUSH_FLOW_QUESTION_IDS) {
      const localized = languageCopy[id];
      const source = QUESTIONS.find((q) => q.id === id);
      if (!localized?.prompt) {
        missing.push(`${id}.prompt`);
        continue;
      }
      if (source?.hint && !localized.hint) missing.push(`${id}.hint`);
      if (source?.section && !localized.section) missing.push(`${id}.section`);
      if (source?.fieldLabel && !localized.fieldLabel) missing.push(`${id}.fieldLabel`);
      for (const option of source?.options ?? []) {
        if (!localized.options?.[option.id]?.label) missing.push(`${id}.options.${option.id}`);
      }
      complete += 1;
    }

    if (missing.length) {
      console.warn(`[MISSING TRANSLATION] ${language}/`, missing.join(", "));
    } else {
      console.info(
        `[AYUSH TRANSLATIONS] ${language}: ${complete}/${AYUSH_FLOW_QUESTION_IDS.length} question translations complete`,
      );
    }
    results.push({
      language,
      missing,
      complete,
      total: AYUSH_FLOW_QUESTION_IDS.length,
    });
  }

  return results;
}
