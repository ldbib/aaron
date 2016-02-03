/**
 *
 * Aaron
 *
 * Copyright 2015 Landstinget Dalarna Bibliotek och Informationscentral
 * Copyright 2015 Emil Hemdal (@emilhem)
 *
 * Aaron is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Aaron is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Aaron.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

'use strict';

var express     = require('express');
var serveStatic = require('serve-static');
var bodyParser  = require('body-parser');
var Cookies     = require('cookies');
var path        = require('path');
var mysql       = require('mysql');

var app = express();

var jadeGen       = require('./lib/jadeGenerator.js');
var browserifyGen = require('./lib/browserifyGenerator.js');
var AM            = require('./lib/accountManager.js');
var login         = require('./lib/login.js');

var AM            = require('./lib/accountManager.js');

var routeUser     = require('./routes/user.js');

var config        = require('./config.json');

var pool = mysql.createPool({
  connectionLimit:  25,
  host:             config.mysql.host,
  user:             config.mysql.user,
  password:         config.mysql.password,
  database:         config.mysql.database
});

/**
 * Test the connection. Kill the server if it fails.
 */
pool.getConnection(function(err, connection) {
  if(err) {
    throw err;
  }
  connection.release();
});

AM.setPool(pool);

if(config.production) {
  browserifyGen.build();
} else {
  browserifyGen.watch();
}

app.set('trust proxy', true);

app.use(serveStatic(path.join(__dirname, 'public/'), { 'index': false, dotfiles: 'ignore' }));

app.use(Cookies.express( config.cookieSecrets )); // TODO change the keys!

var urlencodedParser = bodyParser.urlencoded({ extended: false });

app.use(login.checkLoginStatus);

app.use(AM.getPermissions);

app.use('/admin', AM.getAdminStatus);

app.post('/login', urlencodedParser, login.doLogin);

app.get('/', function (req, res) {
  if(!req.loggedIn) {
    return login.render(req, res);
  }

  var html = jadeGen['main.jade']();
  res.status(200);
  res.set({
    'Content-Type': 'text/html',
    'Content-Length': html.length,
  });
  res.end(html);
});
app.get('/help', function(req, res) {
  var html = jadeGen['help.jade']();
  res.status(200).set({
    'Content-Type': 'text/html',
    'Content-Length': html.length,
  });
  res.end(html);
});
app.get('/admin', function(req, res) {
  var html = jadeGen['admin.jade']({app: 'adminPanel'});
  res.status(200).set({
    'Content-Type': 'text/html',
    'Content-Length': html.length,
  });
  res.end(html);
});

routeUser(app);

app.get('*', function (req, res) {
  res.status(404);
  res.end('404');
});


app.listen(34535, function () {
  console.log('Server is now running!');
});
