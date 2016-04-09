/* jshint node: false, browser: true, browserify: true, jquery: false */

/**
 *
 * Copyright 2015-2016 Landstinget Dalarna Bibliotek och Informationscentral
 * Copyright 2015-2016 Emil Hemdal (@emilhem)
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

var angular = require('angular');

var app = angular.module('adminPanel', []);

var organizations = [
  {
    shortName: 'ld',
    longName: 'Landstinget Dalarna'
  },
  {
    shortName: 'liv',
    longName: 'Landstinget i Värmland'
  }
];

var workplaces = [
  {
    id: 1,
    name: 'Lasarettsbiblioteket Falun'
  }
]

app.controller('PermissionsController', function () {
  this.organizationAccess = organizations; // TODO: Fetch permissions for this one
  this.workplaceAccess = workplaces; // TODO: Fetch permissions for this one
});

app.controller('OrgController', function () {
  this.organizations = organizations;
});

app.controller('UserController', ['$http', function ($http) {
  var that = this;
  this.users = [];
  $http.get('data.json').success(function(data) {
    that.users = data;
  });
}]);

app.controller('PanelController', function () {
  this.tab = 'users';

  this.selectTab = function (setTab) {
    this.tab = setTab;
  };
  this.isSelected = function (checkTab) {
    return this.tab === checkTab;
  };
});
