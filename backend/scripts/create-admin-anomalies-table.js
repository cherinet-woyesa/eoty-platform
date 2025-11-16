/**
 * Script to create admin_anomalies table if it doesn't exist.
 * Mirrors the structure from migration 20251115000004_admin_tools_fr5.js
 */
const db = require('../config/database');

async function createAdminAnomaliesTable() {
  try {
    const hasTable = await db.schema.hasTable('admin_anomalies');

    if (hasTable) {
      console.log('✓ admin_anomalies table already exists');
      return;
    }

    await db.schema.createTable('admin_anomalies', (table) => {
      table.increments('id').primary();
      table.string('anomaly_type', 100).notNullable();
      table.text('details'); // JSON string
      table.enum('severity', ['low', 'medium', 'high']).defaultTo('medium');
      table.boolean('resolved').defaultTo(false);
      table.timestamp('resolved_at').nullable();
      // Note: using integer without foreign key due to users.id being text in some setups
      table.integer('resolved_by').nullable();
      table.timestamp('created_at').defaultTo(db.fn.now());

      table.index('anomaly_type');
      table.index('severity');
      table.index('created_at');
    });

    console.log('✓ Created admin_anomalies table successfully');
  } catch (error) {
    console.error('❌ Error creating admin_anomalies table:', error.message);
    throw error;
  } finally {
    await db.destroy();
  }
}

createAdminAnomaliesTable()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });


