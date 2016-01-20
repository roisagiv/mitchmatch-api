var express = require('express');
var bodyParser = require('body-parser');
var knexfile = require('./knexfile');
var knex = require('knex')(knexfile);

var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set('port', (process.env.PORT || 5000));

app.get('/', function(request, response) {
  console.log('GET /');
  response.send('hello world\n');
});

app.get('/status', function (request, response) {
  // knex_migrations
  knex.withSchema('pg_catalog').select('*').from('pg_tables').then(function (rows){
    console.log(rows);
    response.status(200).end();
  });
});

// Users API
app.post('/api/v1/users', function (request, response, next) {
  console.log('*** POST /api/v1/users ***');
  console.log(request.body);

  var username = request.body.username;
  knex('users')
  .where('username', username)
  .count('username')
  .then( function (results) {
    var usernameExists = results[0].count !== '0'; 
    if (usernameExists) {
      console.log('Username "' + username + '" exists');

      return knex('users').where('username', username).update({
        'image_url': request.body.image_url,
        'full_name': request.body.full_name,
        'updated_at': new Date()
      });
    } else {
      console.log('Username "' + username + '" not exists');
      return knex('users').insert({
        'username': request.body.username,
        'image_url': request.body.image_url,
        'full_name': request.body.full_name,
        'created_at': new Date(),
        'updated_at': new Date()
      }); 
    } 
  }).then(function () {
    response.status(200).end();
  }).catch(function (error) {
    console.log(error);
    response.status(500).send(error);
  });
});

// quickmatch API
var handleQuickMatchForUser = function (quickmatch, request, response, next) {
  knex('users').where('username', request.params.username).update({
    'quickmatch': quickmatch,
    'updated_at': new Date()
  }).then(function (id) {
    console.log(id);
    response.status(id == 0 ? 500 : 200).end();
  }).catch(function (error) {
    console.log(error);
    response.status(500).send(error);
  });
}
app.post('/api/v1/users/:username/quickmatch', function (request, response, next) {
  console.log('*** POST /api/v1/users/:username/quickmatch ***');
  console.log(request.params);
  handleQuickMatchForUser(true, request, response, next);
});

app.delete('/api/v1/users/:username/quickmatch', function (request, response, next) {
  console.log('*** DELETE /api/v1/users/:username/quickmatch ***');
  console.log(request.params);
  handleQuickMatchForUser(false, request, response, next);
});

// start the app
app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
