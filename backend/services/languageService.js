// backend/services/languageService.js - UPDATED WITH FOCUSED LANGUAGES

const { vertexAI } = require('../config/aiConfig-gcp');

class LanguageService {
  constructor() {
    // FOCUSED language support - only the specified languages
    this.supportedLanguages = {
      'en': 'English',
      'am': 'Amharic',
      'ti': 'Tigrigna',
      'om': 'Oromo'
    };
    
    this.languageCodes = {
      'en': 'en-US',
      'am': 'am-ET',
      'ti': 'ti-ET',
      'om': 'om-ET'
    };
    
    // Enhanced language prompts for better responses
    this.languagePrompts = {
      'en-US': "Please respond in English with clear, youth-friendly language that aligns with Ethiopian Orthodox teachings.",
      'am-ET': "እባክዎ በአማርኛ ይመልሱ። የኢትዮጵያ ኦርቶዶክስ ተዋሕዶ ቤተክርስቲያን አስተማሪ ቋንቋ በመጠቀም ለወጣት ግልጽ መልስ ይስጡ።",
      'ti-ET': "በትግርኛ ምላሽ ይስጡ። የኢትዮጵያ ኦርቶዶክስ ተዋሕዶ ቤተክርስቲያን አስተማሪ ቋንቋ በመጠቀም ለወጣት ግልጽ መልስ ይስጡ።",
      'om-ET': "Maaloo, Afaan Oromoo keessatti deebi'i. Yaadota sodaawwanii fi amantii sirna waggaa Oromoo fi Quba sirna keenyaaf deebi'aa hubachuu barbaadu keessatti gargaaraa."
    };
  }

  // Detect language of text using AI if available, otherwise use simple heuristics
  async detectLanguage(text) {
    if (vertexAI) {
      try {
        // Use Vertex AI to detect language with enhanced prompt
        const model = vertexAI.preview.getGenerativeModel({
          model: 'gemini-pro',
          generationConfig: {
            maxOutputTokens: 10,
            temperature: 0,
          }
        });

        const prompt = `
You are a language detection expert specializing in Ethiopian languages. 
Respond only with the ISO 639-1 language code (e.g., 'en', 'am', 'ti', 'om') for the language of the text provided. 
If you cannot determine the language, respond with 'en'. 
Focus on detecting these specific languages: English (en), Amharic (am), Tigrigna (ti), Oromo (om).

Text: "${text.substring(0, 150)}"
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const detectedLang = response.candidates[0].content.parts[0].text.trim().toLowerCase();
        
        // Validate it's one of our supported languages
        if (this.supportedLanguages[detectedLang]) {
          return this.languageCodes[detectedLang] || 'en-US';
        }
        
        return 'en-US'; // Default to English if unsupported
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
    
    // If text contains Ge'ez characters, likely Amharic/Tigrigna
    if (amharicCount > textLength * 0.2) {
      // Try to distinguish between Amharic and Tigrigna
      // This is a simplified approach - in production you'd use more sophisticated detection
      
      // Common Amharic words
      const amharicWords = ['ውስጥ', 'ነው', 'እና', 'ወደ', 'አለ', 'በ'];
      const tigrignaWords = ['እዩ', 'ከም', 'ዶ', 'ን', 'ይ', 'ኣሎ'];
      
      let amharicScore = 0;
      let tigrignaScore = 0;
      
      amharicWords.forEach(word => {
        if (text.includes(word)) amharicScore++;
      });
      
      tigrignaWords.forEach(word => {
        if (text.includes(word)) tigrignaScore++;
      });
      
      if (amharicScore > tigrignaScore) {
        return 'am-ET';
      } else if (tigrignaScore > amharicScore) {
        return 'ti-ET';
      }
      
      // Default to Amharic as it's more common
      return 'am-ET';
    }
    
    // Check for common English words
    const englishWords = ['the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'what', 'how', 'why'];
    const textLower = text.toLowerCase();
    let englishWordCount = 0;
    
    englishWords.forEach(word => {
      if (textLower.includes(` ${word} `)) {
        englishWordCount++;
      }
    });
    
    if (englishWordCount > 1) {
      return 'en-US';
    }
    
    // Check for Oromo patterns (Latin script with specific characters)
    const oromoChars = /[chdhnrstwy']/gi;
    const oromoMatches = textLower.match(oromoChars);
    const oromoRatio = oromoMatches ? oromoMatches.length / textLength : 0;
    
    if (oromoRatio > 0.3) {
      // Common Oromo words
      const oromoWords = ['akka', 'inni', 'isaan', 'kan', 'kana', 'keessa', 'jira'];
      const oromoWordCount = oromoWords.filter(word => textLower.includes(word)).length;
      
      if (oromoWordCount > 0) {
        return 'om-ET';
      }
    }
    
    // Default to English
    return 'en-US';
  }

  // Get language name from code
  getLanguageName(code) {
    const baseCode = code.split('-')[0];
    return this.supportedLanguages[baseCode] || 'English';
  }

  // Check if language is supported
  isLanguageSupported(code) {
    const baseCode = code.split('-')[0];
    return !!this.supportedLanguages[baseCode];
  }

  // Get appropriate prompt for language with enhanced context
  getLanguagePrompt(code) {
    return this.languagePrompts[code] || this.languagePrompts['en-US'];
  }
  
  // Get supported languages list
  getSupportedLanguages() {
    return Object.values(this.languageCodes);
  }
  
  // Get language code mapping
  getLanguageCodeMapping() {
    return { ...this.languageCodes };
  }
  
  // NEW: Check if language is Ethiopian language
  isEthiopianLanguage(code) {
    const ethiopianCodes = ['am-ET', 'ti-ET', 'om-ET'];
    return ethiopianCodes.includes(code);
  }
}

module.exports = new LanguageService();