/**
 * Test script for email service
 * Run with: node test-email-service.js
 */

require('dotenv').config();
const emailService = require('./services/emailService');

async function testEmailService() {
  console.log('🧪 Testing Email Service...\n');

  // Test 1: Verify SMTP connection
  console.log('Test 1: Verifying SMTP connection...');
  try {
    const isConnected = await emailService.verifyConnection();
    if (isConnected) {
      console.log('✅ SMTP connection successful\n');
    } else {
      console.log('❌ SMTP connection failed\n');
      return;
    }
  } catch (error) {
    console.error('❌ SMTP connection error:', error.message, '\n');
    return;
  }

  // Test 2: Send test verification email
  console.log('Test 2: Sending test verification email...');
  try {
    const testEmail = process.env.SMTP_USER; // Send to yourself for testing
    const testToken = 'test-token-' + Date.now();
    const testUserName = 'Test User';

    await emailService.sendVerificationEmail(testEmail, testToken, testUserName);
    console.log(`✅ Verification email sent to ${testEmail}`);
    console.log(`   Check your inbox for the verification email\n`);
  } catch (error) {
    console.error('❌ Failed to send verification email:', error.message, '\n');
  }

  // Test 3: Send test password reset email
  console.log('Test 3: Sending test password reset email...');
  try {
    const testEmail = process.env.SMTP_USER; // Send to yourself for testing
    const testToken = 'reset-token-' + Date.now();
    const testUserName = 'Test User';

    await emailService.sendPasswordResetEmail(testEmail, testToken, testUserName);
    console.log(`✅ Password reset email sent to ${testEmail}`);
    console.log(`   Check your inbox for the password reset email\n`);
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error.message, '\n');
  }

  console.log('🎉 Email service tests completed!');
  console.log('\nNote: Check your email inbox to verify the emails were received.');
  console.log('If using Gmail, check spam folder if emails are not in inbox.');
}

// Run tests
testEmailService()
  .then(() => {
    console.log('\n✅ All tests completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
