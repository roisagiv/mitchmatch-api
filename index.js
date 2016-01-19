var express = require('express');
var pg = require('pg');
var knexfile = require('./knexfile');
var knex = require('knex')(knexfile);

var app = express();

app.set('port', (process.env.PORT || 5000));

app.get('/', function(request, response) {
  console.log('GET /');
  response.send('hello world\n');
});

app.get('/db', function (request, response) {
  // knex_migrations
  knex.withSchema('pg_catalog').select('*').from('pg_tables').then(function (rows){
    console.log(rows);
    response.send('knex!\n');
  });
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
