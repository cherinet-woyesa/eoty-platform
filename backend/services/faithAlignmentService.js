// backend/services/faithAlignmentService.js - NEW FILE
const { vertexAI } = require('../config/aiConfig-gcp');
const db = require('../config/database');

class FaithAlignmentService {
  constructor() {
    // Comprehensive Ethiopian Orthodox doctrinal sources
    this.doctrinalSources = {
      scriptures: [
        'Holy Bible (81 books)', 
        'Book of Enoch', 
        'Book of Jubilees',
        'Metsihafe Berhan',
        'Ethiopian Synaxarium'
      ],
      churchFathers: [
        'St. Yared', 
        'St. Frumentius (Abune Selama)',
        'Nine Syrian Saints',
        'St. Tekle Haymanot',
        'St. Gebre Menfes Kidus'
      ],
      councils: [
        'Council of Nicaea (325)',
        'Council of Constantinople (381)', 
        'Council of Ephesus (431)'
      ],
      liturgicalTexts: [
        'Divine Liturgy of St. Basil',
        'Liturgy of the Apostles',
        'Ethiopian Anaphora',
        'Prayer Books'
      ]
    };

    // Doctrinal positions that must be maintained
    this.nonNegotiableDoctrines = [
      'Tewahedo (Unity of Christ\'s nature)',
      '81-book biblical canon',
      'Seven sacraments',
      'Real Presence in Eucharist',
      'Apostolic succession through St. Mark',
      'Veneration of Saints and Theotokos',
      'Authority of first three Ecumenical Councils'
    ];

    // Common heresies to avoid
    this.heresiesToAvoid = [
      'Nestorianism', 'Arianism', 'Monophysitism', 'Monothelitism',
      'Pelagianism', 'Gnosticism', 'Protestant sola scriptura',
      'Catholic papal supremacy', 'Ecumenical compromise'
    ];

    // Ethiopian Orthodox specific terminology
    this.preferredTerminology = {
      'christ': 'Christ (emphasizing Tewahedo unity)',
      'eucharist': 'Qurban or Eucharist',
      'ark': 'Tabot',
      'priest': 'Priest or Abune',
      'bishop': 'Bishop or Abune',
      'liturgy': 'Divine Liturgy or Qidase',
      'fasting': 'Fasting (Tsom)',
      'prayer': 'Prayer (Slot)',
      'scripture': 'Holy Scripture (including deuterocanonical)',
      'church': 'Ethiopian Orthodox Tewahedo Church'
    };
  }

  // ENHANCED: Comprehensive faith alignment validation
  async validateFaithAlignment(response, question, context = {}) {
    const validation = {
      score: 1.0,
      isAligned: true,
      issues: [],
      warnings: [],
      suggestions: [],
      doctrinalReferences: [],
      terminologyScore: 0,
      sourceAlignment: 0
    };

    const responseLower = response.toLowerCase();

    // 1. Check for non-negotiable doctrines
    validation.score -= await this.checkDoctrinalCompliance(response, validation);
    
    // 2. Check terminology usage
    validation.terminologyScore = this.calculateTerminologyScore(response);
    validation.score += validation.terminologyScore * 0.2;
    
    // 3. Check source alignment
    validation.sourceAlignment = await this.checkSourceAlignment(response, question);
    validation.score += validation.sourceAlignment * 0.3;
    
    // 4. Check for heresy indicators
    validation.score -= await this.checkHeresyIndicators(response, validation);
    
    // 5. Check Ethiopian Orthodox specific content
    validation.score += await this.checkEthiopianOrthodoxContent(response, validation);
    
    // 6. Validate against known orthodox responses
    if (context.lessonId || context.courseId) {
      validation.score += await this.validateAgainstCurriculum(response, context, validation);
    }

    // Ensure score is between 0 and 1
    validation.score = Math.max(0, Math.min(1, validation.score));
    validation.isAligned = validation.score >= 0.85;

    // Log validation for continuous improvement
    await this.logValidationResult(question, response, validation, context);

    return validation;
  }

