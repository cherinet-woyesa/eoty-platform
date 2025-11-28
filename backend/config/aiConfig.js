// backend/config/aiConfig.js - REDIRECT TO GCP CONFIG
// This file is maintained for backward compatibility but redirects to the Google Cloud configuration
// All OpenAI and Pinecone dependencies have been removed in favor of Vertex AI

const { vertexAI, storage, aiConfig } = require('./aiConfig-gcp');

// Export the GCP configuration as the default
module.exports = { 
  // Map Vertex AI to the expected interface if necessary, or just export it
  vertexAI, 
  storage, 
  aiConfig,
  
  // Mock OpenAI interface if legacy code still tries to use it (should be removed eventually)
  openai: null,
  pinecone: null
};
