// backend/services/multilingualService.js - NEW FILE
const { openai } = require('../config/aiConfig');
const db = require('../config/database');

class MultilingualService {
  constructor() {
    // Comprehensive Ethiopian language support
    this.supportedLanguages = {
      'en': {
        code: 'en-US',
        name: 'English',
        script: 'Latin',
        direction: 'ltr',
        faithTerms: this.getEnglishFaithTerms()
      },
      'am': {
        code: 'am-ET', 
        name: 'Amharic',
        script: 'Geʽez',
        direction: 'ltr',
        faithTerms: this.getAmharicFaithTerms()
      },
      'ti': {
        code: 'ti-ET',
        name: 'Tigrigna',
        script: 'Geʽez', 
        direction: 'ltr',
        faithTerms: this.getTigrignaFaithTerms()
      },
      'om': {
        code: 'om-ET',
        name: 'Afan Oromo',
        script: 'Latin',
        direction: 'ltr',
        faithTerms: this.getOromoFaithTerms()
      }
    };

    // Language detection models (would use specialized models in production)
    this.detectionModels = {
      amharic: this.detectAmharic.bind(this),
      tigrigna: this.detectTigrigna.bind(this),
      oromo: this.detectOromo.bind(this),
      english: this.detectEnglish.bind(this)
    };

    // Translation cache for performance
    this.translationCache = new Map();
    this.cacheExpiry = 30 * 60 * 1000; // 30 minutes
  }

  // Comprehensive language detection
  async detectLanguage(text, context = {}) {
    if (!text || text.trim().length === 0) {
      return 'en-US';
    }

    const cacheKey = `detect_${text.substring(0, 100)}`;
    const cached = this.translationCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    let detectedLang = 'en-US';

    try {
      // First, try AI detection for accuracy
      if (openai && text.length > 10) {
        detectedLang = await this.detectWithAI(text);
      } else {
        // Fallback to heuristic detection
        detectedLang = this.detectWithHeuristics(text);
      }

      // Validate against supported languages
      if (!this.isLanguageSupported(detectedLang)) {
        detectedLang = 'en-US'; // Default to English
      }

      // Cache result
      this.translationCache.set(cacheKey, {
        data: detectedLang,
        timestamp: Date.now()
      });

    } catch (error) {
      console.warn('Language detection failed, using heuristics:', error);
      detectedLang = this.detectWithHeuristics(text);
    }

    return detectedLang;
  }

