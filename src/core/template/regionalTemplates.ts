/**
 * Dispatch Regional Language Presets & Multi-Lingual Templates
 * Culturally authentic message templates in 8 major Indian languages
 * designed for any business, professional service, or organization.
 */

export interface RegionalLanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export interface RegionalMessagePreset {
  id: string;
  title: string;
  category: 'fee' | 'notice' | 'meeting' | 'payment' | 'appointment';
  text: string;
}

export const REGIONAL_LANGUAGES: RegionalLanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
];

export const REGIONAL_TEMPLATES: Record<string, RegionalMessagePreset[]> = {
  en: [
    {
      id: 'en-fee',
      title: 'Payment / Balance Due Reminder',
      category: 'fee',
      text: 'Dear {{Student Name}}, this is a gentle reminder regarding the pending balance of ₹{{Balance}} on your account. Kindly arrange payment before {{Due Date}}. Thank you, Accounts & Billing.',
    },
    {
      id: 'en-notice',
      title: 'General Update / Holiday Notice',
      category: 'notice',
      text: 'Dear {{Student Name}}, please note our service update: operations will remain closed on {{Date}} on account of holiday. Normal hours resume on the next working day. Best regards, Management.',
    },
    {
      id: 'en-meeting',
      title: 'Appointment / Meeting Confirmation',
      category: 'meeting',
      text: 'Dear {{Student Name}}, your appointment is scheduled for {{Date}} at {{Time}}. Please reply to this message if you need to reschedule. Warm regards, Front Desk.',
    },
  ],
  hi: [
    {
      id: 'hi-fee',
      title: 'बकाया भुगतान / फीस स्मरण (Fee / Payment Due)',
      category: 'fee',
      text: 'प्रिय {{Student Name}}, यह आपके खाते में ₹{{Balance}} की बकाया राशि के संबंध में स्मरण पत्र है। कृपया {{Due Date}} से पूर्व इसका भुगतान सुनिश्चित करें। धन्यवाद, लेखा विभाग।',
    },
    {
      id: 'hi-notice',
      title: 'आवश्यक सूचना / अवकाश (Notice)',
      category: 'notice',
      text: 'प्रिय {{Student Name}}, सूचित किया जाता है कि {{Date}} को अवकाश के कारण हमारा कार्यालय बंद रहेगा। अगले कार्यदिवस से सेवाएं पूर्ववत चालू रहेंगी। सादर, प्रबंधन।',
    },
    {
      id: 'hi-meeting',
      title: 'अपॉइंटमेंट / बैठक सूचना (Meeting)',
      category: 'meeting',
      text: 'प्रिय {{Student Name}}, आपका अपॉइंटमेंट {{Date}} को समय {{Time}} पर निर्धारित है। यदि आपको किसी बदलाव की आवश्यकता है तो कृपया सूचित करें। धन्यवाद।',
    },
  ],
  mr: [
    {
      id: 'mr-fee',
      title: 'देयक / फी बाकी स्मरणपत्र (Fee / Payment Due)',
      category: 'fee',
      text: 'नमस्कार {{Student Name}}, आपल्या खात्यावर ₹{{Balance}} ची रक्कम बाकी आहे. कृपया {{Due Date}} पूर्वी देयक पूर्ण करावे. सहकार्याबद्दल धन्यवाद, व्यवस्थापन.',
    },
    {
      id: 'mr-notice',
      title: 'महत्त्वाची सूचना / सुट्टी (Notice)',
      category: 'notice',
      text: 'नमस्कार {{Student Name}}, कळविण्यात येते की सुट्टीनिमित्त {{Date}} रोजी कार्यालय बंद राहील. पुढील कामाच्या दिवसापासून सेवा नेहमीप्रमाणे सुरू राहतील. व्यवस्थापन.',
    },
    {
      id: 'mr-meeting',
      title: 'अपॉइंटमेंट / बैठक निश्चिती (Meeting)',
      category: 'meeting',
      text: 'नमस्कार {{Student Name}}, आपली भेट/अपॉइंटमेंट {{Date}} रोजी वेळ {{Time}} वाजता निश्चित करण्यात आली आहे. काही बदल असल्यास कृपया कळवावे. धन्यवाद.',
    },
  ],
  te: [
    {
      id: 'te-fee',
      title: 'చెల్లింపు బకాయి రిమైండర్ (Fee / Payment Due)',
      category: 'fee',
      text: 'నమస్కారం {{Student Name}}, మీ ఖాతాలో బకాయి మొత్తం ₹{{Balance}}. దయచేసి {{Due Date}} లోపు చెల్లించవలసిందిగా కోరుతున్నాము. ధన్యవాదాలు, ఖాతాల విభాగం.',
    },
    {
      id: 'te-notice',
      title: 'ముఖ్యమైన నోటీసు / సెలవు (Notice)',
      category: 'notice',
      text: 'నమస్కారం {{Student Name}}, సెలవు దినం సందర్భంగా {{Date}} న మా కార్యాలయం మూసివేయబడుతుందని తెలియజేస్తున్నాము. మరుసటి పనిదినం నుండి సేవలు యధావిధిగా అందుబాటులో ఉంటాయి. ధన్యవాదాలు.',
    },
    {
      id: 'te-meeting',
      title: 'అపాయింట్‌మెంట్ నిర్ధారణ (Meeting)',
      category: 'meeting',
      text: 'నమస్కారం {{Student Name}}, మీ అపాయింట్‌మెంట్ {{Date}} తేదీన {{Time}} సమయానికి నిర్ణయించబడింది. ఏవైనా మార్పులు ఉంటే దయచేసి తెలియజేయండి. ధన్యవాదాలు.',
    },
  ],
  ta: [
    {
      id: 'ta-fee',
      title: 'கட்டண நிலுவை நினைவூட்டல் (Fee / Payment Due)',
      category: 'fee',
      text: 'வணக்கம் {{Student Name}}, உங்கள் கணக்கில் நிலுவைத் தொகை ₹{{Balance}} உள்ளது. தயவுசெய்து {{Due Date}} க்குள் செலுத்தவும். நன்றி, கணக்கு பிரிவு.',
    },
    {
      id: 'ta-notice',
      title: 'முக்கிய அறிவிப்பு / விடுமுறை (Notice)',
      category: 'notice',
      text: 'வணக்கம் {{Student Name}}, விடுமுறை காரணமாக {{Date}} அன்று எங்களது அலுவலகம் இயங்காது என்பதை தெரிவித்துக் கொள்கிறோம். அடுத்த வேலை நாளில் சேவைகள் தொடரும். நன்றி.',
    },
    {
      id: 'ta-meeting',
      title: 'சந்திப்பு / முன்பதிவு (Meeting)',
      category: 'meeting',
      text: 'வணக்கம் {{Student Name}}, உங்கள் சந்திப்பு/முன்பதிவு {{Date}} அன்று நேரம் {{Time}} மணிக்கு உறுதி செய்யப்பட்டுள்ளது. ஏதேனும் மாற்றம் இருப்பின் தெரிவிக்கவும். நன்றி.',
    },
  ],
  kn: [
    {
      id: 'kn-fee',
      title: 'ಪಾವತಿ ಬಾಕಿ ಜ್ಞಾಪನೆ (Fee / Payment Due)',
      category: 'fee',
      text: 'ನಮಸ್ಕಾರ {{Student Name}}, ನಿಮ್ಮ ಖಾತೆಯಲ್ಲಿ ₹{{Balance}} ಮೊತ್ತ ಬಾಕಿ ಇದೆ. ದಯವಿಟ್ಟು {{Due Date}} ಒಳಗೆ ಪಾವತಿಸಿ. ಧನ್ಯವಾದಗಳು, ಲೆಕ್ಕಪತ್ರ ವಿಭಾಗ.',
    },
    {
      id: 'kn-notice',
      title: 'ಮುಖ್ಯ ಪ್ರಕಟಣೆ / ರಜೆ (Notice)',
      category: 'notice',
      text: 'ನಮಸ್ಕಾರ {{Student Name}}, ರಜಾದಿನದ ಪ್ರಯುಕ್ತ {{Date}} ರಂದು ನಮ್ಮ ಕಚೇರಿ ಕಾರ್ಯನಿರ್ವಹಿಸುವುದಿಲ್ಲ ಎಂದು ತಿಳಿಸಲಾಗಿದೆ. ಮುಂದಿನ ದಿನದಿಂದ ಎಂದಿನಂತೆ ಸೇವೆಗಳು ಲಭ್ಯವಿರುತ್ತವೆ. ಧನ್ಯವಾದಗಳು.',
    },
    {
      id: 'kn-meeting',
      title: 'ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಖಚಿತತೆ (Meeting)',
      category: 'meeting',
      text: 'ನಮಸ್ಕಾರ {{Student Name}}, ನಿಮ್ಮ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ {{Date}} ರಂದು ಸಮಯ {{Time}} ಕ್ಕೆ ನಿಗದಿಯಾಗಿದೆ. ಏನಾದರೂ ಬದಲಾವಣೆ ಇದ್ದಲ್ಲಿ ದಯವಿಟ್ಟು ತಿಳಿಸಿ. ಧನ್ಯವಾದಗಳು.',
    },
  ],
  bn: [
    {
      id: 'bn-fee',
      title: 'বকেয়া পেমেন্ট রিমাইন্ডার (Fee / Payment Due)',
      category: 'fee',
      text: 'নমস্কার {{Student Name}}, আপনার অ্যাকাউন্টে ₹{{Balance}} বকেয়া রয়েছে। অনুগ্রহ করে {{Due Date}} এর মধ্যে পরিশোধ করুন। ধন্যবাদ, হিসাব বিভাগ।',
    },
    {
      id: 'bn-notice',
      title: 'জরুরি নোটিশ / ছুটি (Notice)',
      category: 'notice',
      text: 'নমস্কার {{Student Name}}, জানানো যাচ্ছে যে ছুটির কারণে {{Date}} তারিখে আমাদের অফিস বন্ধ থাকবে। পরবর্তী কার্যদিবস থেকে স্বাভাবিক পরিষেবা চালু থাকবে। ধন্যবাদ, কর্তৃপক্ষ।',
    },
    {
      id: 'bn-meeting',
      title: 'অ্যাপয়েন্টমেন্ট নিশ্চিতকরণ (Meeting)',
      category: 'meeting',
      text: 'নমস্কার {{Student Name}}, আপনার অ্যাপয়েন্টমেন্ট {{Date}} তারিখে সময় {{Time}} এ নিশ্চিত করা হয়েছে। কোনো পরিবর্তনের প্রয়োজন হলে অনুগ্রহ করে জানান। ধন্যবাদ।',
    },
  ],
  gu: [
    {
      id: 'gu-fee',
      title: 'બાકી ચૂકવણી સ્મરણપત્ર (Fee / Payment Due)',
      category: 'fee',
      text: 'નમસ્તે {{Student Name}}, તમારા ખાતામાં ₹{{Balance}} ની રકમ બાકી છે. કૃપા કરીને {{Due Date}} પહેલાં ચૂકવણી કરો. સહકાર બદલ આભાર, હિસાબ વિભાગ.',
    },
    {
      id: 'gu-notice',
      title: 'મહત્વપૂર્ણ સૂચના / રજા (Notice)',
      category: 'notice',
      text: 'નમસ્તે {{Student Name}}, જાણ કરવામાં આવે છે કે રજા નિમિત્તે {{Date}} ના રોજ અમારી ઓફિસ બંધ રહેશે. બીજા કાર્યકારી દિવસથી સેવાઓ રાબેતા મુજબ શરૂ રહેશે. આભાર.',
    },
    {
      id: 'gu-meeting',
      title: 'એપોઇન્ટમેન્ટ કન્ફર્મેશન (Meeting)',
      category: 'meeting',
      text: 'નમસ્તે {{Student Name}}, તમારી એપોઇન્ટમેન્ટ {{Date}} ના રોજ સમય {{Time}} વાગ્યે નક્કી કરવામાં આવી છે. કોઈ ફેરફાર હોય તો કૃપા કરીને જણાવો. આભાર.',
    },
  ],
};

/**
 * Returns presets for a given language code (defaults to English if not found)
 */
export function getRegionalPresets(langCode: string): RegionalMessagePreset[] {
  return REGIONAL_TEMPLATES[langCode] || REGIONAL_TEMPLATES.en;
}
