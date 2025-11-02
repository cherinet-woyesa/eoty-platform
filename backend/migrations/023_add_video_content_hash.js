/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if content_hash column already exists
  const hasContentHash = await knex.schema.hasColumn('videos', 'content_hash');
  
  if (!hasContentHash) {
    await knex.schema.alterTable('videos', (table) => {
      table.string('content_hash').nullable(); // For file integrity checking
      table.string('s3_key').nullable(); // Also add s3_key if missing
    });
  }

  // Also check if other commonly used video columns exist
  const hasS3Key = await knex.schema.hasColumn('videos', 's3_key');
  if (!hasS3Key) {
    await knex.schema.alterTable('videos', (table) => {
      table.string('s3_key').nullable(); // S3 object key
    });
  }
};

exports.down = async function(knex) {
  await knex.schema.alterTable('videos', (table) => {
    table.dropColumn('content_hash');
    table.dropColumn('s3_key');
  });
};