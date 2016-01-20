exports.up = function(knex, Promise) {
  return knex.schema.hasTable('games').then(function (exists) {
    if (!exists) {
      return knex.schema.createTable('games',function (table) {
        table.increments('id').primary(); 
        table.string('player_1');
        table.string('player_2');
        table.string('player_1_score');
        table.string('player_2_score');
        table.boolean('player_1_confirm').default(false);
        table.boolean('player_2_confirm').default(false);
        table.timestamps();
      }).then(function () {
        console.log('"Games" table created');
      });
    }
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('games')
  .then(function () {
    console.log('"Users" table dropped');
  });
};
