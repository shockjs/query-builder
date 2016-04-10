'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.QueryBuilder = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _query = require('./query.class');

var _constants = require('../constants');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var QueryBuilder = exports.QueryBuilder = function () {
  function QueryBuilder(db) {
    _classCallCheck(this, QueryBuilder);

    this._db = db;
    this._separator = " ";
    this._typeMap = [];
    this._conditionBuilders = {
      'NOT': 'buildNotCondition',
      'AND': 'buildAndCondition',
      'OR': 'buildAndCondition',
      'BETWEEN': 'buildBetweenCondition',
      'NOT BETWEEN': 'buildBetweenCondition',
      'IN': 'buildInCondition',
      'NOT IN': 'buildInCondition',
      'LIKE': 'buildLikeCondition',
      'NOT LIKE': 'buildLikeCondition',
      'OR LIKE': 'buildLikeCondition',
      'OR NOT LIKE': 'buildLikeCondition',
      'EXISTS': 'buildExistsCondition',
      'NOT EXISTS': 'buildExistsCondition'
    };
  }

  _createClass(QueryBuilder, [{
    key: 'build',
    value: function build(query) {
      var params = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];


      console.log(query);

      params = params ? query._params : _lodash2.default.extend(params, query._params);

      var clauses = [this.buildSelect(query._select, params, query._distinct, query._selectOption), this.buildFrom(query._from, params), this.buildJoin(query._join, params), this.buildWhere(query._where, params), this.buildGroupBy(query._groupBy), this.buildHaving(query._having, params)];

      var sql = clauses.filter(function (value) {
        return value !== false;
      }).join(this._separator);
      sql = this.buildOrderByAndLimit(sql, query._orderBy, query._limit, query._offset);

      var union = this.buildUnion(query._union, params);
      if (union !== '') {
        sql = '(' + sql + ')' + this._separator + union;
      }

      return [sql, params];
    }
  }, {
    key: 'buildSelect',
    value: function buildSelect(columns, params, distinct, selectOption) {
      var _this = this;

      var select = distinct ? 'SELECT DISTINCT' : 'SELECT';
      if (selectOption !== null) {
        select += ' ' + selectOption;
      }

      if (_lodash2.default.isEmpty(columns)) {
        return select + ' *';
      }

      Object.keys(columns).forEach(function (i) {

        //Convert to int if possible.
        i = !isNaN(i) ? parseInt(i) : i;

        var column = columns[i];
        if (column instanceof _query.Query) {
          var _build = _this.build(column, params);

          var sql = _build[0];

          columns[i] = '(' + sql + ') AS ' + _this._db.quoteColumnName(i);
        } else if (_lodash2.default.isString(i)) {
          if (column.indexOf('(') === -1) {
            column = _this._db.quoteColumnName(column);
          }
          columns[i] = column + ' AS ' + _this._db.quoteColumnName(i);
        } else if (column.indexOf('(') === -1) {
          var matches = column.match(/^(.*?)(\s+as\s+|\s+)([\w\-_\.]+)$/);
          if (matches) {
            columns[i] = _this._db.quoteColumnName(matches[1]) + ' AS ' + _this._db.quoteColumnName(matches[3]);
          } else {
            columns[i] = _this._db.quoteColumnName(column);
          }
        }
      });
      columns = _lodash2.default.isArray(columns) ? columns : Object.keys(columns).map(function (key) {
        return columns[key];
      });
      return select + ' ' + columns.join(', ');
    }
  }, {
    key: 'buildFrom',
    value: function buildFrom(tables, params) {
      if (_lodash2.default.isEmpty(tables)) {
        return '';
      }

      tables = this._quoteTableNames(tables, params);
      tables = _lodash2.default.isArray(tables) ? tables : Object.keys(tables).map(function (key) {
        return tables[key];
      });
      return 'FROM ' + tables.join(', ');
    }
  }, {
    key: 'buildJoin',
    value: function buildJoin(joins, params) {
      var _this2 = this;

      if (_lodash2.default.isEmpty(joins)) {
        return '';
      }

      joins.forEach(function (join, i) {
        if (!_lodash2.default.isArray(join) || join[0] == undefined || join[1] == undefined) {
          throw new Error('A join clause must be specified as an array of join type, join table, and optionally join condition.');
        }
        // 0:join type, 1:join table, 2:on-condition (optional)
        var joinType = join[0];
        var table = join[1];

        var tables = _this2._quoteTableNames(table, params);
        //table = reset($tables); @todo figure out conversion.
        joins[i] = joinType + ' ' + table;
        if (join[2] !== undefined) {
          var condition = _this2.buildCondition(join[2], params);
          if (condition !== '') {
            joins[i] += ' ON ' + condition;
          }
        }
      });

      return joins.join(this._separator);
    }
  }, {
    key: '_quoteTableNames',
    value: function _quoteTableNames(tables, params) {
      var _this3 = this;

      Object.keys(tables).forEach(function (i) {

        //Convert to int if possible.
        i = !isNaN(i) ? parseInt(i) : i;

        var table = tables[i];
        if (table instanceof _query.Query) {
          var _build2 = _this3.build(table, params);

          var sql = _build2[0];
          var params = _build2[1];

          tables[i] = '(' + sql + ') ' + _this3._db.quoteTableName(i);
        } else if (_lodash2.default.isString(i)) {
          if (table.indexOf('(') === -1) {
            table = _this3._db.quoteTableName(table);
          }
          tables[i] = table + ' ' + _this3._db.quoteTableName(i);
        } else if (table.indexOf('(') === -1) {
          var matches = table.match(/^(.*?)(\s+as|)\s+([^ ]+)$/);
          if (matches) {
            // with alias
            tables[i] = _this3._db.quoteTableName(matches[1]) + ' ' + _this3._db.quoteTableName(matches[3]);
          } else {
            tables[i] = _this3._db.quoteTableName(table);
          }
        }
      });
      return tables;
    }
  }, {
    key: 'buildWhere',
    value: function buildWhere(condition, params) {
      var where = this.buildCondition(condition, params);
      return where === '' ? '' : 'WHERE ' + where;
    }
  }, {
    key: 'buildGroupBy',
    value: function buildGroupBy(columns) {
      return _lodash2.default.isEmpty(columns) ? '' : 'GROUP BY ' + this.buildColumns(columns);
    }
  }, {
    key: 'buildHaving',
    value: function buildHaving(condition, params) {
      var having = this.buildCondition(condition, params);
      return having === '' ? '' : 'HAVING ' + having;
    }
  }, {
    key: 'buildCondition',
    value: function buildCondition(condition, params) {

      var method;

      if (!_lodash2.default.isArray(condition) && !_lodash2.default.isObject(condition)) {
        return _lodash2.default.isString(condition) ? condition : condition.toString();
      } else if (_lodash2.default.isEmpty(condition)) {
        return '';
      }

      if (_lodash2.default.isArray(condition)) {
        // operator format: operator, operand 1, operand 2, ...
        var operator = condition[0].toUpperCase();
        if (this._conditionBuilders[operator] !== undefined) {
          method = this._conditionBuilders[operator];
        } else {
          method = 'buildSimpleCondition';
        }
        condition.shift();
        if (this[method] === undefined) {
          throw new Error(method + ' is not implemented...');
        }
        return this[method](operator, condition, params);
      } else {
        // hash format: 'column1' => 'value1', 'column2' => 'value2', ...
        return this.buildHashCondition(condition, params);
      }
    }
  }, {
    key: 'buildColumns',
    value: function buildColumns(columns) {
      var _this4 = this;

      if (!_lodash2.default.isArray(columns)) {
        if (columns.indexOf(columns, '(') !== -1) {
          return columns;
        } else {
          columns = columns.split('/\s*,\s*/').filter(function (value) {
            return value.length > 0;
          });
        }
      }
      columns.forEach(function (column, i) {
        if (column.indexOf('(') === -1) {
          columns[i] = _this4._db.quoteColumnName(column);
        }
      });

      return _lodash2.default.isArray(columns) ? columns.join(', ') : columns;
    }
  }, {
    key: 'buildHashCondition',
    value: function buildHashCondition(condition, params) {
      var _this5 = this;

      var parts = [];
      Object.keys(condition).forEach(function (column) {
        var value = condition[column];
        if (_lodash2.default.isArray(value) || value instanceof _query.Query) {
          // IN condition
          parts.push(_this5.buildInCondition('IN', [column, value], params));
        } else {
          if (column.indexOf('(') === -1) {
            column = _this5._db.quoteColumnName(column);
          }
          if (value === null) {
            parts.push(column + ' IS NULL');
          } else {
            var index = params ? Object.keys(params).length : 0;
            var phName = '' + QueryBuilder.PARAM_PREFIX + index;
            parts.push(column + '=' + phName);
            params[phName] = value;
          }
        }
      });
      return parts.length === 1 ? parts[0] : '(' + parts.join(') AND (') + ')';
    }
  }, {
    key: 'buildAndCondition',
    value: function buildAndCondition(operator, operands, params) {
      var _this6 = this;

      var parts = [];
      operands.forEach(function (operand) {
        if (_lodash2.default.isObject(operand)) {
          operand = _this6.buildCondition(operand, params);
        }
        if (operand !== '') {
          parts.push(operand);
        }
      });
      if (!_lodash2.default.isEmpty(parts)) {
        return '(' + parts.join(') ' + operator + ' (') + ')';
      } else {
        return '';
      }
    }
  }, {
    key: 'buildNotCondition',
    value: function buildNotCondition(operator, operands, params) {
      if (operands.length != 1) {
        throw new Error('Operator \'' + operator + '\' requires exactly one operand.');
      }

      var operand = operands[0]; //@todo check that this conversion is correct.
      if (_lodash2.default.isArray(operand)) {
        operand = this.buildCondition(operand, params);
      }
      if (operand === '') {
        return '';
      }

      return operator + ' (' + operand + ')';
    }
  }, {
    key: 'buildBetweenCondition',
    value: function buildBetweenCondition(operator, operands, params) {
      if (operands[0] === undefined || operands[1] === undefined || operands[2] == undefined) {
        throw new Error('Operator \'' + operator + '\' requires three operands.');
      }

      var column = operands[0];
      var value1 = operands[1];
      var value2 = operands[2];


      if (column.indexOf('(') === -1) {
        column = this._db.quoteColumnName(column);
      }
      var index = _lodash2.default.isArray(params) ? params.length : Object.keys(params).length;
      var phName1 = '' + QueryBuilder.PARAM_PREFIX + index;
      params[phName1] = value1;

      index = _lodash2.default.isArray(params) ? params.length : Object.keys(params).length;
      var phName2 = '' + QueryBuilder.PARAM_PREFIX + index;
      params[phName2] = value2;

      return column + ' ' + operator + ' ' + phName1 + ' AND ' + phName2;
    }
  }, {
    key: 'buildInCondition',
    value: function buildInCondition(operator, operands, params) {
      if (operands[0] === undefined || operands[1] === undefined) {
        throw new Error('Operator \'' + operator + '\' requires two operands.');
      }

      var column = operands[0];
      var values = operands[1];


      if (values === [] || column === []) {
        return operator === 'IN' ? '0=1' : '';
      }

      if (values instanceof _query.Query) {
        return this.buildSubqueryInCondition(operator, column, values, params);
      }

      if (_lodash2.default.isArray(column) && column.length > 1) {
        return this.buildCompositeInCondition(operator, column, values, params);
      }

      if (_lodash2.default.isArray(column)) {
        column = column.shift(); //@todo make sure this works as expected.
      }
      values.forEach(function (value, i) {
        if (_lodash2.default.isArray(value)) {
          value = value[column] !== undefined ? value[column] : null;
        }
        if (value === null) {
          values[i] = 'NULL';
        } else {
          var index = _lodash2.default.isArray(params) ? params.length : Object.keys(params).length;
          var phName = '' + QueryBuilder.PARAM_PREFIX + index;
          params[phName] = value;
          values[i] = phName;
        }
      });
      if (column.indexOf('(') === -1) {
        column = this._db.quoteColumnName(column);
      }

      if (_lodash2.default.isArray(values) && values.length > 1) {
        return column + ' ' + operator + ' (' + values.join(', ') + ')';
      } else {
        operator = operator === 'IN' ? '=' : '<>';
        return column + operator + values.shift(); //@todo make sure this works as expected.
      }
    }
  }, {
    key: 'buildSubqueryInCondition',
    value: function buildSubqueryInCondition(operator, columns, values, params) {
      var _this7 = this;

      var _build3 = this.build(values, params);

      var sql = _build3[0];

      if (_lodash2.default.isArray(columns)) {
        columns.forEach(function (col, i) {
          if (col.indexOf(col, '(') === -1) {
            columns[i] = _this7._db.quoteColumnName(col);
          }
        });
        return '(' + columns.join(', ') + (') ' + operator + ' (' + sql + ')');
      } else {
        if (columns.indexOf('(') === -1) {
          columns = this._db.quoteColumnName(columns);
        }
        return columns + ' ' + operator + ' (' + sql + ')';
      }
    }
  }, {
    key: 'buildCompositeInCondition',
    value: function buildCompositeInCondition(operator, columns, values, params) {
      var _this8 = this;

      var vss = [];
      values.forEach(function (value) {
        var vs = [];
        columns.forEach(function (column) {
          if (value[column] !== undefined) {
            var index = _lodash2.default.isArray(params) ? params.length : Object.keys(params).length;
            var phName = '' + QueryBuilder.PARAM_PREFIX + index;
            params[phName] = value[column];
            vs.push(phName);
          } else {
            vs.push('NULL');
          }
        });
        vss.push('(' + vs.join(', ') + ')');
      });
      columns.forEach(function (column, i) {
        if (column.indexOf('(') === -1) {
          columns[i] = _this8._db.quoteColumnName(column);
        }
      });

      return '(' + columns.join(', ') + (') ' + operator + ' (') + vss.join(', ') + ')';
    }
  }, {
    key: 'buildOrderByAndLimit',
    value: function buildOrderByAndLimit(sql, orderBy, limit, offset) {
      orderBy = this.buildOrderBy(orderBy);
      if (orderBy !== '') {
        sql += this._separator + orderBy;
      }
      limit = this.buildLimit(limit, offset);
      if (limit !== '') {
        sql += this._separator + limit;
      }
      return sql;
    }
  }, {
    key: 'buildUnion',
    value: function buildUnion(unions, params) {
      var _this9 = this;

      if (_lodash2.default.isEmpty(unions)) {
        return '';
      }

      var result = '';

      unions.forEach(function (union, i) {
        var query = union['query'];
        if (query instanceof _query.Query) {
          var data = _this9.build(query, params);
          unions[i]['query'] = data[0];
          params = data[1];
        }

        result += 'UNION ' + (union['all'] ? 'ALL ' : '') + '( ' + unions[i]['query'] + ' ) ';
      });

      return trim(result);
    }
  }, {
    key: 'buildOrderBy',
    value: function buildOrderBy(columns) {
      var _this10 = this;

      if (_lodash2.default.isEmpty(columns)) {
        return '';
      }
      var orders = [];
      Object.keys(columns).forEach(function (name) {
        orders.push(_this10._db.quoteColumnName(name) + (columns[name] === _constants.SORT_DESC ? ' DESC' : ''));
      });

      return 'ORDER BY ' + orders.join(', ');
    }
  }, {
    key: 'buildLimit',
    value: function buildLimit(limit, offset) {
      var sql = '';
      if (this.hasLimit(limit)) {
        sql = 'LIMIT ' + limit;
      }
      if (this.hasOffset(offset)) {
        sql += ' OFFSET ' + offset;
      }

      return _lodash2.default.trimStart(sql);
    }
  }, {
    key: 'hasLimit',
    value: function hasLimit(limit) {
      return (/^\d+$/.test(limit)
      );
    }
  }, {
    key: 'hasOffset',
    value: function hasOffset(offset) {
      return (/^\d+$/.test(offset) && offset != 0
      );
    }
  }, {
    key: 'buildSimpleCondition',
    value: function buildSimpleCondition(operator, operands, params) {
      if (operands.length !== 2) {
        throw new Error('Operator \'' + operator + '\' requires two operands.');
      }

      var column = operands[0];
      var value = operands[1];


      if (column.indexOf('(') === -1) {
        column = this._db.quoteColumnName(column);
      }

      if (value === null) {
        return column + ' ' + operator + ' NULL';
      } else if (value instanceof _query.Query) {
        var _build4 = this.build(value, params);

        var sql = _build4.sql;

        return column + ' ' + operator + ' (' + sql + ')';
      } else {
        var index = _lodash2.default.isArray(params) ? params.length : Object.keys(params).length;
        var phName = '' + QueryBuilder.PARAM_PREFIX + index;
        params[phName] = value;
        return column + ' ' + operator + ' ' + phName;
      }
    }
  }]);

  return QueryBuilder;
}();

QueryBuilder.PARAM_PREFIX = ':qp';