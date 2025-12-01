// backend/config/aiConfig-gcp.js - GOOGLE CLOUD VERTEX AI VERSION
const { VertexAI } = require('@google-cloud/vertexai');
const { Storage } = require('@google-cloud/storage');

// Initialize Vertex AI
let vertexAI = null;
let storage = null;

try {
  if (process.env.GOOGLE_CLOUD_PROJECT) {
    vertexAI = new VertexAI({
      project: process.env.GOOGLE_CLOUD_PROJECT,
      location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'
    });

    storage = new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT
    });

    console.log('✅ Google Cloud AI and Storage initialized successfully');
  } else {
    console.warn('⚠️ GOOGLE_CLOUD_PROJECT not set. AI features will be disabled.');
  }
} catch (error) {
  console.error('❌ Failed to initialize Google Cloud AI:', error.message);
}

const aiConfig = {
  // Vertex AI Model configurations
  // Preferred model (first entry) plus safe fallbacks. If the preferred model is not
  // available to the project, the service will try the next candidate.
  // NOTE: availability of models depends on your Google Cloud project access.
  chatModelCandidates: [
    'gemini-1.5-pro',       // Best quality (closest to Claude Sonnet class)
    'gemini-1.5-flash',     // High speed/efficiency
    'gemini-pro'            // Legacy fallback
  ],
  // Backwards-compatible single value for quick checks (first candidate)
  chatModel: 'gemini-1.5-pro',
  embeddingModel: 'text-embedding-004',

  // Response settings optimized for Vertex AI
  maxTokens: 1200,
  temperature: 0.4, // Lower temperature for more consistent, faith-aligned outputs

  // Enhanced faith alignment settings with comprehensive Ethiopian Orthodox context
  faithContext: `
CRITICAL FAITH ALIGNMENT CONTEXT - ETHIOPIAN ORTHODOX TEWAHEDO CHURCH

YOU ARE: An AI assistant exclusively for Ethiopian Orthodox Tewahedo Church education
MANDATE: Provide doctrinally accurate responses aligned with Tewahedo tradition only

NON-NEGOTIABLE DOCTRINAL POSITIONS:
- Tewahedo (Unity) of Christ's divine and human natures without separation, mixture, or confusion
- Full acceptance of 81 books of the Ethiopian Orthodox Bible (46 OT + 35 NT)
- Seven canonical sacraments: Baptism, Confirmation, Eucharist, Confession, Anointing, Matrimony, Holy Orders
- Veneration of Saints, especially St. Mary (Mariam) as Theotokos
- Real Presence in the Eucharist (Qurban)
- Apostolic succession through St. Mark of Alexandria
- Authority of the Council of Nicaea (325), Constantinople (381), and Ephesus (431)

ESSENTIAL ETHIOPIAN ORTHODOX REFERENCES:
SCRIPTURES: Include references from Enoch, Jubilees, Ethiopian Synaxarium, and Mets'hafe Berhan
SAINTS: Nine Syrian Saints, St. Frumentius (Abune Selama), St. Yared, St. Gebre Menfes Kidus
LITURGY: Divine Liturgy of St. Basil, Liturgy of the Apostles, Ethiopian Anaphora
FEASTS: Timkat (Epiphany), Meskel (Finding of True Cross), Enkutatash (New Year), Hosanna (Palm Sunday)
PRACTICES: 250+ fasting days, prayer 7 times daily, sign of the cross right to left

SPECIFIC TEACHINGS TO EMPHASIZE:
- The Ark of the Covenant (Tabot) resides in Axum and is central to worship
- Ge'ez as the liturgical language preserving ancient traditions
- Monastic tradition from Debre Damo, Debre Libanos, Waldiba
- Coptic connection while maintaining Ethiopian ecclesiastical independence
- Importance of Patriarch-Catholicos of Ethiopia

RESPONSE REQUIREMENTS:
1. Always cite specific Ethiopian Orthodox sources when available
2. Reference appropriate scriptures from the 81-book canon
3. Use Ethiopian Orthodox terminology: Tewahedo, Qurban, Tabot, Abune, Liqawint
4. When discussing sacraments, reference Ethiopian liturgical practices
5. For historical questions, include Ethiopian Church history perspectives
6. Always recommend consulting local clergy for personal spiritual guidance
7. Maintain respectful tone while being educationally rigorous

PROHIBITED CONTENT:
- Do not compare or contrast with other Christian traditions
- Do not engage in ecumenical theological discussions
- Do not speculate beyond established Tewahedo doctrine
- Do not provide personal opinions or interpretations
- Do not discuss modern social issues without clear doctrinal basis

EXAMPLE RESPONSE FRAMEWORK:
"For questions about [topic], the Ethiopian Orthodox Tewahedo Church teaches...
This is based on [specific scripture/source]...
In practice, this is observed through [specific Ethiopian tradition]...
For personal guidance, we recommend speaking with your local priest or Abune."

CRITICAL: If any question touches on sensitive topics (heresy, ecumenism, modern controversies),
escalate for moderation and state: "This question requires review by church authorities for doctrinal accuracy."
  `,

  // Enhanced validation thresholds optimized for Vertex AI
  validationThresholds: {
    minFaithAlignmentScore: 0.85,
    maxResponseTimeMs: 3000,
    minScriptureReferences: 1, // Require at least one scripture reference when appropriate
    maxSensitiveTopicScore: 0.3
  },

  // Cloud Storage configuration for AI content
  storageBucket: process.env.GCS_AI_BUCKET || 'edu-platform-ai-content',
  contentNamespace: 'faith-content',

  // Enhanced Ethiopian Orthodox content categories for better retrieval
  contentCategories: {
    doctrine: ['tewahedo', 'trinity', 'incarnation', 'sacraments'],
    scripture: ['bible', 'enoch', 'jubilees', 'synaxarium'],
    liturgy: ['qurban', 'prayer', 'fasting', 'feasts'],
    history: ['nine_saints', 'axum', 'lalibela', 'monasticism'],
    saints: ['mariam', 'george', 'michael', 'tekle_haymanot']
  },

  // Multi-language support configuration
  supportedLanguages: {
    am: 'Amharic',
    en: 'English',
    gez: 'Ge\'ez (Liturgical)'
  },

  // Context awareness settings
  contextSettings: {
    lessonWeight: 0.4,
    chapterWeight: 0.3,
    userHistoryWeight: 0.2,
    globalContextWeight: 0.1
  }
};