  // Check compliance with non-negotiable doctrines
  async checkDoctrinalCompliance(response, validation) {
    let penalty = 0;
    const responseLower = response.toLowerCase();

    // Check for Tewahedo emphasis
    if (!responseLower.includes('tewahedo') && !responseLower.includes('unity') && 
        (responseLower.includes('christ') || responseLower.includes('nature'))) {
      validation.warnings.push('Consider emphasizing Tewahedo (unity) when discussing Christ\'s nature');
      penalty += 0.1;
    }

    // Check for Ethiopian biblical canon reference when discussing scripture
    if (responseLower.includes('bible') && !responseLower.includes('81') && 
        !responseLower.includes('enoch') && !responseLower.includes('jubilee')) {
      validation.suggestions.push('Reference the 81-book Ethiopian Orthodox biblical canon when discussing scripture');
      penalty += 0.05;
    }

    // Check for sacramental language
    if (responseLower.includes('eucharist') && !responseLower.includes('qurban')) {
      validation.suggestions.push('Use "Qurban" alongside "Eucharist" for Ethiopian Orthodox context');
    }

    return penalty;
  }

  // Calculate terminology score based on preferred Ethiopian Orthodox terms
  calculateTerminologyScore(response) {
    let score = 0;
    let preferredTermsUsed = 0;
    let totalRelevantTerms = 0;

    Object.keys(this.preferredTerminology).forEach(term => {
      if (response.toLowerCase().includes(term.toLowerCase())) {
        totalRelevantTerms++;
        // Check if preferred terminology is used
        const preferred = this.preferredTerminology[term].toLowerCase();
        if (response.toLowerCase().includes(preferred.split(' ')[0].toLowerCase())) {
          preferredTermsUsed++;
        }
      }
    });

    if (totalRelevantTerms > 0) {
      score = preferredTermsUsed / totalRelevantTerms;
    }

    return score;
  }

  // Check alignment with Ethiopian Orthodox sources
  async checkSourceAlignment(response, question) {
    let alignmentScore = 0;
    let sourcesReferenced = 0;

    // Check for specific Ethiopian Orthodox references
    this.doctrinalSources.scriptures.forEach(source => {
      if (response.toLowerCase().includes(source.toLowerCase())) {
        sourcesReferenced++;
      }
    });

    this.doctrinalSources.churchFathers.forEach(father => {
      if (response.toLowerCase().includes(father.toLowerCase())) {
        sourcesReferenced++;
      }
    });

    // Calculate score based on relevance
    const totalPossibleSources = 5; // Reasonable number for a single response
    alignmentScore = Math.min(sourcesReferenced / totalPossibleSources, 1);

    return alignmentScore;
  }

  // Check for heresy indicators
  async checkHeresyIndicators(response, validation) {
    let penalty = 0;
    const responseLower = response.toLowerCase();

    this.heresiesToAvoid.forEach(heresy => {
      if (responseLower.includes(heresy.toLowerCase())) {
        // Check if it's being discussed or promoted
        const contextWords = ['against', 'reject', 'condemn', 'heresy', 'error'];
        const isCondemning = contextWords.some(word => 
          responseLower.includes(word) && 
          responseLower.indexOf(word) < responseLower.indexOf(heresy) + 50
        );

        if (!isCondemning) {
          validation.issues.push(`Potential promotion or neutral discussion of ${heresy}`);
          penalty += 0.3;
        }
      }
    });

    // Check for ecumenical compromise
    const compromisePhrases = [
      'all christians believe',
      'most churches teach',
      'generally accepted',
      'across denominations'
    ];

    compromisePhrases.forEach(phrase => {
      if (responseLower.includes(phrase)) {
        validation.warnings.push('Avoid ecumenical language that compromises Orthodox distinctives');
        penalty += 0.1;
      }
    });

    return penalty;
  }

  // Check for Ethiopian Orthodox specific content
  async checkEthiopianOrthodoxContent(response, validation) {
    let bonus = 0;
    const responseLower = response.toLowerCase();

    // Ethiopian specific terms and concepts
    const ethiopianTerms = [
      'axum', 'lalibela', 'debre damo', 'nine saints', 'timkat',
      'meskel', 'hudade', 'geez', 'fidel', 'kidane mehret',
      'debre libanos', 'waldiba', 'lake tana'
    ];

    const termsUsed = ethiopianTerms.filter(term => 
      responseLower.includes(term.toLowerCase())
    ).length;

    bonus += termsUsed * 0.05;

    // Ethiopian liturgical references
    const liturgicalTerms = ['qurban', 'qidase', 'tsom', 's\'lot', 'me\'era'];
    const liturgicalUsed = liturgicalTerms.filter(term => 
      responseLower.includes(term.toLowerCase())
    ).length;

    bonus += liturgicalUsed * 0.03;

    if (termsUsed > 0 || liturgicalUsed > 0) {
      validation.doctrinalReferences.push('Includes Ethiopian Orthodox specific references');
    }

    return bonus;
  }

