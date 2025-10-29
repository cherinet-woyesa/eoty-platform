/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.createTable("reports", (table) => {
    table.increments("id").primary();
    table.integer("reported_by").unsigned().references("id").inTable("users").onDelete("CASCADE");
    table.string("report_type").notNullable();
    table.text("description").notNullable();
    table.string("status").defaultTo("pending");
    table.timestamps(true, true);
  });

  await knex.schema.createTable("video_notifications", (table) => {
    table.increments("id").primary();
    table.integer("lesson_id").unsigned().references("id").inTable("lessons").onDelete("CASCADE");
    table.string("title").notNullable();
    table.text("message");
    table.boolean("sent").defaultTo(false);
    table.timestamps(true, true);
  });

  await knex.schema.createTable("user_notifications", (table) => {
    table.increments("id").primary();
    table.integer("user_id").unsigned().references("id").inTable("users").onDelete("CASCADE");
    table.string("title").notNullable();
    table.text("message").notNullable();
    table.boolean("read").defaultTo(false);
    table.timestamps(true, true);
  });

  await knex.schema.createTable("analytics_events", (table) => {
    table.increments("id").primary();
    table.integer("user_id").unsigned().references("id").inTable("users").onDelete("CASCADE");
    table.string("event_type").notNullable();
    table.jsonb("event_data");
    table.timestamps(true, true);
    table.index(["user_id", "event_type"]);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("analytics_events");
  await knex.schema.dropTableIfExists("user_notifications");
  await knex.schema.dropTableIfExists("video_notifications");
  await knex.schema.dropTableIfExists("reports");
};