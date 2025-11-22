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

async function createForumAttachmentsTable() {
  try {
    console.log('Creating forum attachments table...');

    const exists = await db.schema.hasTable('forum_attachments');
    if (!exists) {
      await db.schema.createTable('forum_attachments', function(table) {
        table.increments('id').primary();
        table.integer('post_id').unsigned().nullable()
          .references('id').inTable('forum_posts').onDelete('CASCADE');
        table.integer('topic_id').unsigned().nullable()
          .references('id').inTable('forum_topics').onDelete('CASCADE');
        table.string('file_name').notNullable();
        table.string('original_name').notNullable();
        table.string('file_path').notNullable(); // URL or path to file
        table.string('file_type').notNullable(); // 'image', 'document', 'video', 'audio'
        table.string('mime_type').notNullable();
        table.integer('file_size').notNullable(); // in bytes
        table.string('uploaded_by').notNullable()
          .references('id').inTable('users').onDelete('CASCADE');
        table.timestamps(true, true);

        // Ensure either post_id or topic_id is provided, but not both
        table.check('?? IS NOT NULL OR ?? IS NOT NULL', ['post_id', 'topic_id']);
        table.check('NOT (?? IS NOT NULL AND ?? IS NOT NULL)', ['post_id', 'topic_id']);

        // Indexes
        table.index(['post_id']);
        table.index(['topic_id']);
        table.index(['uploaded_by']);
        table.index(['file_type']);
      });
      console.log('✅ Created forum_attachments table');
    } else {
      console.log('⚠️  forum_attachments table already exists');
    }

    console.log('✅ Forum attachments table setup complete!');
  } catch (error) {
    console.error('❌ Error creating forum attachments table:', error);
  } finally {
    await db.destroy();
  }
}

createForumAttachmentsTable();
