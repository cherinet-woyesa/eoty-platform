/**
 * FR3: Seed Resource Library Mock Data
 * Creates comprehensive mock resources for testing Resource Library features
 * Includes various categories, types, topics, authors, and languages
 */

exports.seed = async function(knex) {
  // Check if resources already exist
  const existingResources = await knex('resources').count('* as count').first();
  if (parseInt(existingResources?.count || 0) > 0) {
    console.log('⚠️  Resources already exist, skipping seed');
    return;
  }

  const now = new Date();
  const mockResources = [
    // SCRIPTURE CATEGORY
    {
      title: 'Holy Bible - Ge\'ez Version',
      description: 'Complete Ge\'ez Bible with traditional Orthodox canon. Includes Old and New Testaments with detailed annotations.',
      author: 'Ethiopian Orthodox Church',
      category: 'Scripture',
      topic: 'Orthodox Doctrine',
      file_type: 'application/pdf',
      file_name: 'holy_bible_geez.pdf',
      file_size: 5242880, // 5MB
      file_url: '/uploads/resources/holy_bible_geez.pdf',
      language: 'geez',
      tags: JSON.stringify(['bible', 'scripture', 'geez', 'orthodox', 'canon']),
      is_public: true,
      chapter_id: null,
      published_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      published_date: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      created_at: now,
      updated_at: now
    },
    {
      title: 'Psalms of David - Amharic Translation',
      description: 'Complete Book of Psalms translated into Amharic with musical notations for liturgical use.',
      author: 'Translation Committee',
      category: 'Scripture',
      topic: 'Worship',
      file_type: 'application/pdf',
      file_name: 'psalms_amharic.pdf',
      file_size: 2097152, // 2MB
      file_url: '/uploads/resources/psalms_amharic.pdf',
      language: 'amharic',
      tags: JSON.stringify(['psalms', 'worship', 'amharic', 'liturgy', 'music']),
      is_public: true,
      chapter_id: null,
      published_at: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      published_date: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      created_at: now,
      updated_at: now
    },
    {
      title: 'Gospel of John - English Study Edition',
      description: 'In-depth study guide for the Gospel of John with commentary and reflection questions.',
      author: 'Dr. Michael Abebe',
      category: 'Scripture',
      topic: 'Orthodox Doctrine',
      file_type: 'application/pdf',
      file_name: 'gospel_john_study.pdf',
      file_size: 3145728, // 3MB
      file_url: '/uploads/resources/gospel_john_study.pdf',
      language: 'english',
      tags: JSON.stringify(['gospel', 'john', 'study', 'commentary', 'new-testament']),
      is_public: true,
      chapter_id: null,
      published_at: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
      published_date: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
      created_at: now,
      updated_at: now
    },

    // THEOLOGY CATEGORY
    {
      title: 'Introduction to Orthodox Theology',
      description: 'Comprehensive introduction to Orthodox Christian theology covering fundamental doctrines, sacraments, and spiritual practices.',
      author: 'Metropolitan Yohannes',
      category: 'Theology',
      topic: 'Orthodox Doctrine',
      file_type: 'application/pdf',
      file_name: 'orthodox_theology_intro.pdf',
      file_size: 4194304, // 4MB
      file_url: '/uploads/resources/orthodox_theology_intro.pdf',
      language: 'english',
      tags: JSON.stringify(['theology', 'doctrine', 'orthodox', 'introduction', 'fundamentals']),
      is_public: true,
      chapter_id: null,
      published_at: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
      published_date: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
      created_at: now,
      updated_at: now
    },
    {
      title: 'The Mystery of the Trinity',
      description: 'Deep theological exploration of the Holy Trinity in Orthodox tradition with patristic references.',
      author: 'Fr. Samuel Gebre',
      category: 'Theology',
      topic: 'Orthodox Doctrine',
      file_type: 'text/markdown',
      file_name: 'trinity_mystery.md',
      file_size: 1048576, // 1MB
      file_url: '/uploads/resources/trinity_mystery.md',
      language: 'english',
      tags: JSON.stringify(['trinity', 'theology', 'patristic', 'doctrine', 'mystery']),
      is_public: true,
      chapter_id: null,
      published_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      published_date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      created_at: now,
      updated_at: now
    },
    {
      title: 'Sacraments of the Church',
      description: 'Detailed explanation of the seven sacraments in the Ethiopian Orthodox Church with liturgical context.',
      author: 'Bishop Tekle',
      category: 'Theology',
      topic: 'Worship',
      file_type: 'application/pdf',
      file_name: 'sacraments_church.pdf',
      file_size: 3145728, // 3MB
      file_url: '/uploads/resources/sacraments_church.pdf',
      language: 'amharic',
      tags: JSON.stringify(['sacraments', 'liturgy', 'church', 'worship', 'orthodox']),
      is_public: true,
      chapter_id: null,
      published_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      published_date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      created_at: now,
      updated_at: now
    },

    // HISTORY CATEGORY
    {
      title: 'History of the Ethiopian Orthodox Church',
      description: 'Comprehensive history from the arrival of Christianity to modern times, including key events and figures.',
      author: 'Dr. Alemayehu Tsegaye',
      category: 'History',
      topic: 'Church History',
      file_type: 'application/pdf',
      file_name: 'ethiopian_church_history.pdf',
      file_size: 6291456, // 6MB
      file_url: '/uploads/resources/ethiopian_church_history.pdf',
      language: 'english',
      tags: JSON.stringify(['history', 'ethiopia', 'church', 'orthodox', 'timeline']),
      is_public: true,
      chapter_id: null,
      published_at: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000),
      published_date: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000),
      created_at: now,
      updated_at: now
    },
    {
      title: 'The Nine Saints of Ethiopia',
      description: 'Biographical accounts of the Nine Saints who brought monasticism to Ethiopia in the 5th century.',
      author: 'Monk Yared',
      category: 'History',
      topic: 'Spiritual Life',
      file_type: 'text/plain',
      file_name: 'nine_saints.txt',
      file_size: 524288, // 512KB
      file_url: '/uploads/resources/nine_saints.txt',
      language: 'english',
      tags: JSON.stringify(['saints', 'monasticism', 'history', 'ethiopia', 'biography']),
      is_public: true,
      chapter_id: null,
      published_at: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000),
      published_date: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000),
      created_at: now,
      updated_at: now
    },
    {
      title: 'Aksumite Empire and Christianity',
      description: 'Historical account of how Christianity became the state religion of the Aksumite Empire.',
      author: 'Prof. Mesfin Woldemariam',
      category: 'History',
      topic: 'Church History',
      file_type: 'application/pdf',
      file_name: 'aksum_christianity.pdf',
      file_size: 4194304, // 4MB
      file_url: '/uploads/resources/aksum_christianity.pdf',
      language: 'english',
      tags: JSON.stringify(['aksum', 'history', 'empire', 'christianity', 'ethiopia']),
      is_public: true,
      chapter_id: null,
      published_at: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
      published_date: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
      created_at: now,
      updated_at: now
    },

    // LITURGY CATEGORY
    {
      title: 'Divine Liturgy - Complete Text',
      description: 'Full text of the Ethiopian Orthodox Divine Liturgy in Ge\'ez with English translation and rubrics.',
      author: 'Liturgical Commission',
      category: 'Liturgy',
      topic: 'Worship',
      file_type: 'application/pdf',
      file_name: 'divine_liturgy_complete.pdf',
      file_size: 3145728, // 3MB
      file_url: '/uploads/resources/divine_liturgy_complete.pdf',
      language: 'geez',
      tags: JSON.stringify(['liturgy', 'worship', 'geez', 'divine', 'rubrics']),
      is_public: true,
      chapter_id: null,
      published_at: new Date(now.getTime() - 22 * 24 * 60 * 60 * 1000),
      published_date: new Date(now.getTime() - 22 * 24 * 60 * 60 * 1000),
      created_at: now,
      updated_at: now
    },
    {
      title: 'Daily Prayer Book',
      description: 'Collection of daily prayers, morning and evening prayers, and special occasion prayers in Amharic.',
      author: 'Prayer Book Committee',
      category: 'Liturgy',
      topic: 'Spiritual Life',
      file_type: 'application/pdf',
      file_name: 'daily_prayer_book.pdf',
      file_size: 2097152, // 2MB
      file_url: '/uploads/resources/daily_prayer_book.pdf',
      language: 'amharic',
      tags: JSON.stringify(['prayer', 'daily', 'spiritual', 'amharic', 'devotion']),
      is_public: true,
      chapter_id: null,
      published_at: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
      published_date: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
      created_at: now,
      updated_at: now
    },
    {
      title: 'Hymn Collection - Ge\'ez Chants',
      description: 'Traditional Ge\'ez hymns and chants with musical notation for liturgical use.',
      author: 'Musical Heritage Society',
      category: 'Liturgy',
      topic: 'Worship',
      file_type: 'image/png',
      file_name: 'hymn_collection_cover.png',
      file_size: 1048576, // 1MB
      file_url: '/uploads/resources/hymn_collection_cover.png',
      language: 'geez',
      tags: JSON.stringify(['hymns', 'music', 'geez', 'chants', 'liturgical']),
      is_public: true,
      chapter_id: null,
      published_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      published_date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      created_at: now,
      updated_at: now
    },

    // SAINTS CATEGORY
    {
      title: 'Lives of the Ethiopian Saints',
      description: 'Biographical accounts of Ethiopian Orthodox saints including St. Tekle Haymanot, St. Gebre Menfes Kidus, and others.',
      author: 'Hagiography Department',
      category: 'Saints',
      topic: 'Spiritual Life',
      file_type: 'application/pdf',
      file_name: 'ethiopian_saints_lives.pdf',
      file_size: 5242880, // 5MB
      file_url: '/uploads/resources/ethiopian_saints_lives.pdf',
      language: 'english',
      tags: JSON.stringify(['saints', 'biography', 'hagiography', 'ethiopia', 'spiritual']),
      is_public: true,
      chapter_id: null,
      published_at: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000),
      published_date: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000),
      created_at: now,
      updated_at: now
    },
    {
      title: 'St. Tekle Haymanot - The Great Ascetic',
      description: 'Detailed biography of St. Tekle Haymanot, one of Ethiopia\'s most revered saints, known for his ascetic life and miracles.',
      author: 'Monastery of Debre Libanos',
      category: 'Saints',
      topic: 'Spiritual Life',
      file_type: 'text/markdown',
      file_name: 'st_tekle_haymanot.md',
      file_size: 1572864, // 1.5MB
      file_url: '/uploads/resources/st_tekle_haymanot.md',
      language: 'english',
      tags: JSON.stringify(['saint', 'tekle-haymanot', 'ascetic', 'miracles', 'biography']),
      is_public: true,
      chapter_id: null,
      published_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      published_date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      created_at: now,
      updated_at: now
    },

    // PRAYERS CATEGORY
    {
      title: 'Prayers for All Occasions',
      description: 'Comprehensive collection of prayers for various occasions: morning, evening, before meals, for the sick, for the departed, etc.',
      author: 'Prayer Collection Committee',
      category: 'Prayers',
      topic: 'Spiritual Life',
      file_type: 'application/pdf',
      file_name: 'prayers_all_occasions.pdf',
      file_size: 2097152, // 2MB
      file_url: '/uploads/resources/prayers_all_occasions.pdf',
      language: 'amharic',
      tags: JSON.stringify(['prayers', 'devotion', 'spiritual', 'amharic', 'occasions']),
      is_public: true,
      chapter_id: null,
      published_at: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      published_date: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      created_at: now,
      updated_at: now
    },
    {
      title: 'The Jesus Prayer - Guide and Practice',
      description: 'Guide to the practice of the Jesus Prayer (Lord Jesus Christ, Son of God, have mercy on me) with instructions and benefits.',
      author: 'Spiritual Guidance Office',
      category: 'Prayers',
      topic: 'Spiritual Life',
      file_type: 'application/pdf',
      file_name: 'jesus_prayer_guide.pdf',
      file_size: 1572864, // 1.5MB
      file_url: '/uploads/resources/jesus_prayer_guide.pdf',
      language: 'english',
      tags: JSON.stringify(['jesus-prayer', 'meditation', 'spiritual', 'practice', 'devotion']),
      is_public: true,
      chapter_id: null,
      published_at: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
      published_date: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
      created_at: now,
      updated_at: now
    },

    // ETHICS CATEGORY
    {
      title: 'Orthodox Christian Ethics',
      description: 'Comprehensive guide to Orthodox Christian ethics covering moral principles, virtues, and practical applications in daily life.',
      author: 'Dr. Yonas Assefa',
      category: 'Theology',
      topic: 'Ethics',
      file_type: 'application/pdf',
      file_name: 'orthodox_ethics.pdf',
      file_size: 4194304, // 4MB
      file_url: '/uploads/resources/orthodox_ethics.pdf',
      language: 'english',
      tags: JSON.stringify(['ethics', 'morality', 'virtues', 'orthodox', 'christian-living']),
      is_public: true,
      chapter_id: null,
      published_at: new Date(now.getTime() - 11 * 24 * 60 * 60 * 1000),
      published_date: new Date(now.getTime() - 11 * 24 * 60 * 60 * 1000),
      created_at: now,
      updated_at: now
    },
    {
      title: 'Fasting Guidelines - Orthodox Tradition',
      description: 'Complete guide to Orthodox fasting practices, including fasting periods, rules, and spiritual significance.',
      author: 'Fasting Committee',
      category: 'Theology',
      topic: 'Spiritual Life',
      file_type: 'text/markdown',
      file_name: 'fasting_guidelines.md',
      file_size: 1048576, // 1MB
      file_url: '/uploads/resources/fasting_guidelines.md',
      language: 'english',
      tags: JSON.stringify(['fasting', 'spiritual', 'orthodox', 'discipline', 'tradition']),
      is_public: true,
      chapter_id: null,
      published_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
      published_date: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
      created_at: now,
      updated_at: now
    }
  ];

  // Insert resources
  await knex('resources').insert(mockResources);
  console.log('✅ Resource Library mock data seeded:', mockResources.length, 'resources');

  // Create some mock AI summaries for testing
  const resourceIds = await knex('resources').select('id').limit(5);
  
  if (resourceIds.length > 0) {
    const mockSummaries = resourceIds.map((resource, index) => ({
      resource_id: resource.id,
      summary: `This is a comprehensive ${index === 0 ? 'scriptural' : index === 1 ? 'theological' : 'historical'} resource that provides valuable insights into Orthodox Christian tradition. The document covers essential topics relevant to faith development and spiritual growth. Key themes include ${index === 0 ? 'biblical interpretation and canonical texts' : index === 1 ? 'doctrinal foundations and theological principles' : 'historical context and church development'}. This resource serves as an important reference for understanding Orthodox Christianity.`,
      key_points: JSON.stringify([
        'Essential Orthodox Christian content',
        'Comprehensive coverage of key topics',
        'Valuable for spiritual development',
        'Authentic traditional sources'
      ]),
      spiritual_insights: 'This resource deepens understanding of Orthodox faith\nProvides practical guidance for spiritual life\nConnects historical tradition with contemporary practice\nEncourages deeper engagement with faith',
      summary_type: 'brief',
      word_count: 180 + (index * 10),
      relevance_score: 0.95 + (index * 0.01),
      model_used: 'gpt-4',
      meets_word_limit: true,
      admin_validated: index < 2, // First 2 are validated
      created_at: now,
      updated_at: now
    }));

    await knex('ai_summaries').insert(mockSummaries);
    console.log('✅ AI summaries seeded:', mockSummaries.length);
  }

  // Create some mock user notes for testing
  // Note: This requires a user to exist, so we'll create notes that can be associated with any user
  const mockNotes = [
    {
      user_id: 1, // Assuming user ID 1 exists
      resource_id: resourceIds[0]?.id || 1,
      content: 'This is a very important passage about the Trinity. I need to study this more deeply.',
      is_public: false,
      section_anchor: 'page-5',
      section_text: 'The mystery of the Holy Trinity is central to Orthodox faith...',
      section_position: 5,
      tags: JSON.stringify(['important', 'trinity', 'study']),
      created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      updated_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
    },
    {
      user_id: 1,
      resource_id: resourceIds[1]?.id || 2,
      content: 'Great explanation of Orthodox theology. The section on sacraments is particularly helpful.',
      is_public: true,
      section_anchor: 'section-3',
      section_text: 'The seven sacraments of the Church...',
      section_position: 3,
      tags: JSON.stringify(['theology', 'sacraments', 'helpful']),
      created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      updated_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
    }
  ];

  // Only insert notes if we have resource IDs
  if (resourceIds.length > 0) {
    try {
      await knex('user_notes').insert(mockNotes);
      console.log('✅ Mock user notes seeded:', mockNotes.length);
    } catch (error) {
      console.log('⚠️  Could not seed user notes (user may not exist):', error.message);
    }
  }
};


