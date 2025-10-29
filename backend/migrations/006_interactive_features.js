/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.createTable("user_progress", (table) => {
    table.increments("id").primary();
    table.integer("user_id").unsigned().references("id").inTable("users").onDelete("CASCADE");
    table.integer("lesson_id").unsigned().references("id").inTable("lessons").onDelete("CASCADE");
    table.boolean("completed").defaultTo(false);
    table.integer("progress_percent").defaultTo(0);
    table.timestamps(true, true);
  });

  await knex.schema.createTable("annotations", (table) => {
    table.increments("id").primary();
    table.integer("user_id").unsigned().references("id").inTable("users").onDelete("CASCADE");
    table.integer("lesson_id").unsigned().references("id").inTable("lessons").onDelete("CASCADE");
    table.text("content").notNullable();
    table.integer("timestamp");
    table.timestamps(true, true);
  });

  await knex.schema.createTable("discussions", (table) => {
    table.increments("id").primary();
    table.integer("lesson_id").unsigned().references("id").inTable("lessons").onDelete("CASCADE");
    table.integer("user_id").unsigned().references("id").inTable("users").onDelete("CASCADE");
    table.text("message").notNullable();
    table.timestamps(true, true);
  });

  await knex.schema.createTable("user_engagement", (table) => {
    table.increments("id").primary();
    table.integer("user_id").unsigned().references("id").inTable("users").onDelete("CASCADE");
    table.string("engagement_type").notNullable();
    table.jsonb("metadata");
    table.timestamps(true, true);
  });

  await knex.schema.createTable("leaderboard_entries", (table) => {
    table.increments("id").primary();
    table.integer("user_id").unsigned().references("id").inTable("users").onDelete("CASCADE");
    table.integer("points").defaultTo(0);
    table.string("period").notNullable(); // daily, weekly, monthly, all_time
    table.timestamps(true, true);
    table.unique(["user_id", "period"]);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("leaderboard_entries");
  await knex.schema.dropTableIfExists("user_engagement");
  await knex.schema.dropTableIfExists("discussions");
  await knex.schema.dropTableIfExists("annotations");
  await knex.schema.dropTableIfExists("user_progress");
};