exports.up = function(knex, Promise) {
  return knex.schema.hasTable('users').then(function (exists) {
    if (!exists) {
      return knex.schema.createTable('users',function (table) {
        table.string('username').primary();
        table.string('image_url');
        table.string('full_name');
        table.boolean('quickmatch').default(false);
        table.timestamps();
      }).then(function () {
        console.log('"Users" table created');
      });
    }
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('users')
  .then(function () {
    console.log('"Users" table dropped');
  });
};
