// Script to fix all migration files with integer user_id references to use string instead
const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '..', 'migrations');
const files = fs.readdirSync(migrationsDir);

let fixedCount = 0;

files.forEach(file => {
  if (!file.endsWith('.js')) return;
  
  const filePath = path.join(migrationsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  // Fix patterns that reference users table with integer types
  content = content.replace(/table\.integer\("acknowledged_by"\)\.unsigned\(\)\.references\("id"\)\.inTable\("users"\)/g, 'table.string("acknowledged_by")');
  content = content.replace(/table\.integer\('acknowledged_by'\)\.unsigned\(\)\.references\('id'\)\.inTable\('users'\)/g, "table.string('acknowledged_by')");
  content = content.replace(/table\.integer\("admin_id"\)\.unsigned\(\)\.references\("id"\)\.inTable\("users"\)/g, 'table.string("admin_id")');
  content = content.replace(/table\.integer\('admin_id'\)\.unsigned\(\)\.references\('id'\)\.inTable\('users'\)/g, "table.string('admin_id')");
  content = content.replace(/table\.integer\('user_id'\)\.unsigned\(\)\.references\('id'\)\.inTable\('users'\)/g, "table.string('user_id').notNullable()");
  content = content.replace(/table\.integer\('user_id'\)\.unsigned\(\)\.notNullable\(\)\.references\('id'\)\.inTable\('users'\)/g, "table.string('user_id').notNullable()");
  content = content.replace(/table\.integer\('created_by'\)\.unsigned\(\)\.references\('id'\)\.inTable\('users'\)/g, "table.string('created_by')");
  content = content.replace(/table\.integer\('updated_by'\)\.unsigned\(\)\.references\('id'\)\.inTable\('users'\)/g, "table.string('updated_by')");
  content = content.replace(/table\.integer\('reviewed_by'\)\.unsigned\(\)\.references\('id'\)\.inTable\('users'\)/g, "table.string('reviewed_by')");
  content = content.replace(/table\.integer\('moderator_id'\)\.unsigned\(\)\.references\('id'\)\.inTable\('users'\)/g, "table.string('moderator_id')");
  content = content.replace(/table\.integer\('flagged_by'\)\.unsigned\(\)\.references\('id'\)\.inTable\('users'\)/g, "table.string('flagged_by')");
  content = content.replace(/table\.integer\('sender_id'\)\.unsigned\(\)\.references\('id'\)\.inTable\('users'\)/g, "table.string('sender_id')");
  content = content.replace(/table\.integer\('recipient_id'\)\.unsigned\(\)\.references\('id'\)\.inTable\('users'\)/g, "table.string('recipient_id')");
  content = content.replace(/table\.integer\("user_id"\)\.unsigned\(\)\.references\("id"\)\.inTable\("users"\)\.onDelete\("CASCADE"\)/g, 'table.string("user_id").notNullable()');
  content = content.replace(/table\.integer\("reported_by"\)\.unsigned\(\)\.references\("id"\)\.inTable\("users"\)\.onDelete\("CASCADE"\)/g, 'table.string("reported_by").notNullable()');
  content = content.replace(/table\.integer\("assigned_to"\)\.unsigned\(\)\.references\("id"\)\.inTable\("users"\)/g, 'table.string("assigned_to")');
  
  // Add exists checks for create table operations
  if (!content.includes('hasTable') && content.includes('createTable')) {
    // Only add if not already present
    const createTableMatch = content.match(/exports\.up = async function\(knex\) \{[\s\S]*?await knex\.schema\.createTable\('([^']+)'/);
    if (createTableMatch) {
      const tableName = createTableMatch[1];
      content = content.replace(
        /exports\.up = async function\(knex\) \{/,
        `exports.up = async function(knex) {\n  // Check if table already exists\n  const hasTable = await knex.schema.hasTable('${tableName}');\n  if (hasTable) {\n    console.log('✓ ${tableName} table already exists, skipping migration');\n    return;\n  }\n`
      );
    }
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Fixed ${file}`);
    fixedCount++;
  }
});

console.log(`\n✓ Fixed ${fixedCount} migration files`);

