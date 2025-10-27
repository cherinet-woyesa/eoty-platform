const { pinecone, aiConfig } = require('../config/aiConfig');
const { openai } = require('../config/aiConfig');

// Sample Ethiopian Orthodox content for the AI to reference
const orthodoxContent = [
  {
    content: "The Ethiopian Orthodox Tewahedo Church believes in One God in Three Persons: Father, Son, and Holy Spirit. This is the doctrine of the Holy Trinity.",
    source: "Basic Doctrine - Holy Trinity",
    category: "faith",
    tags: ["trinity", "god", "basic doctrine"]
  },
  {
    content: "The Eucharist (Qurban) is the central sacrament where bread and wine become the true Body and Blood of Christ. It is offered every Sunday and on feast days.",
    source: "Sacraments - Eucharist",
    category: "sacraments",
    tags: ["eucharist", "qurban", "sacraments", "communion"]
  },
  {
    content: "The Ethiopian Orthodox Church follows the Alexandrian tradition and maintains seven canonical sacraments: Baptism, Confirmation, Eucharist, Penance, Anointing of the Sick, Holy Orders, and Matrimony.",
    source: "Church Tradition - Sacraments",
    category: "sacraments",
    tags: ["sacraments", "tradition", "alexandrian"]
  },
  {
    content: "Fasting is an important spiritual discipline. The Church observes 180-250 fasting days per year, including every Wednesday and Friday, Lent, and other fasting periods.",
    source: "Spiritual Life - Fasting",
    category: "spiritual",
    tags: ["fasting", "spiritual discipline", "lent"]
  },
  {
    content: "The Bible used by the Ethiopian Orthodox Church contains 81 books: 46 Old Testament and 35 New Testament books, including books like Enoch and Jubilees.",
    source: "Scripture - Canon",
    category: "scripture",
    tags: ["bible", "canon", "enoch", "scripture"]
  },
  {
    content: "The Divine Liturgy is the main worship service, typically lasting 2-3 hours. It follows the Liturgy of St. Basil and includes elaborate rituals, chanting, and incense.",
    source: "Worship - Divine Liturgy",
    category: "worship",
    tags: ["liturgy", "worship", "st basil", "chanting"]
  },
  {
    content: "Saints are highly venerated in the Ethiopian Orthodox Church. Important saints include St. Mary, St. George, St. Michael, and the Nine Syrian Saints who spread Christianity in Ethiopia.",
    source: "Saints - Veneration",
    category: "saints",
    tags: ["saints", "st mary", "st george", "veneration"]
  },
  {
    content: "The Ark of the Covenant (Tabot) is central to Ethiopian Orthodox belief. Each church contains a replica of the Ark, representing God's presence.",
    source: "Church Items - Tabot",
    category: "tradition",
    tags: ["ark", "tabot", "covenant", "church items"]
  },
  {
    content: "Prayer is essential in Orthodox life. The seven canonical prayer times follow the pattern of the Psalms: 1st hour (6 AM), 3rd hour (9 AM), 6th hour (12 PM), 9th hour (3 PM), 11th hour (5 PM), 12th hour (6 PM), and midnight.",
    source: "Spiritual Life - Prayer Times",
    category: "spiritual",
    tags: ["prayer", "prayer times", "spiritual life"]
  },
  {
    content: "The Ethiopian Calendar follows the ancient Alexandrian calendar with 13 months. Important feasts include Timkat (Epiphany), Meskel (Finding of the True Cross), and Enkutatash (New Year).",
    source: "Calendar - Feasts",
    category: "calendar",
    tags: ["calendar", "feasts", "timkat", "meskel"]
  }
];

async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: aiConfig.embeddingModel,
    input: text,
  });
  return response.data[0].embedding;
}

async function populatePinecone() {
  try {
    const index = pinecone.Index(aiConfig.pineconeIndex);
    
    console.log('Starting to populate Pinecone with Orthodox content...');
    
    const vectors = [];
    
    for (let i = 0; i < orthodoxContent.length; i++) {
      const content = orthodoxContent[i];
      const embedding = await generateEmbedding(content.content);
      
      vectors.push({
        id: `orthodox-content-${i}`,
        values: embedding,
        metadata: {
          content: content.content,
          source: content.source,
          category: content.category,
          tags: content.tags,
          type: 'faith_content'
        }
      });
      
      console.log(`Processed: ${content.source}`);
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Upsert vectors in batches
    const batchSize = 10;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await index.upsert({
        vectors: batch,
        namespace: aiConfig.namespace
      });
      console.log(`Upserted batch ${Math.floor(i/batchSize) + 1}`);
    }
    
    console.log('Successfully populated Pinecone with Orthodox content!');
    console.log(`Total vectors: ${vectors.length}`);
    
  } catch (error) {
    console.error('Error populating Pinecone:', error);
  }
}

// Run if called directly
if (require.main === module) {
  populatePinecone();
}

module.exports = { populatePinecone };