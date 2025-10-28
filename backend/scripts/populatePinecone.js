const { pinecone, aiConfig } = require('../config/aiConfig');
const { openai } = require('../config/aiConfig');

// Enhanced Ethiopian Orthodox content for the AI to reference
const orthodoxContent = [
  {
    content: "The Ethiopian Orthodox Tewahedo Church believes in One God in Three Persons: Father, Son, and Holy Spirit. This is the doctrine of the Holy Trinity. The term 'Tewahedo' means 'united' or 'one body' and refers to the belief that Christ's divine and human natures are united without division, separation, or confusion.",
    source: "Basic Doctrine - Holy Trinity and Tewahedo",
    category: "faith",
    tags: ["trinity", "god", "basic doctrine", "tewahedo", "christology"]
  },
  {
    content: "The Eucharist (Qurban) is the central sacrament where bread and wine become the true Body and Blood of Christ. It is offered every Sunday and on feast days. The faithful receive communion with a mixture of wine and water, symbolizing the unity of Christ's divine and human natures.",
    source: "Sacraments - Eucharist",
    category: "sacraments",
    tags: ["eucharist", "qurban", "sacraments", "communion", "liturgy"]
  },
  {
    content: "The Ethiopian Orthodox Church follows the Alexandrian tradition and maintains seven canonical sacraments: Baptism, Confirmation (Chrismation), Eucharist, Penance (Confession), Anointing of the Sick, Holy Orders, and Matrimony. Each sacrament is a means of grace and spiritual growth.",
    source: "Church Tradition - Sacraments",
    category: "sacraments",
    tags: ["sacraments", "tradition", "alexandrian", "baptism", "confirmation"]
  },
  {
    content: "Fasting is an important spiritual discipline. The Church observes 180-250 fasting days per year, including every Wednesday and Friday (commemorating the betrayal and crucifixion of Christ), Lent (Hudade), the Fast of the Apostles, and other fasting periods. Fasting involves both food restrictions and increased prayer.",
    source: "Spiritual Life - Fasting",
    category: "spiritual",
    tags: ["fasting", "spiritual discipline", "lent", "hudade", "wednesday", "friday"]
  },
  {
    content: "The Bible used by the Ethiopian Orthodox Church contains 81 books: 46 Old Testament (including Enoch, Jubilees, and other deutero-canonical books) and 35 New Testament books. These additional books are considered canonical and are integral to Orthodox teaching and liturgy.",
    source: "Scripture - Canon",
    category: "scripture",
    tags: ["bible", "canon", "enoch", "jubilees", "scripture", "deuterocanonical"]
  },
  {
    content: "The Divine Liturgy is the main worship service, typically lasting 2-3 hours. It follows the Liturgy of St. Basil and includes elaborate rituals, chanting in Ge'ez, and incense. The service is divided into the Preparation (Prothesis), the Liturgy of the Catechumens, and the Liturgy of the Faithful.",
    source: "Worship - Divine Liturgy",
    category: "worship",
    tags: ["liturgy", "worship", "st basil", "chanting", "geez", "prothesis"]
  },
  {
    content: "Saints are highly venerated in the Ethiopian Orthodox Church. Important saints include St. Mary (Mariam), St. George (Giyorgis), St. Michael (Mikael), and the Nine Syrian Saints who spread Christianity in Ethiopia (Abba Pantelewon, Abba Gerima, Abba Aftse, Abba Guba, Abba Alem, Abba Yem'ata, Abba Liqanos, Abba Sehma, and Abba Aragawi).",
    source: "Saints - Veneration",
    category: "saints",
    tags: ["saints", "st mary", "st george", "nine saints", "veneration", "mariam", "giyorgis"]
  },
  {
    content: "The Ark of the Covenant (Tabot) is central to Ethiopian Orthodox belief. Each church contains a replica of the Ark, representing God's presence. The Tabot is carried during processions and is considered so sacred that only ordained priests may touch it. The Ark is believed to be housed in the Church of Our Lady Mary of Zion in Axum.",
    source: "Church Items - Tabot",
    category: "tradition",
    tags: ["ark", "tabot", "covenant", "church items", "axum", "priests"]
  },
  {
    content: "Prayer is essential in Orthodox life. The seven canonical prayer times follow the pattern of the Psalms: 1st hour (6 AM), 3rd hour (9 AM), 6th hour (12 PM), 9th hour (3 PM), 11th hour (5 PM), 12th hour (6 PM), and midnight. These prayers, along with personal devotions, form the backbone of Orthodox spiritual life.",
    source: "Spiritual Life - Prayer Times",
    category: "spiritual",
    tags: ["prayer", "prayer times", "spiritual life", "psalms", "canonical hours"]
  },
  {
    content: "The Ethiopian Calendar follows the ancient Alexandrian calendar with 13 months. Important feasts include Timkat (Epiphany, January 19), Meskel (Finding of the True Cross, September 27 or 28), and Enkutatash (New Year, September 11 or 12). These feasts are celebrated with special liturgies, processions, and community gatherings.",
    source: "Calendar - Feasts",
    category: "calendar",
    tags: ["calendar", "feasts", "timkat", "meskel", "enkutatash", "epiphany"]
  },
  {
    content: "The Ge'ez language is the classical language of the Ethiopian Orthodox Church and is still used in liturgy today. Though no longer spoken as a vernacular, Ge'ez remains the language of prayer and worship, connecting the faithful to centuries of Orthodox tradition. Many hymns and prayers are preserved in Ge'ez.",
    source: "Language - Ge'ez",
    category: "language",
    tags: ["geez", "language", "liturgy", "classical", "hymns", "prayers"]
  },
  {
    content: "The Nine Saints (Abba Pantelewon, Abba Gerima, Abba Aftse, Abba Guba, Abba Alem, Abba Yem'ata, Abba Liqanos, Abba Sehma, and Abba Aragawi) were Syrian monks who came to Ethiopia in the 5th century and established monasteries throughout the country. They played a crucial role in spreading Christianity and establishing the Ethiopian Orthodox Church.",
    source: "History - Nine Saints",
    category: "history",
    tags: ["nine saints", "monks", "history", "5th century", "monasteries", "spread christianity"]
  },
  {
    content: "Hudade (Great Lent) is the longest and most rigorous fast in the Ethiopian Orthodox calendar, lasting 55 days before Easter. During this period, faithful observe strict fasting rules, increased prayer, and charitable giving. The fast culminates in Fasika (Easter), celebrating the Resurrection of Christ.",
    source: "Fasting - Hudade",
    category: "spiritual",
    tags: ["hudade", "great lent", "easter", "fasika", "resurrection", "fasting"]
  },
  {
    content: "The Ethiopian Orthodox Church recognizes the first three Ecumenical Councils (Nicaea, Constantinople, and Ephesus) as authoritative. The church's Christological position, known as Tewahedo, affirms that Christ has one unified nature that is both fully divine and fully human, without division, separation, or confusion.",
    source: "Doctrine - Christology",
    category: "doctrine",
    tags: ["tewahedo", "christology", "ecumenical councils", "nature of christ", "divine", "human"]
  },
  {
    content: "Monasticism has been central to Ethiopian Orthodox Christianity since the 4th century. Famous monasteries like Debre Damo, Debre Libanos, and the monasteries of Lake Tana continue to play important roles in spiritual formation, education, and preservation of manuscripts and traditions.",
    source: "Monasticism - History",
    category: "history",
    tags: ["monasticism", "monasteries", "debre damo", "debre libanos", "lake tana", "manuscripts"]
  },
  {
    content: "The Kidane Mehret (Bond of Mercy) is a significant devotion in the Ethiopian Orthodox Church, focusing on the Virgin Mary's role as an intercessor. This devotion emphasizes Mary's compassion and her willingness to intercede for the faithful, particularly during times of trial and distress.",
    source: "Devotions - Kidane Mehret",
    category: "devotions",
    tags: ["kidane mehret", "virgin mary", "intercession", "devotion", "mercy", "compassion"]
  },
  {
    content: "The Ethiopian Orthodox Church maintains the tradition of clerical celibacy for bishops and priests. Deacons may marry before ordination, but priests and bishops must remain celibate. This tradition reflects the church's emphasis on spiritual dedication and service to God.",
    source: "Clergy - Celibacy",
    category: "clergy",
    tags: ["clergy", "celibacy", "bishops", "priests", "deacons", "ordination"]
  },
  {
    content: "Liqa Qesoch (Order of Priests) is the highest rank of clergy in the Ethiopian Orthodox Church below the rank of bishop. These priests are responsible for leading local congregations, performing sacraments, and maintaining spiritual discipline within their communities.",
    source: "Clergy - Liqa Qesoch",
    category: "clergy",
    tags: ["liqa qesoch", "priests", "clergy", "congregations", "sacraments", "spiritual discipline"]
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
      await new Promise(resolve => setTimeout(resolve, 100));
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