  // Validate against curriculum content when available
  async validateAgainstCurriculum(response, context, validation) {
    let bonus = 0;

    try {
      if (context.lessonId) {
        const lesson = await db('lessons')
          .where({ id: context.lessonId })
          .select('title', 'content', 'doctrinal_focus')
          .first();

        if (lesson && lesson.doctrinal_focus) {
          const focusPoints = JSON.parse(lesson.doctrinal_focus);
          const pointsCovered = focusPoints.filter(point => 
            response.toLowerCase().includes(point.toLowerCase())
          ).length;

          bonus += (pointsCovered / focusPoints.length) * 0.2;
        }
      }
    } catch (error) {
      console.warn('Failed to validate against curriculum:', error);
    }

    return bonus;
  }

  // ENHANCED: Generate faith-aligned response using fine-tuned model
  async generateFaithAlignedResponse(question, context, conversationHistory = []) {
    // First, try to use fine-tuned model if available
    let response;
    
    if (this.hasFineTunedModel()) {
      response = await this.useFineTunedModel(question, context, conversationHistory);
    } else {
      // Fallback to enhanced prompt engineering
      response = await this.useEnhancedPromptEngineering(question, context, conversationHistory);
    }

    // Validate the response
    const validation = await this.validateFaithAlignment(response, question, context);
    
    // If alignment is poor, regenerate with stricter constraints
    if (!validation.isAligned || validation.score < 0.7) {
      console.warn(`Poor faith alignment detected (${validation.score}), regenerating response`);
      response = await this.regenerateWithStrictConstraints(question, context, validation.issues);
      
      // Re-validate
      const revalidation = await this.validateFaithAlignment(response, question, context);
      Object.assign(validation, revalidation);
    }

    return {
      response,
      faithAlignment: validation
    };
  }

  // Check if fine-tuned model is available
  hasFineTunedModel() {
    return process.env.FINE_TUNED_MODEL_ID && process.env.FINE_TUNED_MODEL_ID !== 'your_fine_tuned_model_id';
  }

