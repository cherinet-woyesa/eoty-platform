// backend/services/aiService.js - REDIRECT TO GCP SERVICE
// This file is maintained for backward compatibility but redirects to the Google Cloud service
// All OpenAI and Pinecone dependencies have been removed in favor of Vertex AI

const aiServiceGcp = require('./aiService-gcp');

module.exports = aiServiceGcp;
