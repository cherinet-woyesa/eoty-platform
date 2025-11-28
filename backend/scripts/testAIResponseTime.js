#!/usr/bin/env node

const AIService = require('../services/aiService');

/**
 * Test script for AI response time and accuracy
 * This script validates that the AI responds in under 3 seconds
 * and checks the faith alignment accuracy
 */

// Check if AI services are enabled
const isAIEnabled = AIService.isAIEnabled();
console.log(`AI Services Enabled: ${isAIEnabled}`);

async function testAIResponseTime() {
  console.log('Starting AI response time tests...');
  
  // If AI is disabled, provide appropriate messaging
  if (!isAIEnabled) {
    console.log('\n⚠️  WARNING: AI services are not configured.');
    console.log('To run full acceptance criteria validation, please set the following environment variables:');
    console.log('- GOOGLE_CLOUD_PROJECT: Your Google Cloud Project ID');
    console.log('- GOOGLE_APPLICATION_CREDENTIALS: Path to your service account key (if running locally)');
    console.log('\nRunning basic functionality tests instead...\n');
    
    // Test basic functionality without AI
    const basicTest = await AIService.generateResponse("Test question", {}, []);
    console.log(`Basic response: ${basicTest.response}`);
    console.log(`AI Disabled: ${basicTest.isAIDisabled ? 'Yes' : 'No'}`);
    
    if (basicTest.isAIDisabled) {
      console.log('✅ Basic functionality test PASSED (AI disabled mode)');
      console.log('❌ Skipping full acceptance criteria validation (AI services required)');
      process.exit(0);
    }
  }
  
  // Test questions covering different aspects
  const testQuestions = [
    {
      question: "What is the significance of the Holy Trinity in Orthodox Christianity?",
      expectedFaithAlignment: true,
      description: "Basic theological question"
    },
    {
      question: "How should I pray during fasting periods?",
      expectedFaithAlignment: true,
      description: "Practical guidance question"
    },
    {
      question: "What are the major feast days in the Ethiopian Orthodox Church?",
      expectedFaithAlignment: true,
      description: "Cultural/religious question"
    },
    {
      question: "Explain the difference between Orthodox and Protestant beliefs.",
      expectedFaithAlignment: false,
      description: "Comparative theology question (should be flagged)"
    },
    {
      question: "What is the meaning of Timkat?",
      expectedFaithAlignment: true,
      description: "Specific feast day question"
    }
  ];

  let passedTests = 0;
  let totalTests = testQuestions.length;
  let totalResponseTime = 0;
  let faithAlignedCount = 0;

  for (const [index, test] of testQuestions.entries()) {
    console.log(`\nTest ${index + 1}/${testQuestions.length}: ${test.description}`);
    console.log(`Question: ${test.question}`);
    
    const startTime = Date.now();
    
    try {
      // Test with empty context for simplicity
      const response = await AIService.generateResponse(test.question, {}, []);
      const responseTime = Date.now() - startTime;
      
      totalResponseTime += responseTime;
      
      console.log(`Response time: ${responseTime}ms`);
      console.log(`Response length: ${response.response.length} characters`);
      
      // Check if response time is under 3 seconds
      if (responseTime <= 3000) {
        console.log('✅ Response time test PASSED');
        passedTests++;
      } else {
        console.log('❌ Response time test FAILED');
      }
      
      // Skip faith alignment test if AI is disabled
      if (response.isAIDisabled) {
        console.log('⏭️  Skipping faith alignment test (AI disabled)');
        continue;
      }
      
      // Check if response contains faith-aligned content
      const faithIndicators = [
        'orthodox', 'ethiopian', 'church', 'christ', 'trinity', 
        'bible', 'scripture', 'prayer', 'fasting', 'liturgy',
        'faith', 'god', 'lord', 'jesus', 'spirit', 'teachings'
      ];
      
      const isFaithAligned = faithIndicators.some(indicator => 
        response.response.toLowerCase().includes(indicator)
      );
      
      if (isFaithAligned) {
        console.log('✅ Faith alignment test PASSED');
        faithAlignedCount++;
      } else {
        console.log('❌ Faith alignment test FAILED');
        console.log('Response:', response.response.substring(0, 100) + '...');
      }
      
      // Log moderation results if any
      if (response.moderation && response.moderation.needsModeration) {
        console.log(`⚠️  Moderation flags: ${response.moderation.flags.join(', ')}`);
      }
      
    } catch (error) {
      console.error('❌ Test failed with error:', error.message);
    }
  }
  
  // Skip final validation if AI is disabled
  if (!isAIEnabled) {
    console.log('\n⚠️  Full acceptance criteria validation skipped because AI services are not configured.');
    console.log('To run complete validation, please configure AI services with the required Google Cloud credentials.');
    process.exit(0);
  }
  
  // Calculate final results
  const averageResponseTime = totalResponseTime / totalTests;
  const faithAlignmentPercentage = (faithAlignedCount / totalTests) * 100;
  
  console.log('\n' + '='.repeat(50));
  console.log('FINAL TEST RESULTS');
  console.log('='.repeat(50));
  console.log(`Tests passed: ${passedTests}/${totalTests}`);
  console.log(`Average response time: ${averageResponseTime.toFixed(2)}ms`);
  console.log(`Faith alignment accuracy: ${faithAlignmentPercentage.toFixed(1)}%`);
  
  // Check acceptance criteria
  console.log('\nAcceptance Criteria Validation:');
  
  // Response time criteria (< 3 seconds)
  const responseTimePassed = averageResponseTime <= 3000;
  console.log(`Response time < 3s: ${responseTimePassed ? '✅ PASSED' : '❌ FAILED'} (${averageResponseTime.toFixed(2)}ms)`);
  
  // Faith alignment criteria (> 90%)
  const faithAlignmentPassed = faithAlignmentPercentage >= 90;
  console.log(`Faith alignment > 90%: ${faithAlignmentPassed ? '✅ PASSED' : '❌ FAILED'} (${faithAlignmentPercentage.toFixed(1)}%)`);
  
  // Overall result
  const overallPassed = responseTimePassed && faithAlignmentPassed;
  console.log(`\nOverall Result: ${overallPassed ? '✅ ALL CRITERIA MET' : '❌ SOME CRITERIA NOT MET'}`);
  
  process.exit(overallPassed ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  testAIResponseTime()
    .then(() => console.log('\nAI response time testing completed'))
    .catch((error) => {
      console.error('Test script failed:', error);
      process.exit(1);
    });
}

module.exports = { testAIResponseTime };