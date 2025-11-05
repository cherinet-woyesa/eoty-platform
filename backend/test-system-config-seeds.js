/**
 * Test script to verify system configuration seeds
 */

const knex = require('knex');
const knexConfig = require('./knexfile');

const db = knex(knexConfig.development);

async function testSeeds() {
  try {
    console.log('Testing system configuration seeds...\n');

    // Test course_categories
    console.log('=== Course Categories ===');
    const categories = await db('course_categories')
      .select('*')
      .orderBy('display_order');
    
    console.log(`Found ${categories.length} categories:`);
    categories.forEach(cat => {
      console.log(`  - ${cat.name} (${cat.slug}) - Order: ${cat.display_order}, Active: ${cat.is_active}, Usage: ${cat.usage_count || 0}`);
    });
    console.log();

    // Test course_levels
    console.log('=== Course Levels ===');
    const levels = await db('course_levels')
      .select('*')
      .orderBy('display_order');
    
    console.log(`Found ${levels.length} levels:`);
    levels.forEach(level => {
      console.log(`  - ${level.name} (${level.slug}) - ${level.description} - Order: ${level.display_order}, Active: ${level.is_active}, Usage: ${level.usage_count || 0}`);
    });
    console.log();

    // Test course_durations
    console.log('=== Course Durations ===');
    const durations = await db('course_durations')
      .select('*')
      .orderBy('display_order');
    
    console.log(`Found ${durations.length} durations:`);
    durations.forEach(dur => {
      console.log(`  - ${dur.label} (${dur.value}) - Weeks: ${dur.weeks_min}-${dur.weeks_max || '∞'} - Order: ${dur.display_order}, Active: ${dur.is_active}, Usage: ${dur.usage_count || 0}`);
    });
    console.log();

    // Test usage counts
    console.log('=== Usage Count Verification ===');
    const totalCourses = await db('courses').count('* as count').first();
    console.log(`Total courses in database: ${totalCourses.count}`);
    
    const coursesWithCategory = await db('courses').whereNotNull('category').count('* as count').first();
    console.log(`Courses with category: ${coursesWithCategory.count}`);
    
    const coursesWithLevel = await db('courses').whereNotNull('level').count('* as count').first();
    console.log(`Courses with level: ${coursesWithLevel.count}`);
    
    const coursesWithDuration = await db('courses').whereNotNull('estimated_duration').where('estimated_duration', '!=', '').count('* as count').first();
    console.log(`Courses with duration: ${coursesWithDuration.count}`);
    console.log();

    console.log('✅ All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  } finally {
    await db.destroy();
  }
}

testSeeds();
