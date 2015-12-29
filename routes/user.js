
'use strict';

var AM = require('../lib/accountManager.js');

var config = require('../config.json');

module.exports = function(app) {
  app.get('/users', function(req, res, next) {
    if(!req.loggedIn) {
      return res.status(403).json({authenticate: 'first'}).end();
    }
    console.log(req.permissions);
    //if(req.permissions)
  });
  //app.get('/user/:id', AM.getUser)
};
