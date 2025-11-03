exports.seed = async function(knex) {
  // Get teacher user
  const teacher = await knex('users').where('email', 'teacher@eoty.org').first();
  const chapters = await knex('chapters').select('id');
  
  if (!teacher || chapters.length === 0) {
    console.log('Teacher user or chapters not found');
    return;
  }

  // Clear existing data
  await knex('lessons').del();
  await knex('courses').del();

  // Insert courses
  const courses = await knex('courses').insert([
    {
      title: 'Introduction to Ethiopian Orthodox Tewahedo Faith',
      description: 'A foundational course covering the basics of the EOT faith, traditions, and practices.',
      category: 'Theology',
      chapter_id: chapters[0].id,
      created_by: teacher.id,
      is_published: true,
      published_at: new Date()
    },
    {
      title: 'Biblical Studies: Old Testament',
      description: 'Deep dive into the books of the Old Testament with historical context and theological insights.',
      category: 'Biblical Studies',
      chapter_id: chapters[0].id,
      created_by: teacher.id,
      is_published: true,
      published_at: new Date()
    }
  ]).returning('id');

  console.log('✅ Courses seeded');

  // Insert lessons for the first course
  await knex('lessons').insert([
    {
      title: 'Welcome to Orthodox Christianity',
      description: 'Introduction to the basic beliefs and history of the Orthodox faith.',
      course_id: courses[0].id,
      order: 1,
      duration: 30,
      is_published: true,
      created_by: teacher.id
    },
    {
      title: 'The Holy Trinity',
      description: 'Understanding the doctrine of the Trinity in Orthodox theology.',
      course_id: courses[0].id,
      order: 2,
      duration: 45,
      is_published: true,
      created_by: teacher.id
    },
    {
      title: 'Sacraments and Worship',
      description: 'Exploring the seven sacraments and liturgical practices.',
      course_id: courses[0].id,
      order: 3,
      duration: 60,
      is_published: true,
      created_by: teacher.id
    }
  ]);

  console.log('✅ Lessons seeded');
};