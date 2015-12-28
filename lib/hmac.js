
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

var crypto    = require('crypto');

var config    = require('../config.json');

var serverPrivateKey = config.hmacSecrets.serverPrivateKey;
var serverFakeKey    = config.hmacSecrets.serverFakeKey;

/**
 *
 * This function takes data and an expiry date and oneway hashes it.
 *
 * The function returns the hash to be returned to the client in a cookie.
 *
 */
function hmac(data, expiry) {
  var dynamic_key = crypto.createHmac('sha512', serverPrivateKey).update(data+'|'+expiry).digest('hex');
  var data_enc = crypto.createHmac('sha512', dynamic_key).update(serverFakeKey).digest('hex');
  var encrypted = crypto.createHmac('sha512', dynamic_key).update(data+'|'+expiry+'|'+serverFakeKey).digest('hex');
  var finalOutput = data+'|'+expiry+'|'+data_enc+encrypted;
  return finalOutput;
}

/**
 *
 * This function returns the data if the hmac is still valid, otherwise it returns false.
 *
 */
function validateHmac(hmac) {
  if(!hmac) {
    return false;
  }
  var parts = hmac.split('|');
  var dynamic_key = crypto.createHmac('sha512', serverPrivateKey).update(parts[0]+'|'+parts[1]).digest('hex');
  var data_enc = crypto.createHmac('sha512', dynamic_key).update(serverFakeKey).digest('hex');
  var encrypted = crypto.createHmac('sha512', dynamic_key).update(parts[0]+'|'+parts[1]+'|'+serverFakeKey).digest('hex');
  var finalOutput = parts[0]+'|'+parts[1]+'|'+data_enc+encrypted;
  if(hmac === finalOutput) {
    if(parts[1] > Math.floor(Date.now()/1000)) {
      return parts[0];
    }
  }
  return false;
}


module.exports = {
  hmac:     hmac,
  validate: validateHmac
};
