/**
 *
 * Aaron
 *
 * Copyright 2015-2016 Landstinget Dalarna Bibliotek och Informationscentral
 * Copyright 2015-2016 Emil Hemdal (@emilhem)
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

var debug       = require('debug')('aaron:server');

var app = express();

var pugGen        = require('./lib/pugGenerator.js');
var browserifyGen = require('./lib/browserifyGenerator.js');
var AM            = require('./lib/accountManager.js');
var login         = require('./lib/login.js');

var AM            = require('./lib/accountManager.js');
var password      = require('./lib/passwords.js');

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
  debug('MySQL: Database connected!');
  connection.release();
});

AM.setPool(pool);


password.setSalt(config.salts.serverSalt);

if(config.production) {
  debug('We\'re in production!');
  browserifyGen.build();
} else {
  debug('We\'re in development!');
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
app.get('/logout', urlencodedParser, login.doLogout);

app.get('/', function (req, res) {
  if(!req.loggedIn) {
    return login.render(req, res);
  }

  var html = pugGen['main.pug']();
  res.status(200);
  res.set({
    'Content-Type': 'text/html',
    'Content-Length': html.length,
  });
  res.end(html);
});
app.get('/help', function(req, res) {
  var html = pugGen['help.pug']();
  res.status(200).set({
    'Content-Type': 'text/html',
    'Content-Length': html.length,
  });
  res.end(html);
});
app.get('/admin', function(req, res) {
  var html = pugGen['admin.pug']({app: 'adminPanel'});
  res.status(200).set({
    'Content-Type': 'text/html',
    'Content-Length': html.length,
  });
  res.end(html);
});

routeUser(app);

app.get('*', function (req, res) {
  debug('Reached 404.', req.url);
  res.status(404);
  res.end('404');
});


app.listen(34535, function () {
  console.log('Server is now running!');
});
