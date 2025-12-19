// run-migrations.js - Direct SQL migration runner (Fixed)
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Cherinet4!',
    database: process.env.DB_NAME || 'eoty_platform',
    port: parseInt(process.env.DB_PORT) || 5432
});

async function runMigrations() {
    const client = await pool.connect();

    try {
        console.log('🔄 Running database migrations...\n');

        // Migration 1: Add forum_reports moderation columns
        console.log('1️⃣  Adding moderation columns to forum_reports...');
        await client.query(`
      DO $$
      BEGIN
        -- Add moderated_by column (without foreign key constraint for now)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='forum_reports' AND column_name='moderated_by') THEN
          ALTER TABLE forum_reports ADD COLUMN moderated_by INTEGER;
        END IF;
        
        -- Add moderated_at column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='forum_reports' AND column_name='moderated_at') THEN
          ALTER TABLE forum_reports ADD COLUMN moderated_at TIMESTAMP;
        END IF;
        
        -- Add moderation_notes column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='forum_reports' AND column_name='moderation_notes') THEN
          ALTER TABLE forum_reports ADD COLUMN moderation_notes TEXT;
        END IF;
      END $$;
    `);
        console.log('   ✅ forum_reports migration complete\n');

        // Migration 2: Add content_tags color column
        console.log('2️⃣  Adding color column to content_tags...');
        await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='content_tags' AND column_name='color') THEN
          ALTER TABLE content_tags ADD COLUMN color VARCHAR(7) DEFAULT '#3B82F6';
        END IF;
      END $$;
    `);
        console.log('   ✅ content_tags migration complete\n');

        console.log('✅ All migrations completed successfully!');
        console.log('\nℹ️  Note: moderated_by column added without foreign key constraint.');
        console.log('   This allows flexibility in user management.');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
