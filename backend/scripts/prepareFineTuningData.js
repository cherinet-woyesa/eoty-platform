// backend/scripts/prepareFineTuningData.js - NEW FILE
const db = require('../config/database');
const fs = require('fs');
const path = require('path');

class FineTuningDataPreparer {
  constructor() {
    this.outputDir = path.join(__dirname, '../data/fine_tuning');
    this.ensureOutputDir();
  }

  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  // Prepare conversation data for fine-tuning
  async prepareConversationData() {
    console.log('Preparing conversation data for fine-tuning...');
    
    // Get high-quality conversations (good faith alignment, no moderation flags)
    const conversations = await db('ai_conversations')
      .join('ai_messages', 'ai_conversations.id', 'ai_messages.conversation_id')
      .join('faith_alignment_logs', db.raw("faith_alignment_logs.response_preview LIKE CONCAT(SUBSTRING(ai_messages.content, 1, 50), '%')"))
      .where('faith_alignment_logs.alignment_score', '>=', 0.9)
      .where('ai_messages.role', 'assistant')
      .select(
        'ai_conversations.id',
        'ai_messages.content as assistant_message',
        'faith_alignment_logs.alignment_score',
        'ai_conversations.context_data'
      )
      .orderBy('faith_alignment_logs.alignment_score', 'desc')
      .limit(1000);

    const trainingData = [];

    for (const conv of conversations) {
      // Get the user message that prompted this response
      const userMessage = await db('ai_messages')
        .where({
          conversation_id: conv.id,
          role: 'user'
        })
        .orderBy('created_at', 'desc')
        .first();

      if (userMessage) {
        trainingData.push({
          messages: [
            {
              role: "system",
              content: "You are an Ethiopian Orthodox Tewahedo Church teaching assistant. Provide doctrinally accurate responses based on Ethiopian Orthodox sources and tradition."
            },
            {
              role: "user",
              content: userMessage.content
            },
            {
              role: "assistant", 
              content: conv.assistant_message
            }
          ]
        });
      }
    }

    return trainingData;
  }

  // Prepare doctrinal Q&A pairs from approved sources
  async prepareDoctrinalData() {
    console.log('Preparing doctrinal Q&A data...');
    
    // This would come from curated doctrinal sources
    const doctrinalPairs = [
      {
        question: "What is the meaning of Tewahedo?",
        answer: "Tewahedo means 'unified' or 'made one' and refers to the Ethiopian Orthodox belief in the perfect unity of Christ's divine and human natures without separation, mixture, or confusion. This doctrine emphasizes that Christ is one person with one unified nature, both fully God and fully human."
      },
      {
        question: "How many books are in the Ethiopian Orthodox Bible?",
        answer: "The Ethiopian Orthodox Tewahedo Church recognizes 81 books in the Bible: 46 books in the Old Testament (including Enoch, Jubilees, and other deuterocanonical books) and 35 books in the New Testament. This canon has been preserved in the Ge'ez language and represents the complete scriptural tradition of the Church."
      },
      {
        question: "What is the significance of the Tabot?",
        answer: "The Tabot is a replica of the Ark of the Covenant that resides in every Ethiopian Orthodox church. It represents God's presence and is the most sacred object in the church. The Tabot is carried in processions during important feasts and only ordained priests may touch it, following the tradition that the original Ark resides in the Church of Our Lady Mary of Zion in Axum."
      },
      {
        question: "Who were the Nine Saints?",
        answer: "The Nine Saints were Syrian monks who came to Ethiopia in the 5th century: Abba Pantelewon, Abba Gerima, Abba Aftse, Abba Guba, Abba Alem, Abba Yem'ata, Abba Liqanos, Abba Sehma, and Abba Aragawi. They established monasteries throughout Ethiopia, translated scriptures into Ge'ez, and played a crucial role in spreading Christianity and establishing the Ethiopian Orthodox Church's monastic tradition."
      },
      {
        question: "What is the importance of fasting in the Ethiopian Orthodox Church?",
        answer: "Fasting is a central spiritual discipline in the Ethiopian Orthodox Church, with 180-250 fasting days per year. This includes every Wednesday and Friday (commemorating Christ's betrayal and crucifixion), Lent (Hudade), the Fast of the Apostles, and other periods. Fasting involves abstaining from animal products and increased prayer, serving as spiritual preparation and discipline for the faithful."
      }
    ];

    return doctrinalPairs.map(pair => ({
      messages: [
        {
          role: "system", 
          content: "You are an Ethiopian Orthodox Tewahedo Church teaching assistant. Provide doctrinally accurate responses based on Ethiopian Orthodox sources and tradition."
        },
        {
          role: "user",
          content: pair.question
        },
        {
          role: "assistant",
          content: pair.answer
        }
      ]
    }));
  }

