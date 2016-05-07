"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Connector = undefined;

var _queryBuilder = require("./query.builder.class");

var _lodash = require("lodash");

var _lodash2 = _interopRequireDefault(_lodash);

var _command = require("./command.class");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Connector {

  /**
   * Fetches or creates a new QueryBuilder.
   * @returns {QueryBuilder}
   */
  getQueryBuilder() {
    if (this._builder === null) {
      this._builder = this._createQueryBuilder();
    }

    return this._builder;
  }

  /**
   * Creates a QueryBuilder instance.
   * @returns {QueryBuilder}
   * @private
   */
  _createQueryBuilder() {
    return new _queryBuilder.QueryBuilder(this);
  }

  createCommand(sql = null, params = []) {
    return new _command.Command({
      connection: this._connection,
      sql: sql,
      params: params
    });
  }

  quoteColumnName(name) {

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

  quoteTableName(name) {

    name = _lodash2.default.isString(name) ? name : name.toString();

    if (name.indexOf('(') !== -1 || name.indexOf('{{') !== -1) {
      return name;
    }
    if (name.indexOf('.') === -1) {
      return this.quoteSimpleTableName(name);
    }
    var parts = name.split('.');
    parts.forEach((i, part) => {
      parts[i] = this.quoteSimpleTableName(part);
    });

    return parts.join('.');
  }

  quoteSimpleColumnName(name) {
    throw new Error(`quoteSimpleColumnName must be implemented in ${ this.name }`);
  }

  quoteSimpleTableName(name) {
    throw new Error(`quoteSimpleColumnName must be implemented in ${ this.name }`);
  }

}
exports.Connector = Connector;