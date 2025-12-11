const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createDonationsTable() {
  const client = await pool.connect();
  try {
    console.log('Creating donations table...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS donations (
        id SERIAL PRIMARY KEY,
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        donor_name VARCHAR(255),
        donor_email VARCHAR(255),
        payment_intent_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        payment_method VARCHAR(50),
        is_anonymous BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Donations table created successfully');
    
    // Add some initial seed data if empty so the "Raised" bar isn't 0
    const countResult = await client.query('SELECT COUNT(*) FROM donations');
    if (parseInt(countResult.rows[0].count) === 0) {
        console.log('Seeding initial donation data...');
        await client.query(`
            INSERT INTO donations (amount, donor_name, status, created_at) VALUES 
            (5000.00, 'Initial Seed', 'succeeded', NOW() - INTERVAL '5 days'),
            (25000.00, 'Corporate Sponsor', 'succeeded', NOW() - INTERVAL '10 days'),
            (45000.00, 'Community Fund', 'succeeded', NOW() - INTERVAL '2 days');
        `);
        console.log('Seed data added.');
    }

  } catch (err) {
    console.error('Error creating donations table:', err);
  } finally {
    client.release();
    pool.end();
  }
}

createDonationsTable();
