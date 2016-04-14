"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MySQLConnector = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _mysql = require("mysql");

var _mysql2 = _interopRequireDefault(_mysql);

var _queryBuilder = require("../query.builder.class");

var _command = require("../command.class");

var _lodash = require("lodash");

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Simple mysql connector class.
 */

var MySQLConnector = exports.MySQLConnector = function () {
  function MySQLConnector() {
    _classCallCheck(this, MySQLConnector);
  }

  _createClass(MySQLConnector, [{
    key: "connect",
    value: function connect(config) {
      this._connection = _mysql2.default.createConnection(config);
      this._connection.connect();
      this._connection.config.queryFormat = function (query, values) {
        if (!values) return query;
        return query.replace(/(\:\w+)/g, function (txt, key) {
          if (values.hasOwnProperty(key)) {
            return this.escape(values[key]);
          }
          return txt;
        }.bind(this));
      };
      this._builder = null;
    }
  }, {
    key: "getQueryBuilder",
    value: function getQueryBuilder() {
      if (this._builder === null) {
        this._builder = this._createQueryBuilder();
      }

      return this._builder;
    }
  }, {
    key: "_createQueryBuilder",
    value: function _createQueryBuilder() {
      return new _queryBuilder.QueryBuilder(this);
    }
  }, {
    key: "createCommand",
    value: function createCommand() {
      var sql = arguments.length <= 0 || arguments[0] === undefined ? null : arguments[0];
      var params = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];

      return new _command.Command({
        connection: this._connection,
        sql: sql,
        params: params
      });
    }
  }, {
    key: "end",
    value: function end() {
      this._connection.end();
    }
  }, {
    key: "quoteColumnName",
    value: function quoteColumnName(name) {

      name = _lodash2.default.isString(name) ? name : name.toString();

      if (name.indexOf('(') !== -1 || name.indexOf('[[') !== -1 || name.indexOf('{{') !== -1) {
        return name;
      }
      var prefix;
      var pos = name.indexOf('.');
      if (pos !== -1) {
        prefix = this.quoteTableName(name.slice(0, pos)) + '.';
        name = name.slice(pos + 1);
      } else {
        prefix = '';
      }

      return prefix + this.quoteSimpleColumnName(name);
    }
  }, {
    key: "quoteTableName",
    value: function quoteTableName(name) {
      var _this = this;

      name = _lodash2.default.isString(name) ? name : name.toString();

      if (name.indexOf('(') !== -1 || name.indexOf('{{') !== -1) {
        return name;
      }
      if (name.indexOf('.') === -1) {
        return this.quoteSimpleTableName(name);
      }
      var parts = name.split('.');
      parts.forEach(function (i, part) {
        parts[i] = _this.quoteSimpleTableName(part);
      });

      return parts.join('.');
    }
  }, {
    key: "quoteSimpleColumnName",
    value: function quoteSimpleColumnName(name) {
      return name.indexOf('`') !== -1 || name === '*' ? name : '`' + name + '`';
    }
  }, {
    key: "quoteSimpleTableName",
    value: function quoteSimpleTableName(name) {
      return name.indexOf("`") !== -1 ? name : "`" + name + "`";
    }
  }]);

  return MySQLConnector;
}();