/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Badges table
  await knex.schema.createTable("badges", (table) => {
    table.increments("id").primary();
    table.string("name").notNullable();
    table.string("icon_url");
    table.text("description");
    table.string("badge_type").defaultTo('participation');
    table.string("category");
    table.integer("points").defaultTo(0);
    table.jsonb("requirements");
    table.boolean("is_active").defaultTo(true);
    table.integer("difficulty").defaultTo(1); // 1-5 scale
    table.jsonb("metadata");
    table.timestamps(true, true);
    
    table.index(["badge_type", "is_active"]);
    table.index(["category", "difficulty"]);
  });

  // Achievements table
  await knex.schema.createTable("achievements", (table) => {
    table.increments("id").primary();
    table.string("name").notNullable();
    table.text("description");
    table.string("icon_url");
    table.string("criteria");
    table.string("achievement_type").defaultTo('milestone');
    table.integer("points_value").defaultTo(0);
    table.integer("progress_target").defaultTo(1);
    table.boolean("is_secret").defaultTo(false);
    table.boolean("is_active").defaultTo(true);
    table.jsonb("unlock_conditions");
    table.timestamps(true, true);
    
    table.index(["achievement_type", "is_active"]);
  });

  // User badges junction
  await knex.schema.createTable("user_badges", (table) => {
    table.increments("id").primary();
    table.integer("user_id").unsigned().references("id").inTable("users").onDelete("CASCADE");
    table.integer("badge_id").unsigned().references("id").inTable("badges").onDelete("CASCADE");
    table.timestamp("earned_at").defaultTo(knex.fn.now());
    table.jsonb("metadata");
    table.string("unlock_context"); // How the badge was earned
    
    table.unique(["user_id", "badge_id"]);
    table.index(["user_id", "earned_at"]);
    table.index(["badge_id"]);
  });

  // User achievements progress
  await knex.schema.createTable("user_achievements", (table) => {
    table.increments("id").primary();
    table.integer("user_id").unsigned().references("id").inTable("users").onDelete("CASCADE");
    table.integer("achievement_id").unsigned().references("id").inTable("achievements").onDelete("CASCADE");
    table.integer("progress").defaultTo(0);
    table.boolean("is_unlocked").defaultTo(false);
    table.timestamp("unlocked_at");
    table.timestamp("last_progress_at").defaultTo(knex.fn.now());
    table.jsonb("progress_data");
    
    table.unique(["user_id", "achievement_id"]);
    table.index(["user_id", "is_unlocked"]);
    table.index(["achievement_id", "is_unlocked"]);
  });

  // Insert sample badges
  await knex('badges').insert([
    {
      name: 'First Steps',
      description: 'Complete your first lesson',
      badge_type: 'learning',
      category: 'beginner',
      points: 10,
      requirements: JSON.stringify({ lessons_completed: 1 }),
      difficulty: 1
    },
    {
      name: 'Quiz Master',
      description: 'Score 100% on any quiz',
      badge_type: 'assessment',
      category: 'academic',
      points: 25,
      requirements: JSON.stringify({ perfect_quizzes: 1 }),
      difficulty: 2
    },
    {
      name: 'Community Helper',
      description: 'Help other students by answering 10 forum questions',
      badge_type: 'social',
      category: 'community',
      points: 30,
      requirements: JSON.stringify({ helpful_posts: 10 }),
      difficulty: 3
    },
    {
      name: 'Course Completer',
      description: 'Complete your first full course',
      badge_type: 'milestone',
      category: 'achievement',
      points: 50,
      requirements: JSON.stringify({ courses_completed: 1 }),
      difficulty: 2
    },
    {
      name: 'Video Scholar',
      description: 'Watch 100 hours of video content',
      badge_type: 'engagement',
      category: 'dedication',
      points: 75,
      requirements: JSON.stringify({ hours_watched: 100 }),
      difficulty: 4
    }
  ]);

  // Insert sample achievements
  await knex('achievements').insert([
    {
      name: 'Learning Pathfinder',
      description: 'Complete 5 different courses',
      criteria: 'course_completion',
      achievement_type: 'milestone',
      points_value: 100,
      progress_target: 5
    },
    {
      name: 'Discussion Leader',
      description: 'Create 50 forum posts with positive engagement',
      criteria: 'forum_engagement',
      achievement_type: 'social',
      points_value: 150,
      progress_target: 50
    },
    {
      name: 'Perfect Score Streak',
      description: 'Get perfect scores on 10 consecutive quizzes',
      criteria: 'quiz_performance',
      achievement_type: 'academic',
      points_value: 200,
      progress_target: 10
    },
    {
      name: 'Early Adopter',
      description: 'Be among the first 100 users on the platform',
      criteria: 'platform_usage',
      achievement_type: 'special',
      points_value: 500,
      progress_target: 1,
      is_secret: true
    }
  ]);
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists("user_achievements");
  await knex.schema.dropTableIfExists("user_badges");
  await knex.schema.dropTableIfExists("achievements");
  await knex.schema.dropTableIfExists("badges");
};