// Enhanced faith alignment validation function optimized for Vertex AI
aiConfig.validateFaithAlignment = function(response, context = {}) {
  const validation = {
    isAligned: true,
    score: 1.0,
    issues: [],
    suggestions: []
  };

  const responseLower = response.toLowerCase();

  // Check for Ethiopian Orthodox specific terminology
  const faithTerms = [
    'tewahedo', 'ethiopian orthodox', 'abune', 'qurban', 'tabot',
    'geez', 'timkat', 'meskel', 'hudade', 'nine saints',
    'synaxarium', 'metsehafe berhan', 'lalibela', 'axum'
  ];

  const foundTerms = faithTerms.filter(term => responseLower.includes(term));
  validation.score = Math.min(1.0, 0.3 + (foundTerms.length * 0.1));

  // Check for problematic terms that might indicate non-aligned content
  const problematicTerms = [
    'protestant', 'catholic view', 'compared to', 'versus',
    'modern interpretation', 'some churches', 'alternative view'
  ];

  problematicTerms.forEach(term => {
    if (responseLower.includes(term)) {
      validation.issues.push(`Contains potentially problematic term: ${term}`);
      validation.score -= 0.2;
    }
  });

  // Validate scripture references (should include Ethiopian canon when appropriate)
  const scriptureRefs = response.match(/\b(\d?\s?[A-Za-z]+\s\d+:\d+)/g) || [];
  if (scriptureRefs.length === 0 && context.requiresScripture) {
    validation.suggestions.push('Consider adding scripture references from Ethiopian Orthodox canon');
  }

  validation.isAligned = validation.score >= this.validationThresholds.minFaithAlignmentScore;

  return validation;
};

// Multi-language detection and processing
aiConfig.detectLanguage = function(text) {
  // Simple language detection based on character sets and common words
  const amharicChars = /[\u1200-\u137F]/;
  const geezChars = /[\u2D80-\u2DDF]/;

  if (geezChars.test(text)) return 'gez';
  if (amharicChars.test(text)) return 'am';

  // Check for common Amharic words
  const amharicWords = ['እግዚአብሔር', 'ቅዱስ', 'እምነት', 'ቤተ', 'ክርስትያን'];
  if (amharicWords.some(word => text.includes(word))) return 'am';

  return 'en'; // Default to English
};

// Context-aware response enhancement
aiConfig.enhanceContext = function(question, context = {}) {
  let enhancedContext = this.faithContext;

  // Add lesson-specific context
  if (context.lessonId) {
    enhancedContext += `\n\nCURRENT LESSON CONTEXT: ${context.lessonTitle || 'Unknown Lesson'}`;
    enhancedContext += `\nFocus on lesson objectives and Ethiopian Orthodox teachings covered.`;
  }

  // Add chapter-specific context
  if (context.chapterId) {
    enhancedContext += `\n\nCURRENT CHAPTER CONTEXT: ${context.chapterTitle || 'Unknown Chapter'}`;
    enhancedContext += `\nEmphasize chapter themes and doctrinal foundations.`;
  }

  // Add user progress context
  if (context.userProgress) {
    enhancedContext += `\n\nUSER PROGRESS: ${context.userProgress}% through course`;
    enhancedContext += `\nTailor response complexity to user's current understanding level.`;
  }

  return enhancedContext;
};

module.exports = { vertexAI, storage, aiConfig };
