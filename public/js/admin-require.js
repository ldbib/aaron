/* jshint node: false, browser: true, browserify: true, jquery: false */

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

var React = require('react');
var ReactDOM = require('react-dom');

var $ = require('jquery');

var UserManagement = React.createClass({
  loadUsersFromServer: function() {
    $.ajax({
      url: this.props.url/*'/api/users'*/,
      type: 'GET',
      dataType: 'json',
      cache: false,
      success: function(data) {
        this.setState({data: data});
      }.bind(this),
      error: function(xhr, status, err) {
        // TODO: error handling
        console.error(this.props.url, status, err.toString());
      }.bind(this)
    });
  },
  getInitialState: function() {
    return {data: []};
  },
  componentDidMount: function() {
    this.loadUsersFromServer();
  },
  render: function() {
    return (
      <div className="userManagement">
        <h1>Users</h1>
        <UserList data={this.state.data} />
      </div>
    );
  }
});

var UserList = React.createClass({
  render: function() {
    var userNodes = this.props.data.map(function(user) {
      return (
        <User fullName={user.firstName + ' ' + user.lastName} id={user.id} />
      );
    });
    return (
      <div className="userList">
        {userNodes}
      </div>
    );
  }
});

var UserForm = React.createClass({
  render: function() {
    return (
      <form className="userForm">
        <input type="text" placeholder="Förnamn" />
        <input type="text" placeholder="Efternamn" />
        <input type="submit" value="Post" />
      </form>
    );
  }
});

var User = React.createClass({
  render: function() {
    return (
      <div className="user" key={this.props.id}>
        <div className="userFullName">
          {this.props.fullName}
        </div>
      </div>
    );
  }
});

ReactDOM.render(
  <UserManagement url="/data.json" />,
  document.getElementById('content')
);
