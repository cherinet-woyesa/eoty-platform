const knex = require('knex');
const knexConfig = require('./knexfile');

// Initialize knex with the development configuration
const db = knex(knexConfig.development);

async function createPermissionsTables() {
  try {
    console.log('Creating permissions tables...');
    
    // Check if tables already exist
    const hasUserPermissions = await db.schema.hasTable('user_permissions');
    const hasRolePermissions = await db.schema.hasTable('role_permissions');
    const hasUserChapterAssignments = await db.schema.hasTable('user_chapter_assignments');
    
    if (!hasUserPermissions) {
      console.log('Creating user_permissions table...');
      await db.schema.createTable('user_permissions', function(table) {
        table.increments('id').primary();
        table.string('permission_key').notNullable();
        table.string('description').notNullable();
        table.timestamps(true, true);
        
        table.unique(['permission_key']);
      });
    } else {
      console.log('user_permissions table already exists.');
    }
    
    if (!hasRolePermissions) {
      console.log('Creating role_permissions table...');
      await db.schema.createTable('role_permissions', function(table) {
        table.increments('id').primary();
        table.enum('role', ['student', 'teacher', 'chapter_admin', 'platform_admin']).notNullable();
        table.integer('permission_id').references('id').inTable('user_permissions').onDelete('CASCADE');
        table.timestamps(true, true);
        
        table.unique(['role', 'permission_id']);
      });
    } else {
      console.log('role_permissions table already exists.');
    }
    
    if (!hasUserChapterAssignments) {
      console.log('Creating user_chapter_assignments table...');
      await db.schema.createTable('user_chapter_assignments', function(table) {
        table.increments('id').primary();
        table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
        table.string('chapter_id').notNullable();
        table.enum('role_in_chapter', ['member', 'moderator', 'admin']).defaultTo('member');
        table.timestamps(true, true);
        
        table.unique(['user_id', 'chapter_id']);
      });
    } else {
      console.log('user_chapter_assignments table already exists.');
    }
    
    console.log('Permissions tables created successfully!');
  } catch (error) {
    console.error('Failed to create permissions tables:', error.message);
    console.error('Full error:', error);
  } finally {
    await db.destroy();
  }
}

createPermissionsTables();