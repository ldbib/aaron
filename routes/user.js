
'use strict';

var AM = require('../lib/accountManager.js');

var debug = require('debug')('aaron:users');

module.exports = function(app) {
  app.get('/admin/users', function(req, res) {
    var selectLimiter = {
      organizations: req.organizationAdmin,
      workplaces: req.workplaceAdmin
    };
    if(!req.loggedIn) {
      return res.status(403).json({authenticate: 'first'}).end();
    }

    if(req.organizationAdmin.length === 0 && req.workplaceAdmin.length === 0) {
      debug('/admin/users/ user lacks permissions to do that!');
      return res.status(200).json([]).end();
    }

    AM.getUsers(selectLimiter, function(err, users) {
      if(err) {
        return res.status(500).json({error: err}).end();
      }
      res.status(200).json(users).end();
    });
  });
  //app.get('/user/:id', AM.getUser)
};
