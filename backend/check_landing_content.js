const db = require('./config/database');

async function checkContent() {
  try {
    console.log('Checking landing_page_content table...');
    const content = await db('landing_page_content')
      .where({ is_active: true })
      .first();

    if (content) {
      console.log('Found content record ID:', content.id);
      const json = JSON.parse(content.content_json);
      console.log('About Title in DB:', json.about?.title);
      console.log('Full About Section:', JSON.stringify(json.about, null, 2));
    } else {
      console.log('No active content found in landing_page_content table.');
    }
  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    process.exit();
  }
}

checkContent();