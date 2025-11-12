// frontend/src/services/api/speechToText.ts

// Enhanced speech-to-text functionality with focused language support
// Supports Web Speech API (browser-native) and cloud service fallback

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
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
  maxAlternatives: number;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  onstart: () => void;
  onnomatch: () => void;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface TranscriptionResult {
  transcript: string;
  confidence: number;
  language: string;
  isFinal: boolean;
  words?: Array<{
    word: string;
    startTime: number;
    endTime: number;
    confidence: number;
  }>;
  originalLanguage?: string;
  isFallback?: boolean;
}

interface SpeechToTextConfig {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  timeout: number;
}

type EthiopianLanguageCode = 'am-ET' | 'ti-ET' | 'om-ET';
type SupportedLanguageCode = EthiopianLanguageCode | 'en-US';

interface LanguageSupport {
  'am-ET': boolean;
  'ti-ET': boolean;
  'om-ET': boolean;
  'en-US': boolean;
}

interface LanguageNames {
  'am-ET': string;
  'ti-ET': string;
  'om-ET': string;
  'en-US': string;
}

interface BrowserCompatibility {
  supported: boolean;
  languages: string[];
  limitations: string;
  browser: string;
  version?: string;
}

interface AudioQualityCheck {
  valid: boolean;
  issues: string[];
  duration?: number;
  size?: number;
  sampleRate?: number;
}

