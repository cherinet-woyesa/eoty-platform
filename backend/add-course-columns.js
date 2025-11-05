/**
 * Script to add level and cover_image columns to courses table
 * Run with: node add-course-columns.js
 */

require('dotenv').config();
const db = require('./config/database');

async function addColumns() {
  try {
    console.log('🔍 Checking if columns exist...');

    // Check if level column exists
    const hasLevel = await db.schema.hasColumn('courses', 'level');
    const hasCoverImage = await db.schema.hasColumn('courses', 'cover_image');

    console.log(`   level column exists: ${hasLevel}`);
    console.log(`   cover_image column exists: ${hasCoverImage}`);

    if (!hasLevel || !hasCoverImage) {
      console.log('\n📝 Adding missing columns...');

      await db.schema.table('courses', function(table) {
        if (!hasLevel) {
          table.string('level');
          console.log('   ✅ Added level column');
        }
        if (!hasCoverImage) {
          table.string('cover_image');
          console.log('   ✅ Added cover_image column');
        }
      });

      console.log('\n✅ Columns added successfully!');
    } else {
      console.log('\n✅ All columns already exist!');
    }

    // Verify columns
    console.log('\n🔍 Verifying columns...');
    const columns = await db('information_schema.columns')
      .select('column_name', 'data_type')
      .where({ table_name: 'courses' })
      .whereIn('column_name', ['level', 'cover_image']);

    console.log('   Columns in courses table:');
    columns.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });

    console.log('\n✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addColumns();
