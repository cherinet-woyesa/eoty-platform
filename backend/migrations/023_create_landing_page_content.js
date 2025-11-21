/**
 * Migration: Create landing_page_content and testimonials tables
 * Created: 2024
 */

exports.up = function(knex) {
  return knex.schema
    .createTableIfNotExists('landing_page_content', function(table) {
      table.increments('id').primary();
      table.jsonb('content_json').notNullable();
      table.boolean('is_active').defaultTo(true);
      table.integer('created_by').references('id').inTable('users').onDelete('SET NULL');
      table.integer('updated_by').references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTableIfNotExists('testimonials', function(table) {
      table.increments('id').primary();
      table.string('name', 255).notNullable();
      table.string('role', 255);
      table.text('content').notNullable();
      table.integer('rating').checkBetween([1, 5]);
      table.string('image_url', 500);
      table.integer('display_order').defaultTo(0);
      table.boolean('is_active').defaultTo(true);
      table.integer('created_by').references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('testimonials')
    .dropTableIfExists('landing_page_content');
};

