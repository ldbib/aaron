
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

var fs      = require('fs');
var path    = require('path');
var watch   = require('watch');
var pug     = require('pug');

var dir = path.join(__dirname, '../views/');

var pugGenerated = {};

function generatePug() {
  fs.readdir(dir, function(err, files) {
    if(err) { throw err; }
    function parseFile() {
      var file = files.pop();
      fs.stat(dir+file, function(err, stats) {
        if(!err) {
          if(stats.isFile()) {
            pugGenerated[file] = pug.compileFile(dir+file, {pretty: true});
          }
        } else {
          console.error('Failed generating pug function!');
          console.error(err);
          console.trace();
        }
        if(files.length > 0) {
          parseFile();
        }
      });
    }
    if(files.length > 0) {
      parseFile();
    }
  });
}

generatePug();

watch.watchTree(dir, function (f, curr, prev) {
  if(typeof f === 'object' && prev === null && curr === null) {
    // Finished walking the tree
  } else if(prev === null) {
    // f is a new file
  } else if(curr.nlink === 0) {
    // f was removed
  } else {
    // f was changed
    generatePug();
  }
});


module.exports = pugGenerated;
