
/**
 *
 * Copyright 2015 Landstinget Dalarna Bibliotek och Informationscentral
 * Copyright 2015 Emil Hemdal (@emilhem)
 *
 *
 * This file is part of Aaron.
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

var url     = require('url');
var util    = require('util');

var hmac    = require('./hmac.js');
var AM      = require('./accountManager.js');
var pugGen = require('./pugGenerator.js');
var config  = require('../config.json');

function renderLoginPage(req, res) {
  var html = pugGen['login.pug']({title: 'Aaron | Logga in för att fortsätta', currentPath: url.parse(req.url).pathname});
  res.status(200).set({
    'Content-Type': 'text/html',
    'Content-Length': html.length,
  });
  res.end(html);
}

// TODO better email regex.
var re_email = new RegExp('^[^@\n ]+@+[^@\n ]+\.[^@\n ]+$', 'i');

function login(req, res, next) {
  if(re_email.test(req.body.email)) {
    AM.validateLogin(req.body.email, req.body.password, function(err, userID) {
      if(err) {
        res.status(500);
        res.end('Inloggningen misslyckades!'); // TODO bättre meddelande. Kanske redirect till startsidan?
        return;
      }
      if(userID !== false) {
        var cookieOptions = {
          expires: new Date(Date.now() + config.loginTime * 1000),
          domain: req.headers.host,
          signed: true
        };
        res.cookies.set('aaron-login', hmac.hmac(userID, Math.floor(Date.now()/1000) + config.loginTime), cookieOptions);
        res.redirect(302, '//' + req.headers.host + (req.body.previousPath ? req.body.previousPath : '/'));
        res.end();
      } else {
        res.redirect(302, '//' + req.headers.host + (req.body.previousPath !== '/' ? '/?previousPath='+req.body.previousPath+'&' : '?')+'error=login');
        res.end();
      }
    });
  } else {
    res.redirect(302, '//' + req.headers.host + (req.body.previousPath !== '/'   ? '/?previousPath='+req.body.previousPath+'&' : '?')+'error=email');
    res.end();
  }
}

function checkLoginStatus(req, res, next) {
  if(req.cookies.get('aaron-login')) {
    var user = hmac.validate(req.cookies.get('aaron-login'));
    if(user !== false) {
      req.loggedIn = true;
      /*if(isNaN(user)) { // username is not a number. Therefore legacy.
        req.userLegacy = user;
        AM.legacyToID(user, function(err, user_id) {
          // TODO: error handling
          req.userId = user_id;
          next();
        });
        return;
      } else {*/
        req.userId = 1; // placeholder
      //}
      return next();
    }
  }
  req.loggedIn = false;
  req.userId = null;
  //req.userLegacy = null;
  next();
}

function logout(req, res) {
  res.cookies.set('aaron-login', '', {
    maxAge: 0,
    expires: new Date(0),
    path: '/',
    domain: req.headers.host,
    secure: false,
    httpOnly: true,
    overwrite: true,
    signed: true
  });
  res.status(303).set({
    'Location': '/'
  });
  res.end();
}

module.exports = {
  doLogin:          login,
  doLogout:         logout,
  checkLoginStatus: checkLoginStatus,
  render:           renderLoginPage
};
