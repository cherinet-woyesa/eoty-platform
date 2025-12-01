const db = require('./config/database');

async function checkTables() {
  try {
    console.log('Checking tables...');
    const result = await db.raw("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
    const tables = result.rows.map(r => r.tablename);
    
    console.log('Found tables:', tables.length);
    
    const requiredTables = ['assignments', 'courses', 'assignment_submissions', 'student_invitations'];
    
    requiredTables.forEach(t => {
      if (tables.includes(t)) {
        console.log(`✅ Table '${t}' exists`);
      } else {
        console.error(`❌ Table '${t}' MISSING`);
      }
    });

    if (tables.includes('assignments')) {
        const columns = await db('assignments').columnInfo();
        console.log('Assignments columns:', Object.keys(columns));
    }

  } catch (error) {
    console.error('Error checking tables:', error);
  } finally {
    process.exit();
  }
}

checkTables();