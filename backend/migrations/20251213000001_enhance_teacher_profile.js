/**
 * Migration: Enhance teacher profile with social links, certifications, and stats
 */

exports.up = async function(knex) {
  // Check users table columns
  const hasWebsiteUrl = await knex.schema.hasColumn('users', 'website_url');
  if (!hasWebsiteUrl) {
    await knex.schema.table('users', function(table) {
      table.string('website_url').nullable();
      table.string('twitter_url').nullable();
      table.string('linkedin_url').nullable();
      table.string('facebook_url').nullable();
      table.string('instagram_url').nullable();
      table.text('certifications').nullable(); // JSON array of certification objects
      table.integer('total_students').defaultTo(0);
      table.integer('total_courses').defaultTo(0);
      table.decimal('average_rating', 3, 2).nullable();
      table.integer('total_ratings').defaultTo(0);
      table.decimal('total_earnings', 12, 2).defaultTo(0);
      table.boolean('is_verified').defaultTo(false);
      table.timestamp('verified_at').nullable();
    });
  }

  // Check resources table columns
  const hasFileUrl = await knex.schema.hasColumn('resources', 'file_url');
  if (!hasFileUrl) {
    await knex.schema.table('resources', function(table) {
      table.string('file_url').nullable();
      table.string('file_type').nullable();
      table.bigInteger('file_size').nullable();
      table.string('mime_type').nullable();
      table.integer('download_count').defaultTo(0);
      table.integer('view_count').defaultTo(0);
    });
  }
};

exports.down = function(knex) {
  return knex.schema
    .table('users', function(table) {
      table.dropColumn('website_url');
      table.dropColumn('twitter_url');
      table.dropColumn('linkedin_url');
      table.dropColumn('facebook_url');
      table.dropColumn('instagram_url');
      table.dropColumn('certifications');
      table.dropColumn('total_students');
      table.dropColumn('total_courses');
      table.dropColumn('average_rating');
      table.dropColumn('total_ratings');
      table.dropColumn('total_earnings');
      table.dropColumn('is_verified');
      table.dropColumn('verified_at');
    })
    .table('resources', function(table) {
      table.dropColumn('file_url');
      table.dropColumn('file_type');
      table.dropColumn('file_size');
      table.dropColumn('mime_type');
      table.dropColumn('download_count');
      table.dropColumn('view_count');
    });
};
