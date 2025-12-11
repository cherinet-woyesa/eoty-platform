exports.up = async function(knex) {
  await knex.schema.table('users', function(table) {
    table.string('profile_visibility').defaultTo('public'); // public | friends | private
    table.boolean('links_public_default').defaultTo(true);
    table.boolean('allow_linked_profiles').defaultTo(true);
    table.boolean('share_location').defaultTo(false);
    table.string('preferred_public_location').nullable();
    table.string('time_zone').nullable();
    table.jsonb('social_links').defaultTo('[]');
    table.jsonb('recent_media').defaultTo('[]');
    table.jsonb('linked_accounts').defaultTo('[]');
    table.boolean('location_consent').defaultTo(false);
  });
};

exports.down = async function(knex) {
  await knex.schema.table('users', function(table) {
    table.dropColumn('profile_visibility');
    table.dropColumn('links_public_default');
    table.dropColumn('allow_linked_profiles');
    table.dropColumn('share_location');
    table.dropColumn('preferred_public_location');
    table.dropColumn('time_zone');
    table.dropColumn('social_links');
    table.dropColumn('recent_media');
    table.dropColumn('linked_accounts');
    table.dropColumn('location_consent');
  });
};

