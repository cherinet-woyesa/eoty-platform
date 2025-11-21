const knex = require('knex');
const knexConfig = require('../knexfile');

const db = knex(knexConfig.development);

// List of historical migration files that are expected by the DB but missing
const missing = [
  '001_initial_platform.js',
  '002_courses_lessons.js',
  '003_permissions_system.js',
  '004_resources_ai.js',
  '005_quizzes_assessments.js',
  '006_user_progress_tracking.js',
  '007_forums_discussions.js',
  '20251115000006_enhance_chapter_auth_fr7.js',
  '20251120000001_create_flagged_content.js',
  '20251120010000_create_community_posts.js'
];

async function markApplied() {
  try {
    // Ensure knex_migrations table exists
    const has = await db.schema.hasTable('knex_migrations');
    if (!has) {
      console.log('knex_migrations table does not exist — creating minimal table');
      await db.schema.createTable('knex_migrations', t => {
        t.increments('id');
        t.string('name');
        t.timestamp('migration_time');
      });
    }

    const existing = await db('knex_migrations').pluck('name');

    const toInsert = missing.filter(m => !existing.includes(m)).map(m => ({ name: m, migration_time: new Date() }));

    if (toInsert.length === 0) {
      console.log('All missing migrations already marked applied.');
    } else {
      console.log('Marking the following migrations as applied:', toInsert.map(t => t.name));
      await db('knex_migrations').insert(toInsert);
      console.log('Marked as applied.');
    }
  } catch (err) {
    console.error('Failed to mark migrations applied:', err);
  } finally {
    await db.destroy();
  }
}

markApplied();
