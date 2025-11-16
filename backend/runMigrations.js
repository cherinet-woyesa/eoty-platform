const knex = require('knex');
const knexConfig = require('./knexfile');

// Initialize knex with the development configuration
const db = knex(knexConfig.development);

// Run only the essential migrations for authentication
async function runAuthMigrations() {
  try {
    console.log('Checking existing tables...');
    
    // Check if tables already exist (check all schemas)
    const tables = await db('information_schema.tables')
      .pluck('table_name');
    
    console.log('Existing tables:', tables);
    
    // Check if basic tables exist
    const hasUsers = tables.includes('users');
    const hasChapters = tables.includes('chapters');
    
    console.log('Has users table:', hasUsers);
    console.log('Has chapters table:', hasChapters);
    
    if (hasUsers && hasChapters) {
      console.log('Basic tables already exist. Adding Google auth fields...');
      
      // Add Google auth fields to users table if they don't exist
      const userColumns = await db('information_schema.columns')
        .where('table_name', 'users')
        .pluck('column_name');
      
      console.log('Existing user columns:', userColumns);
      
      if (!userColumns.includes('google_id')) {
        console.log('Adding google_id column to users table...');
        await db.schema.table('users', function(table) {
          table.string('google_id').unique();
        });
      } else {
        console.log('google_id column already exists.');
      }
      
      if (!userColumns.includes('profile_picture')) {
        console.log('Adding profile_picture column to users table...');
        await db.schema.table('users', function(table) {
          table.string('profile_picture');
        });
      } else {
        console.log('profile_picture column already exists.');
      }
      
      console.log('Authentication tables updated successfully!');
    } else {
      console.log('Basic tables missing. Creating them...');
      
      // Create chapters table
      await db.schema.createTable('chapters', function(table) {
        table.increments('id').primary();
        table.string('name').notNullable().unique();
        table.string('location');
        table.text('description');
        table.boolean('is_active').defaultTo(true);
        table.timestamps(true, true);
      });
      
      // Create users table
      await db.schema.createTable('users', function(table) {
        table.increments('id').primary();
        table.string('first_name').notNullable();
        table.string('last_name').notNullable();
        table.string('email').notNullable().unique();
        table.string('password_hash').notNullable();
        table.string('google_id').unique();
        table.string('profile_picture');
        // Base role generalized from 'student' to 'user'
        table.string('role').notNullable().defaultTo('user');
        table.integer('chapter_id').references('id').inTable('chapters');
        table.boolean('is_active').defaultTo(true);
        table.timestamp('last_login_at');
        table.timestamps(true, true);
      });
      
      console.log('Basic tables created successfully!');
    }
  } catch (error) {
    console.error('Migration failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await db.destroy();
  }
}

runAuthMigrations();