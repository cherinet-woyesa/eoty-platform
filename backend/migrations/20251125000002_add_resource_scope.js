exports.up = async function(knex) {
  const hasResourceScope = await knex.schema.hasColumn('resources', 'resource_scope');
  const hasCourseId = await knex.schema.hasColumn('resources', 'course_id');
  const hasLessonId = await knex.schema.hasColumn('resources', 'lesson_id');

  return knex.schema.alterTable('resources', function(table) {
    // Add resource_scope column to differentiate between different types of resources
    if (!hasResourceScope) {
      table.enum('resource_scope', ['course_specific', 'chapter_wide', 'platform_wide'])
        .defaultTo('chapter_wide')
        .notNullable()
        .comment('Scope of resource visibility: course_specific (tied to lessons), chapter_wide (available to chapter members), platform_wide (available to all users)');
    }

    // Add course_id for course-specific resources
    if (!hasCourseId) {
      table.integer('course_id').nullable()
        .references('courses.id')
        .onDelete('CASCADE')
        .comment('Reference to course for course-specific resources');
    }

    // Add lesson_id for lesson-specific resources
    if (!hasLessonId) {
      table.integer('lesson_id').nullable()
        .references('lessons.id')
        .onDelete('CASCADE')
        .comment('Reference to lesson for lesson-specific resources');
    }

    // Add index for better query performance
    // Note: If columns existed from 004, these indexes might be missing, so we add them.
    // If this migration runs multiple times, this might fail.
    table.index(['resource_scope', 'chapter_id']);
    table.index(['resource_scope', 'course_id']);
    table.index(['resource_scope', 'lesson_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('resources', function(table) {
    table.dropIndex(['resource_scope', 'chapter_id']);
    table.dropIndex(['resource_scope', 'course_id']);
    table.dropIndex(['resource_scope', 'lesson_id']);
    // Only drop columns if we are sure we want to lose data
    // table.dropColumn('lesson_id');
    // table.dropColumn('course_id');
    // table.dropColumn('resource_scope');
  });
};
