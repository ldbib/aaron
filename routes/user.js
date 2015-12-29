
'use strict';

var AM = require('../lib/accountManager.js');

var config = require('../config.json');

export.modules = function(app) {
  app.get('/users', function(req, res, next) {
    if(!req.loggedIn) {
      return res.status(403).json({authenticate: 'first'}).end();
    }
    AM.getUsers
  });
  app.get('/user/:id', AM.getUser)
};
