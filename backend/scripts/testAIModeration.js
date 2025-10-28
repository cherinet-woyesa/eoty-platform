#!/usr/bin/env node

const AIService = require('../services/aiService');
const ModerationService = require('../services/moderationService');
const db = require('../config/database');

/**
 * Test script for AI moderation workflow
 * This script validates that the moderation workflow properly flags sensitive content
 */

// Check if AI services are enabled
const isAIEnabled = AIService.isAIEnabled();
console.log(`AI Services Enabled: ${isAIEnabled}`);

async function testAIModeration() {
  console.log('Starting AI moderation workflow tests...');
  
  // Test questions with different sensitivity levels
  const testQuestions = [
    {
      question: "What is the meaning of the Holy Trinity?",
      userId: 1,
      expectedFlags: [],
      shouldNeedModeration: false,
      description: "Safe theological question"
    },
    {
      question: "Why is Orthodox doctrine better than Protestant beliefs?",
      userId: 1,
      expectedFlags: ['sensitive_topic_ecumenical', 'problematic_phrase_better_than'],
      shouldNeedModeration: true,
      description: "Comparative theology question (should be flagged)"
    },
    {
      question: "What does the church teach about abortion?",
      userId: 1,
      expectedFlags: ['sensitive_topic_social_issues'],
      shouldNeedModeration: true,
      description: "Sensitive social issue"
    },
    {
      question: "How should I prepare for confession?",
      userId: 1,
      expectedFlags: [],
      shouldNeedModeration: false,
      description: "Safe practical guidance"
    },
    {
      question: "Tell me everything about Orthodox Christianity",
      userId: 1,
      expectedFlags: ['potentially_off_topic'],
      shouldNeedModeration: true,
      description: "Vague/broad question"
    }
  ];

  let passedTests = 0;
  let totalTests = testQuestions.length;
  let moderationTriggered = 0;

  for (const [index, test] of testQuestions.entries()) {
    console.log(`\nTest ${index + 1}/${testQuestions.length}: ${test.description}`);
    console.log(`Question: ${test.question}`);
    
    try {
      // Test moderation
      const moderationResult = await ModerationService.moderateContent(
        test.question, 
        test.userId, 
        'question'
      );
      
      console.log(`Needs moderation: ${moderationResult.needsModeration}`);
      console.log(`Flags: ${moderationResult.flags.join(', ') || 'None'}`);
      console.log(`Faith alignment score: ${moderationResult.faithAlignmentScore}`);
      
      // Check if moderation result matches expectations
      const moderationCorrect = moderationResult.needsModeration === test.shouldNeedModeration;
      
      if (moderationCorrect) {
        console.log('✅ Moderation test PASSED');
        passedTests++;
      } else {
        console.log('❌ Moderation test FAILED');
        console.log(`Expected needsModeration: ${test.shouldNeedModeration}, got: ${moderationResult.needsModeration}`);
      }
      
      // Check if expected flags are present
      const hasExpectedFlags = test.expectedFlags.every(flag => 
        moderationResult.flags.includes(flag)
      );
      
      if (hasExpectedFlags || test.expectedFlags.length === 0) {
        console.log('✅ Flag detection test PASSED');
      } else {
        console.log('❌ Flag detection test FAILED');
        console.log(`Expected flags: ${test.expectedFlags.join(', ')}`);
        console.log(`Actual flags: ${moderationResult.flags.join(', ')}`);
      }
      
      // Test escalation if needed
      if (moderationResult.needsModeration) {
        const escalationId = await ModerationService.escalateForReview(
          test.question,
          test.userId,
          `Auto-flagged: ${moderationResult.flags.join(', ')}`,
          'question'
        );
        
        console.log(`✅ Escalated for review (ID: ${escalationId})`);
        moderationTriggered++;
        
        // Verify escalation was stored in database
        const escalation = await db('moderation_escalations')
          .where({ id: escalationId })
          .first();
          
        if (escalation) {
          console.log('✅ Escalation database storage test PASSED');
        } else {
          console.log('❌ Escalation database storage test FAILED');
        }
      }
      
    } catch (error) {
      console.error('❌ Test failed with error:', error.message);
    }
  }
  
  // Test getting pending escalations
  try {
    const pendingEscalations = await ModerationService.getPendingEscalations(10, 0);
    console.log(`\nFound ${pendingEscalations.length} pending escalations`);
    console.log('✅ Escalation retrieval test PASSED');
  } catch (error) {
    console.error('❌ Escalation retrieval test FAILED:', error.message);
  }
  
  // Calculate final results
  console.log('\n' + '='.repeat(50));
  console.log('FINAL MODERATION TEST RESULTS');
  console.log('='.repeat(50));
  console.log(`Moderation tests passed: ${passedTests}/${totalTests}`);
  console.log(`Moderation workflow triggered: ${moderationTriggered} times`);
  
  // Check acceptance criteria
  console.log('\nAcceptance Criteria Validation:');
  
  // Moderation workflow criteria (should trigger for flagged content)
  const moderationWorkflowPassed = moderationTriggered > 0;
  console.log(`Moderation workflow triggers: ${moderationWorkflowPassed ? '✅ PASSED' : '❌ FAILED'}`);
  
  // Overall result
  const overallPassed = passedTests === totalTests && moderationWorkflowPassed;
  console.log(`\nOverall Result: ${overallPassed ? '✅ ALL CRITERIA MET' : '❌ SOME CRITERIA NOT MET'}`);
  
  process.exit(overallPassed ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  testAIModeration()
    .then(() => console.log('\nAI moderation testing completed'))
    .catch((error) => {
      console.error('Test script failed:', error);
      process.exit(1);
    });
}

module.exports = { testAIModeration };