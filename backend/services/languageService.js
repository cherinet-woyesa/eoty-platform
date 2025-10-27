const { openai } = require('../config/aiConfig');

class LanguageService {
  constructor() {
    // Supported languages for the platform
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
  }

  // Detect language of text using AI if available, otherwise use simple heuristics
  async detectLanguage(text) {
    if (openai) {
      try {
        // Use OpenAI to detect language
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are a language detection expert. Respond only with the ISO 639-1 language code (e.g., 'en', 'am', 'ti', 'om', 'so') for the language of the text provided. If you cannot determine the language, respond with 'unknown'."
            },
            {
              role: "user",
              content: `Detect the language of this text: "${text.substring(0, 100)}"`
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

  // Simple heuristic-based language detection
  detectLanguageHeuristic(text) {
    // Character-based detection for Ethiopian languages
    const amharicChars = /[\u1200-\u137F]/g;
    const tigrignaChars = /[\u1200-\u137F]/g; // Similar range to Amharic
    const oromoChars = /[\u1200-\u137F]/g; // Similar range to Amharic
    
    const amharicMatches = text.match(amharicChars);
    const amharicCount = amharicMatches ? amharicMatches.length : 0;
    
    // Simple heuristic - if text contains many Ge'ez characters, likely Amharic/Tigrigna/Oromo
    if (amharicCount > text.length * 0.3) {
      // For now, default to Amharic as it's the most common
      return 'am-ET';
    }
    
    // Check for common English words
    const englishWords = ['the', 'and', 'or', 'but', 'is', 'are', 'was', 'were'];
    const textLower = text.toLowerCase();
    let englishWordCount = 0;
    
    englishWords.forEach(word => {
      if (textLower.includes(word)) {
        englishWordCount++;
      }
    });
    
    if (englishWordCount > 3) {
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

  // Get appropriate prompt for language
  getLanguagePrompt(code) {
    const basePrompts = {
      'en-US': "Please respond in English.",
      'am-ET': "እባክዎ በአማርኛ ይመልሱ።",
      'ti-ET': "በትግርኛ ምላሽ ይስጡ።",
      'om-ET': "Maaloo, Afaan Oromoo keessatti deebi'i.",
      'so-SO': "Fadlan uga jawaab soomaali."
    };
    
    return basePrompts[code] || basePrompts['en-US'];
  }
}

module.exports = new LanguageService();