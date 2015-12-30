
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
var jadeGen = require('./jadeGenerator.js');
var config  = require('../config.json');

function renderLoginPage(req, res) {
  var html = jadeGen['login.jade']({title: 'Aaron | Logga in för att fortsätta', currentPath: url.parse(req.url).pathname});
  res.status(200).set({
    'Content-Type': 'text/html',
    'Content-Length': html.length,
  });
  res.end(html);
}

function login(req, res, next) {
  if(true) {
    var cookieOptions = {
      expires: new Date(Date.now() + config.loginTime * 1000),
      domain: req.headers.host,
      signed: true
    };
    res.cookies.set('aaron-login', hmac.hmac(req.body.email, Math.floor(Date.now()/1000) + config.loginTime), cookieOptions);
  } else {
    // no cookie for you!
  }
  res.redirect(302, '//' + req.headers.host + (req.body.previousPath ? req.body.previousPath : '/'));
  res.end();
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
  res.cookie.set('aaron-login', '', {
    maxAge: 0,
    expires: new Date(0).toUTCString(),
    path: '/',
    domain: req.headers.host,
    secure: false,
    httpOnly: true,
    overwrite: true,
    signed: true
  });
}

module.exports = {
  doLogin:          login,
  doLogout:         logout,
  checkLoginStatus: checkLoginStatus,
  render:           renderLoginPage
};
