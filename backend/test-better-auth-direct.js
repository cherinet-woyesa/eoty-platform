const { auth } = require('./lib/auth');

async function testBetterAuthDirect() {
  try {
    console.log('\n🔍 Testing Better Auth directly...\n');
    
    const email = 'teacher@eoty.org';
    const password = 'Teacher123!';
    
    console.log(`Attempting to sign in with: ${email}`);
    
    // Try to use Better Auth's internal methods
    const result = await auth.api.signInEmail({
      body: {
        email,
        password,
      },
    });
    
    console.log('\n✅ Sign in successful!');
    console.log('Result:', JSON.stringify(result, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Sign in failed:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testBetterAuthDirect();
