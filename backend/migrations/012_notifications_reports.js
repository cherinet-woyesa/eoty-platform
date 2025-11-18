/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if table already exists
  const hasTable = await knex.schema.hasTable('user_notifications');
  if (hasTable) {
    console.log('✓ Notifications tables already exist, skipping migration');
    return;
  }

  // User Notifications
  await knex.schema.createTable("user_notifications", (table) => {
    table.increments("id").primary();
    table.string("user_id").notNullable(); // Changed to string to match users table
    table.string("title").notNullable();
    table.text("message").notNullable();
    table.string("notification_type").notNullable(); // system, course, achievement, social, etc.
    table.jsonb("data"); // Additional data for the notification
    table.boolean("is_read").defaultTo(false);
    table.string("priority").defaultTo('normal'); // low, normal, high
    table.string("action_url"); // URL for the notification action
    table.timestamp("sent_at").defaultTo(knex.fn.now());
    table.timestamp("read_at");
    table.timestamps(true, true);
    
    table.index(["user_id", "is_read"]);
    table.index(["user_id", "sent_at"]);
    table.index(["notification_type", "sent_at"]);
  });

  // Video Notifications
  await knex.schema.createTable("video_notifications", (table) => {
    table.increments("id").primary();
    table.integer("lesson_id").unsigned().references("id").inTable("lessons").onDelete("CASCADE");
    table.string("title").notNullable();
    table.text("message");
    table.string("notification_type").defaultTo('availability'); // availability, update, reminder
    table.boolean("sent").defaultTo(false);
    table.timestamp("scheduled_for");
    table.timestamp("sent_at");
    table.jsonb("target_audience"); // Specific users, roles, or all
    table.timestamps(true, true);
    
    table.index(["lesson_id", "sent"]);
    table.index(["scheduled_for", "sent"]);
  });

  // Reports System
  await knex.schema.createTable("reports", (table) => {
    table.increments("id").primary();
    table.string("reported_by").notNullable(); // Changed to string to match users table
    table.string("report_type").notNullable(); // content, user, technical, abuse
    table.string("target_type"); // user, lesson, forum_post, comment, etc.
    table.integer("target_id"); // ID of the reported entity
    table.text("description").notNullable();
    table.jsonb("evidence"); // Screenshots, links, etc.
    table.string("status").defaultTo("pending"); // pending, investigating, resolved, dismissed
    table.string("assigned_to"); // Changed to string to match users table
    table.text("resolution_notes");
    table.string("severity").defaultTo('medium'); // low, medium, high, critical
    table.timestamp("resolved_at");
    table.timestamps(true, true);
    
    table.index(["report_type", "status"]);
    table.index(["reported_by", "created_at"]);
    table.index(["target_type", "target_id"]);
    table.index(["status", "severity"]);
  });

  // Analytics Events
  await knex.schema.createTable("analytics_events", (table) => {
    table.increments("id").primary();
    table.string("user_id"); // Changed to string to match users table
    table.string("event_type").notNullable();
    table.string("event_category");
    table.jsonb("event_data");
    table.string("session_id");
    table.string("user_agent");
    table.string("ip_address");
    table.timestamps(true, true);
    
    table.index(["user_id", "event_type"]);
    table.index(["event_type", "created_at"]);
    table.index(["session_id"]);
  });

  // System Logs
  await knex.schema.createTable("system_logs", (table) => {
    table.increments("id").primary();
    table.string("log_level").notNullable(); // info, warn, error, debug
    table.string("log_type").notNullable(); // auth, database, api, system
    table.text("message").notNullable();
    table.jsonb("context");
    table.string("source"); // File/function where log originated
    table.timestamp("logged_at").defaultTo(knex.fn.now());
    
    table.index(["log_level", "logged_at"]);
    table.index(["log_type", "logged_at"]);
  });

  // Admin Actions Audit
  await knex.schema.createTable("admin_actions", (table) => {
    table.increments("id").primary();
    table.string("admin_id"); // Foreign key to users.id
    table.string("action_type").notNullable();
    table.string("resource_type"); // user, course, lesson, etc.
    table.integer("resource_id"); // ID of the affected resource
    table.text("details");
    table.jsonb("changes"); // Before/after state for updates
    table.string("ip_address");
    table.timestamps(true, true);
    
    table.index(["admin_id", "created_at"]);
    table.index(["action_type", "created_at"]);
    table.index(["resource_type", "resource_id"]);
  });

  // Email Notifications Queue
  await knex.schema.createTable("email_queue", (table) => {
    table.increments("id").primary();
    table.string("to_email").notNullable();
    table.string("subject").notNullable();
    table.text("html_content");
    table.text("text_content");
    table.string("template_name"); // For template-based emails
    table.jsonb("template_data");
    table.string("status").defaultTo('pending'); // pending, sent, failed, retrying
    table.integer("attempts").defaultTo(0);
    table.text("last_error");
    table.timestamp("sent_at");
    table.timestamp("scheduled_for").defaultTo(knex.fn.now());
    table.timestamps(true, true);
    
    table.index(["status", "scheduled_for"]);
    table.index(["to_email", "created_at"]);
  });

  // Push Notifications Subscriptions
  await knex.schema.createTable("push_subscriptions", (table) => {
    table.increments("id").primary();
    table.string("user_id").notNullable();
    table.jsonb("subscription_data").notNullable(); // Web Push subscription object
    table.string("user_agent");
    table.boolean("is_active").defaultTo(true);
    table.timestamp("last_used_at").defaultTo(knex.fn.now());
    table.timestamps(true, true);
    
    table.unique(["user_id", "subscription_data"]);
    table.index(["user_id", "is_active"]);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists("push_subscriptions");
  await knex.schema.dropTableIfExists("email_queue");
  await knex.schema.dropTableIfExists("admin_actions");
  await knex.schema.dropTableIfExists("system_logs");
  await knex.schema.dropTableIfExists("analytics_events");
  await knex.schema.dropTableIfExists("reports");
  await knex.schema.dropTableIfExists("video_notifications");
  await knex.schema.dropTableIfExists("user_notifications");
};