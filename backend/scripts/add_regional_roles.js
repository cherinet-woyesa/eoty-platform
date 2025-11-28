/**
 * Script to add regional roles for FR7 multi-city chapter system
 * Adds Chapter Admin and Regional Coordinator roles with appropriate permissions
 */

const db = require('../config/database');

async function addRegionalRoles() {
  try {
    console.log('Adding regional roles for multi-city chapter management...');

    // First, let's check if we need to add chapter-scoped permissions
    const existingPermissions = await db('user_permissions').select('permission_key');
    const permissionKeys = existingPermissions.map(p => p.permission_key);

    // Define new chapter-scoped permissions
    const newPermissions = [
      // Chapter Admin permissions (scoped to specific chapter)
      { permission_key: 'chapter:admin_own', description: 'Administer assigned chapter' },
      { permission_key: 'content:create_chapter', description: 'Create content for assigned chapter' },
      { permission_key: 'content:edit_chapter', description: 'Edit content in assigned chapter' },
      { permission_key: 'content:approve_chapter', description: 'Approve content uploads for assigned chapter' },
      { permission_key: 'discussion:moderate_chapter', description: 'Moderate discussions in assigned chapter' },
      { permission_key: 'user:view_chapter', description: 'View users in assigned chapter' },
      { permission_key: 'user:manage_chapter', description: 'Manage users in assigned chapter' },
      { permission_key: 'analytics:view_chapter', description: 'View analytics for assigned chapter' },

      // Regional Coordinator permissions (scoped to region)
      { permission_key: 'chapter:view_region', description: 'View chapters in assigned region' },
      { permission_key: 'chapter:coordinate_region', description: 'Coordinate between chapters in region' },
      { permission_key: 'analytics:view_region', description: 'View analytics across region' },
      { permission_key: 'user:approve_chapter_admin', description: 'Approve chapter admin applications' },
      { permission_key: 'content:review_region', description: 'Review content across region' }
    ];

    // Add new permissions if they don't exist
    for (const perm of newPermissions) {
      if (!permissionKeys.includes(perm.permission_key)) {
        await db('user_permissions').insert({
          permission_key: perm.permission_key,
          description: perm.description,
          category: perm.permission_key.split(':')[0],
          created_at: new Date(),
          updated_at: new Date()
        });
        console.log(`✅ Added permission: ${perm.permission_key}`);
      }
    }

    // Get permission IDs for role assignment
    const allPermissions = await db('user_permissions').select('id', 'permission_key');
    const permissionMap = {};
    allPermissions.forEach(p => {
      permissionMap[p.permission_key] = p.id;
    });

    // Define role permissions
    const chapterAdminPermissions = [
      // Basic permissions
      'course:view', 'lesson:view', 'quiz:take', 'discussion:view',
      'user:edit_own', 'progress:view', 'notes:create', 'notes:view_own',
      'video:stream',

      // Chapter admin specific
      'chapter:admin_own', 'content:create_chapter', 'content:edit_chapter',
      'content:approve_chapter', 'discussion:moderate_chapter',
      'user:view_chapter', 'user:manage_chapter', 'analytics:view_chapter',

      // Content management (within chapter)
      'content:create', 'content:edit_own', 'video:upload', 'video:manage'
    ];

    const regionalCoordinatorPermissions = [
      // All chapter admin permissions
      ...chapterAdminPermissions,

      // Regional coordinator specific
      'chapter:view_region', 'chapter:coordinate_region',
      'analytics:view_region', 'user:approve_chapter_admin',
      'content:review_region',

      // Additional admin capabilities
      'user:view', 'analytics:view', 'content:moderate'
    ];

    // Clear existing role permissions for these roles (if they exist)
    await db('role_permissions').where('role', 'chapter_admin').del();
    await db('role_permissions').where('role', 'regional_coordinator').del();

    // Insert chapter admin permissions
    const chapterAdminRolePerms = chapterAdminPermissions
      .map(key => permissionMap[key])
      .filter(id => id)
      .map(permissionId => ({
        role: 'chapter_admin',
        permission_id: permissionId,
        created_at: new Date()
      }));

    if (chapterAdminRolePerms.length > 0) {
      await db('role_permissions').insert(chapterAdminRolePerms);
      console.log(`✅ Assigned ${chapterAdminRolePerms.length} permissions to chapter_admin role`);
    }

    // Insert regional coordinator permissions
    const regionalCoordinatorRolePerms = regionalCoordinatorPermissions
      .map(key => permissionMap[key])
      .filter(id => id)
      .map(permissionId => ({
        role: 'regional_coordinator',
        permission_id: permissionId,
        created_at: new Date()
      }));

    if (regionalCoordinatorRolePerms.length > 0) {
      await db('role_permissions').insert(regionalCoordinatorRolePerms);
      console.log(`✅ Assigned ${regionalCoordinatorRolePerms.length} permissions to regional_coordinator role`);
    }

    // Create user_chapter_roles table for chapter-specific role assignments
    const hasUserChapterRoles = await db.schema.hasTable('user_chapter_roles');
    if (!hasUserChapterRoles) {
      await db.schema.createTable('user_chapter_roles', (table) => {
        table.increments('id').primary();
        // Handle the fact that users.id is text, not integer
        table.string('user_id').notNullable(); // Match users.id type
        table.integer('chapter_id').unsigned().notNullable().references('id').inTable('chapters').onDelete('CASCADE');
        table.string('role').notNullable(); // 'chapter_admin', 'regional_coordinator', etc.
        table.jsonb('permissions').nullable(); // Additional custom permissions
        table.timestamp('assigned_at').defaultTo(db.fn.now());
        table.string('assigned_by').nullable(); // Match users.id type
        table.timestamps(true, true);

        table.unique(['user_id', 'chapter_id', 'role']);
        table.index(['user_id', 'chapter_id']);
        table.index(['role']);

        // Add foreign key constraints manually since users.id is text
        table.foreign('user_id').references('users.id').onDelete('CASCADE');
        table.foreign('assigned_by').references('users.id').onDelete('SET NULL');
      });
      console.log('✅ Created user_chapter_roles table');
    }

    console.log('🎉 Regional roles setup complete!');
    console.log('');
    console.log('📋 Summary:');
    console.log(`   • Added ${newPermissions.length} new permissions`);
    console.log('   • Created chapter_admin role');
    console.log('   • Created regional_coordinator role');
    console.log('   • Created user_chapter_roles table for chapter-specific assignments');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error adding regional roles:', error);
    process.exit(1);
  }
}

addRegionalRoles();
