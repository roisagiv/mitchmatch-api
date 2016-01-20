var express = require('express');
var bodyParser = require('body-parser');

var knexfile = require('./knexfile');
var env = process.env.NODE_ENV ? process.env.NODE_ENV : 'development';
knexfile["debug"] = true;

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

// *********
// Users API
// *********
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

// **************
// quickmatch API
// **************

var handleQuickMatchForUser = function (quickmatch, request, response, next) {
  return knex('users').where('username', request.params.username).update({
    'quickmatch': quickmatch,
    'updated_at': new Date()
  }).then(function (id) {
    console.log(id);
    response.status(id == 0 ? 500 : 200).end();
  }).catch(function (error) {
    console.log(error);
    response.status(500).send(error);
  });
};

var findActiveGameForUsername = function (username) {
  return knex.select('games.*', 
                     'users1.image_url as player_1_image_url', 
                     'users1.full_name as player_1_full_name', 
                     'users2.image_url as player_2_image_url',
                     'users2.full_name as player_2_full_name'
                    )
                    .from('games').where(function () {
                      this.where({
                        'player_1': username,
                        'player_1_confirm': false
                      });
                    }).orWhere(function () {
                      this.where({
                        'player_2': username,
                        'player_2_confirm': false
                      });
                    })
                    .innerJoin('users as users1', 'games.player_1', 'users1.username') 
                    .innerJoin('users as users2', 'games.player_2', 'users2.username') 
                    .limit(1)
                    ;
};

var findTwoUsersForMatch = function () {
  return knex('users')
  .where('quickmatch', true)
  .whereNotExists(
    knex.select('*').from('games').whereRaw('users.username = games.player_1 or users.username = games.player_2')
  );
};

var createGameForUsers = function (username1, username2) {
  return knex('games').insert({
    'player_1': username1,
    'player_2': username2,
    'created_at': new Date(),
    'updated_at': new Date()
  }); 
};

app.post('/api/v1/users/:username/quickmatch', function (request, response, next) {
  console.log('*** POST /api/v1/users/:username/quickmatch ***');
  console.log(request.params);

  return handleQuickMatchForUser(true, request, response, next).then(function () {
    findTwoUsersForMatch().then(function (results) {
      if (results.length == 2) {
        return createGameForUsers(results[0].username, results[1].username);
      }
    }); 
  });
});

app.delete('/api/v1/users/:username/quickmatch', function (request, response, next) {
  console.log('*** DELETE /api/v1/users/:username/quickmatch ***');
  console.log(request.params);

  return handleQuickMatchForUser(false, request, response, next).then(function () {
    findTwoUsersForMatch().then(function (results) {
      if (results.length == 2) {
        return createGameForUsers(results[0].username, results[1].username);
      }
    });
  });
});

app.get('/api/v1/users/:username/quickmatch', function (request, response, next) {
  console.log('*** GET /api/v1/users/:username/quickmatch ***');
  console.log(request.params);

  var username = request.params.username;
  knex('users')
  .where('username', username)
  .select('quickmatch')
  .then(function (results) {
    console.log(results); 
    if (results.length == 0) {
      response.status(500).end();
      return;
    }

    var quickmatch = results[0].quickmatch;
    if (quickmatch) {
      return findActiveGameForUsername(username).then(function (results) {
        if (results.length == 0) {
          response.status(204).end();
        } else {
          response.status(200).json(results[0]);
        }
      });
    } else {
      response.status(404).end();
    }
  })
  .catch(function (error) {
    console.log(error);
    response.status(500).end();
  });
});

// *********
// Games API
// *********
app.delete('/api/v1/users/:username/games/:game_id', function (request, response, next) {
  console.log('*** DELETE /api/v1/users/:username/games/:game_id ***');
  console.log(request.params);

  var username = request.params.username;

  knex('games')
  .where({
    'id': request.params.game_id,
    'player_1': username
  })
  .update({
    'player_1_confirm': true,
    'updated_at': new Date()
  })
  .then(function () {
    return knex('games')
    .where({
      'id': request.params.game_id,
      'player_2': username
    })
    .update({
      'player_2_confirm': true,
      'updated_at': new Date()
    })
  })
  .then(function () {
    response.status(200).end();
  })
  .then(function () {
    return knex('games').where({
      'player_1_confirm': true,
      'player_2_confirm': true
    })
    .del();
  })
  .then(function () {
    return knex('users').where('username', username).update({
      'quickmatch': false,
      'updated_at': new Date()
    }) 
  })
  .catch(function (error) {
    console.log(error);
    response.status(500).end();
  });
});

// start the app
app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
