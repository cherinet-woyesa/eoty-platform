exports.up = function(knex) {
  // First, ensure some chapters are active
  return knex('chapters')
    .whereIn('name', ['Addis Ababa Chapter', 'Nairobi Chapter', 'Cape Town Chapter'])
    .update({ is_active: true, updated_at: new Date() })
    .then(() => {
      // Check if we need to create any chapters
      return knex('chapters').count('* as count').where('is_active', true).first();
    })
    .then((result) => {
      if (result.count < 3) {
        // Create additional test chapters if needed
        const chaptersToInsert = [];
        if (result.count === 0) {
          chaptersToInsert.push({
            name: 'Default Chapter',
            location: 'Default Location',
            country: 'Default',
            city: 'Default City',
            description: 'Default test chapter',
            timezone: 'UTC',
            language: 'English',
            topics: JSON.stringify(['general']),
            region: 'Global',
            latitude: 0,
            longitude: 0,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
          });
        }
        if (chaptersToInsert.length > 0) {
          return knex('chapters').insert(chaptersToInsert);
        }
      }
    });
};

exports.down = function(knex) {
  return knex('chapters')
    .whereIn('name', ['Addis Ababa Chapter', 'Nairobi Chapter', 'Cape Town Chapter'])
    .del();
};
