"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Connector = undefined;

var _mysql = require("mysql");

var _mysql2 = _interopRequireDefault(_mysql);

var _connector = require("../../connector.class");

var _schema = require("./schema.class");

var _queryBuilder = require("./query.builder.class");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Simple mysql connector class.
 */
class Connector extends _connector.Connector {

  connect(config) {
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

  /**
   * Creates a QueryBuilder instance.
   * @returns {QueryBuilder}
   * @private
   */
  _createQueryBuilder() {
    return new _queryBuilder.QueryBuilder(this);
  }

  end() {
    this._connection.end();
  }

  getSchema() {
    return new _schema.Schema(this);
  }

  getDriverName() {
    return 'mysql';
  }

  quoteSimpleColumnName(name) {
    return name.indexOf('`') !== -1 || name === '*' ? name : '`' + name + '`';
  }

  quoteSimpleTableName(name) {
    return name.indexOf("`") !== -1 ? name : "`" + name + "`";
  }

}
exports.Connector = Connector;