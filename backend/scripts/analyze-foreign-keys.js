const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD),
  database: process.env.DB_NAME,
});

async function analyzeForeignKeys() {
  try {
    const result = await pool.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'users'
        AND ccu.column_name = 'id'
      ORDER BY tc.table_name;
    `);

    console.log(`Found ${result.rows.length} foreign key constraints referencing users.id:\n`);
    
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.table_name}.${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name}`);
      console.log(`   Constraint: ${row.constraint_name}\n`);
    });

    return result.rows;
  } catch (error) {
    console.error('Error analyzing foreign keys:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

analyzeForeignKeys();
