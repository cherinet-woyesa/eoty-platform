exports.up = function(knex) {
  return knex.raw(`
    DO $$
    BEGIN
      -- Grant permissions to postgres user (if not already owner)
      GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
      GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
      GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres;
      
      -- Ensure public schema is owned by postgres
      ALTER SCHEMA public OWNER TO postgres;
    EXCEPTION WHEN OTHERS THEN
      -- Ignore errors if we don't have permission to grant (e.g. if we are not superuser)
      RAISE NOTICE 'Could not grant permissions: %', SQLERRM;
    END $$;
  `);
};

exports.down = function(knex) {
  return Promise.resolve();
};
