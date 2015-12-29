
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


/**
 *
 * TODO: Make sure that a user can't be created as a number.
 * Test this by passing their username to isNaN(val) and make sure it's true.
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/isNaN
 *
 */


'use strict';

var util    = require('util');

var jadeGen = require('../lib/jadeGenerator.js');

var config  = require('../config.json');

var maxRetries = 5;

var pool = {
  getConnection: function() {
    throw 'pool is not set!';
  }
};

var mysql_selectUser = [
  'SELECT user_id, user_legacyUsername, user_firstName, user_lastName, user_workplace, user_place, user_email, user_pemail, user_phonenumber, user_password, user_admin, user_activated',
  'FROM users',
  'WHERE ?? = ?;'
].join('\n');

var mysql_legacyToUserId = [
  'SELECT user_id',
  'FROM users',
  'WHERE user_legacyUsername = ?;'
].join('\n');

function setPool(newPool) {
  pool = newPool;
}

function mysqlError(err, callback) {
  console.error(err);
  if(callback) {
    callback('mysql-error', null);
  }
}

function legacyToID(user, callback, retries) {
  if(typeof user !== 'string' && typeof user !== 'number') {
    return callback('invalid-user-param');
  }
  pool.getConnection(function(err, connection) {
    if(err) {
      connection.release();
      if(retries && retries > maxRetries) {
        return mysqlError(err, callback);
      }
      return setTimeout(legacyToID, 100, user, callback, retries ? retries + 1 : 1);
    }
    connection.query(mysql_legacyToUserId, [user], function(err, rows) {
      connection.release();
      if(err) { // for connection releasing reasons, don't copy this one.
        if(retries && retries > maxRetries) {
          return mysqlError(err, callback);
        }
        return setTimeout(legacyToID, 100, user, callback, retries ? retries + 1 : 1);
      }
      callback(null, rows[0].user_id);
    });
  });
}

function getUser(user, callback, retries) {
  if(typeof user !== 'string' && typeof user !== 'number') {
    return callback('invalid-user-param');
  }
  pool.getConnection(function(err, connection) {
    if(err) {
      connection.release();
      if(retries && retries > maxRetries) {
        return mysqlError(err, callback);
      }
      return setTimeout(getUser, 100, user, callback, retries ? retries + 1 : 1);
    }
    connection.query(mysql_selectUser, [typeof user === 'string' ? 'user_legacyUsername' : 'user_id', user], function(err, data) {
      connection.release();
      if(err) { // for connection releasing reasons, don't copy this one.
        if(retries && retries > maxRetries) {
          return mysqlError(err, callback);
        }
        return setTimeout(getUser, 100, user, callback, retries ? retries + 1 : 1);
      }
      callback(null, data);
    });
  });
}

var mysql_getPermissions = [
  'SELECT permission_id',
  'FROM users u',
  'LEFT JOIN users_has_groups ug ON u.user_id = ug.users_user_id',
  'LEFT JOIN groups g ON g.group_id = ug.groups_group_id',
  'LEFT JOIN groups_has_permissions gp ON g.group_id = gp.groups_group_id',
  'LEFT JOIN permissions p ON p.permission_id = gp.permissions_permission_id',
  'LEFT JOIN permissions_has_applications pa ON p.permission_id = pa.permissions_permission_id',
  'LEFT JOIN applications a ON a.application_shortname = pa.applications_application_shortname',
  'WHERE user_email = ?',
  'AND a.application_shortname = ?;'
].join('\n');

function getPermissions (req, res, next) {
  var retries = -1;
  function run() {
    retries++;
    if(req.loggedIn) {
      pool.getConnection(function(err, connection) {
        if(err) {
          connection.release();
          if(retries && retries > maxRetries) {
            mysqlError(err);
            res.status(500).end(jadeGen['500.jade']({debugInfo: config.debug ? util.inspect(err, { showHidden: true, depth: 5 }) : null}));
            return;
          }
          return setTimeout(run, 100);
        }
        connection.query(
          mysql_getPermissions,
          [req.authUser, 'aaron'],
          function(err, rows) {
            var i;
            connection.release();
            if(err) {
              if(retries && retries > maxRetries) {
                mysqlError(err);
                res.status(500).end(jadeGen['500.jade']({debugInfo: config.debug ? util.inspect(err, { showHidden: true, depth: 5 }) : null}));
                return;
              }
              return setTimeout(run, 100);
            }
            for (i = rows.length - 1; i >= 0; i--) {
              rows[i] = rows[i].permission_id;
            }
            console.log('check perms');
            console.log(rows);
            req.permissions = rows;
            next();
          }
        );
      });
    }
  }
  run();
}


