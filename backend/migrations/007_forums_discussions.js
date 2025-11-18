/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if table already exists
  const hasTable = await knex.schema.hasTable('lesson_discussions');
  if (hasTable) {
    console.log('✓ lesson_discussions table already exists, skipping migration');
    return;
  }

  // Forums - organized discussion spaces
  await knex.schema.createTable("forums", (table) => {
    table.increments("id").primary();
    table.string("title").notNullable();
    table.text("description");
    table.integer("course_id").unsigned().references("id").inTable("courses").onDelete("CASCADE");
    table.integer("chapter_id").unsigned().references("id").inTable("chapters").onDelete("CASCADE");
    table.integer("created_by").unsigned().references("id").inTable("users").onDelete("CASCADE");
    table.boolean("is_active").defaultTo(true);
    table.boolean("is_public").defaultTo(true);
    table.jsonb("moderation_rules");
    table.integer("topic_count").defaultTo(0);
    table.integer("post_count").defaultTo(0);
    table.timestamp("last_activity_at").defaultTo(knex.fn.now());
    table.timestamps(true, true);
    
    table.index(["course_id", "is_active"]);
    table.index(["chapter_id", "is_active"]);
  });

  // Forum topics
  await knex.schema.createTable("forum_topics", (table) => {
    table.increments("id").primary();
    table.integer("forum_id").unsigned().references("id").inTable("forums").onDelete("CASCADE");
    table.string("title").notNullable();
    table.text("content").notNullable();
    table.integer("author_id").unsigned().references("id").inTable("users").onDelete("CASCADE");
    table.boolean("is_pinned").defaultTo(false);
    table.boolean("is_locked").defaultTo(false);
    table.integer("view_count").defaultTo(0);
    table.integer("post_count").defaultTo(0);
    table.integer("last_post_id").unsigned();
    table.timestamp("last_activity_at").defaultTo(knex.fn.now());
    table.jsonb("topic_metadata"); // Tags, categories, etc.
    table.timestamps(true, true);
    
    table.index(["forum_id", "last_activity_at"]);
    table.index(["author_id", "created_at"]);
    table.index(["is_pinned", "created_at"]);
  });

  // Forum posts
  await knex.schema.createTable("forum_posts", (table) => {
    table.increments("id").primary();
    table.integer("topic_id").unsigned().references("id").inTable("forum_topics").onDelete("CASCADE");
    table.string("user_id").notNullable();
    table.integer("parent_id").unsigned().references("id").inTable("forum_posts").onDelete("CASCADE");
    table.text("content").notNullable();
    table.integer("like_count").defaultTo(0);
    table.boolean("is_moderated").defaultTo(false);
    table.string("moderation_reason");
    table.jsonb("metadata");
    table.timestamps(true, true);
    
    table.index(["topic_id", "created_at"]);
    table.index(["user_id", "created_at"]);
    table.index(["parent_id"]);
  });

  // Lesson discussions (video timestamp-based discussions)
  await knex.schema.createTable('lesson_discussions', (table) => {
    table.increments('id').primary();
    table.string('user_id').notNullable().onDelete('CASCADE');
    table.integer('lesson_id').unsigned().references('id').inTable('lessons').onDelete('CASCADE');
    table.integer('parent_id').unsigned().references('id').inTable('lesson_discussions').onDelete('CASCADE');
    table.text('content').notNullable();
    table.float('video_timestamp');
    table.boolean('is_pinned').defaultTo(false);
    table.boolean('is_moderated').defaultTo(false);
    table.integer('report_count').defaultTo(0);
    table.boolean('is_auto_flagged').defaultTo(false);
    table.string('auto_flag_reason', 50);
    table.integer('like_count').defaultTo(0);
    table.jsonb('discussion_metadata');
    table.timestamps(true, true);
    
    table.index(['lesson_id', 'created_at']);
    table.index(['lesson_id', 'video_timestamp']);
    table.index(['user_id', 'lesson_id']);
    table.index(['parent_id']);
  });

  // Discussion reports
  await knex.schema.createTable('discussion_reports', (table) => {
    table.increments('id').primary();
    table.integer('post_id').unsigned(); // Can be forum_posts.id or lesson_discussions.id
    table.string('post_type').notNullable(); // 'forum' or 'lesson'
    table.integer('reporter_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.enu('reason', ['inappropriate', 'spam', 'harassment', 'offensive', 'other']).notNullable();
    table.text('details');
    table.string('status').defaultTo('pending');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('resolved_at');
    table.integer('resolved_by').unsigned().references('id').inTable('users');
    
    table.unique(['post_id', 'post_type', 'reporter_id']);
    table.index(['post_id', 'post_type']);
    table.index(['reporter_id']);
    table.index(['status', 'created_at']);
  });

  // Post likes
  await knex.schema.createTable('post_likes', (table) => {
    table.increments('id').primary();
    table.string('user_id').notNullable().onDelete('CASCADE');
    table.integer('post_id').unsigned();
    table.string('post_type').notNullable(); // 'forum' or 'lesson'
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.unique(['user_id', 'post_id', 'post_type']);
    table.index(['post_id', 'post_type']);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('post_likes');
  await knex.schema.dropTableIfExists('discussion_reports');
  await knex.schema.dropTableIfExists('lesson_discussions');
  await knex.schema.dropTableIfExists('forum_posts');
  await knex.schema.dropTableIfExists('forum_topics');
  await knex.schema.dropTableIfExists('forums');
};