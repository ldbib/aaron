
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
