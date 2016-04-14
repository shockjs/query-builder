'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Query = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _constants = require('../constants');

var _mysqlConnector = require('./schemas/mysql.connector.class');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Query = function () {
  _createClass(Query, null, [{
    key: 'connect',
    value: function connect(details) {
      switch (details.schemaType) {
        case 'mysql':
        default:
          Query._connector = new _mysqlConnector.MySQLConnector();
          break;
      }
      Query._connector.connect(details);
    }
  }, {
    key: 'end',
    value: function end() {
      Query._connector.end();
    }
  }]);

  function Query() {
    _classCallCheck(this, Query);

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

  _createClass(Query, [{
    key: 'createCommand',
    value: function createCommand() {
      var _Query$_connector$get = Query._connector.getQueryBuilder().build(this);

      var sql = _Query$_connector$get[0];
      var params = _Query$_connector$get[1];

      return Query._connector.createCommand(sql, params);
    }
  }, {
    key: 'all',
    value: function all() {
      return this.createCommand().execute().then(function (data) {
        return data.rows ? data.rows : null;
      });
    }
  }, {
    key: 'one',
    value: function one() {
      return this.createCommand().execute().then(function (data) {
        return data.rows ? data.rows.pop() : null;
      });
    }

    /**
     * If value is a CSV String then split into an array
     * @param value
     * @returns {*}
     * @private
     */

  }, {
    key: '_CSVToArray',
    value: function _CSVToArray(value) {
      if (_lodash2.default.isString(value)) {
        var temp = value.trim().split(/\s*,\s*/);
        if (temp.length > 0) {
          value = temp;
        } else {
          value = [value];
        }
      }
      return value;
    }

    /**
     * Merges like php arrays where numbered keys get merged and string keys overwrite.
     *
     * @param mergeTo
     * @param mergeFrom
     * @returns {Object}
     * @private
     */

  }, {
    key: '_mergeValues',
    value: function _mergeValues(mergeTo, mergeFrom) {

      //If both are arrays then there is nothing else to do
      if (_lodash2.default.isArray(mergeTo) && _lodash2.default.isArray(mergeFrom)) {
        return _lodash2.default.concat(mergeTo, mergeFrom);
      }

      //Extract numbered keys into an array and convert back to object so that values get combined.
      var numbered = _lodash2.default.reduce(_lodash2.default.filter(mergeTo, function (v, k) {
        return !isNaN(k);
      }).concat(_lodash2.default.filter(mergeFrom, function (v, k) {
        return !isNaN(k);
      })), function (o, v, i) {
        o[i] = v;
        return o;
      }, {});

      // Extract aliased values from arrays
      var keyed = _lodash2.default.extend(_lodash2.default.omitBy(mergeTo, function (v, k) {
        return !isNaN(k);
      }), _lodash2.default.omitBy(mergeFrom, function (v, k) {
        return !isNaN(k);
      }));

      return _lodash2.default.extend(keyed, numbered);
    }
  }, {
    key: 'select',
    value: function select(columns) {
      var option = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];

      columns = this._CSVToArray(columns);
      this._select = columns;
      this._selectOption = option;
      return this;
    }
  }, {
    key: 'addSelect',
    value: function addSelect(columns) {
      columns = this._CSVToArray(columns);
      if (this._select === null) {
        this._select = columns;
      } else {
        this._select = this._mergeValues(this._select, columns);
      }
      return this;
    }
  }, {
    key: 'distinct',
    value: function distinct() {
      var value = arguments.length <= 0 || arguments[0] === undefined ? true : arguments[0];

      this._distinct = value;
      return this;
    }
  }, {
    key: 'from',
    value: function from(tables) {
      tables = this._CSVToArray(tables);
      this._from = tables;
      return this;
    }
  }, {
    key: 'where',
    value: function where(condition, params) {
      this._where = condition;
      this.addParams(params);
      return this;
    }
  }, {
    key: 'andWhere',
    value: function andWhere(condition, params) {
      if (this._where === null) {
        this._where = condition;
      } else {
        this._where = ['and', this._where, condition];
      }
      this.addParams(params);
      return this;
    }
  }, {
    key: 'orWhere',
    value: function orWhere(condition) {
      var params = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];

      if (this._where === null) {
        this._where = condition;
      } else {
        this._where = ['or', this._where, condition];
      }
      this.addParams(params);
      return this;
    }
  }, {
    key: 'join',
    value: function join(type, table) {
      var on = arguments.length <= 2 || arguments[2] === undefined ? '' : arguments[2];
      var params = arguments.length <= 3 || arguments[3] === undefined ? [] : arguments[3];

      this._join.push([type, table, on]);
      return this.addParams(params);
    }
  }, {
    key: 'innerJoin',
    value: function innerJoin(table) {
      var on = arguments.length <= 1 || arguments[1] === undefined ? '' : arguments[1];
      var params = arguments.length <= 2 || arguments[2] === undefined ? [] : arguments[2];

      this._join.push(['INNER JOIN', table, on]);
      return this.addParams(params);
    }
  }, {
    key: 'leftJoin',
    value: function leftJoin(table) {
      var on = arguments.length <= 1 || arguments[1] === undefined ? '' : arguments[1];
      var params = arguments.length <= 2 || arguments[2] === undefined ? [] : arguments[2];

      this._join.push(['LEFT JOIN', table, on]);
      return this.addParams(params);
    }
  }, {
    key: 'rightJoin',
    value: function rightJoin(table) {
      var on = arguments.length <= 1 || arguments[1] === undefined ? '' : arguments[1];
      var params = arguments.length <= 2 || arguments[2] === undefined ? [] : arguments[2];

      this._join.push(['RIGHT JOIN', table, on]);
      return this.addParams(params);
    }
  }, {
    key: 'groupBy',
    value: function groupBy(columns) {
      columns = this._CSVToArray(columns);
      this._groupBy = columns;
      return this;
    }
  }, {
    key: 'addGroupBy',
    value: function addGroupBy(columns) {
      columns = this._CSVToArray(columns);
      if (this._groupBy === null) {
        this._groupBy = columns;
      } else {
        this._groupBy = _lodash2.default.merge(this._groupBy, columns);
      }
      return this;
    }
  }, {
    key: 'having',
    value: function having(condition) {
      var params = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];

      this._having = condition;
      this.addParams(params);
      return this;
    }
  }, {
    key: 'andHaving',
    value: function andHaving(condition) {
      var params = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];

      if (this._having === null) {
        this._having = condition;
      } else {
        this._having = ['and', this._having, condition];
      }
      this.addParams(params);
      return this;
    }
  }, {
    key: 'orHaving',
    value: function orHaving(condition) {
      var params = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];

      if (this._having === null) {
        this._having = condition;
      } else {
        this._having = ['or', this._having, condition];
      }
      this.addParams(params);
      return this;
    }
  }, {
    key: 'orderBy',
    value: function orderBy(columns) {
      this._orderBy = this.normalizeOrderBy(columns);
      return this;
    }
  }, {
    key: 'normalizeOrderBy',
    value: function normalizeOrderBy(columns) {
      if (_lodash2.default.isObject(columns)) {
        return columns;
      } else {
        columns = columns.trim().split(/\s*,\s*/).filter(function (value) {
          return value != '';
        });
        var result = [];
        Object.keys(columns).forEach(function (key) {
          var matches = columns[key].match(/^(.*?)\s+(asc|desc)$/i);
          if (matches) {
            result[matches[1]] = matches[2].localeCompare('desc') ? _constants.SORT_ASC : _constants.SORT_DESC;
          } else {
            result[columns[key]] = _constants.SORT_ASC;
          }
        });
        return result;
      }
    }
  }, {
    key: 'union',
    value: function union(sql) {
      var all = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

      this._union.push({ query: sql, all: all });
      return this;
    }
  }, {
    key: 'params',
    value: function params(_params) {
      this.params = _params;
      return this;
    }
  }, {
    key: 'addParams',
    value: function addParams(params) {
      var _this = this;

      if (!_lodash2.default.isEmpty(params)) {
        if (_lodash2.default.isEmpty(this._params)) {
          this._params = params;
        } else {
          Object.keys(params).forEach(function (name) {
            _this._params[name] = params[name];
          });
        }
      }
      return this;
    }
  }]);

  return Query;
}();

exports.Query = Query;