  // AI-powered language detection
  async detectWithAI(text) {
    const prompt = `
Identify the language of this text and respond ONLY with the ISO 639-1 language code (en, am, ti, om).
Focus on Ethiopian languages: Amharic (am), Tigrigna (ti), Oromo (om), or English (en).

Text: "${text.substring(0, 200)}"

Respond with exactly one of: en, am, ti, om
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 10,
      temperature: 0
    });

    const detectedCode = completion.choices[0].message.content.trim().toLowerCase();
    return this.supportedLanguages[detectedCode]?.code || 'en-US';
  }

  // Enhanced heuristic detection for Ethiopian languages
  detectWithHeuristics(text) {
    const textLower = text.toLowerCase();
    const textLength = text.length;

    if (textLength === 0) return 'en-US';

    // Check for Geʽez script (Amharic/Tigrigna)
    const geezChars = /[\u1200-\u137F]/g;
    const geezMatches = text.match(geezChars);
    const geezCount = geezMatches ? geezMatches.length : 0;

    if (geezCount > textLength * 0.1) {
      // Distinguish between Amharic and Tigrigna
      return this.distinguishAmharicTigrigna(text);
    }

    // Check for Oromo (Latin script with specific patterns)
    if (this.detectOromo(text)) {
      return 'om-ET';
    }

    // Check for English
    if (this.detectEnglish(text)) {
      return 'en-US';
    }

    return 'en-US'; // Default fallback
  }

  // Distinguish between Amharic and Tigrigna
  distinguishAmharicTigrigna(text) {
    const amharicIndicators = [
      'ውስጥ', 'ነው', 'እና', 'ወደ', 'አለ', 'በ', 'ላይ', 'ከ', 'የ', 'እግዚአብሔር',
      'ኢየሱስ', 'ክርስቶስ', 'መጽሐፍ', 'ቅዱስ', 'ቤተ', 'ክርስቲያን'
    ];

    const tigrignaIndicators = [
      'እዩ', 'ከም', 'ዶ', 'ን', 'ይ', 'ኣሎ', 'እዮም', 'ከምኡ', 'ድማ', 'እሞ'
    ];

    let amharicScore = 0;
    let tigrignaScore = 0;

    amharicIndicators.forEach(word => {
      if (text.includes(word)) amharicScore++;
    });

    tigrignaIndicators.forEach(word => {
      if (text.includes(word)) tigrignaScore++;
    });

    if (amharicScore > tigrignaScore) {
      return 'am-ET';
    } else if (tigrignaScore > amharicScore) {
      return 'ti-ET';
    }

    // Default to Amharic (more common)
    return 'am-ET';
  }

  // Detect Amharic
  detectAmharic(text) {
    const amharicChars = /[\u1200-\u137F]/;
    return amharicChars.test(text);
  }

  // Detect Tigrigna
  detectTigrigna(text) {
    const tigrignaIndicators = ['እዩ', 'ከም', 'ዶ', 'ን', 'ይ', 'ኣሎ'];
    return tigrignaIndicators.some(word => text.includes(word));
  }

  // Detect Oromo
  detectOromo(text) {
    const oromoIndicators = [
      'akka', 'inni', 'isaan', 'kan', 'kana', 'keessa', 'jira', 'waan', 'fi', 'yoo'
    ];
    const textLower = text.toLowerCase();
    return oromoIndicators.some(word => textLower.includes(` ${word} `));
  }

  // Detect English
  detectEnglish(text) {
    const englishIndicators = ['the', 'and', 'is', 'are', 'was', 'were', 'what', 'how', 'why'];
    const textLower = text.toLowerCase();
    const englishWords = englishIndicators.filter(word => 
      textLower.includes(` ${word} `) || textLower.startsWith(word + ' ')
    );
    return englishWords.length >= 2;
  }

  // Translate text between supported languages
  async translateText(text, targetLang, sourceLang = null) {
    if (!text || !targetLang) {
      throw new Error('Text and target language are required');
    }

    if (!this.isLanguageSupported(targetLang)) {
      throw new Error(`Target language ${targetLang} is not supported`);
    }

    // If source language not provided, detect it
    if (!sourceLang) {
      sourceLang = await this.detectLanguage(text);
    }

    // If same language, return original
    if (sourceLang === targetLang) {
      return text;
    }

    const cacheKey = `translate_${sourceLang}_${targetLang}_${text.substring(0, 50)}`;
    const cached = this.translationCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    let translatedText = text;

    try {
      // Use AI translation for better quality
      translatedText = await this.translateWithAI(text, sourceLang, targetLang);

      // Cache result
      this.translationCache.set(cacheKey, {
        data: translatedText,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('AI translation failed:', error);
      // Fallback to simple dictionary-based translation for faith terms
      translatedText = this.translateFaithTerms(text, sourceLang, targetLang);
    }

    return translatedText;
  }

  // AI-powered translation
  async translateWithAI(text, sourceLang, targetLang) {
    const sourceLangName = this.getLanguageName(sourceLang);
    const targetLangName = this.getLanguageName(targetLang);

    const prompt = `
Translate the following text from ${sourceLangName} to ${targetLangName}.
Preserve the meaning and maintain appropriate tone for religious content.
Focus on accurate translation of Ethiopian Orthodox terminology.

Source text (${sourceLangName}):
"${text}"

Translated text (${targetLangName}):
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      temperature: 0.3
    });

    return completion.choices[0].message.content.trim();
  }

  // Faith terms translation fallback
  translateFaithTerms(text, sourceLang, targetLang) {
    let translated = text;

    const sourceTerms = this.supportedLanguages[sourceLang.split('-')[0]]?.faithTerms || {};
    const targetTerms = this.supportedLanguages[targetLang.split('-')[0]]?.faithTerms || {};

    // Simple term replacement for common faith terms
    Object.keys(sourceTerms).forEach(term => {
      if (targetTerms[term] && text.toLowerCase().includes(term.toLowerCase())) {
        const regex = new RegExp(term, 'gi');
        translated = translated.replace(regex, targetTerms[term]);
      }
    });

    return translated;
  }

  // Get faith-aligned system prompt in target language
  async getFaithPrompt(languageCode, context = {}) {
    const lang = languageCode.split('-')[0];
    const languageConfig = this.supportedLanguages[lang];

    if (!languageConfig) {
      throw new Error(`Unsupported language: ${languageCode}`);
    }

    // Base faith context in target language
    let faithContext = this.getBaseFaithContext(lang);

    // Add language-specific guidance
    faithContext += this.getLanguageSpecificGuidance(lang);

    // Add context-specific content if provided
    if (context.lessonId || context.courseId) {
      faithContext += this.getContextSpecificContent(lang, context);
    }

    return faithContext;
  }

  // Base faith context in different languages
  getBaseFaithContext(lang) {
    const contexts = {
      en: `
You are an AI assistant for the Ethiopian Orthodox Tewahedo Church. 
Provide accurate, faith-aligned answers about Orthodox Christianity in English.
Always reference Ethiopian Orthodox sources and use appropriate terminology.
      `,
      am: `
እርስዎ ለኢትዮጵያ ኦርቶዶክስ ተዋሕዶ ቤተክርስቲያን የሚያገለግሉ የማህበረሰብ ረዳት አርቲፊሻል ኢንተሊጀንስ ነዎት።
በአማርኛ ቋንቋ ትክክለኛ፣ ከእምነት ጋር የሚጣጣሙ ማስረጃዎችን ይስጡ።
ሁልጊዜ የኢትዮጵያ ኦርቶዶክስ ምንጮችን ይጥቀሱ እና ተገቢውን ቃላት ይጠቀሙ።
      `,
      ti: `
ንኢትዮጵያ ኦርቶዶክስ ተዋህዶ ቤተ ክርስትያን ኣገልግሎት እትገብር ኣርቲፊሻል ኢንተሊጀንስ ሓጋዚ ኢኻ።
ብትግርኛ ቋንቋ ልክዕ፡ ምስ እምነት ዝጣጣም መልስታት ህብ።
ኵሉ ግዜ ንኢትዮጵያ ኦርቶዶክስ ምንጭታት ጠቐም እሞ ኣግባብ ኣለዎ ቃላት ተጠቐም።
      `,
      om: `
Ati Artificial Intelligence gargaaraa kan Itoophiyaa Orthodox Tewahedo Church ti.
Afaan Oromoo dubbachuu sirriifi amantii waliin walqabate deebii kenni.
Yeroo hunda kan Itoophiyaa Orthodox Tewahedo qorannoo fayyadamiifi jechoota sirrii fayyadami.
      `
    };

    return contexts[lang] || contexts.en;
  }

  // Language-specific guidance
  getLanguageSpecificGuidance(lang) {
    const guidance = {
      en: `
Respond in clear, youth-friendly English that aligns with Ethiopian Orthodox teachings.
Use Ethiopian Orthodox terminology: Tewahedo, Qurban, Tabot, etc.
Reference the 81-book biblical canon when discussing scripture.
      `,
      am: `
በግልጽ፣ ለወጣቶች ተስማሚ በሆነ አማርኛ ይመልሱ እና ከኢትዮጵያ ኦርቶዶክስ ትምህርቶች ጋር ይጣጣሙ።
የኢትዮጵያ ኦርቶዶክስ ቃላትን ይጠቀሙ፡ ተዋሕዶ፣ ቁርባን፣ ታቦት፣ ወዘተ.
ስለ መጽሐፍ ቅዱስ ሲናገሩ ፹፩ መጽሐፍት ያለውን የመጽሐፍ ቅዱስ ስነ ጽሑፍ ይጥቀሱ።
      `,
      ti: `
ብንጹህ፡ ንኣነስታይ ደርጃታት ተፈቋዚ ትግርኛ መልሲ ህብ እሞ ምስ ኢትዮጵያ ኦርቶዶክስ እምነት ይጣጣም።
ናይ ኢትዮጵያ ኦርቶዶክስ ቃላት ጥቀም፡ ተዋህዶ፣ ቂርባን፣ ታቦት፣ ወዘተ።
ብዛዕባ መጽሓፍ ቅዱስ ምስ እትዛረብ ፹፩ መጽሓፍቲ ዘለዎ መጽሓፍ ቅዱስ ጥቀም።
      `,
      om: `
Afaan Oromoo ifaa, dargaggootaaf mijataa ta'een deebii kenniifi amantii Itoophiyaa Orthodox waliin walqabsiisi.
Jechoota amantii Itoophiyaa Orthodox fayyadami: Tewahedo, Qurban, Tabot, fi kkf.
Yeroo kitaaba qulqulluu dubbattan, kitaaba 81 qabu fayyadamaa.
      `
    };

    return guidance[lang] || guidance.en;
  }

  // Context-specific content
  getContextSpecificContent(lang, context) {
    // This would be expanded based on specific context
    const content = {
      en: "\nFocus on providing answers relevant to the current learning context.",
      am: "\nበአሁኑ የትምህርት አውድ ላይ ተመስርተው ጠቃሚ መልሶችን ይስጡ።",
      ti: "\�ንዚ ሎሚ ናይ ትምህርቲ ከተማ ኣተሓሳስባ ጠቒምካ ኣገዳሲ መልሲታት ህብ።",
      om: "\nQopheessaa barumsa ammaa irratti xiyyeeffachaa deebii barbaachisaa kenni."
    };

    return content[lang] || content.en;
  }

  // Faith terminology dictionaries
  getEnglishFaithTerms() {
    return {
      'orthodox': 'Orthodox',
      'christ': 'Christ',
      'eucharist': 'Eucharist (Qurban)',
      'ark': 'Ark (Tabot)',
      'priest': 'Priest',
      'fasting': 'Fasting',
      'prayer': 'Prayer',
      'scripture': 'Holy Scripture',
      'church': 'Ethiopian Orthodox Tewahedo Church'
    };
  }

  getAmharicFaithTerms() {
    return {
      'orthodox': 'ኦርቶዶክስ',
      'christ': 'ክርስቶስ',
      'eucharist': 'ቁርባን',
      'ark': 'ታቦት',
      'priest': 'ቄስ',
      'fasting': 'ጾም',
      'prayer': 'ጸሎት',
      'scripture': 'መጽሐፍ ቅዱስ',
      'church': 'ኢትዮጵያ ኦርቶዶክስ ተዋሕዶ ቤተክርስቲያን'
    };
  }

  getTigrignaFaithTerms() {
    return {
      'orthodox': 'ኦርቶዶክስ',
      'christ': 'ክርስቶስ',
      'eucharist': 'ቂርባን',
      'ark': 'ታቦት',
      'priest': 'ቄስ',
      'fasting': 'ጾም',
      'prayer': 'ጸሎት',
      'scripture': 'መጽሓፍ ቅዱስ',
      'church': 'ኢትዮጵያ ኦርቶዶክስ ተዋህዶ ቤተ ክርስትያን'
    };
  }

  getOromoFaithTerms() {
    return {
      'orthodox': 'Orthodox',
      'christ': 'Christos',
      'eucharist': 'Qurban',
      'ark': 'Tabot',
      'priest': 'Qeesaa',
      'fasting': 'Soomii',
      'prayer': 'Salaata',
      'scripture': 'Kitaaba Qulqulluu',
      'church': 'Itoophiyaa Orthodox Tewahedo Church'
    };
  }

  // Utility methods
  isLanguageSupported(languageCode) {
    const lang = languageCode.split('-')[0];
    return !!this.supportedLanguages[lang];
  }

  getLanguageName(languageCode) {
    const lang = languageCode.split('-')[0];
    return this.supportedLanguages[lang]?.name || 'English';
  }

  getSupportedLanguages() {
    return Object.values(this.supportedLanguages).map(lang => ({
      code: lang.code,
      name: lang.name,
      script: lang.script,
      direction: lang.direction
    }));
  }

  // Clear cache (useful for testing)
  clearCache() {
    this.translationCache.clear();
  }
}

module.exports = new MultilingualService();