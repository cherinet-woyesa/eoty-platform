/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.createTable("admin_actions", (table) => {
    table.increments("id").primary();
    table.integer("admin_id").unsigned().references("id").inTable("users").onDelete("CASCADE");
    table.string("action_type").notNullable();
    table.text("details");
    table.timestamps(true, true);
  });

  await knex.schema.createTable("google_auth", (table) => {
    table.increments("id").primary();
    table.integer("user_id").unsigned().references("id").inTable("users").onDelete("CASCADE");
    table.string("google_id").unique().notNullable();
    table.string("email").notNullable();
    table.string("profile_picture");
    table.timestamps(true, true);
  });

  await knex.schema.createTable("onboarding_steps", (table) => {
    table.increments("id").primary();
    table.integer("user_id").unsigned().references("id").inTable("users").onDelete("CASCADE");
    table.string("step_name").notNullable();
    table.boolean("completed").defaultTo(false);
    table.timestamps(true, true);
  });

  await knex.schema.createTable("achievements", (table) => {
    table.increments("id").primary();
    table.string("name").notNullable();
    table.text("description");
    table.string("icon_url");
    table.string("criteria");
    table.timestamps(true, true);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("achievements");
  await knex.schema.dropTableIfExists("onboarding_steps");
  await knex.schema.dropTableIfExists("google_auth");
  await knex.schema.dropTableIfExists("admin_actions");
};