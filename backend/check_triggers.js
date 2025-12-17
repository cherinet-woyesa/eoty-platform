const knex = require('knex')(require('./knexfile').development);

async function checkTriggers() {
  try {
    const triggers = await knex.raw(`
      SELECT event_object_table, trigger_name, action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'resources'
    `);
    console.log('Triggers on resources:', triggers.rows);
  } catch (error) {
    console.error('Error checking triggers:', error);
  } finally {
    process.exit(0);
  }
}

checkTriggers();