/*
exports.getAccountByUser = function(user, callback) {
  accounts.findOne({_id:user}, function(e, o) { callback(e, o); });
};

/* record insertion, update & deletion methods */
/*
exports.addNewAccount = function(prefix, newData, locked, callback) {
  accounts.findOne({_id:prefix+'-'+newData.user}, function(e, o) {
    if(o) {
      return callback('username-taken');
    }
    accounts.findOne({$or: [{email: newData.email}, {privateEmail: newData.email}]}, function(e, o) {
      if(o) {
         return callback('email-taken');
      }
      newData.locked = locked;
      newData._id = prefix+'-'+newData.user;
      newData.pul = true; // nya användare har sett och har därför godkännt PuL-avtalet.
      if(newData.privateEmail !== '') {
        accounts.findOne({$or: [{email: newData.privateEmail}, {privateEmail: newData.privateEmail}]}, function(e, o) {
          if(o) {
             return callback('public-email-taken');
          }
          salthash(newData, callback);
        });
      } else {
        salthash(newData, callback);
      }
    });
  });
};

function salthash(newData, callback) {
  var hash = saltAndHash(newData.pass);
  newData.pass = hash;
  newData.date = moment().utc().format();
  newData.admin = false;
  accounts.insert(newData, {safe: true}, callback);
}

exports.updateAccount = function(id, newData, callback) {
  accounts.findOne({_id: id}, function(e, o) {
    if(e) {
      return callback(e);
    }
    if(!o) {
      return callback('No user found!');
    }
    o.name      = newData.name;
    o.fname     = newData.fname;
    o.lname     = newData.lname;
    o.email     = newData.email;
    o.privateEmail  = newData.pemail;
    o.workplace   = newData.workplace;
    o.organization  = newData.organization;
    if(!newData.pass) {
      accounts.save(o, {safe: true}, function(err) {
        if(err) { callback(err); }
        else { callback(null, o); }
      });
    } else {
      var hash = saltAndHash(newData.pass);
      o.pass = hash;
      accounts.save(o, {safe: true}, function(err) {
        if(err) { callback(err); }
        else { callback(null, o); }
      });
    }
  });
};
exports.approve_pul = function(o, callback) {
  accounts.findOne({_id: o._id}, function(e, o) {
    o.pul = true;
    accounts.save(o, {safe: true}, callback);
  });
};

exports.updatePassword = function(user, newPass, callback) {
  console.log('USER: '+user);
  accounts.findOne({_id:user}, function(e, o) {
    if(e) {
      callback(e, null);
    } else {
      var hash = saltAndHash(newPass);
      o.pass = hash;
      accounts.save(o, {safe: true}, callback);
    }
  });
};

exports.lock = function(id, lock, callback) {
  accounts.findOne({_id: id}, function(e, o) {
    if(o !== null) {
      if(o.locked === lock) {
        if(lock) {
          callback('user-already-locked');
        } else {
          callback('user-already-unlocked');
        }
      } else {
        o.locked = lock;
        accounts.save(o, {safe: true}, function(err) {
          if(err) { callback(err); }
          else { callback(null, o); }
        });
      }
    } else {
      callback('no-user-found');
    }
  });
};

exports.admin = function(id, admin, callback) {
  accounts.findOne({_id: id}, function(e, o) {
    if(o !== null) {
      if(o.admin === admin) {
        if(admin) {
          callback('user-already-promoted');
        } else {
          callback('user-already-demoted');
        }
      } else {
        o.admin = admin;
        accounts.save(o, {safe: true}, function(err) {
          if(err) { callback(err); }
          else { callback(null, o); }
        });
      }
    } else {
      callback('no-user-found');
    }
  });
};


/* account lookup methods */
/*
exports.deleteAccount = function(id, callback) {
  accounts.remove({_id: id}, callback);
};

exports.getAccountByEmail = function(email, organization, callback) {
  accounts.findOne({_id: new RegExp(organization+'-'), email:email}, function(e, o) {
    if(e) {
      return callback(e, null);
    }
    if(!o) {
      accounts.findOne({privateEmail:email}, callback);
    } else {
      return callback(null, o);
    }
  });
};

exports.validateResetLink = function(email, passHash, callback) {
  accounts.find({ $and: [{email:email, pass:passHash}] }, function(e, o) {
    callback(o ? 'ok' : null);
  });
};

exports.getUserInfo = function(id, callback) {
  accounts.findOne({_id: id}, {_id: 0, pass: 0, date: 0}, function(e, obj) {
    if(e) { callback(e); }
    else { callback(null, obj); }
  });
};

exports.getOrganizationRecords = function(settings, callback) {
  accounts.find({_id: {$regex: '^'+settings._id+'-', $options: 'i'}}).sort({date: 1}).toArray(function(e, res) {
    if(e) { callback(e); }
    else {
      for(var i=0, ii=res.length;i<ii;i++) {
        //console.log(res[i]._id);
        if(res[i]._id.indexOf('@') !== -1) {
          res[i]._id = res[i]._id.replace(/@/ig, 'AT');
        }
        if(res[i]._id.indexOf('.') !== -1) {
          res[i]._id = res[i]._id.replace(/\./ig, 'DOT');
        }
        if(res[i]._id.indexOf(' ') !== -1) {
          res[i]._id = res[i]._id.replace(/\ /ig, 'SPACE');
        }
      }
      callback(null, res);
    }
  });
};

exports.getAllRecords = function(callback) {
  accounts.find().sort({date: 1}).toArray(function(e, res) {
    if(e) { callback(e); }
    else { callback(null, res); }
  });
};

exports.exportUsersFromOrg = function(org, callback) {
  accounts.find({'_id': new RegExp('^'+org+'-')}).sort({'_id': 1}).toArray(function(e, res) {
    if(e) { callback(e); }
    else { callback(null, res); }
  });
};*/

/* auxiliary methods */
/*
var getObjectId = function(id) {
  return accounts.db.bson_serializer.ObjectID.createFromHexString(id);
};

var findById = function(id, callback) {
  accounts.findOne({_id: getObjectId(id)},
    function(e, res) {
    if(e) { callback(e); }
    else { callback(null, res); }
  });
};


var findByMultipleFields = function(a, callback) {
// this takes an array of name/val pairs to search against {fieldName : 'value'} //
  accounts.find( { $or : a } ).toArray(
    function(e, results) {
    if(e) { callback(e); }
    else { callback(null, results); }
  });
};*/

module.exports = {
  getUser:        getUser,
  setPool:        setPool,
  getPermissions: getPermissions,
  legacyToID:     legacyToID
};