  // Use fine-tuned model for responses
  async useFineTunedModel(question, context, conversationHistory) {
    try {
      // Vertex AI implementation for fine-tuned model
      const model = vertexAI.preview.getGenerativeModel({
        model: process.env.FINE_TUNED_MODEL_ID || 'gemini-pro',
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.3,
        }
      });

      const prompt = `
SYSTEM: You are an Ethiopian Orthodox Tewahedo Church teaching assistant. Provide doctrinally accurate responses based on Ethiopian Orthodox sources and tradition.

CONVERSATION HISTORY:
${JSON.stringify(conversationHistory)}

USER QUESTION:
${question}
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Fine-tuned model error, falling back to prompt engineering:', error);
      return await this.useEnhancedPromptEngineering(question, context, conversationHistory);
    }
  }

  // Enhanced prompt engineering for faith alignment
  async useEnhancedPromptEngineering(question, context, conversationHistory) {
    const faithContext = this.buildComprehensiveFaithContext(context);
    
    const prompt = `
ETHIOPIAN ORTHODOX TEWAHEDO CHURCH TEACHING ASSISTANT

CRITICAL DOCTRINAL FRAMEWORK:
${faithContext}

RESPONSE REQUIREMENTS:
1. Always align with Ethiopian Orthodox Tewahedo doctrine
2. Reference specific Ethiopian Orthodox sources when possible
3. Use Ethiopian Orthodox terminology (Qurban, Tabot, Tewahedo, etc.)
4. Emphasize the unity of Christ's nature (Tewahedo)
5. Reference the 81-book biblical canon when discussing scripture
6. Maintain distinct Orthodox identity without ecumenical compromise
7. Recommend consultation with clergy for personal spiritual matters
8. Connect answers to Ethiopian liturgical practice and tradition

FORBIDDEN CONTENT:
- Do not compare with other Christian traditions
- Do not engage in speculative theology
- Do not compromise Orthodox distinctives
- Do not provide personal opinions beyond established doctrine

RESPONSE TEMPLATE:
[Doctrinally accurate answer based on Ethiopian Orthodox teaching]
[Reference to relevant Ethiopian Orthodox sources]
[Connection to Ethiopian liturgical practice if applicable]
[Recommendation for further study or clergy consultation if complex]

CONVERSATION HISTORY:
${JSON.stringify(conversationHistory)}

USER QUESTION:
${question}
    `;

    try {
      const model = vertexAI.preview.getGenerativeModel({
        model: 'gemini-pro',
        generationConfig: {
          maxOutputTokens: 1200,
          temperature: 0.4,
        }
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Vertex AI generation failed:', error);
      throw error;
    }
  }

  // Build comprehensive faith context
  buildComprehensiveFaithContext(appContext = {}) {
    let context = `NON-NEGOTIABLE DOCTRINES:
- Tewahedo: Unity of Christ's divine and human natures without separation, mixture, or confusion
- 81-book biblical canon including Enoch, Jubilees, and Ethiopian Synaxarium
- Seven sacraments with real presence in the Eucharist (Qurban)
- Apostolic succession through St. Mark of Alexandria
- Authority of first three Ecumenical Councils only
- Veneration of Saints, especially St. Mary as Theotokos

ESSENTIAL ETHIOPIAN ORTHODOX REFERENCES:
Scriptures: ${this.doctrinalSources.scriptures.join(', ')}
Church Fathers: ${this.doctrinalSources.churchFathers.join(', ')}
Liturgical Texts: ${this.doctrinalSources.liturgicalTexts.join(', ')}

PREFERRED TERMINOLOGY:
${Object.entries(this.preferredTerminology).map(([standard, preferred]) => 
  `- ${standard} → ${preferred}`
).join('\n')}

HERESIES TO AVOID:
${this.heresiesToAvoid.join(', ')}`;

    // Add application-specific context
    if (appContext.lessonId || appContext.courseId) {
      context += `\n\nCURRENT TEACHING CONTEXT: Focus on established doctrine from approved curriculum`;
    }

    return context;
  }

  // Regenerate response with strict constraints
  async regenerateWithStrictConstraints(question, context, issues) {
    const constraintMessage = issues.length > 0 
      ? `Previous response had these doctrinal issues: ${issues.join(', ')}. Please ensure complete alignment with Ethiopian Orthodox Tewahedo teaching.`
      : 'Please ensure complete alignment with Ethiopian Orthodox Tewahedo teaching.';

    const prompt = `
ETHIOPIAN ORTHODOX TEWAHEDO CHURCH - STRICT DOCTRINAL MODE

You must provide responses that are 100% aligned with Ethiopian Orthodox Tewahedo doctrine.
When in doubt, be conservative and recommend consulting clergy.
Always use Ethiopian Orthodox terminology and references.

${constraintMessage}

USER QUESTION:
${question}
    `;

    try {
      const model = vertexAI.preview.getGenerativeModel({
        model: 'gemini-pro',
        generationConfig: {
          maxOutputTokens: 800,
          temperature: 0.2,
        }
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Vertex AI regeneration failed:', error);
      throw error;
    }
  }

  // Log validation results for continuous improvement
  async logValidationResult(question, response, validation, context) {
    try {
      await db('faith_alignment_validation').insert({
        question: question.substring(0, 500),
        response: response.substring(0, 1000),
        alignment_score: validation.score,
        is_aligned: validation.isAligned,
        issues: JSON.stringify(validation.issues),
        warnings: JSON.stringify(validation.warnings),
        suggestions: JSON.stringify(validation.suggestions),
        context: JSON.stringify(context),
        timestamp: new Date()
      });

      // If alignment is poor, flag for review
      if (!validation.isAligned || validation.score < 0.7) {
        await db('doctrinal_review_queue').insert({
          question: question.substring(0, 500),
          response: response.substring(0, 1000),
          alignment_score: validation.score,
          issues: JSON.stringify(validation.issues),
          priority: validation.score < 0.5 ? 'high' : 'medium',
          status: 'pending',
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.warn('Failed to log faith alignment validation:', error);
    }
  }

  // Get alignment statistics for monitoring
  async getAlignmentStats(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await db('faith_alignment_validation')
      .where('timestamp', '>=', startDate)
      .select(
        db.raw('AVG(alignment_score) as avg_score'),
        db.raw('COUNT(*) as total_validations'),
        db.raw('COUNT(CASE WHEN is_aligned = true THEN 1 END) as aligned_count'),
        db.raw('COUNT(CASE WHEN alignment_score < 0.7 THEN 1 END) as poor_alignment_count')
      )
      .first();

    return {
      averageScore: parseFloat(stats.avg_score) || 0,
      totalValidations: stats.total_validations || 0,
      alignmentRate: stats.total_validations ? (stats.aligned_count / stats.total_validations) * 100 : 0,
      poorAlignmentCount: stats.poor_alignment_count || 0
    };
  }
}

module.exports = new FaithAlignmentService();