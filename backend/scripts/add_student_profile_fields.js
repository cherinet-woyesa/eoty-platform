const db = require('../config/database');

async function addStudentProfileFields() {
  console.log('🎯 Adding student profile fields to users table...');
  
  try {
    // Check if columns already exist
    const hasInterests = await db.schema.hasColumn('users', 'interests');
    const hasLearningGoals = await db.schema.hasColumn('users', 'learning_goals');
    const hasDateOfBirth = await db.schema.hasColumn('users', 'date_of_birth');
    
    if (hasInterests && hasLearningGoals && hasDateOfBirth) {
      console.log('✅ Student profile fields already exist');
      process.exit(0);
    }

    // Add columns that don't exist
    if (!hasInterests) {
      await db.schema.table('users', function(table) {
        table.json('interests');
      });
      console.log('✅ Added interests column');
    }

    if (!hasLearningGoals) {
      await db.schema.table('users', function(table) {
        table.text('learning_goals');
      });
      console.log('✅ Added learning_goals column');
    }

    if (!hasDateOfBirth) {
      await db.schema.table('users', function(table) {
        table.date('date_of_birth');
      });
      console.log('✅ Added date_of_birth column');
    }

    console.log('🎉 Student profile fields added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding student profile fields:', error);
    process.exit(1);
  }
}

addStudentProfileFields();

