
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

var browserify = require('browserify');
var watchify   = require('watchify');
var path       = require('path');
var fs         = require('fs');
var exorcist   = require('exorcist');

var mapfile    = path.join(__dirname, '../public/js/admin.js.map');

var b = browserify({
  entries: path.join(__dirname, '../public/js/admin-require.js'),
  debug: true,
  cache: {},
  packageCache: {},
  plugin: []
});

var w;

function watch() {
  w = watchify(b)
  .on('update', function() {
    build();
  });
  build();
}

function build() {
  if(typeof w === 'undefined') {
    w = b;
  }
  console.log('Building admin.js');
  w.bundle()
    .pipe(exorcist(mapfile))
    .pipe(fs.createWriteStream(path.join(__dirname, '../public/js/admin.js'), 'utf8'));
}

module.exports = {
  build: build,
  watch: watch
};
