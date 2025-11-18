/**
 * Script to publish sample courses for landing page
 */

const db = require('../config/database');

async function publishSampleCourses() {
  try {
    console.log('Publishing sample courses...');
    
    // Get all courses
    const courses = await db('courses')
      .select('id', 'title', 'is_published')
      .limit(10);
    
    if (courses.length === 0) {
      console.log('No courses found in database');
      return;
    }
    
    console.log(`Found ${courses.length} courses`);
    
    // Publish all courses
    const updated = await db('courses')
      .whereIn('id', courses.map(c => c.id))
      .update({
        is_published: true,
        published_at: new Date(),
        updated_at: new Date()
      });
    
    console.log(`Published ${updated} courses`);
    
    // Show published courses
    const published = await db('courses')
      .where({ is_published: true })
      .select('id', 'title');
    
    console.log('\nPublished courses:');
    published.forEach(c => console.log(`  - ${c.title} (ID: ${c.id})`));
    
    process.exit(0);
  } catch (error) {
    console.error('Error publishing courses:', error);
    process.exit(1);
  }
}

publishSampleCourses();
