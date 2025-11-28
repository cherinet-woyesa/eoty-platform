exports.up = async function(knex) {
  // 1. Add metadata to video_annotations
  const hasMetadata = await knex.schema.hasColumn('video_annotations', 'metadata');
  if (!hasMetadata) {
    await knex.schema.alterTable('video_annotations', function(table) {
      table.jsonb('metadata').defaultTo('{}');
    });
  }

  // 2. Add type to video_annotations
  const hasType = await knex.schema.hasColumn('video_annotations', 'type');
  if (!hasType) {
    await knex.schema.alterTable('video_annotations', function(table) {
      table.string('type').defaultTo('note'); // note, highlight, etc.
    });
  }

  // 3. Add is_moderated to lesson_discussions
  const hasIsModerated = await knex.schema.hasColumn('lesson_discussions', 'is_moderated');
  if (!hasIsModerated) {
    await knex.schema.alterTable('lesson_discussions', function(table) {
      table.boolean('is_moderated').defaultTo(false);
    });
  }

  // 4. Add order to quiz_questions (if missing, though migration 018 has order_number, controller uses order)
  // The error says column "order" does not exist. Migration 018 created "order_number".
  // We should rename order_number to order OR add order column. Renaming is cleaner if data is fresh.
  // But to be safe, let's check if "order" exists.
  const hasOrder = await knex.schema.hasColumn('quiz_questions', 'order');
  const hasOrderNumber = await knex.schema.hasColumn('quiz_questions', 'order_number');
  
  if (!hasOrder && hasOrderNumber) {
    await knex.schema.alterTable('quiz_questions', function(table) {
      table.renameColumn('order_number', 'order');
    });
  } else if (!hasOrder) {
    await knex.schema.alterTable('quiz_questions', function(table) {
      table.integer('order').defaultTo(0);
    });
  }
};

exports.down = async function(knex) {
  const hasMetadata = await knex.schema.hasColumn('video_annotations', 'metadata');
  if (hasMetadata) {
    await knex.schema.alterTable('video_annotations', function(table) {
      table.dropColumn('metadata');
    });
  }

  const hasType = await knex.schema.hasColumn('video_annotations', 'type');
  if (hasType) {
    await knex.schema.alterTable('video_annotations', function(table) {
      table.dropColumn('type');
    });
  }

  const hasIsModerated = await knex.schema.hasColumn('lesson_discussions', 'is_moderated');
  if (hasIsModerated) {
    await knex.schema.alterTable('lesson_discussions', function(table) {
      table.dropColumn('is_moderated');
    });
  }
  
  // Reverting order rename is complex without knowing original state perfectly, skipping for safety in down migration
};
