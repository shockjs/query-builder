'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Query = undefined;

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _constants = require('../constants');

var _connector = require('./schemas/mysql/connector.class');

var _phpjs = require('phpjs');

var _csvToArray = require('../utils/csvToArray');

var _csvToArray2 = _interopRequireDefault(_csvToArray);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Query {

  static connect(details) {
    switch (details.schemaType) {
      case 'mysql':
      default:
        this.constructor._connector = new _connector.Connector();
        break;
    }
    this.constructor._connector.connect(details);
  }

  static end() {
    this.constructor._connector.end();
  }

  static getDb() {
    return this.constructor._connector;
  }

  constructor() {
    this._select = null;
    this._selectOption = null;
    this._distinct = null;
    this._from = null;
    this._where = '';
    this._limit = null;
    this._offset = null;
    this._orderBy = null;
    this._groupBy = null;
    this._join = null;
    this._having = '';
    this._union = null;
    this._params = {};
  }

  /**
   * Creates the sql command ready for execution.
   * @returns {Command}
   */
  createCommand() {
    var { 0: sql, 1: params } = this.constructor._connector.getQueryBuilder().build(this);
    return this.constructor._connector.createCommand(sql, params);
  }

  /**
   * Fetches all results.
   * @returns {Promise.<Array>}
   */
  all() {
    return this.createCommand().execute().then(data => data.rows ? data.rows : null);
  }

  /**
   * Fetches a single result.
   * @returns {Promise.<Object>}
   */
  one() {
    return this.createCommand().execute().then(data => data.rows ? data.rows.pop() : null);
  }

  /**
   * Fetches the first column from each row.
   * @returns {Promise.<Array>}
   */
  column() {
    return this.createCommand().execute().then(data => _lodash2.default.map(data.rows, row => {
      return (0, _phpjs.reset)(row);
    }));
  }

  /**
   * Fetches a single value.
   * @returns {Promise.<String>}
   */
  scalar() {
    return this.createCommand().execute().then(data => (0, _phpjs.reset)(data.rows[0]));
  }

  /**
   * Fetches the count of the whole table.
   *
   * @param q
   * @returns {*}
   */
  count(q = "*") {
    return this._queryScalar(`COUNT(${ q })`);
  }

  /**
   * Fetches the sum of the specified column.
   *
   * @param q
   * @returns {*}
   */
  sum(q) {
    return this._queryScalar(`SUM(${ q })`);
  }

  /**
   * Fetches the average of the specified column.
   *
   * @param q
   * @returns {*}
   */
  average(q) {
    return this._queryScalar(`AVG(${ q })`);
  }

  /**
   * Fetches the minimum of the specified column.
   *
   * @param q
   * @returns {*}
   */
  min(q) {
    return this._queryScalar(`MIN(${ q })`);
  }

  /**
   * Fetches the maximum of the specified column.
   *
   * @param q
   * @returns {*}
   */
  max(q) {
    return this._queryScalar(`MAX(${ q })`);
  }

  /**
   * Queries a scalar value by setting [[select]] first.
   * Restores the value of select to make this query reusable.
   * @param {String} expression
   * @return {Promise.<Boolean|String>}
   */
  _queryScalar(expression) {
    var select = this._select;
    var limit = this._limit;
    var offset = this._offset;
    this._select = [expression];
    this._limit = null;
    this._offset = null;
    var command = this.createCommand();
    this._select = select;
    this._offset = offset;
    this._limit = limit;
    return command.execute().then(data => (0, _phpjs.reset)(data.rows[0]));
  }

  /**
   * Merges like php arrays where numbered keys get merged and string keys overwrite.
   *
   * @param mergeTo
   * @param mergeFrom
   * @returns {Object}
   * @private
   */
  _mergeValues(mergeTo, mergeFrom) {

    //If both are arrays then there is nothing else to do
    if (_lodash2.default.isArray(mergeTo) && _lodash2.default.isArray(mergeFrom)) {
      return _lodash2.default.concat(mergeTo, mergeFrom);
    }

    //Extract numbered keys into an array and convert back to object so that values get combined.
    var numbered = _lodash2.default.reduce(_lodash2.default.filter(mergeTo, (v, k) => !isNaN(k)).concat(_lodash2.default.filter(mergeFrom, (v, k) => !isNaN(k))), (o, v, i) => {
      o[i] = v;
      return o;
    }, {});

    // Extract aliased values from arrays
    var keyed = _lodash2.default.extend(_lodash2.default.omitBy(mergeTo, (v, k) => {
      return !isNaN(k);
    }), _lodash2.default.omitBy(mergeFrom, (v, k) => {
      return !isNaN(k);
    }));

    return _lodash2.default.extend(keyed, numbered);
  }

  select(columns, option = null) {
    columns = (0, _csvToArray2.default)(columns);
    this._select = columns;
    this._selectOption = option;
    return this;
  }

  addSelect(columns) {
    columns = (0, _csvToArray2.default)(columns);
    if (this._select === null) {
      this._select = columns;
    } else {
      this._select = this._mergeValues(this._select, columns);
    }
    return this;
  }

  distinct(value = true) {
    this._distinct = value;
    return this;
  }

  from(tables) {
    tables = (0, _csvToArray2.default)(tables);
    this._from = tables;
    return this;
  }

  where(condition, params) {
    this._where = condition;
    this.addParams(params);
    return this;
  }

  andWhere(condition, params) {
    if (this._where === null) {
      this._where = condition;
    } else {
      this._where = ['and', this._where, condition];
    }
    this.addParams(params);
    return this;
  }

  orWhere(condition, params = []) {
    if (this._where === null) {
      this._where = condition;
    } else {
      this._where = ['or', this._where, condition];
    }
    this.addParams(params);
    return this;
  }

  join(type, table, on = '', params = []) {
    this._join.push([type, table, on]);
    return this.addParams(params);
  }

  innerJoin(table, on = '', params = []) {
    this._join.push(['INNER JOIN', table, on]);
    return this.addParams(params);
  }

  leftJoin(table, on = '', params = []) {
    this._join.push(['LEFT JOIN', table, on]);
    return this.addParams(params);
  }

  rightJoin(table, on = '', params = []) {
    this._join.push(['RIGHT JOIN', table, on]);
    return this.addParams(params);
  }

  groupBy(columns) {
    columns = (0, _csvToArray2.default)(columns);
    this._groupBy = columns;
    return this;
  }

  addGroupBy(columns) {
    columns = (0, _csvToArray2.default)(columns);
    if (this._groupBy === null) {
      this._groupBy = columns;
    } else {
      this._groupBy = this._mergeValues(this._groupBy, columns);
    }
    return this;
  }

  having(condition, params = []) {
    this._having = condition;
    this.addParams(params);
    return this;
  }

  andHaving(condition, params = []) {
    if (this._having === null) {
      this._having = condition;
    } else {
      this._having = ['and', this._having, condition];
    }
    this.addParams(params);
    return this;
  }

  orHaving(condition, params = []) {
    if (this._having === null) {
      this._having = condition;
    } else {
      this._having = ['or', this._having, condition];
    }
    this.addParams(params);
    return this;
  }

  orderBy(columns) {
    this._orderBy = this.normalizeOrderBy(columns);
    return this;
  }

  addOrderBy(columns) {
    columns = this.normalizeOrderBy(columns);
    if (this._orderBy === null) {
      this._orderBy = columns;
    } else {
      this._orderBy = this._mergeValues(this._orderBy, columns);
    }
    return this;
  }

  normalizeOrderBy(columns) {
    if (_lodash2.default.isObject(columns)) {
      return columns;
    } else {
      columns = columns.trim().split(/\s*,\s*/).filter(value => {
        return value != '';
      });
      var result = {};
      Object.keys(columns).forEach(key => {
        var matches = columns[key].match(/^(.*?)\s+(asc|desc)$/i);
        if (matches) {
          result[matches[1]] = (0, _phpjs.strcasecmp)(matches[2], 'desc') ? _constants.SORT_ASC : _constants.SORT_DESC;
        } else {
          result[columns[key]] = _constants.SORT_ASC;
        }
      });
      return result;
    }
  }

  union(sql, all = false) {
    this._union.push({ query: sql, all: all });
    return this;
  }

  params(params) {
    this.params = params;
    return this;
  }

  addParams(params) {
    if (!_lodash2.default.isEmpty(params)) {
      if (_lodash2.default.isEmpty(this._params)) {
        this._params = params;
      } else {
        Object.keys(params).forEach(name => {
          this._params[name] = params[name];
        });
      }
    }
    return this;
  }

  limit(limit) {
    this._limit = limit;
    return this;
  }

  offset(offset) {
    this._offset = offset;
    return this;
  }

}
exports.Query = Query;