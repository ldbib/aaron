
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

var _ = require('lodash');

var debug = require('debug')('aaron:AccountManager');

var password = require('./passwords.js');

var pool = {
  getConnection: function() {
    throw 'pool is not set!';
  }
};

function setPool(newPool) {
  pool = newPool;
}

function mysqlError(err, callback) {
  console.trace();
  console.error(err);
  if(callback) {
    callback('mysql-error', null);
  }
}

var mysql_legacyToUserId = [
  'SELECT user_id',
  'FROM users',
  'WHERE user_legacyUsername = ?;'
].join('\n');

function legacyToID(user, callback) {
  if(typeof user !== 'string' && typeof user !== 'number') {
    return callback('invalid-user-param');
  }
  pool.getConnection(function(err, connection) {
    if(err) {
      connection.release();
      return mysqlError(err, callback);
    }
    connection.query(mysql_legacyToUserId, [user], function(err, rows) {
      connection.release();
      if(err) {
        return mysqlError(err, callback);
      }
      callback(null, rows[0].user_id);
    });
  });
}

var mysql_checkLogin = [
  'SELECT user_id, user_password',
  'FROM users',
  'WHERE (user_email = ? OR user_pemail = ?)',
  'LIMIT 1;'
].join('\n');

function validateLogin(email, pass, callback) {
  pool.getConnection(function(err, connection) {
    if(err) {
      connection.release();
      return mysqlError(err, callback);
    }
    connection.query(mysql_checkLogin, [email, email], function(err, rows) {
      var row;
      if(err) {
        connection.release();
        return mysqlError(err, callback);
      }
      if(rows.length === 0) {
        // User doesn't exist, therefore return false and run the validate password on a gibberish value to reduce the likelyhood of timed attacks.
        row = {user_id: false, user_password: 'gibberishgibberishgibberishgibberishgibber'};
      } else {
        row = rows[0];
      }
      if(password.validate(pass, row.user_password)) {
        callback(null, row.user_id);
      } else {
        callback(null, false);
      }
    });
  });
}

var mysql_selectUser = [
  'SELECT user_id, user_legacyUsername, user_firstName, user_lastName, user_workplace, user_place, user_email, user_pemail, user_phonenumber, user_admin, user_activated',
  'FROM users',
  'WHERE user_id = ?;'
].join('\n');

var mysql_getUserWorkplaces = [
  'SELECT workplaces_workplace_id AS workplace_id, workplace_admin AS admin',
  'FROM users_has_workplaces',
  'WHERE users_user_id = ?;'
].join('\n');

var mysql_getUserOrganizations = [
  'SELECT organizations_organization_shortname AS organization',
  'FROM workplaces',
  'WHERE workplace_id IN ('
].join('\n');

function getUser(user, callback) {
  pool.getConnection(function(err, connection) {
    if(err) {
      connection.release();
      return mysqlError(err, callback);
    }
    connection.query(mysql_selectUser, [user], function(err, rows) {
      var user;
      if(err) {
        connection.release();
        return mysqlError(err, callback);
      }
      if(rows.length !== 0) {
        user = rows[0];
        connection.query(mysql_getUserWorkplaces, [user], function(err, rows) {
          var i, ii,
            workplaces = [],
            orgQuery = mysql_getUserOrganizations;
          if(err) {
            connection.release();
            return mysqlError(err, callback);
          }
          if(rows.length === 0) {
            user.workplaces = [];
            user.organizations = [];
            return callback(null, user);
          }
          for (i = 0, ii = rows.length; i < ii; i++) {
            workplaces.push(rows[i].workplace_id);
            orgQuery+= '?' + (i + 1 === ii ? ');' : ',');
          }
          user.workplaces = rows;
          connection.query(orgQuery, workplaces, function(err, rows) {
            connection.release();
            if(err) {
              return mysqlError(err, callback);
            }
            user.organizations = _.pluck(rows, 'organization');
            callback(null, user);
          });
        });
      } else {
        connection.release();
        callback('no-user-found', null);
      }
    });
  });
}

