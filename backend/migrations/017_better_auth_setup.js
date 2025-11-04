/**
 * Better Auth Migration - Creates required tables for Better Auth
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Create session table for Better Auth
  await knex.schema.createTable('session', function(table) {
    table.text('id').primary();
    table.integer('user_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('expires_at').notNullable();
    table.text('token').notNullable().unique();
    table.text('ip_address');
    table.text('user_agent');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes for performance
    table.index('user_id');
    table.index('token');
  });
  console.log('✅ Created session table for Better Auth');

  // Create account table for OAuth providers
  await knex.schema.createTable('account', function(table) {
    table.text('id').primary();
    table.integer('user_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.text('account_id').notNullable();
    table.text('provider').notNullable();
    table.text('access_token');
    table.text('refresh_token');
    table.timestamp('expires_at');
    table.text('scope');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Unique constraint on provider + account_id
    table.unique(['provider', 'account_id']);
    
    // Index for performance
    table.index('user_id');
  });
  console.log('✅ Created account table for OAuth providers');

  // Create verification table for email verification tokens
  await knex.schema.createTable('verification', function(table) {
    table.text('id').primary();
    table.text('identifier').notNullable();
    table.text('value').notNullable();
    table.timestamp('expires_at').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Index for lookups
    table.index('identifier');
  });
  console.log('✅ Created verification table for email verification tokens');
};

/**
 * Rollback migration - removes Better Auth tables
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Drop tables in reverse order to respect foreign key constraints
  await knex.schema.dropTableIfExists('verification');
  console.log('✅ Dropped verification table');
  
  await knex.schema.dropTableIfExists('account');
  console.log('✅ Dropped account table');
  
  await knex.schema.dropTableIfExists('session');
  console.log('✅ Dropped session table');
};
