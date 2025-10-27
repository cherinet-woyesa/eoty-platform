const { OpenAI } = require('openai');
const { Pinecone } = require('@pinecone-database/pinecone');

// Initialize OpenAI only if API key is provided
let openai = null;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key') {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
} else {
  console.warn('OpenAI API key not provided. AI features will be disabled.');
}

// Initialize Pinecone only if API key is provided
let pinecone = null;
if (process.env.PINECONE_API_KEY && process.env.PINECONE_API_KEY !== 'your_pinecone_api_key') {
  pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });
} else {
  console.warn('Pinecone API key not provided. AI vector search features will be disabled.');
}

const aiConfig = {
  // Model configurations
  chatModel: 'gpt-4',
  embeddingModel: 'text-embedding-3-small',
  
  // Response settings
  maxTokens: 1000,
  temperature: 0.7,
  
  // Faith alignment settings
  faithContext: `
    You are an AI assistant for the Ethiopian Orthodox Tewahedo Church youth learning platform.
    Your purpose is to provide accurate, faith-aligned answers about Orthodox Christianity.
    
    KEY PRINCIPLES:
    - Always align with Ethiopian Orthodox doctrine and teachings
    - Reference Holy Scripture, Church Fathers, and tradition
    - Be respectful and educational in tone
    - If unsure, acknowledge limitations and suggest consulting clergy
    - Promote spiritual growth and understanding
    
    SENSITIVE TOPICS TO FLAG:
    - Doctrinal controversies
    - Political religious matters
    - Ecumenical relations
    - Modern social issues from religious perspective
  `,
  
  // Pinecone configuration
  pineconeIndex: 'eoty-platform',
  namespace: 'faith-content'
};

module.exports = { openai, pinecone, aiConfig };