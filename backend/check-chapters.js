const db = require('./config/database');

async function checkChapters() {
  try {
    const chapters = await db('chapters').select('*');
    
    console.log('\n📋 Current chapters in database:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    chapters.forEach(ch => {
      console.log(`ID: ${ch.id} | Name: "${ch.name}" | Location: ${ch.location} | Active: ${ch.is_active}`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log(`Total chapters: ${chapters.length}\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkChapters();
