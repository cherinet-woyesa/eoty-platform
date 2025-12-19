// add-created-by-to-content-tags.js - Add missing created_by column
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Cherinet4!',
    database: process.env.DB_NAME || 'eoty_platform',
    port: parseInt(process.env.DB_PORT) || 5432
});

async function addCreatedByColumn() {
    const client = await pool.connect();

    try {
        console.log('🔄 Adding created_by column to content_tags...\n');

        await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='content_tags' AND column_name='created_by') THEN
          ALTER TABLE content_tags ADD COLUMN created_by INTEGER;
          COMMENT ON COLUMN content_tags.created_by IS 'User ID who created this tag';
        END IF;
      END $$;
    `);

        console.log('✅ created_by column added successfully!\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

addCreatedByColumn()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