  // Prepare liturgical and practical guidance data
  async prepareLiturgicalData() {
    console.log('Preparing liturgical data...');
    
    const liturgicalData = [
      {
        context: "A youth asking about prayer times",
        question: "When should I pray during the day?",
        answer: "The Ethiopian Orthodox Church follows seven canonical prayer times based on the Psalms: 1st hour (6 AM), 3rd hour (9 AM), 6th hour (12 PM), 9th hour (3 PM), 11th hour (5 PM), 12th hour (6 PM), and midnight. These prayers, along with personal devotions, form the daily rhythm of Orthodox spiritual life. Start with the prayers you can manage consistently, and your local priest can guide you in developing your prayer rule."
      },
      {
        context: "Preparation for communion",
        question: "How should I prepare to receive Holy Communion?",
        answer: "Preparation for Holy Communion (Qurban) involves prayer, fasting, and confession. Typically, one should fast from midnight, pray the preparatory prayers, examine one's conscience, and recent confession is required. It's essential to approach with reverence, faith, and repentance. For specific guidance, consult your spiritual father or local priest, as practices may vary slightly by region and individual spiritual condition."
      },
      {
        context: "Understanding feast days", 
        question: "What is the significance of Timkat?",
        answer: "Timkat (Epiphany) celebrated on January 19th, commemorates Christ's baptism in the Jordan River. It's one of the most important feasts in the Ethiopian Orthodox Church. The celebration involves elaborate processions with the Tabot, symbolic reenactments of the baptism, and blessings of water. It's a joyful celebration of God's revelation and the beginning of Christ's public ministry, emphasizing our own baptismal commitment to Christ."
      }
    ];

    return liturgicalData.map(item => ({
      messages: [
        {
          role: "system",
          content: `You are an Ethiopian Orthodox Tewahedo Church teaching assistant. Context: ${item.context}`
        },
        {
          role: "user", 
          content: item.question
        },
        {
          role: "assistant",
          content: item.answer
        }
      ]
    }));
  }

  // Combine all data and save for fine-tuning
  async prepareAllData() {
    try {
      const conversationData = await this.prepareConversationData();
      const doctrinalData = await this.prepareDoctrinalData();
      const liturgicalData = await this.prepareLiturgicalData();

      const allData = [...conversationData, ...doctrinalData, ...liturgicalData];

      // Shuffle data for better training
      const shuffledData = this.shuffleArray(allData);

      // Split into training and validation sets (90/10)
      const splitIndex = Math.floor(shuffledData.length * 0.9);
      const trainingSet = shuffledData.slice(0, splitIndex);
      const validationSet = shuffledData.slice(splitIndex);

      // Save datasets
      const trainingPath = path.join(this.outputDir, 'training_data.jsonl');
      const validationPath = path.join(this.outputDir, 'validation_data.jsonl');

      this.saveAsJSONL(trainingSet, trainingPath);
      this.saveAsJSONL(validationSet, validationPath);

      console.log(`Prepared ${trainingSet.length} training examples and ${validationSet.length} validation examples`);
      console.log(`Training data saved to: ${trainingPath}`);
      console.log(`Validation data saved to: ${validationPath}`);

      return {
        trainingExamples: trainingSet.length,
        validationExamples: validationSet.length,
        trainingPath,
        validationPath
      };
    } catch (error) {
      console.error('Error preparing fine-tuning data:', error);
      throw error;
    }
  }

  // Utility methods
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  saveAsJSONL(data, filePath) {
    const lines = data.map(item => JSON.stringify(item));
    fs.writeFileSync(filePath, lines.join('\n'));
  }
}

// Run if called directly
if (require.main === module) {
  const preparer = new FineTuningDataPreparer();
  preparer.prepareAllData()
    .then(result => {
      console.log('Fine-tuning data preparation completed successfully');
      console.log(result);
    })
    .catch(error => {
      console.error('Fine-tuning data preparation failed:', error);
      process.exit(1);
    });
}

module.exports = FineTuningDataPreparer;