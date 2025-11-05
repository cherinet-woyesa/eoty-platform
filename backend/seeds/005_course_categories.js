/**
 * Seed script for course categories
 * Migrates hardcoded CATEGORIES array from CourseEditor to database
 */

exports.seed = async function(knex) {
  // Delete existing entries
  await knex('course_categories').del();
  
  // Insert course categories from CourseEditor
  await knex('course_categories').insert([
    {
      name: 'Faith & Doctrine',
      slug: 'faith',
      icon: 'BookOpen',
      description: 'Courses focused on faith formation and doctrinal teachings',
      display_order: 1,
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      name: 'Church History',
      slug: 'history',
      icon: 'Clock',
      description: 'Courses exploring the history of the Church',
      display_order: 2,
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      name: 'Spiritual Development',
      slug: 'spiritual',
      icon: 'BookOpen',
      description: 'Courses for personal spiritual growth and development',
      display_order: 3,
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      name: 'Bible Study',
      slug: 'bible',
      icon: 'BookOpen',
      description: 'In-depth study of Scripture and biblical texts',
      display_order: 4,
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      name: 'Liturgical Studies',
      slug: 'liturgical',
      icon: 'BookOpen',
      description: 'Courses on liturgy, worship, and sacraments',
      display_order: 5,
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      name: 'Youth Ministry',
      slug: 'youth',
      icon: 'BookOpen',
      description: 'Courses designed for youth ministry and engagement',
      display_order: 6,
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }
  ]);
  
  console.log('✅ Course categories seeded (6 categories)');
};
