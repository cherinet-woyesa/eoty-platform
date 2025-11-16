/**
 * Script to create teacher_applications table if it doesn't exist.
 * Mirrors the intent of migration 20251111000001_create_teacher_applications.js
 * but avoids strict foreign key constraints to be compatible with existing user ID types.
 */
const db = require('../config/database');

async function createTeacherApplicationsTable() {
  try {
    const hasTable = await db.schema.hasTable('teacher_applications');

    if (hasTable) {
      console.log('✓ teacher_applications table already exists');
      return;
    }

    await db.schema.createTable('teacher_applications', (table) => {
      table.increments('id').primary();

      // User IDs stored as text to match potential string IDs in existing users table
      table.text('user_id').notNullable();

      // Application details
      table.text('application_text').notNullable(); // Why they want to teach
      table.text('qualifications').notNullable();   // Educational background, certifications
      table.text('experience');                     // Teaching experience
      table.jsonb('subject_areas');                // Areas of interest/expertise (JSON array)

      // Application status
      table.string('status').defaultTo('pending').notNullable(); // pending, approved, rejected
      table.text('admin_notes'); // Admin review notes

      // Review information
      table.text('reviewed_by'); // stores reviewer user ID as text (no FK to avoid type mismatches)
      table.timestamp('reviewed_at');

      table.timestamps(true, true);

      // Indexes for efficient queries
      table.index(['user_id']);
      table.index(['status']);
      table.index(['status', 'created_at']);
      table.index(['reviewed_by']);
    });

    console.log('✓ Created teacher_applications table successfully');
  } catch (error) {
    console.error('❌ Error creating teacher_applications table:', error.message);
    throw error;
  } finally {
    await db.destroy();
  }
}

createTeacherApplicationsTable()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });


