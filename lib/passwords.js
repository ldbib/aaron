
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

var crypto = require('crypto');

var serverSalt = '';

function passMeTheSalt() {
  if(serverSalt === '') {
    throw 'Password salt hasn\'t been set!';
  } else {
    return serverSalt;
  }
}

function setSalt(salt) {
  serverSalt = salt;
}

/**
 *
 * This function returns a random salt. If no length is specified a salt with 32 characters will be returned.
 *
 */
function generateSalt(saltLength) {
  var set = '0123456789abcdefghijklmnopqurstuvwxyzABCDEFGHIJKLMNOPQURSTUVWXYZ!@#$%&/{([)]=}?+*\'.,-_:;';
  var salt = '';
  if(typeof saltLength !== 'number') {
    saltLength = 32;
  } else {
    saltLength = parseInt(saltLength, 10);
  }
  for (var i = 0; i < saltLength; i++) {
    var p = Math.floor(Math.random() * set.length);
    salt += set[p];
  }
  return salt;
}

/**
 *
 * Pretty self explanitory. MD5 once on a string.
 *
 */
function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}
/**
 *
 * Pretty self explanitory. SHA512 once on a string.
 *
 */
function sha512(str) {
  return crypto.createHash('sha512').update(str).digest('hex');
}

/**
 *
 * Salts and hashes a password
 *
 */
function saltAndHash(pass) {
  var newSalt = generateSalt();
  var passedSalt = passMeTheSalt();
  var calculatedHash = sha512(pass + newSalt + passedSalt);
  for(var i = 0; i < 16384; i++) {
    calculatedHash = sha512(calculatedHash + newSalt + passedSalt);
  }
  return newSalt + calculatedHash;
}

/**
 *
 * Validate the password entered with a hashed password.
 *
 * The function checks whether the hashed password is hashed with MD5 or SHA512 (16385 times).
 *
 * Returns a boolean if the password inserted is correct.
 *
 */
function validatePassword(plainPass, hashedPass) {
  var storedSalt, calculatedHash;
  var passedSalt = passMeTheSalt();
  if(hashedPass.length === 42) {
    storedSalt = hashedPass.substr(0, 10);
    return hashedPass === storedSalt + md5(plainPass + storedSalt);
  } else {
    storedSalt = hashedPass.substr(0, 32);
    calculatedHash = sha512(plainPass + storedSalt + passedSalt);
    for(var i = 0; i < 16384; i++) {
      calculatedHash = sha512(calculatedHash + storedSalt + passedSalt);
    }
    return hashedPass === storedSalt + calculatedHash;
  }
}

module.exports = {
  setSalt:      setSalt,
  sha512:       sha512,
  md5:          md5,
  saltAndHash:  saltAndHash,
  validate:     validatePassword
};
