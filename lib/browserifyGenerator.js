
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
