// backend/utils/databaseTransactions.js
const db = require('../config/database');

async function withTransaction(callback) {
  const trx = await db.transaction();
  
  try {
    const result = await callback(trx);
    await trx.commit();
    return result;
  } catch (error) {
    await trx.rollback();
    console.error('Transaction failed:', error);
    throw error;
  }
}

async function uploadVideoTransaction(teacherId, lessonId, videoData, fileBuffer, trx) {
  // 1. Verify lesson belongs to teacher
  const lesson = await trx('lessons')
    .join('courses', 'lessons.course_id', 'courses.id')
    .where('lessons.id', lessonId)
    .where('courses.created_by', teacherId)
    .select('lessons.*')
    .first();

  if (!lesson) {
    throw new Error('Lesson not found or access denied');
  }

  // 2. Insert video record with processing status
  const [videoId] = await trx('videos').insert({
    lesson_id: lessonId,
    uploader_id: teacherId,
    storage_url: videoData.storageUrl,
    size_bytes: fileBuffer.length,
    status: 'processing',
    created_at: new Date(),
    updated_at: new Date(),
  });

  // 3. Update lesson with video reference
  await trx('lessons')
    .where({ id: lessonId })
    .update({
      video_id: videoId,
      video_url: videoData.storageUrl, // Temporary URL
      updated_at: new Date(),
    });

  return { videoId, lesson };
}

module.exports = {
  withTransaction,
  uploadVideoTransaction
};