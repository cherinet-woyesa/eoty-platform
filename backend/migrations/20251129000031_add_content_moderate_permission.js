exports.up = function(knex) {
  return knex('user_permissions').insert({
    permission_key: 'content:moderate',
    name: 'Moderate Content',
    description: 'Moderate user-generated content and forum posts',
    category: 'content'
  })
  .then(() => {
    // Fetch the id
    return knex('user_permissions').where('permission_key', 'content:moderate').select('id').first();
  }).then((permission) => {
    if (permission) {
      return knex('role_permissions').insert({
        role: 'admin',
        permission_id: permission.id
      });
    }
  });
};

exports.down = function(knex) {
  return knex('user_permissions')
    .where('permission_key', 'content:moderate')
    .select('id')
    .first()
    .then((permission) => {
      if (permission) {
        return knex('role_permissions')
          .where({
            role: 'admin',
            permission_id: permission.id
          })
          .del()
          .then(() => {
            return knex('user_permissions').where('id', permission.id).del();
          });
      }
    });
};