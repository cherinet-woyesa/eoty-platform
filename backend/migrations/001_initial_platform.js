// Placeholder migration (no-op) to satisfy migration ordering for development
exports.up = function(knex) {
  // Intentionally empty - legacy migration placeholder
  return Promise.resolve();
};

exports.down = function(knex) {
  return Promise.resolve();
};
