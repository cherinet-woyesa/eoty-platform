exports.seed = async function(knex) {
  await knex('chapters').del();
  
  await knex('chapters').insert([
    {
      name: 'Main Headquarters',
      location: 'Addis Ababa',
      description: 'Primary administration and coordination center',
      is_active: true
    },
    {
      name: 'Addis Ababa Chapter', 
      location: 'Addis Ababa',
      description: 'Capital city chapter serving urban communities',
      is_active: true
    },
    {
      name: 'Bahir Dar Chapter',
      location: 'Bahir Dar',
      description: 'Serving the Lake Tana region communities',
      is_active: true
    }
  ]);
  
  console.log('✅ Chapters seeded');
};