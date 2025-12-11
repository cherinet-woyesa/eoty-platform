/**
 * Create a database view to expose per-course progress for a user.
 * This is consumed by learning paths to show user progress across mapped courses.
 *
 * View columns:
 *  - user_id
 *  - course_id
 *  - progress (0-100)
 *  - completed_lessons
 *  - total_lessons
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Drop existing view if present to allow redefinition
  await knex.raw('DROP VIEW IF EXISTS user_course_progress_view');

  await knex.raw(`
    CREATE VIEW user_course_progress_view AS
    SELECT
      uce.user_id,
      c.id AS course_id,
      COALESCE(
        CASE
          WHEN COUNT(l.id) = 0 THEN 0
          ELSE ROUND((COUNT(CASE WHEN ulp.is_completed = true OR ulp.progress = 100 THEN 1 END) * 100.0) / NULLIF(COUNT(l.id), 0), 2)
        END,
        0
      ) AS progress,
      COUNT(CASE WHEN ulp.is_completed = true OR ulp.progress = 100 THEN 1 END) AS completed_lessons,
      COUNT(l.id) AS total_lessons
    FROM user_course_enrollments uce
    JOIN courses c ON c.id = uce.course_id
    LEFT JOIN lessons l ON l.course_id = c.id
    LEFT JOIN user_lesson_progress ulp
      ON ulp.lesson_id = l.id
      AND ulp.user_id = uce.user_id
    GROUP BY uce.user_id, c.id;
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.raw('DROP VIEW IF EXISTS user_course_progress_view');
};


