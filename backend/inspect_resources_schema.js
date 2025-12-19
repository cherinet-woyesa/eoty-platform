const db = require('./config/database');

async function inspectResources() {
  try {
    console.log('Inspecting resources table schema...');
    const hasTable = await db.schema.hasTable('resources');
    if (!hasTable) {
      console.error('❌ Table "resources" does not exist');
      return;
    }

    const columns = await db('resources').columnInfo();
    console.log('Columns in "resources" table:');
    console.log(JSON.stringify(columns, null, 2));
  } catch (error) {
    console.error('Error inspecting resources:', error);
  } finally {
    process.exit();
  }
}

inspectResources();
