const knex = require('knex');
require('dotenv').config();

const dbConfig = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: String(process.env.DB_PASSWORD),
  },
};

const db = knex(dbConfig);

async function addPinnedTopicsToForumTopics() {
  try {
    console.log('Adding pinned topics functionality to forum_topics table...');

    const hasIsPinned = await db.schema.hasColumn('forum_topics', 'is_pinned');
    const hasPinnedAt = await db.schema.hasColumn('forum_topics', 'pinned_at');
    const hasPinnedBy = await db.schema.hasColumn('forum_topics', 'pinned_by');

    if (!hasPinnedAt || !hasPinnedBy) {
      if (!hasPinnedAt) {
        await db.schema.table('forum_topics', function(table) {
          table.timestamp('pinned_at').nullable();
        });
        console.log('✅ Added pinned_at column to forum_topics');
      }

      if (!hasPinnedBy) {
        await db.schema.table('forum_topics', function(table) {
          table.string('pinned_by').nullable()
            .references('id').inTable('users').onDelete('SET NULL');
        });
        console.log('✅ Added pinned_by column to forum_topics');
      }
    } else {
      console.log('⚠️  Pinned topics columns already exist in forum_topics');
    }

    // Add indexes for better performance only if pinned_at exists
    if (hasPinnedAt) {
      try {
        await db.schema.raw('CREATE INDEX IF NOT EXISTS forum_topics_is_pinned_idx ON forum_topics (is_pinned, pinned_at DESC)');
        console.log('✅ Added index for pinned topics');
      } catch (error) {
        console.log('⚠️  Index already exists or could not be created');
      }
    }

    console.log('✅ Pinned topics functionality setup complete!');
  } catch (error) {
    console.error('❌ Error adding pinned topics functionality:', error);
  } finally {
    await db.destroy();
  }
}

addPinnedTopicsToForumTopics();
