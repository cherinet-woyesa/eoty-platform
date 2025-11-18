/**
 * Migration: Create uptime monitoring tables
 * REQUIREMENT: 99% video stream uptime tracking
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if table already exists
  const hasTable = await knex.schema.hasTable('uptime_monitoring');
  if (hasTable) {
    console.log('✓ uptime_monitoring table already exists, skipping migration');
    return;
  }

  // Uptime monitoring health checks
  await knex.schema.createTable('uptime_monitoring', (table) => {
    table.increments('id').primary();
    table.boolean('is_healthy').notNullable();
    table.text('error_message');
    table.integer('check_duration_ms');
    table.decimal('uptime_percentage', 5, 2); // 0.00 to 100.00
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    
    table.index(['timestamp']);
    table.index(['is_healthy']);
  });

  // Uptime statistics (hourly aggregates)
  await knex.schema.createTable('uptime_statistics', (table) => {
    table.increments('id').primary();
    table.integer('total_checks').defaultTo(0);
    table.integer('successful_checks').defaultTo(0);
    table.integer('failed_checks').defaultTo(0);
    table.decimal('uptime_percentage', 5, 2); // 0.00 to 100.00
    table.boolean('meets_threshold').defaultTo(true); // >= 99%
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    
    table.index(['timestamp']);
    table.index(['meets_threshold']);
  });

  // Uptime alerts
  await knex.schema.createTable('uptime_alerts', (table) => {
    table.increments('id').primary();
    table.string('severity', 20).notNullable(); // WARNING, CRITICAL
    table.text('message').notNullable();
    table.decimal('uptime_percentage', 5, 2);
    table.integer('consecutive_failures').defaultTo(0);
    table.boolean('resolved').defaultTo(false);
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    table.timestamp('resolved_at');
    
    table.index(['timestamp']);
    table.index(['severity']);
    table.index(['resolved']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('uptime_alerts');
  await knex.schema.dropTableIfExists('uptime_statistics');
  await knex.schema.dropTableIfExists('uptime_monitoring');
};


