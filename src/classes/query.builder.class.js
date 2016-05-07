import _ from 'lodash';
import {Query} from './query.class';
import {SORT_DESC} from '../constants';
import {strtr} from 'phpjs';
import csvToArray from "../utils/csvToArray";

export class QueryBuilder {

  static get PARAM_PREFIX() {':qp'};

  constructor(db) {

    /**
     * Connection the database connection.
     */
    this._db = db;
    /**
     * The separator between different fragments of a SQL statement.
     * Defaults to an empty space. This is mainly used by [[build()]] when generating a SQL statement.
     */
    this._separator = " ";
    /**
     * Array map of query condition to builder methods.
     * These methods are used by [[buildCondition]] to build SQL conditions from array syntax.
     */
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

  /**
   * Generates a SELECT SQL statement from a [[Query]] object.
   * @param {Query} query the [[Query]] object from which the SQL statement will be generated.
   * @param {Object} params the parameters to be bound to the generated SQL statement. These parameters will
   * be included in the result with the additional parameters generated during the query building process.
   * @return {Array} the generated SQL statement (the first array element) and the corresponding
   * parameters to be bound to the SQL statement (the second array element). The parameters returned
   * include those provided in `$params`.
   */
  build(query, params={}) {

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

  /**
   * Builds a SQL statement for creating a new DB table.
   *
   * The columns in the new  table should be specified as name-definition pairs (e.g. 'name' => 'string'),
   * where name stands for a column name which will be properly quoted by the method, and definition
   * stands for the column type which can contain an abstract DB type.
   * The [[getColumnType()]] method will be invoked to convert any abstract type into a physical one.
   *
   * If a column is specified with definition only (e.g. 'PRIMARY KEY (name, type)'), it will be directly
   * inserted into the generated SQL.
   *
   * For example,
   *
   * ~~~
   * sql = queryBuilder.createTable('user', {
   *  'id': 'pk',
   *  'name': 'string',
   *  'age': 'integer',
   * });
   * ~~~
   *
   * @param {String} table the name of the table to be created. The name will be properly quoted by the method.
   * @param {Object} columns the columns (name => definition) in the new table.
   * @param {String} options additional SQL fragment that will be appended to the generated SQL.
   * @return {String} the SQL statement for creating a new DB table.
   */
  createTable(table, columns, options = null) {
    var cols = [];
    Object.keys(columns).forEach((name) => {
      var type = columns[name];
      if (isNaN(name)) {
        cols.push("\t" + this._db.quoteColumnName(name) + ' ' + this.getColumnType(type));
      } else {
        cols.push("\t" + type);
      }
    });
    var sql = "CREATE TABLE " + this._db.quoteTableName(table) + " (\n" + cols.join(",\n") + "\n)";

    return options === null ? sql : sql + ' ' + options;
  }

  /**
   * Builds a SQL statement for renaming a DB table.
   * @param {String} oldName the table to be renamed. The name will be properly quoted by the method.
   * @param {String} newName the new table name. The name will be properly quoted by the method.
   * @return {String} the SQL statement for renaming a DB table.
   */
  renameTable(oldName, newName) {
    return 'RENAME TABLE ' + this._db.quoteTableName(oldName) + ' TO ' + this._db.quoteTableName(newName);
  }

  /**
   * Builds a SQL statement for dropping a DB table.
   * @param {String} table the table to be dropped. The name will be properly quoted by the method.
   * @return {String} the SQL statement for dropping a DB table.
   */
   dropTable(table) {
    return "DROP TABLE " + this._db.quoteTableName(table);
  }

  /**
   * Builds a SQL statement for adding a primary key constraint to an existing table.
   * @param {String} name the name of the primary key constraint.
   * @param {String} table the table that the primary key constraint will be added to.
   * @param {String|Array} columns comma separated string or array of columns that the primary key will consist of.
   * @return {String} the SQL statement for adding a primary key constraint to an existing table.
   */
  addPrimaryKey(name, table, columns) {

    columns = csvToArray(columns);

    columns.forEach((col, i) => {
      columns[i] = this._db.quoteColumnName(col);
    });

    return 'ALTER TABLE ' + this._db.quoteTableName(table) + ' ADD CONSTRAINT '
    + this._db.quoteColumnName(name) + '  PRIMARY KEY ('
    + columns.join(', ') + ' )';
  }

  /**
   * Builds a SQL statement for removing a primary key constraint to an existing table.
   * @param {String} name the name of the primary key constraint to be removed.
   * @param {String} table the table that the primary key constraint will be removed from.
   * @return {String} the SQL statement for removing a primary key constraint from an existing table.
   */
  dropPrimaryKey(name, table) {
    return 'ALTER TABLE ' + this._db.quoteTableName(table)
      + ' DROP CONSTRAINT ' + this._db.quoteColumnName(name);
  }

  /**
   * Builds a SQL statement for truncating a DB table.
   * @param {String} table the table to be truncated. The name will be properly quoted by the method.
   * @return {String} the SQL statement for truncating a DB table.
   */
  truncateTable(table) {
    return "TRUNCATE TABLE " + this._db.quoteTableName(table);
  }

  /**
   * Builds a SQL statement for adding a new DB column.
   * @param {String} table the table that the new column will be added to. The table name will be properly quoted by the method.
   * @param {String} column the name of the new column. The name will be properly quoted by the method.
   * @param {String} type the column type. The [[getColumnType()]] method will be invoked to convert abstract column type (if any)
   * into the physical one. Anything that is not recognized as abstract type will be kept in the generated SQL.
   * For example, 'string' will be turned into 'varchar(255)', while 'string not null' will become 'varchar(255) not null'.
   * @return string the SQL statement for adding a new column.
   */
  addColumn(table, column, type) {
    return 'ALTER TABLE ' + this._db.quoteTableName(table)
      + ' ADD ' + this._db.quoteColumnName(column) + ' '
      + this.getColumnType(type);
  }

  /**
   * Builds a SQL statement for dropping a DB column.
   * @param {String} table the table whose column is to be dropped. The name will be properly quoted by the method.
   * @param {string} column the name of the column to be dropped. The name will be properly quoted by the method.
   * @return {String} the SQL statement for dropping a DB column.
   */
  dropColumn(table, column) {
    return "ALTER TABLE " + this._db.quoteTableName(table)
    + " DROP COLUMN " + this._db.quoteColumnName(column);
  }

  /**
   * Builds a SQL statement for renaming a column.
   * @param {String} table the table whose column is to be renamed. The name will be properly quoted by the method.
   * @param {String} oldName the old name of the column. The name will be properly quoted by the method.
   * @param {String} newName the new name of the column. The name will be properly quoted by the method.
   * @param {String} type the type for the column, used for database that require redeclaration of type.
   * @return {String} the SQL statement for renaming a DB column.
   */
  renameColumn(table, oldName, newName, type=null) {
    return "ALTER TABLE " + this._db.quoteTableName(table)
    + " RENAME COLUMN " + this._db.quoteColumnName(oldName)
    + " TO " + this._db.quoteColumnName(newName);
  }

  /**
   * Builds a SQL statement for changing the definition of a column.
   * @param {String} table the table whose column is to be changed. The table name will be properly quoted by the method.
   * @param {String} column the name of the column to be changed. The name will be properly quoted by the method.
   * @param {String} type the new column type. The [[getColumnType()]] method will be invoked to convert abstract
   * column type (if any) into the physical one. Anything that is not recognized as abstract type will be kept
   * in the generated SQL. For example, 'string' will be turned into 'varchar(255)', while 'string not null'
   * will become 'varchar(255) not null'.
   * @return {String} the SQL statement for changing the definition of a column.
   */
  alterColumn(table, column, type) {
    return 'ALTER TABLE ' + this._db.quoteTableName(table) + ' CHANGE '
    + this._db.quoteColumnName(column) + ' '
    + this._db.quoteColumnName(column) + ' '
    + this.getColumnType(type);
  }

  /**
   * Builds a SQL statement for adding a foreign key constraint to an existing table.
   * The method will properly quote the table and column names.
   * @param {String} name the name of the foreign key constraint.
   * @param {String} table the table that the foreign key constraint will be added to.
   * @param {String|Array} columns the name of the column to that the constraint will be added on.
   * If there are multiple columns, separate them with commas or use an array to represent them.
   * @param {String} refTable the table that the foreign key references to.
   * @param {String|Array} refColumns the name of the column that the foreign key references to.
   * If there are multiple columns, separate them with commas or use an array to represent them.
   * @param {String} remove the ON DELETE option. Most DBMS support these options: RESTRICT, CASCADE, NO ACTION, SET DEFAULT, SET NULL
   * @param {String} update the ON UPDATE option. Most DBMS support these options: RESTRICT, CASCADE, NO ACTION, SET DEFAULT, SET NULL
   * @return {String} the SQL statement for adding a foreign key constraint to an existing table.
   */
  addForeignKey(name, table, columns, refTable, refColumns, remove = null, update = null) {
    var sql = 'ALTER TABLE ' + this._db.quoteTableName(table)
      + ' ADD CONSTRAINT ' + this._db.quoteColumnName(name)
      + ' FOREIGN KEY (' + this.buildColumns(columns) + ')'
      + ' REFERENCES ' + this._db.quoteTableName(refTable)
      + ' (' + this.buildColumns(refColumns) + ')';
    if (remove !== null) {
      sql += ' ON DELETE ' + remove;
    }
    if (update !== null) {
      sql += ' ON UPDATE ' + update;
    }

    return sql;
  }

  /**
   * Builds a SQL statement for dropping a foreign key constraint.
   * @param {String} name the name of the foreign key constraint to be dropped. The name will be properly quoted by the method.
   * @param {String} table the table whose foreign is to be dropped. The name will be properly quoted by the method.
   * @return {String} the SQL statement for dropping a foreign key constraint.
   */
  dropForeignKey(name, table) {
    return 'ALTER TABLE ' + this._db.quoteTableName(table)
      + ' DROP CONSTRAINT ' + this._db.quoteColumnName(name);
  }

  /**
   * Builds a SQL statement for creating a new index.
   * @param {String} name the name of the index. The name will be properly quoted by the method.
   * @param {String} table the table that the new index will be created for. The table name will be properly quoted by the method.
   * @param {String|Array} columns the column(s) that should be included in the index. If there are multiple columns,
   * separate them with commas or use an array to represent them. Each column name will be properly quoted
   * by the method, unless a parenthesis is found in the name.
   * @param {Boolean} unique whether to add UNIQUE constraint on the created index.
   * @return {String} the SQL statement for creating a new index.
   */
  createIndex(name, table, columns, unique = false) {
    return (unique ? 'CREATE UNIQUE INDEX ' : 'CREATE INDEX ')
      + this._db.quoteTableName(name) + ' ON '
      + this._db.quoteTableName(table)
      + ' (' + this.buildColumns(columns) + ')';
  }

  /**
   * Builds a SQL statement for dropping an index.
   * @param {String} name the name of the index to be dropped. The name will be properly quoted by the method.
   * @param {String} table the table whose index is to be dropped. The name will be properly quoted by the method.
   * @return {String} the SQL statement for dropping an index.
   */
  dropIndex(name, table) {
    return 'DROP INDEX ' + this._db.quoteTableName(name) + ' ON ' + this._db.quoteTableName(table);
  }

  /**
   * Creates a SQL statement for resetting the sequence value of a table's primary key.
   * The sequence will be reset such that the primary key of the next new row inserted
   * will have the specified value or 1.
   * @param {String} table the name of the table whose primary key sequence will be reset
   * @param {Array|String} value the value for the primary key of the next new row inserted. If this is not set,
   * the next new row's primary key will have a value 1.
   * @return {String} the SQL statement for resetting sequence
   * @throws Error if this is not supported by the underlying DBMS
   */
  resetSequence(table, value = null) {
    throw new Error(this._db.getDriverName() + ' does not support resetting sequence.');
  }

  /**
   * Converts an abstract column type into a physical column type.
   * The conversion is done using the type map specified in [[typeMap]].
   * The following abstract column types are supported (using MySQL as an example to explain the corresponding
   * physical types):
   *
   * - `pk`: an auto-incremental primary key type, will be converted into "int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY"
   * - `bigpk`: an auto-incremental primary key type, will be converted into "bigint(20) NOT NULL AUTO_INCREMENT PRIMARY KEY"
   * - `string`: string type, will be converted into "varchar(255)"
   * - `text`: a long string type, will be converted into "text"
   * - `smallint`: a small integer type, will be converted into "smallint(6)"
   * - `integer`: integer type, will be converted into "int(11)"
   * - `bigint`: a big integer type, will be converted into "bigint(20)"
   * - `boolean`: boolean type, will be converted into "tinyint(1)"
   * - `float``: float number type, will be converted into "float"
   * - `decimal`: decimal number type, will be converted into "decimal"
   * - `datetime`: datetime type, will be converted into "datetime"
   * - `timestamp`: timestamp type, will be converted into "timestamp"
   * - `time`: time type, will be converted into "time"
   * - `date`: date type, will be converted into "date"
   * - `money`: money type, will be converted into "decimal(19,4)"
   * - `binary`: binary data type, will be converted into "blob"
   *
   * If the abstract type contains two or more parts separated by spaces (e.g. "string NOT NULL"), then only
   * the first part will be converted, and the rest of the parts will be appended to the converted result.
   * For example, 'string NOT NULL' is converted to 'varchar(255) NOT NULL'.
   *
   * For some of the abstract types you can also specify a length or precision constraint
   * by appending it in round brackets directly to the type.
   * For example `string(32)` will be converted into "varchar(32)" on a MySQL database.
   * If the underlying DBMS does not support these kind of constraints for a type it will
   * be ignored.
   *
   * If a type cannot be found in [[typeMap]], it will be returned without any change.
   * @param {String} type abstract column type
   * @return {String} physical column type.
   */
  getColumnType(type) {

    var matches;
    if (this.typeMap[type] !== undefined) {
      return this.typeMap[type];
    } else if (matches = type.match(/^(\w+)\((.+?)\)(.*)$/)) {
      if (this.typeMap[matches[1]] !== undefined) {
        return ('(' + matches[2] + ')').replace(/\(.+\)/, this.typeMap[matches[1]]) + matches[3];
      }
    } else if (matches = type.match(/^(\w+)\s+/)) {
      if (this.typeMap[matches[1]] !== undefined) {
        return this.typeMap[matches[1]].replace(/^\w+/, type);
      }
    }

    return type;
  }

  /**
   * @param {Array|Object} columns
   * @param {Object} params the binding parameters to be populated
   * @param {boolean} distinct
   * @param {string} selectOption
   * @return {string} the SELECT clause built from [[Query::select]].
   */
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

  /**
   * @param {Array|Object} tables
   * @param {Object} params the binding parameters to be populated
   * @return {String} the FROM clause built from [[Query::from]].
   */
  buildFrom(tables, params) {
    if (_.isEmpty(tables)) {
      return '';
    }

    tables = this._quoteTableNames(tables, params);
    tables = _.isArray(tables) ? tables : Object.keys(tables).map(key => tables[key]);
    return 'FROM ' + tables.join(', ');
  }

  /**
   * @param {Array} joins
   * @param {Object} params the binding parameters to be populated
   * @return {String} the JOIN clause built from [[Query::join]].
   * @throws Exception if the joins parameter is not in proper format
   */
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
      table = tables.shift(); //@todo figure out conversion.
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

  /**
   * Quotes table names passed
   *
   * @param {Array|Object} tables
   * @param {Object} params
   * @return {Array|Object}
   */
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

  /**
   * @param {String|Array} condition
   * @param {Object} params the binding parameters to be populated
   * @return {String} the WHERE clause built from [[Query::where]].
   */
  buildWhere(condition, params) {
    var where = this.buildCondition(condition, params);
    return where === '' ? '' : 'WHERE ' + where;
  }

  /**
   * @param {Array|Object} columns
   * @return {String} the GROUP BY clause
   */
  buildGroupBy(columns) {
    return _.isEmpty(columns) ? '' : 'GROUP BY ' + this.buildColumns(columns);
  }

  /**
   * @param {String|Array|Object} condition
   * @param {Object} params the binding parameters to be populated
   * @return string the HAVING clause built from [[Query::having]].
   */
  buildHaving(condition, params) {
    var having = this.buildCondition(condition, params);
    return having === '' ? '' : 'HAVING ' + having;
  }

  /**
   * Builds the ORDER BY and LIMIT/OFFSET clauses and appends them to the given SQL.
   * @param {String} sql the existing SQL (without ORDER BY/LIMIT/OFFSET)
   * @param {Array|Object} orderBy the order by columns. See [[Query::orderBy]] for more details on how to specify this parameter.
   * @param {int} limit the limit number. See [[Query::limit]] for more details.
   * @param {int} offset the offset number. See [[Query::offset]] for more details.
   * @return {String} the SQL completed with ORDER BY/LIMIT/OFFSET (if any)
   */
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

  /**
   * @param {Array|Object} columns
   * @return {String} the ORDER BY clause built from [[Query::$orderBy]].
   */
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

  /**
   * @param {int} limit
   * @param {int} offset
   * @return {String} the LIMIT and OFFSET clauses
   */
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

  /**
   * Checks to see if the given limit is effective.
   * @param {String} limit the given limit
   * @return {boolean} whether the limit is effective
   */
  hasLimit(limit) {
    return /^\d+$/.test(limit);
  }

  /**
   * Checks to see if the given offset is effective.
   * @param {String} offset the given offset
   * @return {boolean} whether the offset is effective
   */
  hasOffset(offset) {
    return /^\d+$/.test(offset) && offset != 0;
  }

  /**
   * @param {Array|Object} unions
   * @param {Object} params the binding parameters to be populated
   * @return {String} the UNION clause built from [[Query::union]].
   */
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

    return result.trim();
  }

  /**
   * Processes columns and properly quotes them if necessary.
   * It will join all columns into a string with comma as separators.
   * @param {String|Array|Object} columns the columns to be processed
   * @return {String} the processing result
   */
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

  /**
   * Parses the condition specification and generates the corresponding SQL expression.
   * @param {String|Array|Object} condition the condition specification. Please refer to [[Query::where()]]
   * on how to specify a condition.
   * @param {Object} params the binding parameters to be populated
   * @return {String} the generated SQL expression
   */
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

  /**
   * Creates a condition based on column-value pairs.
   * @param {Array|Object} condition the condition specification.
   * @param {Object} params the binding parameters to be populated
   * @return {String} the generated SQL expression
   */
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

  /**
   * Connects two or more SQL expressions with the `AND` or `OR` operator.
   * @param {String} operator the operator to use for connecting the given operands
   * @param {Array} operands the SQL expressions to connect.
   * @param {Object} params the binding parameters to be populated
   * @return {String} the generated SQL expression
   */
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

  /**
   * Inverts an SQL expressions with `NOT` operator.
   * @param {String} operator the operator to use for connecting the given operands
   * @param {Array} operands the SQL expressions to connect.
   * @param {Array} params the binding parameters to be populated
   * @return {String} the generated SQL expression
   * @throws Error if wrong number of operands have been given.
   */
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

  /**
   * Creates an SQL expressions with the `BETWEEN` operator.
   * @param {String} operator the operator to use (e.g. `BETWEEN` or `NOT BETWEEN`)
   * @param {Array} operands the first operand is the column name. The second and third operands
   * describe the interval that column value should be in.
   * @param {Object|Array} params the binding parameters to be populated
   * @return {String} the generated SQL expression
   * @throws InvalidParamException if wrong number of operands have been given.
   */
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

  /**
   * Creates an SQL expressions with the `IN` operator.
   * @param {String} operator the operator to use (e.g. `IN` or `NOT IN`)
   * @param {Array} operands the first operand is the column name. If it is an array
   * a composite IN condition will be generated.
   * The second operand is an array of values that column value should be among.
   * If it is an empty array the generated expression will be a `false` value if
   * operator is `IN` and empty if operator is `NOT IN`.
   * @param {Object} params the binding parameters to be populated
   * @return {String} the generated SQL expression
   * @throws Error if wrong number of operands have been given.
   */
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

  /**
   * Builds SQL for IN condition
   *
   * @param {String} operator
   * @param {Array} columns
   * @param {Query} values
   * @param {Array} params
   * @return {String} SQL
   */
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

  /**
   * Builds SQL for IN condition
   *
   * @param {String} operator
   * @param {Array} columns
   * @param {Query} values
   * @param {Array} params
   * @return {String} SQL
   */
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

  /**
   * Creates an SQL expressions with the `LIKE` operator.
   * @param {String} operator the operator to use (e.g. `LIKE`, `NOT LIKE`, `OR LIKE` or `OR NOT LIKE`)
   * @param {Array} operands an array of two or three operands
   *
   * - The first operand is the column name.
   * - The second operand is a single value or an array of values that column value
   *   should be compared with. If it is an empty array the generated expression will
   *   be a `false` value if operator is `LIKE` or `OR LIKE`, and empty if operator
   *   is `NOT LIKE` or `OR NOT LIKE`.
   * - An optional third operand can also be provided to specify how to escape special characters
   *   in the value(s). The operand should be an array of mappings from the special characters to their
   *   escaped counterparts. If this operand is not provided, a default escape mapping will be used.
   *   You may use `false` or an empty array to indicate the values are already escaped and no escape
   *   should be applied. Note that when using an escape mapping (or the third operand is not provided),
   *   the values will be automatically enclosed within a pair of percentage characters.
   * @param {Object} params the binding parameters to be populated
   * @return {String} the generated SQL expression
   * @throws Error if wrong number of operands have been given.
   */
  buildLikeCondition(operator, operands, params)
  {
    if (operands[0] === undefined || operands[1] === undefined) {
      throw new Error(`Operator '${operator}' requires two operands.`);
    }

    var escape = operands[2] !== undefined ? operands[2] : {'%': '\%', '_': '\_', '\\': '\\\\'};
    delete operands[2];

    var matches = operator.match(/^(AND |OR |)(((NOT |))I?LIKE)/);
    if (!matches) {
      throw new Error(`Invalid operator '${operator}'.`);
    }
    var andor = ' ' + (!_.isEmpty(matches[1]) ? matches[1] : 'AND ');
    var not = !_.isEmpty(matches[3]);
    operator = matches[2];

    var {0: column, 1: values} = operands;

    if (!_.isArray(values)) {
      values = [values];
    }

    if (_.isEmpty(values)) {
      return not ? '' : '0=1';
    }

    if (column.indexOf('(') === -1) {
      column = this._db.quoteColumnName(column);
    }

    var parts = [];
    values.forEach((value) => {
      var index = _.isArray(params) ? params.length : Object.keys(params).length;
      var phName = `${QueryBuilder.PARAM_PREFIX}${index}`;
      params[phName] = _.isEmpty(escape) ? value : ('%' + strtr(value, escape) + '%');
      parts.push(`${column} ${operator} ${phName}`);
    });

    return parts.join(andor);
  }

  /**
   * Creates an SQL expressions with the `EXISTS` operator.
   * @param {String} operator the operator to use (e.g. `EXISTS` or `NOT EXISTS`)
   * @param {Array} operands contains only one element which is a [[Query]] object representing the sub-query.
   * @param {Object} params the binding parameters to be populated
   * @return {String} the generated SQL expression
   * @throws Error if the operand is not a [[Query]] object.
   */
  buildExistsCondition(operator, operands, params)
  {
    if (operands[0] instanceof Query) {
      var {0: sql} = this.build(operands[0], params);
      return `${operator} (${sql})`;
    } else {
      throw new Error('Subquery for EXISTS operator must be a Query object.');
    }
  }

  /**
   * Creates an SQL expressions like `"column" operator value`.
   * @param {String} operator the operator to use. Anything could be used e.g. `>`, `<=`, etc.
   * @param {Array} operands contains two column names.
   * @param {Array} params the binding parameters to be populated
   * @return string the generated SQL expression
   * @throws InvalidParamException if wrong number of operands have been given.
   */
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