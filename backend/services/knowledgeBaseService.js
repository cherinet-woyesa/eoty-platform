const db = require('../config/database-gcp');
const { storage, aiConfig } = require('../config/aiConfig-gcp');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

class KnowledgeBaseService {
  constructor() {
    this.bucketName = aiConfig.storageBucket || 'eoty-platform-ai-content';
    this.bucket = storage ? storage.bucket(this.bucketName) : null;
  }

  async uploadDocument(fileBuffer, originalName, metadata, userId) {
    if (!this.bucket) {
      throw new Error('Storage bucket not configured');
    }

    const fileExtension = path.extname(originalName).toLowerCase();
    const fileName = `knowledge-base/${uuidv4()}${fileExtension}`;
    const file = this.bucket.file(fileName);

    // Upload to GCS
    await file.save(fileBuffer, {
      metadata: {
        contentType: metadata.mimetype,
      },
    });

    // Make public or generate signed URL (depending on privacy requirements)
    // For now, we'll assume we generate a signed URL or use the public URL if the bucket is public
    // But for internal knowledge base, we might just store the GCS path.
    const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${fileName}`;

    // Insert into DB
    const [document] = await db('knowledge_documents').insert({
      title: metadata.title || originalName,
      description: metadata.description,
      category: metadata.category || 'general',
      file_url: publicUrl,
      file_type: fileExtension.replace('.', ''),
      status: 'pending',
      metadata: JSON.stringify({
        originalName,
        size: fileBuffer.length,
        uploadedBy: userId,
        gcsPath: fileName
      }),
      created_by: userId
    }).returning('*');

    return document;
  }

  async getAllDocuments(filters = {}) {
    let query = db('knowledge_documents').select('*').orderBy('created_at', 'desc');

    if (filters.category) {
      query = query.where('category', filters.category);
    }
    
    if (filters.status) {
      query = query.where('status', filters.status);
    }

    return await query;
  }

  async deleteDocument(id) {
    const document = await db('knowledge_documents').where({ id }).first();
    if (!document) {
      throw new Error('Document not found');
    }

    // Delete from GCS
    if (this.bucket && document.metadata && document.metadata.gcsPath) {
      try {
        await this.bucket.file(document.metadata.gcsPath).delete();
      } catch (err) {
        console.warn(`Failed to delete file from GCS: ${err.message}`);
      }
    }

    // Delete from DB (chunks will be deleted via CASCADE)
    await db('knowledge_documents').where({ id }).del();
    
    return true;
  }
  
  async updateDocumentStatus(id, status) {
    return await db('knowledge_documents')
      .where({ id })
      .update({ status, updated_at: new Date() })
      .returning('*');
  }

  // Simple in-memory vector search (for MVP without pgvector)
  async searchKnowledgeBase(queryEmbedding, limit = 5) {
    // Fetch all chunks with embeddings
    // optimization: cache this or use pgvector in production
    const chunks = await db('knowledge_chunks')
      .join('knowledge_documents', 'knowledge_chunks.document_id', 'knowledge_documents.id')
      .select(
        'knowledge_chunks.content',
        'knowledge_chunks.embedding',
        'knowledge_documents.title',
        'knowledge_documents.category'
      )
      .whereNotNull('knowledge_chunks.embedding');

    if (!chunks.length) return [];

    // Calculate cosine similarity
    const scoredChunks = chunks.map(chunk => {
      let embedding = chunk.embedding;
      if (typeof embedding === 'string') {
        try { embedding = JSON.parse(embedding); } catch (e) { return { ...chunk, score: -1 }; }
      }
      
      if (!Array.isArray(embedding) || embedding.length !== queryEmbedding.length) {
        return { ...chunk, score: -1 };
      }

      const score = this.cosineSimilarity(queryEmbedding, embedding);
      return { ...chunk, score };
    });

    // Sort and return top K
    return scoredChunks
      .filter(c => c.score > 0.6) // Minimum relevance threshold
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

module.exports = new KnowledgeBaseService();
