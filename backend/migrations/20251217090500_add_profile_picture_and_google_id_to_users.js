exports.up = async function(knex) {
  const hasProfilePicture = await knex.schema.hasColumn('users', 'profile_picture');
  const hasGoogleId = await knex.schema.hasColumn('users', 'google_id');

  if (!hasProfilePicture || !hasGoogleId) {
    await knex.schema.alterTable('users', table => {
      if (!hasGoogleId) {
        table.string('google_id').unique();
      }
      if (!hasProfilePicture) {
        table.string('profile_picture');
      }
    });
  }
};

exports.down = async function(knex) {
  const hasProfilePicture = await knex.schema.hasColumn('users', 'profile_picture');
  const hasGoogleId = await knex.schema.hasColumn('users', 'google_id');

  if (hasProfilePicture || hasGoogleId) {
    await knex.schema.alterTable('users', table => {
      if (hasGoogleId) {
        table.dropColumn('google_id');
      }
      if (hasProfilePicture) {
        table.dropColumn('profile_picture');
      }
    });
  }
};
