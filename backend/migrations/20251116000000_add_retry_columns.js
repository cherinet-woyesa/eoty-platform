/**
 * Add retry columns to queue table
 * Fixes: Undefined binding(s) detected when compiling WHERE. Undefined column(s): [retry_count]
 */

exports.up = function(knex) {
  return knex.schema.hasTable('queue_jobs').then(function(queueExists) {
    let queuePromise;
    if (!queueExists) {
      // Create the queue_jobs table if it doesn't exist
      queuePromise = knex.schema.createTable('queue_jobs', function(table) {
        table.increments('id').primary();
        table.string('job_type').notNullable();
        table.jsonb('data').notNullable();
        table.string('status').defaultTo('pending');
        table.integer('retry_count').defaultTo(0);
        table.timestamp('next_retry_at').nullable();
        table.integer('max_retries').defaultTo(3);
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
        table.text('error_message').nullable();
        table.index(['status']);
        table.index(['next_retry_at']);
      });
    } else {
      // Add missing columns if table exists but columns don't
      queuePromise = knex.raw(`
        ALTER TABLE queue_jobs
        ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3
      `);
    }

    // Handle user_chapter_roles table type fixes
    const rolesPromise = knex.schema.hasTable('user_chapter_roles').then(function(exists) {
      if (exists) {
        // Fix type mismatches - users.id is text, not integer
        return knex.raw(`
          ALTER TABLE user_chapter_roles
          ALTER COLUMN user_id TYPE TEXT,
          ALTER COLUMN assigned_by TYPE TEXT
        `);
      }
    });

    return Promise.all([queuePromise, rolesPromise]);
  });
};

exports.down = function(knex) {
  return knex.schema.hasTable('queue_jobs').then(function(exists) {
    if (exists) {
      return knex.schema.table('queue_jobs', function(table) {
        table.dropColumn('retry_count');
        table.dropColumn('next_retry_at');
        table.dropColumn('max_retries');
      });
    }
  });
};
