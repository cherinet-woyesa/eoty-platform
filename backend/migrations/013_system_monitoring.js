/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // System Monitoring Metrics
  await knex.schema.createTable('system_monitoring', (table) => {
    table.increments('id').primary();
    table.string('metric').notNullable(); // cpu_usage, memory_usage, response_time, etc.
    table.decimal('value', 10, 2).notNullable();
    table.string('unit'); // percentage, milliseconds, megabytes, etc.
    table.text('details');
    table.text('error');
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    
    table.index(['metric']);
    table.index(['timestamp']);
    table.index(['metric', 'timestamp']);
  });

  // Performance Metrics
  await knex.schema.createTable('performance_metrics', (table) => {
    table.increments('id').primary();
    table.string('session_id', 255).notNullable();
    table.string('operation', 100).notNullable(); // api_call, database_query, file_upload, etc.
    table.integer('response_time_ms').notNullable();
    table.boolean('within_threshold').notNullable();
    table.integer('threshold_ms').notNullable();
    table.jsonb('metadata'); // Additional performance data
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    
    table.index(['timestamp']);
    table.index(['operation', 'within_threshold']);
    table.index(['session_id']);
  });

  // Accuracy Metrics for AI
  await knex.schema.createTable('accuracy_metrics', (table) => {
    table.increments('id').primary();
    table.string('session_id', 255).notNullable();
    table.text('question').notNullable();
    table.text('response').notNullable();
    table.decimal('accuracy_score', 3, 2).notNullable();
    table.boolean('is_accurate').notNullable();
    table.decimal('faith_alignment', 3, 2);
    table.jsonb('moderation_flags');
    table.string('user_feedback', 50); // positive, negative, neutral
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    
    table.index(['timestamp']);
    table.index(['accuracy_score']);
    table.index(['user_feedback']);
  });

  // Performance Alerts
  await knex.schema.createTable('performance_alerts', (table) => {
    table.increments('id').primary();
    table.string('alert_type', 50).notNullable(); // performance, error, security, capacity
    table.string('severity', 20).notNullable(); // low, medium, high, critical
    table.text('message').notNullable();
    table.string('metric', 50).notNullable();
    table.decimal('metric_value', 5, 2).notNullable();
    table.decimal('threshold', 5, 2).notNullable();
    table.string('status').defaultTo('active'); // active, acknowledged, resolved
    table.integer('acknowledged_by').unsigned().references('id').inTable('users');
    table.timestamp('acknowledged_at');
    table.timestamp('resolved_at');
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    
    table.index(['alert_type', 'severity']);
    table.index(['status', 'timestamp']);
    table.index(['metric', 'timestamp']);
  });

  // System Jobs
  await knex.schema.createTable('system_jobs', (table) => {
    table.increments('id').primary();
    table.string('job_name', 255).notNullable().unique();
    table.string('job_type', 100).notNullable(); // cleanup, backup, report, maintenance
    table.string('schedule', 100).notNullable(); // cron expression
    table.boolean('is_active').defaultTo(true);
    table.string('status').defaultTo('idle'); // idle, running, failed, completed
    table.timestamp('last_run_at');
    table.text('last_run_result');
    table.text('last_error');
    table.integer('consecutive_failures').defaultTo(0);
    table.jsonb('job_config');
    table.timestamps(true, true);
    
    table.index(['job_type', 'is_active']);
    table.index(['status', 'last_run_at']);
  });

  // Job Execution Logs
  await knex.schema.createTable('job_execution_logs', (table) => {
    table.increments('id').primary();
    table.integer('job_id').unsigned().references('id').inTable('system_jobs').onDelete('CASCADE');
    table.string('status').notNullable(); // started, completed, failed
    table.text('result');
    table.text('error');
    table.integer('duration_ms');
    table.timestamp('started_at').defaultTo(knex.fn.now());
    table.timestamp('finished_at');
    table.jsonb('execution_context');
    
    table.index(['job_id', 'started_at']);
    table.index(['status', 'started_at']);
  });

  // Database Maintenance Logs
  await knex.schema.createTable('database_maintenance', (table) => {
    table.increments('id').primary();
    table.string('operation').notNullable(); // vacuum, analyze, reindex, backup
    table.string('table_name');
    table.decimal('duration_seconds', 8, 2);
    table.bigInteger('rows_affected');
    table.boolean('success').defaultTo(true);
    table.text('error');
    table.timestamp('executed_at').defaultTo(knex.fn.now());
    
    table.index(['operation', 'executed_at']);
    table.index(['table_name', 'executed_at']);
  });

  // Insert system jobs
  await knex('system_jobs').insert([
    {
      job_name: 'cleanup_old_metrics',
      job_type: 'cleanup',
      schedule: '0 2 * * *', // Daily at 2 AM
      is_active: true,
      job_config: JSON.stringify({
        retention_days: 30,
        tables: ['performance_metrics', 'system_monitoring', 'analytics_events']
      })
    },
    {
      job_name: 'database_backup',
      job_type: 'backup',
      schedule: '0 0 * * 0', // Weekly on Sunday
      is_active: true,
      job_config: JSON.stringify({
        backup_type: 'full',
        compression: true,
        retention_count: 4
      })
    },
    {
      job_name: 'user_engagement_report',
      job_type: 'report',
      schedule: '0 6 * * 1', // Weekly on Monday at 6 AM
      is_active: true,
      job_config: JSON.stringify({
        report_type: 'weekly_engagement',
        recipients: ['admin@eoty.org']
      })
    },
    {
      job_name: 'video_processing_cleanup',
      job_type: 'cleanup',
      schedule: '0 3 * * *', // Daily at 3 AM
      is_active: true,
      job_config: JSON.stringify({
        max_processing_hours: 24,
        cleanup_failed: true
      })
    }
  ]).onConflict('job_name').ignore();
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('database_maintenance');
  await knex.schema.dropTableIfExists('job_execution_logs');
  await knex.schema.dropTableIfExists('system_jobs');
  await knex.schema.dropTableIfExists('performance_alerts');
  await knex.schema.dropTableIfExists('accuracy_metrics');
  await knex.schema.dropTableIfExists('performance_metrics');
  await knex.schema.dropTableIfExists('system_monitoring');
};