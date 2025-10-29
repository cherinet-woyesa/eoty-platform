/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.createTable("forums", (table) => {
    table.increments("id").primary();
    table.string("title").notNullable();
    table.text("description");
    table.integer("course_id").unsigned().references("id").inTable("courses").onDelete("CASCADE");
    table.integer("created_by").unsigned().references("id").inTable("users").onDelete("CASCADE");
    table.timestamps(true, true);
  });

  await knex.schema.createTable("badges", (table) => {
    table.increments("id").primary();
    table.string("name").notNullable();
    table.string("icon_url");
    table.text("description");
    table.timestamps(true, true);
  });

  await knex.schema.createTable("forum_posts", (table) => {
    table.increments("id").primary();
    table.integer("forum_id").unsigned().references("id").inTable("forums").onDelete("CASCADE");
    table.integer("user_id").unsigned().references("id").inTable("users").onDelete("CASCADE");
    table.text("content").notNullable();
    table.timestamps(true, true);
  });

  await knex.schema.createTable("user_badges", (table) => {
    table.increments("id").primary();
    table.integer("user_id").unsigned().references("id").inTable("users").onDelete("CASCADE");
    table.integer("badge_id").unsigned().references("id").inTable("badges").onDelete("CASCADE");
    table.timestamp("earned_at").defaultTo(knex.fn.now());
    table.unique(["user_id", "badge_id"]);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("user_badges");
  await knex.schema.dropTableIfExists("forum_posts");
  await knex.schema.dropTableIfExists("badges");
  await knex.schema.dropTableIfExists("forums");
};