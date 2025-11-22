exports.seed = function(knex) {
  // Check if chapters already exist
  return knex('chapters').count('id as count').first()
    .then(result => {
      if (result.count > 0) {
        console.log('Chapters already exist, skipping seed');
        return;
      }

      return knex('chapters').insert([
        {
          name: 'Addis Ababa Central',
          location: 'Addis Ababa, Ethiopia',
          country: 'Ethiopia',
          city: 'Addis Ababa',
          description: 'Central chapter for Addis Ababa students and professionals',
          timezone: 'Africa/Addis_Ababa',
          language: 'am',
          topics: JSON.stringify(['Faith', 'Education', 'Community Service', 'Youth Ministry']),
          region: 'East Africa',
          latitude: 9.145,
          longitude: 38.7379,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          name: 'Dire Dawa Community',
          location: 'Dire Dawa, Ethiopia',
          country: 'Ethiopia',
          city: 'Dire Dawa',
          description: 'Community-focused chapter serving Dire Dawa region',
          timezone: 'Africa/Addis_Ababa',
          language: 'am',
          topics: JSON.stringify(['Community Development', 'Education', 'Healthcare', 'Faith']),
          region: 'East Africa',
          latitude: 9.6009,
          longitude: 41.8661,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          name: 'Mekelle University',
          location: 'Mekelle, Ethiopia',
          country: 'Ethiopia',
          city: 'Mekelle',
          description: 'University-focused chapter for Mekelle students',
          timezone: 'Africa/Addis_Ababa',
          language: 'ti',
          topics: JSON.stringify(['Higher Education', 'Research', 'Youth Leadership', 'Faith']),
          region: 'East Africa',
          latitude: 13.4969,
          longitude: 39.4769,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          name: 'Awassa Lakeside',
          location: 'Awassa, Ethiopia',
          country: 'Ethiopia',
          city: 'Awassa',
          description: 'Peaceful chapter by the lakeside focusing on spiritual growth',
          timezone: 'Africa/Addis_Ababa',
          language: 'am',
          topics: JSON.stringify(['Spiritual Growth', 'Nature', 'Community', 'Education']),
          region: 'East Africa',
          latitude: 7.0621,
          longitude: 38.4769,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          name: 'Bahir Dar Unity',
          location: 'Bahir Dar, Ethiopia',
          country: 'Ethiopia',
          city: 'Bahir Dar',
          description: 'Unity-focused chapter promoting togetherness and growth',
          timezone: 'Africa/Addis_Ababa',
          language: 'am',
          topics: JSON.stringify(['Unity', 'Cultural Heritage', 'Education', 'Faith']),
          region: 'East Africa',
          latitude: 11.5742,
          longitude: 37.3614,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          name: 'London Bridge',
          location: 'London, United Kingdom',
          country: 'United Kingdom',
          city: 'London',
          description: 'International chapter serving Ethiopian community in London',
          timezone: 'Europe/London',
          language: 'en',
          topics: JSON.stringify(['Diaspora', 'Cultural Exchange', 'Education', 'Faith']),
          region: 'Europe',
          latitude: 51.5074,
          longitude: -0.1278,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          name: 'Toronto Community',
          location: 'Toronto, Canada',
          country: 'Canada',
          city: 'Toronto',
          description: 'Canadian chapter supporting Ethiopian diaspora',
          timezone: 'America/Toronto',
          language: 'en',
          topics: JSON.stringify(['Immigration', 'Education', 'Cultural Preservation', 'Faith']),
          region: 'North America',
          latitude: 43.6532,
          longitude: -79.3832,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          name: 'Washington DC',
          location: 'Washington DC, USA',
          country: 'United States',
          city: 'Washington DC',
          description: 'US capital chapter for Ethiopian community',
          timezone: 'America/New_York',
          language: 'en',
          topics: JSON.stringify(['Policy', 'Education', 'Community Service', 'Faith']),
          region: 'North America',
          latitude: 38.9072,
          longitude: -77.0369,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);
    });
};
