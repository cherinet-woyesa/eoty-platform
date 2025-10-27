// Enhanced speech-to-text functionality with multi-language support
// Supports Web Speech API (browser-native) and placeholder for cloud services

interface SpeechRecognitionEvent extends Event {
  results: {
    [key: number]: {
      [key: number]: {
        transcript: string;
        confidence: number;
      };
      length: number;
    };
    length: number;
  };
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export const speechToText = {
  // Supported languages for the platform
  supportedLanguages: {
    'en-US': 'English (US)',
    'en-CA': 'English (Canada)',
    'en-GB': 'English (UK)',
    'am-ET': 'Amharic (Ethiopia)',
    'ti-ET': 'Tigrigna (Ethiopia)',
    'om-ET': 'Oromo (Ethiopia)',
    'so-SO': 'Somali (Somalia)'
  },

  // Get user's preferred language
  getUserLanguage(): string {
    const userLang = navigator.language;
    // Map common language codes to our supported ones
    const langMap: Record<string, string> = {
      'am': 'am-ET',
      'ti': 'ti-ET',
      'om': 'om-ET',
      'so': 'so-SO'
    };
    
    const baseLang = userLang.split('-')[0];
    return langMap[baseLang] || userLang;
  },

  // Placeholder function - would be implemented with actual STT service
  transcribeAudio: async (audioBlob: Blob, language: string = 'en-US'): Promise<string> => {
    // For now, return a placeholder message
    // In production, this would send the audio to a speech-to-text service
    console.log(`Audio transcription for language ${language} would happen here with actual STT service`);
    
    return "This is a placeholder transcription. In production, this would be the actual transcribed text from the audio.";
  },

  // Check if browser supports Web Speech API
  isBrowserSupported(): boolean {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  },

  // Browser-native speech recognition with multi-language support
  startBrowserRecognition: (language?: string): Promise<{transcript: string, confidence: number}> => {
    return new Promise((resolve, reject) => {
      if (!speechToText.isBrowserSupported()) {
        reject(new Error('Speech recognition not supported in this browser'));
        return;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language || speechToText.getUserLanguage();

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const result = event.results[0][0];
        const transcript = result.transcript;
        const confidence = result.confidence;
        resolve({ transcript, confidence });
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        reject(new Error(`Speech recognition error: ${event.error} - ${event.message}`));
      };

      recognition.onend = () => {
        // Recognition ended
      };

      recognition.start();
    });
  },

  // Enhanced browser recognition with better error handling
  startEnhancedBrowserRecognition: async (language?: string): Promise<{transcript: string, confidence: number, language: string}> => {
    try {
      const lang = language || speechToText.getUserLanguage();
      const result = await speechToText.startBrowserRecognition(lang);
      return {
        ...result,
        language: lang
      };
    } catch (error) {
      // Fallback to English if language-specific recognition fails
      if (language && language !== 'en-US') {
        try {
          const result = await speechToText.startBrowserRecognition('en-US');
          return {
            ...result,
            language: 'en-US'
          };
        } catch (fallbackError) {
          throw error; // Throw original error if fallback also fails
        }
      }
      throw error;
    }
  },

  // Detect if the language is supported by the browser
  isLanguageSupported(language: string): boolean {
    if (!speechToText.isBrowserSupported()) return false;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    try {
      recognition.lang = language;
      return true;
    } catch (e) {
      return false;
    }
  }
};