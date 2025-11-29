exports.up = function(knex) {
  return knex('user_permissions')
    .where('permission_key', 'content:delete')
    .select('id')
    .first()
    .then((permission) => {
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
    .where('permission_key', 'content:delete')
    .select('id')
    .first()
    .then((permission) => {
      if (permission) {
        return knex('role_permissions')
          .where({
            role: 'admin',
            permission_id: permission.id
          })
          .del();
      }
    });
};