var mysql_selectOrganizationUsers = [
  'SELECT user_id, user_legacyUsername, user_firstName, user_lastName, user_admin, user_activated, COUNT(DISTINCT workplace_id) AS workplaces, COUNT(DISTINCT organizations_organization_shortname) AS organizations',
  'FROM users',
  'LEFT JOIN users_has_workplaces ON user_id = users_user_id',
  'LEFT JOIN workplaces ON workplace_id = workplaces_workplace_id',
  'WHERE organizations_organization_shortname IN (?)',
  'GROUP BY user_id;'
].join('\n');
var mysql_selectWorkplaceUsers = [
  'SELECT user_id, user_legacyUsername, user_firstName, user_lastName, user_admin, user_activated, COUNT(DISTINCT workplace_id) AS workplaces, COUNT(DISTINCT organizations_organization_shortname) AS organizations',
  'FROM users',
  'LEFT JOIN users_has_workplaces ON user_id = users_user_id',
  'LEFT JOIN workplaces ON workplace_id = workplaces_workplace_id',
  'WHERE workplaces_workplace_id IN (?)',
  'GROUP BY user_id;'
].join('\n');

var mysql_selectOrgOrWorkUsers = [
  'SELECT user_id, user_legacyUsername, user_firstName, user_lastName, user_admin, user_activated, COUNT(DISTINCT workplace_id) AS workplaces, COUNT(DISTINCT organizations_organization_shortname) AS organizations',
  'FROM users',
  'LEFT JOIN users_has_workplaces ON user_id = users_user_id',
  'LEFT JOIN workplaces ON workplace_id = workplaces_workplace_id',
  'WHERE organizations_organization_shortname IN (?)',
  'OR workplaces_workplace_id IN (?)',
  'GROUP BY user_id;'
].join('\n');

function getUsers(limit, callback) {
  if(_.isEmpty(limit.organizations) && _.isEmpty(limit.workplaces)) {
    debug('getUsers: what happened? Limits are empty!');
    return callback(null, []);
  }
  pool.getConnection(function(err, connection) {
    var toEscape, func;
    if(err) {
      connection.release();
      return mysqlError(err, callback);
    }
    if(!_.isEmpty(limit.organizations) && !_.isEmpty(limit.workplaces)) {
      debug('getUsers: selectOrgOrWorkUsers');
      func = mysql_selectOrgOrWorkUsers;
      toEscape = [limit.organizations, limit.workplaces];
    } else if(!_.isEmpty(limit.organizations)) {
      debug('getUsers: selectOrganizationUsers');
      func = mysql_selectOrganizationUsers;
      toEscape = [limit.organizations];
    } else {
      debug('getUsers: selectWorkplaceUsers');
      func = mysql_selectWorkplaceUsers;
      toEscape = [limit.workplaces];
    }
    connection.query(func, toEscape, function(err, rows) {
      if(err) {
        connection.release();
        return mysqlError(err, callback);
      }
      callback(null, rows);
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
  if(req.loggedIn) {
    debug('getPermissions: Fetching permissions!');
    pool.getConnection(function(err, connection) {
      if(err) {
        connection.release();
        return mysqlError(err);
      }
      connection.query(mysql_getPermissions, [req.authUser, 'aaron'], function(err, rows) {
        connection.release();
        if(err) {
          return mysqlError(err);
        }
        req.permissions = _.pluck(rows, 'permission_id');
        debug('getPermissions: permissions are '+req.permissions);
        next();
      });
    });
  } else {
    next();
  }
}

var mysql_getUserOrganizationAdmin = [
  'SELECT organizations_organization_shortname AS organization_admin',
  'FROM organizations_has_admins',
  'WHERE users_user_id = ?;'
].join('\n');
var mysql_getUserWorkplaceAdmin = [
  'SELECT workplaces_workplace_id AS workplace_admin',
  'FROM aaron.users_has_workplaces',
  'WHERE users_user_id = ?',
  'AND workplace_admin = 1;'
].join('\n');

function getAdminStatus (req, res, next) {
  debug('getAdminStatus: Fetching admin status!');
  pool.getConnection(function(err, connection) {
    if(err) {
      connection.release();
      return mysqlError(err);
    }
    connection.query(mysql_getUserWorkplaceAdmin, [req.authUser], function(err, rows) {
      if(err) {
        connection.release();
        return mysqlError(err);
      }
      req.workplaceAdmin = _.pluck(rows, 'workplace_admin');
      connection.query(mysql_getUserOrganizationAdmin, [req.authUser], function(err, rows) {
        connection.release();
        if(err) {
          return mysqlError(err);
        }
        req.organizationAdmin = _.pluck(rows, 'organization_admin');
        debug('getAdminStatus: Admin permissions are ORG:',req.organizationAdmin, 'WORK:', req.workplaceAdmin);
        next();
      });
    });
  });
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
  getUsers:       getUsers,
  setPool:        setPool,
  getPermissions: getPermissions,
  getAdminStatus: getAdminStatus,
  legacyToID:     legacyToID,
  validateLogin:  validateLogin
};
