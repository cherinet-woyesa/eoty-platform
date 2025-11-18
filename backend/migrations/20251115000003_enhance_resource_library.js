/**
 * Migration: Enhance Resource Library (FR3)
 * REQUIREMENT: Resource Library with search, notes, AI summaries, export/share
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Add topic field to resources (REQUIREMENT: Search by topic)
  const hasTopic = await knex.schema.hasColumn('resources', 'topic');
  if (!hasTopic) {
    await knex.schema.table('resources', (table) => {
      table.string('topic').nullable();
      table.index('topic');
    });
  }

  // Add date fields for filtering (REQUIREMENT: Search by date)
  const hasPublishedDate = await knex.schema.hasColumn('resources', 'published_date');
  if (!hasPublishedDate) {
    await knex.schema.table('resources', (table) => {
      table.date('published_date').nullable();
      table.index('published_date');
    });
  }

  // Enhance user_notes with section anchoring (REQUIREMENT: Anchor notes to sections)
  const hasSectionAnchor = await knex.schema.hasColumn('user_notes', 'section_anchor');
  if (!hasSectionAnchor) {
    await knex.schema.table('user_notes', (table) => {
      table.string('section_anchor').nullable(); // e.g., "page_5", "chapter_2", "paragraph_10"
      table.text('section_text').nullable(); // Excerpt of the section
      table.integer('section_position').nullable(); // Position in document
      table.index(['resource_id', 'section_anchor']);
    });
  }

  // Add shared notes table (REQUIREMENT: Share notes with chapter members)
  const hasSharedNotes = await knex.schema.hasTable('shared_resource_notes');
  if (!hasSharedNotes) {
    await knex.schema.createTable('shared_resource_notes', (table) => {
      table.increments('id').primary();
      table.integer('note_id').unsigned().notNullable().references('id').inTable('user_notes').onDelete('CASCADE');
      table.integer('shared_by').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.integer('chapter_id').unsigned().references('id').inTable('chapters').onDelete('CASCADE');
      table.boolean('is_approved').defaultTo(false); // For moderation
      table.timestamps(true, true);
      
      table.index(['chapter_id', 'is_approved']);
      table.index(['shared_by']);
    });
  }

  // Enhance AI summaries with relevance validation (REQUIREMENT: 98% relevance)
  const hasAdminValidated = await knex.schema.hasColumn('ai_summaries', 'admin_validated');
  if (!hasAdminValidated) {
    await knex.schema.table('ai_summaries', (table) => {
      table.boolean('admin_validated').defaultTo(false);
      table.decimal('admin_relevance_score', 3, 2).nullable(); // Admin-validated relevance (0-1)
      table.integer('validated_by').unsigned().references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('validated_at').nullable();
      table.text('validation_notes').nullable();
      table.integer('word_count').defaultTo(0); // REQUIREMENT: < 250 words
      table.boolean('meets_word_limit').defaultTo(true); // REQUIREMENT: < 250 words
      table.index(['admin_validated', 'relevance_score']);
    });
  }

  // Resource library coverage tracking (REQUIREMENT: 80%+ coverage)
  const hasCoverageTracking = await knex.schema.hasTable('resource_library_coverage');
  if (!hasCoverageTracking) {
    await knex.schema.createTable('resource_library_coverage', (table) => {
      table.increments('id').primary();
      table.string('source_type').notNullable(); // 'faith_source', 'historical', 'theological', etc.
      table.string('source_name').notNullable();
      table.integer('total_items').defaultTo(0); // Total items in source
      table.integer('indexed_items').defaultTo(0); // Items indexed in library
      table.decimal('coverage_percentage', 5, 2).defaultTo(0); // REQUIREMENT: 80%+
      table.boolean('meets_requirement').defaultTo(false); // >= 80%
      table.jsonb('metadata');
      table.timestamp('last_updated').defaultTo(knex.fn.now());
      table.timestamps(true, true);
      
      table.index(['source_type', 'meets_requirement']);
      table.unique(['source_type', 'source_name']);
    });
  }

  // Resource export tracking (REQUIREMENT: Export notes/summaries)
  const hasExportTracking = await knex.schema.hasTable('resource_exports');
  if (!hasExportTracking) {
    await knex.schema.createTable('resource_exports', (table) => {
      table.increments('id').primary();
      table.string('user_id').notNullable().onDelete('CASCADE');
      table.integer('resource_id').unsigned().references('id').inTable('resources').onDelete('SET NULL');
      table.string('export_type').notNullable(); // 'notes', 'summary', 'full', 'combined'
      table.string('format').notNullable(); // 'pdf', 'docx', 'txt', 'json'
      table.string('file_path').nullable();
      table.jsonb('export_data');
      table.timestamps(true, true);
      
      table.index(['user_id', 'created_at']);
      table.index(['resource_id']);
    });
  }

  // Resource sharing with chapter members (REQUIREMENT: Share with chapter members)
  const hasResourceSharing = await knex.schema.hasTable('resource_shares');
  if (!hasResourceSharing) {
    await knex.schema.createTable('resource_shares', (table) => {
      table.increments('id').primary();
      table.integer('resource_id').unsigned().notNullable().references('id').inTable('resources').onDelete('CASCADE');
      table.integer('shared_by').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.integer('chapter_id').unsigned().notNullable().references('id').inTable('chapters').onDelete('CASCADE');
      table.string('share_type').defaultTo('view'); // 'view', 'annotate', 'export'
      table.text('message').nullable();
      table.timestamps(true, true);
      
      table.index(['chapter_id', 'created_at']);
      table.index(['resource_id']);
      table.index(['shared_by']);
    });
  }

  // Unsupported file type tracking (REQUIREMENT: Error notification)
  const hasUnsupportedFiles = await knex.schema.hasTable('unsupported_file_attempts');
  if (!hasUnsupportedFiles) {
    await knex.schema.createTable('unsupported_file_attempts', (table) => {
      table.increments('id').primary();
      table.string('user_id').notNullable().onDelete('SET NULL');
      table.string('file_name').notNullable();
      table.string('file_type').notNullable();
      table.string('mime_type').nullable();
      table.bigInteger('file_size').nullable();
      table.text('error_message').nullable();
      table.timestamps(true, true);
      
      table.index(['file_type', 'created_at']);
      table.index(['user_id']);
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('unsupported_file_attempts');
  await knex.schema.dropTableIfExists('resource_shares');
  await knex.schema.dropTableIfExists('resource_exports');
  await knex.schema.dropTableIfExists('resource_library_coverage');
  await knex.schema.dropTableIfExists('shared_resource_notes');
  
  // Note: We don't drop columns to preserve data
};


