const { openai } = require('../config/aiConfig');

class LanguageService {
  constructor() {
    // Supported languages for the platform with enhanced information
    this.supportedLanguages = {
      'en': 'English',
      'am': 'Amharic',
      'ti': 'Tigrigna',
      'om': 'Oromo',
      'so': 'Somali'
    };
    
    this.languageCodes = {
      'en': 'en-US',
      'am': 'am-ET',
      'ti': 'ti-ET',
      'om': 'om-ET',
      'so': 'so-SO'
    };
    
    // Enhanced language prompts for better responses
    this.languagePrompts = {
      'en-US': "Please respond in English with clear, youth-friendly language that aligns with Ethiopian Orthodox teachings.",
      'am-ET': "እባክዎ በአማርኛ ይመልሱ። የኢትዮጵያ ኦርቶዶክስ ተዋሕዶ ቤተክርስቲያን አስተማሪ ቋንቋ በመጠቀም ለወጣት ግልጽ መልስ ይስጡ።",
      'ti-ET': "በትግርኛ ምላሽ ይስጡ። የኢትዮጵያ ኦርቶዶክስ ተዋሕዶ ቤተክርስቲያን አስተማሪ ቋንቋ በመጠቀም ለወጣት ግልጽ መልስ ይስጡ።",
      'om-ET': "Maaloo, Afaan Oromoo keessatti deebi'i. Yaadota sodaawwanii fi amantii sirna waggaa Oromoo fi Quba sirna keenyaaf deebi'aa hubachuu barbaadu keessatti gargaaraa.",
      'so-SO': "Fadlan uga jawaab soomaali. Si cad uga jawaab su'aalaha iyo barashada dadweynaha ee Kaniisadda Orthodox tiyoorooduxii Itoobiya."
    };
  }

  // Detect language of text using AI if available, otherwise use simple heuristics
  async detectLanguage(text) {
    if (openai) {
      try {
        // Use OpenAI to detect language with enhanced prompt
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are a language detection expert specializing in Ethiopian languages. Respond only with the ISO 639-1 language code (e.g., 'en', 'am', 'ti', 'om', 'so') for the language of the text provided. If you cannot determine the language, respond with 'unknown'. Pay special attention to Ge'ez script characters which indicate Amharic, Tigrigna, or Oromo."
            },
            {
              role: "user",
              content: `Detect the language of this text: "${text.substring(0, 150)}"`
            }
          ],
          max_tokens: 10,
          temperature: 0
        });

        const detectedLang = completion.choices[0].message.content.trim().toLowerCase();
        return this.languageCodes[detectedLang] || 'en-US';
      } catch (error) {
        console.warn('Language detection with AI failed, falling back to heuristics:', error);
      }
    }

    // Fallback to heuristic-based detection
    return this.detectLanguageHeuristic(text);
  }

  // Simple heuristic-based language detection with improved accuracy
  detectLanguageHeuristic(text) {
    // Character-based detection for Ethiopian languages
    const amharicChars = /[\u1200-\u137F]/g;
    const textLength = text.length;
    
    if (textLength === 0) return 'en-US';
    
    const amharicMatches = text.match(amharicChars);
    const amharicCount = amharicMatches ? amharicMatches.length : 0;
    
    // Simple heuristic - if text contains many Ge'ez characters, likely Amharic/Tigrigna/Oromo
    if (amharicCount > textLength * 0.2) {
      // More sophisticated detection based on character patterns
      // Amharic typically has more vowel characters in certain ranges
      const amharicVowels = /[\u1200-\u1247]/g;
      const amharicVowelMatches = text.match(amharicVowels);
      const amharicVowelCount = amharicVowelMatches ? amharicVowelMatches.length : 0;
      
      if (amharicVowelCount > amharicCount * 0.4) {
        return 'am-ET';
      }
      
      // For now, default to Amharic as it's the most common
      return 'am-ET';
    }
    
    // Check for common English words
    const englishWords = ['the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'what', 'how', 'why'];
    const textLower = text.toLowerCase();
    let englishWordCount = 0;
    
    englishWords.forEach(word => {
      if (textLower.includes(word)) {
        englishWordCount++;
      }
    });
    
    if (englishWordCount > 2) {
      return 'en-US';
    }
    
    // Default to English
    return 'en-US';
  }

  // Get language name from code
  getLanguageName(code) {
    return this.supportedLanguages[code.split('-')[0]] || 'English';
  }

  // Check if language is supported
  isLanguageSupported(code) {
    return !!this.supportedLanguages[code.split('-')[0]];
  }

  // Get appropriate prompt for language with enhanced context
  getLanguagePrompt(code) {
    return this.languagePrompts[code] || this.languagePrompts['en-US'];
  }
  
  // Get supported languages list
  getSupportedLanguages() {
    return Object.keys(this.supportedLanguages);
  }
  
  // Get language code mapping
  getLanguageCodeMapping() {
    return { ...this.languageCodes };
  }
}

module.exports = new LanguageService();