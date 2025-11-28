const db = require('./config/database');

async function checkTables() {
  try {
    const result = await db.raw("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
    const tableNames = result.rows.map(r => r.tablename);
    console.log('Database tables:');
    tableNames.filter(t => t.includes('onboard') || t.includes('user')).forEach(t => console.log('-', t));

    // Check if onboarding tables exist
    const onboardingTables = ['user_onboarding', 'onboarding_flows', 'onboarding_steps', 'onboarding_completion_rewards'];
    console.log('\nOnboarding tables status:');
    onboardingTables.forEach(table => {
      const exists = tableNames.includes(table);
      console.log(`${exists ? '✅' : '❌'} ${table}`);
    });

  } catch (err) {
    console.error('Database check failed:', err.message);
  }
  process.exit(0);
}

checkTables();
