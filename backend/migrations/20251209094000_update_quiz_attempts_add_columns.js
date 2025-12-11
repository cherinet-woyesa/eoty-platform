exports.up = async function (knex) {
  const hasTable = await knex.schema.hasTable('quiz_attempts');
  if (!hasTable) return;

  const tasks = [];

  const hasMaxScore = await knex.schema.hasColumn('quiz_attempts', 'max_score');
  if (!hasMaxScore) {
    tasks.push(
      knex.schema.alterTable('quiz_attempts', (table) => {
        table.integer('max_score').defaultTo(0);
      })
    );
  }

  const hasAnswers = await knex.schema.hasColumn('quiz_attempts', 'answers');
  if (!hasAnswers) {
    tasks.push(
      knex.schema.alterTable('quiz_attempts', (table) => {
        table.jsonb('answers').defaultTo('[]');
      })
    );
  }

  const hasAnonymized = await knex.schema.hasColumn('quiz_attempts', 'anonymized_at');
  if (!hasAnonymized) {
    tasks.push(
      knex.schema.alterTable('quiz_attempts', (table) => {
        table.timestamp('anonymized_at').nullable();
      })
    );
  }

  if (tasks.length > 0) {
    await Promise.all(tasks);
  }
};

exports.down = async function (knex) {
  const hasTable = await knex.schema.hasTable('quiz_attempts');
  if (!hasTable) return;

  const tasks = [];

  const hasMaxScore = await knex.schema.hasColumn('quiz_attempts', 'max_score');
  if (hasMaxScore) {
    tasks.push(
      knex.schema.alterTable('quiz_attempts', (table) => {
        table.dropColumn('max_score');
      })
    );
  }

  const hasAnswers = await knex.schema.hasColumn('quiz_attempts', 'answers');
  if (hasAnswers) {
    tasks.push(
      knex.schema.alterTable('quiz_attempts', (table) => {
        table.dropColumn('answers');
      })
    );
  }

  const hasAnonymized = await knex.schema.hasColumn('quiz_attempts', 'anonymized_at');
  if (hasAnonymized) {
    tasks.push(
      knex.schema.alterTable('quiz_attempts', (table) => {
        table.dropColumn('anonymized_at');
      })
    );
  }

  if (tasks.length > 0) {
    await Promise.all(tasks);
  }
};




