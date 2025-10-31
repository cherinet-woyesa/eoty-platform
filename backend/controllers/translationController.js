// backend/controllers/translationController.js - NEW FILE
const multilingualService = require('../services/multilingualService');

const translationController = {
  // Detect language of text
  async detectLanguage(req, res) {
    try {
      const { text } = req.body;

      if (!text || text.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Text is required for language detection'
        });
      }

      const detectedLang = await multilingualService.detectLanguage(text);

      res.json({
        success: true,
        data: {
          detectedLanguage: detectedLang,
          languageName: multilingualService.getLanguageName(detectedLang),
          confidence: 'high' // Would be calculated in production
        }
      });
    } catch (error) {
      console.error('Language detection error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to detect language'
      });
    }
  },

  // Translate text between languages
  async translateText(req, res) {
    try {
      const { text, targetLanguage, sourceLanguage } = req.body;

      if (!text || !targetLanguage) {
        return res.status(400).json({
          success: false,
          message: 'Text and target language are required'
        });
      }

      if (!multilingualService.isLanguageSupported(targetLanguage)) {
        return res.status(400).json({
          success: false,
          message: `Target language ${targetLanguage} is not supported`
        });
      }

      const translatedText = await multilingualService.translateText(
        text, 
        targetLanguage, 
        sourceLanguage
      );

      res.json({
        success: true,
        data: {
          originalText: text,
          translatedText: translatedText,
          sourceLanguage: sourceLanguage || 'auto-detected',
          targetLanguage: targetLanguage
        }
      });
    } catch (error) {
      console.error('Translation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to translate text'
      });
    }
  },

  // Get supported languages
  async getSupportedLanguages(req, res) {
    try {
      const languages = multilingualService.getSupportedLanguages();

      res.json({
        success: true,
        data: {
          languages,
          total: languages.length
        }
      });
    } catch (error) {
      console.error('Get supported languages error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch supported languages'
      });
    }
  },

  // Get faith terms for a specific language
  async getFaithTerms(req, res) {
    try {
      const { language } = req.params;
      
      if (!multilingualService.isLanguageSupported(language)) {
        return res.status(400).json({
          success: false,
          message: `Language ${language} is not supported`
        });
      }

      const langConfig = multilingualService.supportedLanguages[language.split('-')[0]];
      
      res.json({
        success: true,
        data: {
          language: langConfig.name,
          faithTerms: langConfig.faithTerms
        }
      });
    } catch (error) {
      console.error('Get faith terms error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch faith terms'
      });
    }
  }
};

module.exports = translationController;