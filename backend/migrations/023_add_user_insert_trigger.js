/**
 * Add INSTEAD OF INSERT trigger to user view for Better Auth registration
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Create function to handle user inserts
  await knex.raw(`
    CREATE OR REPLACE FUNCTION user_insert()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO users (
        id,
        email,
        password_hash,
        name,
        email_verified,
        profile_picture,
        created_at,
        updated_at,
        first_name,
        last_name,
        role,
        chapter_id,
        is_active,
        two_factor_enabled,
        two_factor_secret
      )
      VALUES (
        NEW.id,
        NEW.email,
        NEW.password,
        NEW.name,
        COALESCE(NEW."emailVerified", false),
        NEW.image,
        COALESCE(NEW."createdAt", NOW()),
        COALESCE(NEW."updatedAt", NOW()),
        NEW.first_name,
        NEW.last_name,
        COALESCE(NEW.role, 'student'),
        NEW.chapter_id,
        COALESCE(NEW.is_active, true),
        COALESCE(NEW.two_factor_enabled, false),
        NEW.two_factor_secret
      );
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  
  // Create INSTEAD OF INSERT trigger on user view
  await knex.raw(`
    CREATE TRIGGER user_insert_trigger
    INSTEAD OF INSERT ON "user"
    FOR EACH ROW
    EXECUTE FUNCTION user_insert();
  `);
  
  console.log('✅ Created INSTEAD OF INSERT trigger for user view');
  
  // Also create UPDATE trigger
  await knex.raw(`
    CREATE OR REPLACE FUNCTION user_update()
    RETURNS TRIGGER AS $$
    BEGIN
      UPDATE users SET
        email = NEW.email,
        password_hash = NEW.password,
        name = NEW.name,
        email_verified = NEW."emailVerified",
        profile_picture = NEW.image,
        updated_at = NOW(),
        first_name = NEW.first_name,
        last_name = NEW.last_name,
        role = NEW.role,
        chapter_id = NEW.chapter_id,
        is_active = NEW.is_active,
        two_factor_enabled = NEW.two_factor_enabled,
        two_factor_secret = NEW.two_factor_secret
      WHERE id = NEW.id;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  
  await knex.raw(`
    CREATE TRIGGER user_update_trigger
    INSTEAD OF UPDATE ON "user"
    FOR EACH ROW
    EXECUTE FUNCTION user_update();
  `);
  
  console.log('✅ Created INSTEAD OF UPDATE trigger for user view');
};

/**
 * Rollback migration
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.raw(`DROP TRIGGER IF EXISTS user_insert_trigger ON "user";`);
  await knex.raw(`DROP FUNCTION IF EXISTS user_insert();`);
  await knex.raw(`DROP TRIGGER IF EXISTS user_update_trigger ON "user";`);
  await knex.raw(`DROP FUNCTION IF EXISTS user_update();`);
  console.log('✅ Dropped user view triggers');
};
