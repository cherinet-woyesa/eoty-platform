/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.createTable("system_logs", (table) => {
    table.increments("id").primary();
    table.string("log_type").notNullable();
    table.text("message").notNullable();
    table.timestamp("logged_at").defaultTo(knex.fn.now());
  });

  // AI embeddings for semantic search - using JSONB instead of vector type
  await knex.schema.createTable("ai_embeddings", (table) => {
    table.increments("id").primary();
    table.integer("resource_id").unsigned().references("id").inTable("resources").onDelete("CASCADE");
    table.text("content").notNullable();
    table.jsonb("embedding"); // Store as JSONB instead of vector
    table.string("content_type");
    table.timestamps(true, true);
    table.index("resource_id");
  });

  // AI conversations
  await knex.schema.createTable("ai_conversations", (table) => {
    table.increments("id").primary();
    table.integer("user_id").unsigned().references("id").inTable("users").onDelete("CASCADE");
    table.integer("resource_id").unsigned().references("id").inTable("resources").onDelete("CASCADE");
    table.string("title");
    table.timestamps(true, true);
  });

  // AI messages
  await knex.schema.createTable("ai_messages", (table) => {
    table.increments("id").primary();
    table.integer("conversation_id").unsigned().references("id").inTable("ai_conversations").onDelete("CASCADE");
    table.text("message").notNullable();
    table.boolean("is_user_message").defaultTo(true);
    table.jsonb("metadata");
    table.timestamps(true, true);
    table.index("conversation_id");
  });

  // Moderated queries
  await knex.schema.createTable("moderated_queries", (table) => {
    table.increments("id").primary();
    table.text("original_query").notNullable();
    table.text("moderated_query");
    table.string("moderation_action");
    table.jsonb("moderation_reasons");
    table.integer("user_id").unsigned().references("id").inTable("users").onDelete("SET NULL");
    table.timestamps(true, true);
  });

  // Moderation logs
  await knex.schema.createTable("moderation_logs", (table) => {
    table.increments("id").primary();
    table.string("action_type").notNullable();
    table.integer("moderator_id").unsigned().references("id").inTable("users").onDelete("SET NULL");
    table.jsonb("details");
    table.timestamps(true, true);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("moderation_logs");
  await knex.schema.dropTableIfExists("moderated_queries");
  await knex.schema.dropTableIfExists("ai_messages");
  await knex.schema.dropTableIfExists("ai_conversations");
  await knex.schema.dropTableIfExists("ai_embeddings");
  await knex.schema.dropTableIfExists("system_logs");
};