const db = require('./config/database');

async function createUserView() {
  try {
    // Create a view that maps 'user' to 'users' table for Better Auth compatibility
    await db.raw('CREATE OR REPLACE VIEW "user" AS SELECT * FROM users');
    console.log('✅ Created "user" view for Better Auth compatibility');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating user view:', error);
    process.exit(1);
  }
}

createUserView();
