const knex = require('knex');
const knexConfig = require('./knexfile');

// Determine environment
const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment];

// Initialize knex
const db = knex(config);

async function createAdminTables() {
  try {
    console.log('Creating admin tables...');

    // 1. content_tags
    if (!(await db.schema.hasTable('content_tags'))) {
      console.log('Creating content_tags table...');
      await db.schema.createTable('content_tags', (table) => {
        table.increments('id').primary();
        table.string('name').notNullable();
        table.string('category');
        table.string('color');
        table.integer('created_by').references('id').inTable('users');
        table.boolean('is_active').defaultTo(true);
        table.timestamps(true, true);
      });
    } else {
      console.log('content_tags table already exists.');
    }

    // 2. content_tag_relationships
    if (!(await db.schema.hasTable('content_tag_relationships'))) {
      console.log('Creating content_tag_relationships table...');
      await db.schema.createTable('content_tag_relationships', (table) => {
        table.increments('id').primary();
        table.string('content_type').notNullable();
        table.integer('content_id').notNullable();
        table.integer('tag_id').references('id').inTable('content_tags').onDelete('CASCADE');
        table.integer('tagged_by').references('id').inTable('users');
        table.timestamps(true, true);
      });
    } else {
      console.log('content_tag_relationships table already exists.');
    }

    // 3. analytics_snapshots
    if (!(await db.schema.hasTable('analytics_snapshots'))) {
      console.log('Creating analytics_snapshots table...');
      await db.schema.createTable('analytics_snapshots', (table) => {
        table.increments('id').primary();
        table.string('snapshot_type').notNullable();
        table.date('snapshot_date').notNullable();
        table.jsonb('metrics');
        table.jsonb('chapter_comparison');
        table.jsonb('trends');
        table.timestamps(true, true);
      });
    } else {
      console.log('analytics_snapshots table already exists.');
    }

    // 4. content_quotas
    if (!(await db.schema.hasTable('content_quotas'))) {
      console.log('Creating content_quotas table...');
      await db.schema.createTable('content_quotas', (table) => {
        table.increments('id').primary();
        table.string('chapter_id').notNullable(); 
        table.string('content_type').notNullable();
        table.integer('monthly_limit').defaultTo(0);
        table.integer('current_usage').defaultTo(0);
        table.timestamp('period_start');
        table.timestamp('period_end');
        table.timestamps(true, true);
      });
    } else {
      console.log('content_quotas table already exists.');
    }

    // 5. flagged_content
    if (!(await db.schema.hasTable('flagged_content'))) {
      console.log('Creating flagged_content table...');
      await db.schema.createTable('flagged_content', (table) => {
        table.increments('id').primary();
        table.string('content_type').notNullable();
        table.integer('content_id').notNullable();
        table.string('reason');
        table.string('status').defaultTo('pending');
        table.integer('flagged_by').references('id').inTable('users');
        table.integer('reviewed_by').references('id').inTable('users');
        table.text('review_notes');
        table.timestamps(true, true);
      });
    } else {
      console.log('flagged_content table already exists.');
    }

    // 6. admin_audit_logs
    if (!(await db.schema.hasTable('admin_audit_logs'))) {
      console.log('Creating admin_audit_logs table...');
      await db.schema.createTable('admin_audit_logs', (table) => {
        table.increments('id').primary();
        table.integer('admin_id').references('id').inTable('users');
        table.string('action_type').notNullable();
        table.string('entity_type');
        table.integer('entity_id');
        table.text('details');
        table.string('ip_address');
        table.string('user_agent');
        table.timestamps(true, true);
      });
    } else {
      console.log('admin_audit_logs table already exists.');
    }

    // 7. chapters
    if (!(await db.schema.hasTable('chapters'))) {
      console.log('Creating chapters table...');
      await db.schema.createTable('chapters', (table) => {
        table.increments('id').primary();
        table.string('name').notNullable().unique();
        table.text('description');
        table.integer('display_order').defaultTo(0);
        table.boolean('is_active').defaultTo(true);
        table.integer('course_count').defaultTo(0);
        table.timestamps(true, true);
      });
    } else {
      console.log('chapters table already exists.');
    }

    // 8. user_chapters
    if (!(await db.schema.hasTable('user_chapters'))) {
      console.log('Creating user_chapters table...');
      await db.schema.createTable('user_chapters', (table) => {
        table.increments('id').primary();
        table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
        table.integer('chapter_id').references('id').inTable('chapters').onDelete('CASCADE');
        table.timestamps(true, true);
      });
    } else {
      console.log('user_chapters table already exists.');
    }

    // 9. course_categories
    if (!(await db.schema.hasTable('course_categories'))) {
      console.log('Creating course_categories table...');
      await db.schema.createTable('course_categories', (table) => {
        table.increments('id').primary();
        table.string('name').notNullable();
        table.string('slug').notNullable().unique();
        table.text('description');
        table.string('icon');
        table.string('color');
        table.integer('display_order').defaultTo(0);
        table.boolean('is_active').defaultTo(true);
        table.timestamps(true, true);
      });
    } else {
      console.log('course_categories table already exists.');
    }

    // 10. course_levels
    if (!(await db.schema.hasTable('course_levels'))) {
      console.log('Creating course_levels table...');
      await db.schema.createTable('course_levels', (table) => {
        table.increments('id').primary();
        table.string('name').notNullable();
        table.string('slug').notNullable().unique();
        table.text('description');
        table.integer('display_order').defaultTo(0);
        table.boolean('is_active').defaultTo(true);
        table.timestamps(true, true);
      });
    } else {
      console.log('course_levels table already exists.');
    }

    // 11. course_durations
    if (!(await db.schema.hasTable('course_durations'))) {
      console.log('Creating course_durations table...');
      await db.schema.createTable('course_durations', (table) => {
        table.increments('id').primary();
        table.string('label').notNullable();
        table.string('value').notNullable().unique();
        table.integer('display_order').defaultTo(0);
        table.boolean('is_active').defaultTo(true);
        table.timestamps(true, true);
      });
    } else {
      console.log('course_durations table already exists.');
    }

    console.log('Admin tables created successfully.');
  } catch (error) {
    console.error('Error creating admin tables:', error);
  } finally {
    await db.destroy();
  }
}

createAdminTables();
