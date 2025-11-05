/**
 * Seed script for course levels
 * Migrates hardcoded LEVELS array from CourseEditor to database
 */

exports.seed = async function(knex) {
  // Delete existing entries
  await knex('course_levels').del();
  
  // Insert course levels from CourseEditor
  await knex('course_levels').insert([
    {
      name: 'Beginner',
      slug: 'beginner',
      description: 'No prior knowledge required',
      display_order: 1,
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      name: 'Intermediate',
      slug: 'intermediate',
      description: 'Basic understanding recommended',
      display_order: 2,
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      name: 'Advanced',
      slug: 'advanced',
      description: 'For experienced learners',
      display_order: 3,
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }
  ]);
  
  console.log('✅ Course levels seeded (3 levels)');
};
