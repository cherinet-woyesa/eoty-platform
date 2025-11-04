const knex = require('knex')(require('./knexfile').development);

async function debugSession() {
  try {
    const userId = process.argv[2] || '2'; // Teacher user
    
    console.log(`\n🔍 Debugging session for user ID: ${userId}\n`);
    
    // Check user
    const user = await knex('users').where({ id: userId }).first();
    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }
    
    console.log('✅ User found:');
    console.log(`   ID: ${user.id} (type: ${typeof user.id})`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Role: ${user.role}`);
    
    // Check sessions
    const sessions = await knex('session_table')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc');
    
    console.log(`\n📊 Sessions: ${sessions.length}`);
    
    if (sessions.length > 0) {
      console.log('\nRecent sessions:');
      sessions.slice(0, 3).forEach((session, i) => {
        const isExpired = new Date(session.expires_at) < new Date();
        console.log(`\n${i + 1}. Session ID: ${session.id}`);
        console.log(`   Token: ${session.token?.substring(0, 20)}...`);
        console.log(`   Expires: ${session.expires_at}`);
        console.log(`   Status: ${isExpired ? '❌ EXPIRED' : '✅ ACTIVE'}`);
        console.log(`   Created: ${session.created_at}`);
      });
    }
    
    // Check Better Auth views
    console.log('\n🔍 Checking Better Auth views...');
    
    try {
      const userView = await knex('user').where({ id: userId }).first();
      console.log('✅ User view accessible:', !!userView);
      if (userView) {
        console.log(`   emailVerified: ${userView.emailVerified}`);
        console.log(`   createdAt: ${userView.createdAt}`);
      }
    } catch (error) {
      console.log('❌ User view error:', error.message);
    }
    
    try {
      const sessionView = await knex('session')
        .where({ userId: userId })
        .first();
      console.log('✅ Session view accessible:', !!sessionView);
      if (sessionView) {
        console.log(`   Session ID: ${sessionView.id}`);
        console.log(`   Expires: ${sessionView.expiresAt}`);
      }
    } catch (error) {
      console.log('❌ Session view error:', error.message);
    }
    
    // Check account table
    const accounts = await knex('account_table')
      .where({ user_id: userId })
      .count('* as count');
    
    console.log(`\n📊 Linked accounts: ${accounts[0].count}`);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

debugSession();
