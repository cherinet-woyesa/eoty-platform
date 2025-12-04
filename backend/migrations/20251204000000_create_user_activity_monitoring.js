/**
 * Create user activity monitoring, audit logging, and security monitoring tables
 */

exports.up = function(knex) {
  return knex.schema
    // User Activity Table
    .createTable('user_activity', function(table) {
      table.increments('id').primary();
      table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('action', 100).notNullable(); // LOGIN, LOGOUT, COURSE_ACCESS, QUIZ_COMPLETE, etc.
      table.text('details'); // Additional context about the action
      table.string('ip_address', 45); // IPv6 compatible
      table.text('user_agent');
      table.json('metadata'); // Additional data like course_id, quiz_id, etc.
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index(['user_id', 'created_at']);
      table.index(['action', 'created_at']);
    })

    // Admin Audit Logs Table
    .createTable('admin_audit_logs', function(table) {
      table.increments('id').primary();
      table.integer('admin_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.integer('user_id').references('id').inTable('users').onDelete('SET NULL'); // Target user if applicable
      table.string('action', 100).notNullable(); // USER_CREATED, ROLE_CHANGED, etc.
      table.text('details').notNullable(); // Description of what was done
      table.string('ip_address', 45);
      table.text('user_agent');
      table.json('old_values'); // Previous values for audit trail
      table.json('new_values'); // New values for audit trail
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index(['admin_id', 'created_at']);
      table.index(['action', 'created_at']);
      table.index(['user_id', 'created_at']);
    })

    // Security Alerts Table
    .createTable('security_alerts', function(table) {
      table.increments('id').primary();
      table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('alert_type', 50).notNullable(); // FAILED_LOGIN, SUSPICIOUS_ACTIVITY, etc.
      table.string('severity', 20).notNullable(); // LOW, MEDIUM, HIGH, CRITICAL
      table.text('description').notNullable();
      table.string('ip_address', 45);
      table.text('user_agent');
      table.json('metadata'); // Additional context
      table.boolean('resolved').defaultTo(false);
      table.integer('resolved_by').references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('resolved_at');
      table.text('resolution_notes');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index(['user_id', 'created_at']);
      table.index(['severity', 'resolved']);
      table.index(['alert_type', 'created_at']);
    })

    // Security Incidents Table
    .createTable('security_incidents', function(table) {
      table.increments('id').primary();
      table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('incident_type', 50).notNullable(); // MULTIPLE_FAILED_LOGINS, UNUSUAL_LOCATION, etc.
      table.string('severity', 20).notNullable(); // LOW, MEDIUM, HIGH, CRITICAL
      table.text('description').notNullable();
      table.string('ip_address', 45);
      table.text('user_agent');
      table.json('metadata'); // Additional context and evidence
      table.integer('count').defaultTo(1); // For aggregated incidents
      table.boolean('resolved').defaultTo(false);
      table.integer('resolved_by').references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('resolved_at');
      table.text('resolution_notes');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.index(['user_id', 'created_at']);
      table.index(['severity', 'resolved']);
      table.index(['incident_type', 'created_at']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('security_incidents')
    .dropTableIfExists('security_alerts')
    .dropTableIfExists('admin_audit_logs')
    .dropTableIfExists('user_activity');
};
