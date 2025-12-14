exports.up = async function(knex) {
  const exists = await knex.schema.hasTable('teacher_documents');
  if (!exists) {
    return knex.schema.createTable('teacher_documents', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.integer('teacher_id').references('id').inTable('teachers').onDelete('CASCADE').notNullable();
      table.string('document_type').notNullable(); // e.g., 'national_id', 'tax_photo', 'proof_of_address'
      table.string('file_url').notNullable();
      table.string('file_name').notNullable();
      table.string('mime_type');
      table.enu('status', ['uploaded', 'pending_review', 'verified', 'rejected']).defaultTo('uploaded');
      table.text('rejection_reason');
      table.timestamp('uploaded_at').defaultTo(knex.fn.now());
      table.timestamp('verified_at');
    });
  }
};

exports.down = function(knex) {
  return knex.schema.dropTable('teacher_documents');
};

