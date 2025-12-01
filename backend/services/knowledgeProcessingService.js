const db = require('../config/database-gcp');
const { vertexAI, storage, aiConfig } = require('../config/aiConfig-gcp');
const pdf = require('pdf-parse');
const knowledgeBaseService = require('./knowledgeBaseService');

class KnowledgeProcessingService {
  constructor() {
    this.embeddingModel = null;
  }

  async getEmbeddingModel() {
    if (!this.embeddingModel && vertexAI) {
      this.embeddingModel = vertexAI.getGenerativeModel({ 
        model: aiConfig.embeddingModel || 'text-embedding-004' 
      });
    }
    return this.embeddingModel;
  }

  async processDocument(documentId) {
    console.log(`Processing document ${documentId}...`);
    
    try {
      // 1. Get document metadata
      const document = await db('knowledge_documents').where({ id: documentId }).first();
      if (!document) throw new Error('Document not found');

      await knowledgeBaseService.updateDocumentStatus(documentId, 'processing');

      // 2. Fetch file content
      let textContent = '';
      
      if (document.metadata && document.metadata.gcsPath && storage) {
        const bucket = storage.bucket(aiConfig.storageBucket || 'eoty-platform-ai-content');
        const file = bucket.file(document.metadata.gcsPath);
        const [buffer] = await file.download();

        if (document.file_type === 'pdf') {
          const data = await pdf(buffer);
          textContent = data.text;
        } else {
          textContent = buffer.toString('utf-8');
        }
      } else {
        throw new Error('File source not available');
      }

      // 3. Chunk text
      const chunks = this.chunkText(textContent, 1000); // ~1000 chars per chunk
      console.log(`Generated ${chunks.length} chunks for document ${documentId}`);

      // 4. Generate embeddings and save
      const model = await this.getEmbeddingModel();
      
      // Process in batches to avoid rate limits
      const BATCH_SIZE = 5;
      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        
        await Promise.all(batch.map(async (chunkText, batchIndex) => {
          const globalIndex = i + batchIndex;
          
          let embedding = [];
          if (model) {
            try {
              const result = await model.embedContent(chunkText);
              // Handle different response structures from Vertex AI SDK
              if (result.embedding && result.embedding.values) {
                embedding = result.embedding.values;
              } else if (result.embeddings && result.embeddings[0] && result.embeddings[0].values) {
                embedding = result.embeddings[0].values;
              }
            } catch (err) {
              console.error(`Failed to generate embedding for chunk ${globalIndex}:`, err.message);
            }
          }

          await db('knowledge_chunks').insert({
            document_id: documentId,
            content: chunkText,
            chunk_index: globalIndex,
            token_count: chunkText.length / 4, // Rough estimate
            embedding: JSON.stringify(embedding)
          });
        }));
      }

      await knowledgeBaseService.updateDocumentStatus(documentId, 'active');
      console.log(`Document ${documentId} processing complete.`);

    } catch (error) {
      console.error(`Error processing document ${documentId}:`, error);
      await knowledgeBaseService.updateDocumentStatus(documentId, 'error');
      throw error;
    }
  }

  chunkText(text, chunkSize = 1000) {
    // Simple splitting by paragraphs first, then combining
    const paragraphs = text.split(/\n\s*\n/);
    const chunks = [];
    let currentChunk = '';

    for (const para of paragraphs) {
      const cleanPara = para.trim();
      if (!cleanPara) continue;

      if ((currentChunk.length + cleanPara.length) > chunkSize) {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = cleanPara;
      } else {
        currentChunk = currentChunk ? `${currentChunk}\n\n${cleanPara}` : cleanPara;
      }
    }
    if (currentChunk) chunks.push(currentChunk);
    
    return chunks;
  }
}

module.exports = new KnowledgeProcessingService();
