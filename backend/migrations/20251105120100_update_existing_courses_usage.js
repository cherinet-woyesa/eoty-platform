/**
 * Migration to update existing courses to reference new configuration tables
 * and calculate usage counts for all entities
 */

exports.up = async function(knex) {
  console.log('Starting migration to update existing courses and calculate usage counts...');

  // Step 1: Add estimated_duration column to courses table if it doesn't exist
  const hasEstimatedDuration = await knex.schema.hasColumn('courses', 'estimated_duration');
  if (!hasEstimatedDuration) {
    await knex.schema.table('courses', function(table) {
      table.string('estimated_duration', 20);
    });
    console.log('✓ Added estimated_duration column to courses');
  }

  // Step 2: Add prerequisites column to courses table if it doesn't exist
  const hasPrerequisites = await knex.schema.hasColumn('courses', 'prerequisites');
  if (!hasPrerequisites) {
    await knex.schema.table('courses', function(table) {
      table.text('prerequisites');
    });
    console.log('✓ Added prerequisites column to courses');
  }

  // Step 3: Add learning_objectives column to courses table if it doesn't exist
  const hasLearningObjectives = await knex.schema.hasColumn('courses', 'learning_objectives');
  if (!hasLearningObjectives) {
    await knex.schema.table('courses', function(table) {
      table.jsonb('learning_objectives');
    });
    console.log('✓ Added learning_objectives column to courses');
  }

  // Step 4: Add usage_count column to course_categories if it doesn't exist
  const hasCategoryUsageCount = await knex.schema.hasColumn('course_categories', 'usage_count');
  if (!hasCategoryUsageCount) {
    await knex.schema.table('course_categories', function(table) {
      table.integer('usage_count').defaultTo(0);
    });
    console.log('✓ Added usage_count column to course_categories');
  }

  // Step 5: Add usage_count column to course_levels if it doesn't exist
  const hasLevelUsageCount = await knex.schema.hasColumn('course_levels', 'usage_count');
  if (!hasLevelUsageCount) {
    await knex.schema.table('course_levels', function(table) {
      table.integer('usage_count').defaultTo(0);
    });
    console.log('✓ Added usage_count column to course_levels');
  }

  // Step 6: Add usage_count column to course_durations if it doesn't exist
  const hasDurationUsageCount = await knex.schema.hasColumn('course_durations', 'usage_count');
  if (!hasDurationUsageCount) {
    await knex.schema.table('course_durations', function(table) {
      table.integer('usage_count').defaultTo(0);
    });
    console.log('✓ Added usage_count column to course_durations');
  }

  // Step 7: Calculate and update usage_count for course_categories
  console.log('Calculating usage counts for course categories...');
  
  const categoryUsage = await knex('courses')
    .select('category')
    .count('* as count')
    .whereNotNull('category')
    .groupBy('category');
  
  for (const row of categoryUsage) {
    await knex('course_categories')
      .where('slug', row.category)
      .update({
        usage_count: row.count,
        updated_at: knex.fn.now()
      });
  }
  
  console.log(`✓ Updated usage counts for ${categoryUsage.length} categories`);

  // Step 8: Calculate and update usage_count for course_levels
  console.log('Calculating usage counts for course levels...');
  
  const levelUsage = await knex('courses')
    .select('level')
    .count('* as count')
    .whereNotNull('level')
    .groupBy('level');
  
  for (const row of levelUsage) {
    await knex('course_levels')
      .where('slug', row.level)
      .update({
        usage_count: row.count,
        updated_at: knex.fn.now()
      });
  }
  
  console.log(`✓ Updated usage counts for ${levelUsage.length} levels`);

  // Step 9: Calculate and update usage_count for course_durations
  console.log('Calculating usage counts for course durations...');
  
  const durationUsage = await knex('courses')
    .select('estimated_duration')
    .count('* as count')
    .whereNotNull('estimated_duration')
    .where('estimated_duration', '!=', '')
    .groupBy('estimated_duration');
  
  for (const row of durationUsage) {
    await knex('course_durations')
      .where('value', row.estimated_duration)
      .update({
        usage_count: row.count,
        updated_at: knex.fn.now()
      });
  }
  
  console.log(`✓ Updated usage counts for ${durationUsage.length} durations`);

  console.log('✓ Migration completed successfully');
};

exports.down = async function(knex) {
  console.log('Rolling back usage count updates...');
  
  // Remove usage_count columns from configuration tables
  const hasCategoryUsageCount = await knex.schema.hasColumn('course_categories', 'usage_count');
  if (hasCategoryUsageCount) {
    await knex.schema.table('course_categories', function(table) {
      table.dropColumn('usage_count');
    });
  }

  const hasLevelUsageCount = await knex.schema.hasColumn('course_levels', 'usage_count');
  if (hasLevelUsageCount) {
    await knex.schema.table('course_levels', function(table) {
      table.dropColumn('usage_count');
    });
  }

  const hasDurationUsageCount = await knex.schema.hasColumn('course_durations', 'usage_count');
  if (hasDurationUsageCount) {
    await knex.schema.table('course_durations', function(table) {
      table.dropColumn('usage_count');
    });
  }

  // Remove new columns from courses table
  const hasEstimatedDuration = await knex.schema.hasColumn('courses', 'estimated_duration');
  if (hasEstimatedDuration) {
    await knex.schema.table('courses', function(table) {
      table.dropColumn('estimated_duration');
    });
  }

  const hasPrerequisites = await knex.schema.hasColumn('courses', 'prerequisites');
  if (hasPrerequisites) {
    await knex.schema.table('courses', function(table) {
      table.dropColumn('prerequisites');
    });
  }

  const hasLearningObjectives = await knex.schema.hasColumn('courses', 'learning_objectives');
  if (hasLearningObjectives) {
    await knex.schema.table('courses', function(table) {
      table.dropColumn('learning_objectives');
    });
  }

  console.log('✓ Rollback completed');
};
