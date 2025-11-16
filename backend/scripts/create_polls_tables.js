const db = require('../config/database');

async function createPollsTables() {
  console.log('🎯 Creating polls and poll_responses tables...');
  
  try {
    // Check if tables already exist
    const hasPollsTable = await db.schema.hasTable('polls');
    const hasPollResponsesTable = await db.schema.hasTable('poll_responses');
    
    if (hasPollsTable && hasPollResponsesTable) {
      console.log('✅ Polls tables already exist');
      process.exit(0);
    }

    // Create polls table
    if (!hasPollsTable) {
      await db.schema.createTable('polls', function(table) {
        table.increments('id').primary();
        table.integer('lesson_id').unsigned().references('id').inTable('lessons').onDelete('CASCADE');
        table.string('created_by').references('id').inTable('users').onDelete('CASCADE');
        table.string('question').notNullable();
        table.text('description');
        table.jsonb('options').notNullable();
        table.boolean('is_active').defaultTo(true);
        table.boolean('is_published').defaultTo(false);
        table.boolean('allow_multiple_choice').defaultTo(false);
        table.boolean('show_results_before_voting').defaultTo(false);
        table.boolean('show_results_after_voting').defaultTo(true);
        table.timestamp('start_date');
        table.timestamp('end_date');
        table.integer('total_responses').defaultTo(0);
        table.jsonb('metadata');
        table.timestamps(true, true);
        
        table.index(['lesson_id', 'is_active']);
        table.index(['lesson_id', 'is_published']);
        table.index(['created_by']);
        table.index(['start_date', 'end_date']);
      });
      console.log('✅ Created polls table');
    }

    // Create poll_responses table
    if (!hasPollResponsesTable) {
      await db.schema.createTable('poll_responses', function(table) {
        table.increments('id').primary();
        table.integer('poll_id').unsigned().references('id').inTable('polls').onDelete('CASCADE');
        table.string('user_id').references('id').inTable('users').onDelete('CASCADE');
        table.integer('option_id').notNullable();
        table.text('custom_answer');
        table.jsonb('response_metadata');
        table.timestamps(true, true);
        
        table.index(['poll_id', 'user_id']);
        table.index(['poll_id', 'option_id']);
        table.index(['user_id']);
      });
      console.log('✅ Created poll_responses table');
    }

    console.log('🎉 Polls tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating polls tables:', error);
    process.exit(1);
  }
}

createPollsTables();

