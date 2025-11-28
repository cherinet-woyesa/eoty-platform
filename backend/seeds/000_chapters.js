exports.seed = async function(knex) {
  // Don't delete existing chapters to preserve relationships, just update or insert
  
  const chapters = [
    {
      name: 'Main Headquarters',
      location: 'Addis Ababa',
      country: 'Ethiopia',
      city: 'Addis Ababa',
      region: 'Addis Ababa',
      timezone: 'Africa/Addis_Ababa',
      language: 'Amharic',
      topics: JSON.stringify(['Leadership', 'Technology', 'Innovation']),
      description: 'Primary administration and coordination center',
      is_active: true
    },
    {
      name: 'Addis Ababa Chapter', 
      location: 'Addis Ababa',
      country: 'Ethiopia',
      city: 'Addis Ababa',
      region: 'Addis Ababa',
      timezone: 'Africa/Addis_Ababa',
      language: 'Amharic',
      topics: JSON.stringify(['Community Service', 'Education', 'Arts']),
      description: 'Capital city chapter serving urban communities',
      is_active: true
    },
    {
      name: 'Bahir Dar Chapter',
      location: 'Bahir Dar',
      country: 'Ethiopia',
      city: 'Bahir Dar',
      region: 'Amhara',
      timezone: 'Africa/Addis_Ababa',
      language: 'Amharic',
      topics: JSON.stringify(['Environment', 'Tourism', 'History']),
      description: 'Serving the Lake Tana region communities',
      is_active: true
    }
  ];

  for (const chapter of chapters) {
    const existing = await knex('chapters').where({ name: chapter.name }).first();
    if (existing) {
      await knex('chapters').where({ name: chapter.name }).update(chapter);
    } else {
      await knex('chapters').insert(chapter);
    }
  }
  
  console.log('✅ Chapters seeded/updated');
};