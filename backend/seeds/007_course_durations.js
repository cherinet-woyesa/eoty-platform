/**
 * Seed script for course durations
 * Migrates hardcoded DURATIONS array from CourseEditor to database
 */

exports.seed = async function(knex) {
  // Delete existing entries
  await knex('course_durations').del();
  
  // Insert course durations from CourseEditor
  await knex('course_durations').insert([
    {
      value: '1-2',
      label: '1-2 weeks',
      weeks_min: 1,
      weeks_max: 2,
      display_order: 1,
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      value: '3-4',
      label: '3-4 weeks',
      weeks_min: 3,
      weeks_max: 4,
      display_order: 2,
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      value: '5-8',
      label: '5-8 weeks',
      weeks_min: 5,
      weeks_max: 8,
      display_order: 3,
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      value: '9+',
      label: '9+ weeks',
      weeks_min: 9,
      weeks_max: null,
      display_order: 4,
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }
  ]);
  
  console.log('✅ Course durations seeded (4 durations)');
};