export const speechToText = {
  // FOCUSED language support - only the specified languages
  supportedLanguages: {
    'en-US': 'English (US)',
    'am-ET': 'Amharic (Ethiopia)',
    'ti-ET': 'Tigrigna (Ethiopia)', 
    'om-ET': 'Oromo (Ethiopia)'
  } as Record<SupportedLanguageCode, string>,

  // Language compatibility mapping for better browser support
  languageCompatibility: {
    'am-ET': ['am-ET', 'en-US'] as SupportedLanguageCode[],
    'ti-ET': ['ti-ET', 'am-ET', 'en-US'] as SupportedLanguageCode[],
    'om-ET': ['om-ET', 'en-US'] as SupportedLanguageCode[],
    'en-US': ['en-US'] as SupportedLanguageCode[]
  },

  // Default configuration
  defaultConfig: {
    continuous: false,
    interimResults: true,
    maxAlternatives: 1,
    timeout: 10000 // 10 seconds
  } as SpeechToTextConfig,

  // Enhanced browser support detection
  getBrowserCompatibility(): BrowserCompatibility {
    const supported = this.isBrowserSupported();
    const userAgent = navigator.userAgent;
    let browser = 'Unknown';
    let version = '';

    // Detect browser
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      browser = 'Chrome';
      const match = userAgent.match(/Chrome\/(\d+)/);
      version = match ? match[1] : '';
    } else if (userAgent.includes('Firefox')) {
      browser = 'Firefox';
      const match = userAgent.match(/Firefox\/(\d+)/);
      version = match ? match[1] : '';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      browser = 'Safari';
      const match = userAgent.match(/Version\/(\d+)/);
      version = match ? match[1] : '';
    } else if (userAgent.includes('Edg')) {
      browser = 'Edge';
      const match = userAgent.match(/Edg\/(\d+)/);
      version = match ? match[1] : '';
    }

    const supportedLanguages = this.getSupportedLanguages().filter(lang => 
      this.isLanguageSupported(lang)
    );
    
    let limitations = '';
    if (!supported) {
      limitations = 'Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari 14.1+.';
    } else if (supportedLanguages.length === 0) {
      limitations = 'No languages supported in this browser.';
    } else if (supportedLanguages.length < Object.keys(this.supportedLanguages).length) {
      const unsupported = this.getSupportedLanguages().filter(lang => !supportedLanguages.includes(lang));
      limitations = `Limited language support. Unsupported: ${unsupported.map(lang => this.supportedLanguages[lang as SupportedLanguageCode]).join(', ')}.`;
    }
    
    return {
      supported,
      languages: supportedLanguages,
      limitations,
      browser,
      version
    };
  },

  // Enhanced Ethiopian language support detection
  getEthiopianLanguageSupport(): LanguageSupport {
    const support: LanguageSupport = {
      'am-ET': false,
      'ti-ET': false,
      'om-ET': false,
      'en-US': true // English is generally supported
    };

    if (!this.isBrowserSupported()) {
      return support;
    }

    // Test each Ethiopian language
    const testLanguages: EthiopianLanguageCode[] = ['am-ET', 'ti-ET', 'om-ET'];
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    testLanguages.forEach((lang: EthiopianLanguageCode) => {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = lang;
        // If no error is thrown, the language is supported
        support[lang] = true;
      } catch (e) {
        support[lang] = false;
        console.warn(`Language ${lang} not supported:`, e);
      }
    });

    return support;
  },

  // Enhanced error messages for Ethiopian languages
  getLanguageErrorMessage(language: string): string {
    const languageNames: LanguageNames = {
      'am-ET': 'Amharic',
      'ti-ET': 'Tigrigna', 
      'om-ET': 'Afan Oromo',
      'en-US': 'English'
    };

    const support = this.getEthiopianLanguageSupport();
    const langKey = language as keyof LanguageNames;
    
    if (!support[language as keyof LanguageSupport] && language !== 'en-US') {
      return `${languageNames[langKey]} voice input is not fully supported in your browser. Please try Chrome or Edge for better Ethiopian language support, or type your question instead.`;
    }

    return `Voice input for ${languageNames[langKey]} is available.`;
  },

  // Get user's preferred language with enhanced detection
  getUserLanguage(): SupportedLanguageCode {
    const userLang = navigator.language;
    const browserLang = navigator.language || (navigator as any).userLanguage;
    const systemLang = (navigator as any).systemLanguage;
    
    const availableLang = userLang || browserLang || systemLang || 'en-US';
    
    // Focused mapping for Ethiopian languages only
    const langMap: Record<string, SupportedLanguageCode> = {
      'am': 'am-ET',
      'ti': 'ti-ET', 
      'om': 'om-ET',
      'en': 'en-US'
    };
    
    const baseLang = availableLang.split('-')[0].toLowerCase();
    return langMap[baseLang] || 'en-US';
  },

  // Main transcription service with enhanced error handling
  async transcribeAudio(audioBlob: Blob, language: string = 'en-US'): Promise<TranscriptionResult> {
    // Validate input
    if (!audioBlob || audioBlob.size === 0) {
      throw new Error('No audio data provided for transcription.');
    }

    // Validate language
    const langCode = language as SupportedLanguageCode;
    if (!this.supportedLanguages[langCode]) {
      throw new Error(`Language ${language} is not supported. Please use one of: ${Object.keys(this.supportedLanguages).join(', ')}`);
    }

    // Validate audio quality
    const qualityCheck = this.validateAudioQuality(audioBlob);
    if (!qualityCheck.valid) {
      throw new Error(`Audio quality issues: ${qualityCheck.issues.join(', ')}`);
    }

    try {
      // First, try browser-native recognition if supported
      if (this.isBrowserSupported() && this.isLanguageSupported(language)) {
        console.log(`Using browser-native speech recognition for ${this.supportedLanguages[langCode]}`);
        return await this.startBrowserRecognition(language);
      }

      // Fallback to cloud-based transcription service
      console.log(`Using cloud transcription service for ${this.supportedLanguages[langCode]}`);
      return await this.transcribeWithCloudService(audioBlob, language);
      
    } catch (error) {
      console.error('Transcription failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Speech recognition unavailable for ${this.supportedLanguages[langCode]}. ${errorMessage}`);
    }
  },

  // Cloud-based transcription service with enhanced error handling
  async transcribeWithCloudService(audioBlob: Blob, language: string): Promise<TranscriptionResult> {
    const formData = new FormData();
    formData.append('audio', audioBlob, `recording-${Date.now()}.webm`);
    formData.append('language', language);
    formData.append('timestamp', new Date().toISOString());
    
    try {
      const response = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Transcription service error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.transcript) {
        throw new Error('No transcription result received from service');
      }
      
      return {
        transcript: result.transcript,
        confidence: result.confidence || 0.7,
        language: result.language || language,
        isFinal: true,
        words: result.words
      };
    } catch (error) {
      console.error('Cloud transcription failed:', error);
      
      // Provide helpful fallback message
      const langName = this.supportedLanguages[language as SupportedLanguageCode];
      return {
        transcript: `Voice input for ${langName} requires additional configuration. Please type your question or try in English.`,
        confidence: 0,
        language,
        isFinal: true
      };
    }
  },

  // Check if browser supports Web Speech API
  isBrowserSupported(): boolean {
    return !!(window.webkitSpeechRecognition || (window as any).SpeechRecognition);
  },

  // Enhanced browser-native speech recognition with better error handling
  startBrowserRecognition(language: string, config: Partial<SpeechToTextConfig> = {}): Promise<TranscriptionResult> {
    return new Promise((resolve, reject) => {
      if (!this.isBrowserSupported()) {
        reject(new Error('Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari 14.1+ for best results.'));
        return;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      const finalConfig = { ...this.defaultConfig, ...config };
      
      recognition.continuous = finalConfig.continuous;
      recognition.interimResults = finalConfig.interimResults;
      recognition.lang = language;
      recognition.maxAlternatives = finalConfig.maxAlternatives;

      let timeoutId: NodeJS.Timeout;
      let hasResult = false;
      let finalTranscript = '';
      let highestConfidence = 0;

      // Set timeout for recognition
      timeoutId = setTimeout(() => {
        if (!hasResult) {
          recognition.stop();
          reject(new Error('Speech recognition timeout. No speech detected. Please try speaking again.'));
        }
      }, finalConfig.timeout);

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        clearTimeout(timeoutId);
        hasResult = true;

        const results = event.results;
        const lastResult = results[results.length - 1];
        const alternative = lastResult[0];
        
        finalTranscript = alternative.transcript;
        highestConfidence = Math.max(highestConfidence, alternative.confidence);

        // If this is a final result, resolve immediately
        if (lastResult.isFinal) {
          recognition.stop();
          resolve({
            transcript: finalTranscript,
            confidence: highestConfidence,
            language,
            isFinal: true
          });
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        clearTimeout(timeoutId);
        console.error('Speech recognition error:', event.error, event.message);
        
        let userMessage = 'Speech recognition error. ';
        
        switch (event.error) {
          case 'not-allowed':
          case 'permission-denied':
            userMessage += 'Microphone permission denied. Please allow microphone access in your browser settings.';
            break;
          case 'audio-capture':
            userMessage += 'No microphone detected. Please check your audio device.';
            break;
          case 'network':
            userMessage += 'Network error occurred. Please check your internet connection.';
            break;
          case 'language-not-supported':
            userMessage += `${this.supportedLanguages[language as SupportedLanguageCode]} not supported in this browser. Please try English or type your question.`;
            break;
          case 'no-speech':
            userMessage += 'No speech detected. Please speak clearly into your microphone.';
            break;
          case 'service-not-allowed':
            userMessage += 'Speech recognition service not allowed. Please check your browser settings.';
            break;
          default:
            userMessage += `Please try again or type your question. (${event.error})`;
        }
        
        reject(new Error(userMessage));
      };

      recognition.onend = () => {
        clearTimeout(timeoutId);
        if (!hasResult) {
          reject(new Error('No speech detected. Please try speaking clearly into your microphone.'));
        } else if (finalTranscript) {
          // If we have a transcript but no final result, use what we have
          resolve({
            transcript: finalTranscript,
            confidence: highestConfidence,
            language,
            isFinal: true
          });
        }
      };

      recognition.onnomatch = () => {
        console.log('No speech recognition match found');
        reject(new Error('Speech not recognized. Please try speaking more clearly or check your microphone.'));
      };

      recognition.onstart = () => {
        console.log(`Speech recognition started for ${this.supportedLanguages[language as SupportedLanguageCode]}`);
      };

      try {
        recognition.start();
      } catch (error) {
        clearTimeout(timeoutId);
        reject(new Error(`Failed to start speech recognition: ${error}`));
      }
    });
  },

  // Enhanced browser recognition with comprehensive fallback strategy
  async startEnhancedBrowserRecognition(preferredLanguage?: string): Promise<TranscriptionResult> {
    const language = (preferredLanguage || this.getUserLanguage()) as SupportedLanguageCode;
    
    console.log(`Attempting speech recognition in: ${this.supportedLanguages[language]}`);
    
    // Validate language is supported
    if (!this.supportedLanguages[language]) {
      throw new Error(`Language ${language} is not supported. Supported languages: ${Object.keys(this.supportedLanguages).join(', ')}`);
    }

    try {
      // Try preferred language first
      return await this.startBrowserRecognition(language);
    } catch (error: any) {
      console.warn(`Primary language (${this.supportedLanguages[language]}) recognition failed:`, error.message);
      
      // If language-specific failed, try fallback chain
      const fallbackChain = this.languageCompatibility[language] || ['en-US'];
      
      for (const fallbackLang of fallbackChain) {
        if (fallbackLang === language) continue;
          
        try {
          console.log(`Trying fallback language: ${this.supportedLanguages[fallbackLang]}`);
          const result = await this.startBrowserRecognition(fallbackLang);
          return {
            ...result,
            language: fallbackLang,
            originalLanguage: language,
            isFallback: true
          };
        } catch (fallbackError) {
          console.warn(`Fallback language ${this.supportedLanguages[fallbackLang]} also failed:`, fallbackError);
          continue;
        }
      }
      
      // All fallbacks failed
      throw new Error(`Speech recognition unavailable for ${this.supportedLanguages[language]}. ${error.message}`);
    }
  },

  // Enhanced language support detection
  isLanguageSupported(language: string): boolean {
    if (!this.isBrowserSupported()) return false;
    
    const langCode = language as SupportedLanguageCode;
    if (!this.supportedLanguages[langCode]) {
      return false;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = language;
      
      // Ethiopian languages have limited browser support
      const ethiopianLanguages: EthiopianLanguageCode[] = ['am-ET', 'ti-ET', 'om-ET'];
      if (ethiopianLanguages.includes(langCode as EthiopianLanguageCode)) {
        const support = this.getEthiopianLanguageSupport();
        if (!support[langCode as keyof LanguageSupport]) {
          console.warn(`Ethiopian language ${this.supportedLanguages[langCode]} has limited browser support`);
          return false;
        }
      }
      
      return true;
    } catch (e) {
      return false;
    }
  },

  // Enhanced audio quality validation
  validateAudioQuality(audioBlob: Blob): AudioQualityCheck {
    const issues: string[] = [];
    
    // Check file size
    if (audioBlob.size < 1000) {
      issues.push('Audio recording too short or empty (minimum 1KB required)');
    }
    
    if (audioBlob.size > 10 * 1024 * 1024) {
      issues.push('Audio file too large (maximum 10MB allowed)');
    }
    
    // Check MIME type
    const validTypes = ['audio/webm', 'audio/mp4', 'audio/wav', 'audio/mpeg', 'audio/ogg'];
    if (!validTypes.includes(audioBlob.type) && audioBlob.type !== '') {
      issues.push(`Unsupported audio format: ${audioBlob.type}. Supported: ${validTypes.join(', ')}`);
    }
    
    return {
      valid: issues.length === 0,
      issues,
      size: audioBlob.size,
      duration: undefined // Could be enhanced with actual duration calculation
    };
  },

  // Get list of supported languages
  getSupportedLanguages(): string[] {
    return Object.keys(this.supportedLanguages);
  },

  // Get language display name
  getLanguageDisplayName(code: string): string {
    return this.supportedLanguages[code as SupportedLanguageCode] || code;
  },

  // Check if language is Ethiopian language
  isEthiopianLanguage(code: string): boolean {
    const ethiopianLanguages: EthiopianLanguageCode[] = ['am-ET', 'ti-ET', 'om-ET'];
    return ethiopianLanguages.includes(code as EthiopianLanguageCode);
  },

  // Get recommended browser for language
  getRecommendedBrowser(language: string): string {
    if (this.isEthiopianLanguage(language)) {
      return 'Chrome or Edge for best Ethiopian language support';
    }
    return 'Any modern browser';
  },

  // Utility to stop any ongoing recognition
  stopAllRecognition(): void {
    // This would need to be implemented if we keep track of recognition instances
    console.log('Stop all recognition requested');
  }
};