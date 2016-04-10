import _ from 'lodash';
import {Query} from './query.class';
import {SORT_DESC} from '../constants';

export class QueryBuilder {

  static PARAM_PREFIX = ':qp';

  constructor(db) {

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

  build(query, params={}) {

    console.log(query);

    params = params ? query._params : _.extend(params, query._params);

    var clauses = [
      this.buildSelect(query._select, params, query._distinct, query._selectOption),
      this.buildFrom(query._from, params),
      this.buildJoin(query._join, params),
      this.buildWhere(query._where, params),
      this.buildGroupBy(query._groupBy),
      this.buildHaving(query._having, params)
    ];

    var sql = clauses.filter((value) => value !== false).join(this._separator);
    sql = this.buildOrderByAndLimit(sql, query._orderBy, query._limit, query._offset);

    var union = this.buildUnion(query._union, params);
    if (union !== '') {
      sql = `(${sql})${this._separator}${union}`;
    }

    return [sql, params];
  }

  buildSelect(columns, params, distinct, selectOption) {
    
    var select = distinct ? 'SELECT DISTINCT' : 'SELECT';
    if (selectOption !== null) {
      select += ' ' + selectOption;
    }

    if (_.isEmpty(columns)) {
      return select + ' *';
    }

    Object.keys(columns).forEach((i) => {

      //Convert to int if possible.
      i = !isNaN(i) ? parseInt(i) : i;

      var column = columns[i];
      if (column instanceof Query) {
        var {0: sql} = this.build(column, params);
        columns[i] = `(${sql}) AS ` + this._db.quoteColumnName(i);
      } else if (_.isString(i)) {
        if (column.indexOf('(') === -1) {
          column = this._db.quoteColumnName(column);
        }
        columns[i] = `${column} AS ` + this._db.quoteColumnName(i);
      } else if (column.indexOf('(') === -1) {
        var matches = column.match(/^(.*?)(\s+as\s+|\s+)([\w\-_\.]+)$/);
        if (matches) {
          columns[i] = this._db.quoteColumnName(matches[1]) + ' AS ' + this._db.quoteColumnName(matches[3]);
        } else {
          columns[i] = this._db.quoteColumnName(column);
        }
      }
    });
    columns = _.isArray(columns) ? columns : Object.keys(columns).map(key => columns[key]);
    return select + ' ' + columns.join(', ');
  }

  buildFrom(tables, params) {
    if (_.isEmpty(tables)) {
      return '';
    }

    tables = this._quoteTableNames(tables, params);
    tables = _.isArray(tables) ? tables : Object.keys(tables).map(key => tables[key]);
    return 'FROM ' + tables.join(', ');
  }

  buildJoin(joins, params) {
    if (_.isEmpty(joins)) {
      return '';
    }

    joins.forEach((join, i) => {
      if (!_.isArray(join) || join[0] == undefined || join[1] == undefined) {
        throw new Error('A join clause must be specified as an array of join type, join table, and optionally join condition.');
      }
      // 0:join type, 1:join table, 2:on-condition (optional)
      var {0: joinType, 1:table} = join;
      var tables = this._quoteTableNames(table, params);
      //table = reset($tables); @todo figure out conversion.
      joins[i] = `${joinType} ${table}`;
      if (join[2] !== undefined) {
        var condition = this.buildCondition(join[2], params);
        if (condition !== '') {
          joins[i] += ' ON ' + condition;
        }
      }
    });

    return joins.join(this._separator);
  }

  _quoteTableNames(tables, params) {
    Object.keys(tables).forEach ((i) => {

      //Convert to int if possible.
      i = !isNaN(i) ? parseInt(i) : i;

      var table = tables[i];
      if (table instanceof Query) {
        var {0: sql, 1: params} = this.build(table, params);
        tables[i] = `(${sql}) ` + this._db.quoteTableName(i);
      } else if (_.isString(i)) {
        if (table.indexOf('(') === -1) {
          table = this._db.quoteTableName(table);
        }
        tables[i] = `${table} ` + this._db.quoteTableName(i);
      } else if (table.indexOf('(') === -1) {
        var matches = table.match(/^(.*?)(\s+as|)\s+([^ ]+)$/);
        if (matches) { // with alias
          tables[i] = this._db.quoteTableName(matches[1]) + ' ' + this._db.quoteTableName(matches[3]);
        } else {
          tables[i] = this._db.quoteTableName(table);
        }
      }
    });
    return tables;
  }

  buildWhere(condition, params) {
    var where = this.buildCondition(condition, params);
    return where === '' ? '' : 'WHERE ' + where;
  }

  buildGroupBy(columns) {
    return _.isEmpty(columns) ? '' : 'GROUP BY ' + this.buildColumns(columns);
  }

  buildHaving(condition, params) {
    var having = this.buildCondition(condition, params);
    return having === '' ? '' : 'HAVING ' + having;
  }

  buildCondition(condition, params) {

    var method;

    if (!_.isArray(condition) && !_.isObject(condition)) {
      return _.isString(condition) ? condition : condition.toString();
    } else if (_.isEmpty(condition)) {
      return '';
    }

    if (_.isArray(condition)) { // operator format: operator, operand 1, operand 2, ...
      var operator = condition[0].toUpperCase();
      if (this._conditionBuilders[operator] !== undefined) {
        method = this._conditionBuilders[operator];
      } else {
        method = 'buildSimpleCondition';
      }
      condition.shift();
      if (this[method] === undefined) {
        throw new Error(`${method} is not implemented...`);
      }
      return this[method](operator, condition, params);
    } else { // hash format: 'column1' => 'value1', 'column2' => 'value2', ...
      return this.buildHashCondition(condition, params);
    }
  }

  buildColumns(columns) {
    if (!_.isArray(columns)) {
      if (columns.indexOf(columns, '(') !== -1) {
        return columns;
      } else {
        columns = columns.split('/\s*,\s*/').filter((value) => value.length > 0);
      }
    }
    columns.forEach((column, i) => {
      if (column.indexOf('(') === -1) {
        columns[i] = this._db.quoteColumnName(column);
      }
    });

    return _.isArray(columns) ? columns.join(', ') : columns;
  }

  buildHashCondition(condition, params) {
    var parts = [];
    Object.keys(condition).forEach((column) => {
      var value = condition[column];
      if (_.isArray(value) || value instanceof Query) {
        // IN condition
        parts.push(this.buildInCondition('IN', [column, value], params));
      } else {
        if (column.indexOf('(') === -1) {
          column = this._db.quoteColumnName(column);
        }
        if (value === null) {
          parts.push(`${column} IS NULL`);
        } else {
          var index = params ? Object.keys(params).length : 0;
          var phName = `${QueryBuilder.PARAM_PREFIX}${index}`;
          parts.push(`${column}=${phName}`);
          params[phName] = value;
        }
      }
    });
    return parts.length === 1 ? parts[0] : '(' + parts.join(') AND (') + ')';
  }

  buildAndCondition(operator, operands, params)
  {
    var parts = [];
    operands.forEach((operand) => {
      if (_.isObject(operand)) {
        operand = this.buildCondition(operand, params);
      }
      if (operand !== '') {
        parts.push(operand);
      }
    });
    if (!_.isEmpty(parts)) {
      return '(' + parts.join(`) ${operator} (`) + ')';
    } else {
      return '';
    }
  }

  buildNotCondition(operator, operands, params) {
    if (operands.length != 1) {
      throw new Error(`Operator '${operator}' requires exactly one operand.`);
    }

    var operand = operands[0]; //@todo check that this conversion is correct.
    if (_.isArray(operand)) {
      operand = this.buildCondition(operand, params);
    }
    if (operand === '') {
      return '';
    }

    return `${operator} (${operand})`;
  }

  buildBetweenCondition(operator, operands, params) {
    if (operands[0] === undefined || operands[1] === undefined || operands[2] == undefined) {
      throw new Error(`Operator '${operator}' requires three operands.`);
    }

    var {0: column, 1: value1, 2: value2} = operands;

    if (column.indexOf('(') === -1) {
      column = this._db.quoteColumnName(column);
    }
    var index = _.isArray(params) ? params.length : Object.keys(params).length;
    var phName1 = `${QueryBuilder.PARAM_PREFIX}${index}`;
    params[phName1] = value1;

    index = _.isArray(params) ? params.length : Object.keys(params).length;
    var phName2 = `${QueryBuilder.PARAM_PREFIX}${index}`;
    params[phName2] = value2;

    return `${column} ${operator} ${phName1} AND ${phName2}`;
  }

  buildInCondition(operator, operands, params) {
    if (operands[0] === undefined || operands[1] === undefined) {
      throw new Error(`Operator '${operator}' requires two operands.`);
    }

    var {0: column, 1:values} = operands;

    if (values === [] || column === []) {
      return operator === 'IN' ? '0=1' : '';
    }

    if (values instanceof Query) {
      return this.buildSubqueryInCondition(operator, column, values, params);
    }

    if (_.isArray(column) && column.length > 1) {
      return this.buildCompositeInCondition(operator, column, values, params);
    }

    if (_.isArray(column)) {
      column = column.shift(); //@todo make sure this works as expected.
    }
    values.forEach((value, i) => {
      if (_.isArray(value)) {
        value = value[column] !== undefined ? value[column] : null;
      }
      if (value === null) {
        values[i] = 'NULL';
      } else {
        var index = _.isArray(params) ? params.length : Object.keys(params).length;
        var phName = `${QueryBuilder.PARAM_PREFIX}${index}`;
        params[phName] = value;
        values[i] = phName;
      }
    });
    if (column.indexOf('(') === -1) {
      column = this._db.quoteColumnName(column);
    }

    if (_.isArray(values) && values.length > 1) {
      return `${column} ${operator} (` + values.join(', ') + ')';
    } else {
      operator = operator === 'IN' ? '=' : '<>';
      return column + operator + values.shift(); //@todo make sure this works as expected.
    }
  }

  buildSubqueryInCondition(operator, columns, values, params) {
    var {0: sql} = this.build(values, params);
    if (_.isArray(columns)) {
      columns.forEach((col, i) => {
        if (col.indexOf(col, '(') === -1) {
          columns[i] = this._db.quoteColumnName(col);
        }
      });
      return '(' + columns.join(', ') + `) ${operator} (${sql})`;
    } else {
      if (columns.indexOf('(') === -1) {
        columns = this._db.quoteColumnName(columns);
      }
      return `${columns} ${operator} (${sql})`;
    }
  }

  buildCompositeInCondition(operator, columns, values, params) {
    var vss = [];
    values.forEach((value) => {
      var vs = [];
      columns.forEach((column) => {
        if (value[column] !== undefined) {
          var index = _.isArray(params) ? params.length : Object.keys(params).length;
          var phName = `${QueryBuilder.PARAM_PREFIX}${index}`;
          params[phName] = value[column];
          vs.push(phName);
        } else {
          vs.push('NULL');
        }
      });
      vss.push('(' + vs.join(', ') + ')');
    });
    columns.forEach((column, i) => {
      if (column.indexOf('(') === -1) {
        columns[i] = this._db.quoteColumnName(column);
      }
    });

    return '(' + columns.join(', ') + `) ${operator} (` + vss.join(', ')  + ')';
  }

  buildOrderByAndLimit(sql, orderBy, limit, offset) {
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

  buildUnion(unions, params) {
    if (_.isEmpty(unions)) {
      return '';
    }

    var result = '';

    unions.forEach((union, i) => {
      var query = union['query'];
      if (query instanceof Query) {
        var data = this.build(query, params);
        unions[i]['query'] = data[0];
        params = data[1];
      }

      result += 'UNION ' + (union['all'] ? 'ALL ' : '') + '( ' + unions[i]['query'] + ' ) ';
    });

    return trim(result);
  }

  buildOrderBy(columns) {
    if (_.isEmpty(columns)) {
      return '';
    }
    var orders = [];
    Object.keys(columns).forEach((name) => {
      orders.push(this._db.quoteColumnName(name) + (columns[name] === SORT_DESC ? ' DESC' : ''));
    });

    return 'ORDER BY ' + orders.join(', ');
  }

  buildLimit(limit, offset) {
    var sql = '';
    if (this.hasLimit(limit)) {
      sql = 'LIMIT ' + limit;
    }
    if (this.hasOffset(offset)) {
      sql += ' OFFSET ' + offset;
    }

    return _.trimStart(sql);
  }

  hasLimit(limit) {
    return /^\d+$/.test(limit);
  }

  hasOffset(offset) {
    return /^\d+$/.test(offset) && offset != 0;
  }

  buildSimpleCondition(operator, operands, params)
  {
    if (operands.length !== 2) {
      throw new Error(`Operator '${operator}' requires two operands.`);
    }

    var {0: column, 1:value} = operands;

    if (column.indexOf('(') === -1) {
      column = this._db.quoteColumnName(column);
    }

    if (value === null) {
      return `${column} ${operator} NULL`;
    } else if (value instanceof Query) {
      var {sql} = this.build(value, params);
      return `${column} ${operator} (${sql})`;
    } else {
      var index = _.isArray(params) ? params.length : Object.keys(params).length;
      var phName = `${QueryBuilder.PARAM_PREFIX}${index}`;
      params[phName] = value;
      return `${column} ${operator} ${phName}`;
    }
  }
}