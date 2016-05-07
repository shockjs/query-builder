"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Schema = undefined;

var _tableSchema = require("../../table.schema.class");

var _schema = require("../../schema.class");

var _columnSchema = require("../../column.schema.class");

var _lodash = require("lodash");

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Schema extends _schema.Schema {

  constructor(connection) {
    super();
    this._db = connection;
    this._tables = {};
    this.typeMap = {
      'tinyint': this.constructor.TYPE_SMALLINT,
      'bit': this.constructor.TYPE_INTEGER,
      'smallint': this.constructor.TYPE_SMALLINT,
      'mediumint': this.constructor.TYPE_INTEGER,
      'int': this.constructor.TYPE_INTEGER,
      'integer': this.constructor.TYPE_INTEGER,
      'bigint': this.constructor.TYPE_BIGINT,
      'float': this.constructor.TYPE_FLOAT,
      'double': this.constructor.TYPE_DOUBLE,
      'real': this.constructor.TYPE_FLOAT,
      'decimal': this.constructor.TYPE_DECIMAL,
      'numeric': this.constructor.TYPE_DECIMAL,
      'tinytext': this.constructor.TYPE_TEXT,
      'mediumtext': this.constructor.TYPE_TEXT,
      'longtext': this.constructor.TYPE_TEXT,
      'longblob': this.constructor.TYPE_BINARY,
      'blob': this.constructor.TYPE_BINARY,
      'text': this.constructor.TYPE_TEXT,
      'varchar': this.constructor.TYPE_STRING,
      'string': this.constructor.TYPE_STRING,
      'char': this.constructor.TYPE_STRING,
      'datetime': this.constructor.TYPE_DATETIME,
      'year': this.constructor.TYPE_DATE,
      'date': this.constructor.TYPE_DATE,
      'time': this.constructor.TYPE_TIME,
      'timestamp': this.constructor.TYPE_TIMESTAMP,
      'enum': this.constructor.TYPE_STRING
    };
  }

  /**
   * Resolves the table name and schema name (if any).
   * @param {TableSchema} table the table metadata object
   * @param {String} name the table name
   */
  _resolveTableNames(table, name) {
    var parts = name.replace('`', '').split('.');
    if (parts[1] !== undefined) {
      table.schemaName = parts[0];
      table.name = parts[1];
      table.fullName = table.schemaName + '.' + table.name;
    } else {
      table.fullName = table.name = parts[0];
    }
  }

  /**
   * Loads the metadata for the specified table.
   * @param {String} name table name
   * @return {Promise<TableSchema>} DBMS-dependent table metadata, null if the table does not exist.
   */
  _loadTableSchema(name) {
    var table = new _tableSchema.TableSchema();
    this._resolveTableNames(table, name);

    return new Promise((resolve, reject) => {
      this._findColumns(table).then(() => {
        return this._findConstraints(table);
      }).then(() => {
        resolve(table);
      }).catch(err => {
        resolve(err.stack);
      });
    });
  }

  /**
   * Collects the foreign key column details for the given table.
   * @param {TableSchema} table the table metadata
   */
  _findConstraints(table) {
    return this._getCreateTableSql(table).then(sql => {
      var matches;
      if (matches = sql.match(/FOREIGN KEY\s+\(([^\)]+)\)\s+REFERENCES\s+([^\(^\s]+)\s*\(([^\)]+)\)/mig)) {
        matches.forEach(match => {
          var fks = match[1].replace('`', '').split(',').map(value => value.trim());
          var pks = match[3].replace('`', '').split(',').map(value => value.trim());
          var constraint = { 0: match[2].replace('`', '') };
          fks.forEach((name, k) => {
            constraint[name] = pks[k];
          });
          table.foreignKeys.push(constraint);
        });
      }
    });
  }

  /**
   * Collects the metadata of table columns.
   * @param {TableSchema} table the table metadata
   * @return {Promise<Boolean>} whether the table exists in the database
   */
  _findColumns(table) {
    var sql = 'SHOW FULL COLUMNS FROM ' + this._db.quoteTableName(table.fullName);
    return this._db.createCommand(sql).execute().then(({ rows: columns }) => {
      columns.forEach(info => {
        info = _lodash2.default.transform(info, function (result, val, key) {
          result[key.toLowerCase()] = val;
        });
        var column = this._loadColumnSchema(info);
        table.columns[column.name] = column;
        if (column.isPrimaryKey) {
          table.primaryKey.push(column.name);
          if (column.autoIncrement) {
            table.sequenceName = '';
          }
        }
      });
      return true;
    });
  }

  /**
   * Gets the CREATE TABLE sql string.
   * @param {TableSchema} table the table metadata
   * @return {Promise<string>} sql the result of 'SHOW CREATE TABLE'
   */
  _getCreateTableSql(table) {
    return this._db.createCommand('SHOW CREATE TABLE ' + this._db.quoteTableName(table.fullName)).execute().then(({ rows }) => {
      var sql;
      if (rows[0]['Create Table'] !== undefined) {
        sql = rows[0]['Create Table'];
      } else {
        var row = Object.keys(rows[0]).map(key => rows[0][key]);
        sql = row[1];
      }
      return sql;
    });
  }

  /**
   * @return {ColumnSchema}
   */
  _createColumnSchema() {
    return new _columnSchema.ColumnSchema();
  }

  /**
   * Loads the column information into a [[ColumnSchema]] object.
   * @param {Object} info column information
   * @return ColumnSchema the column schema object
   */
  _loadColumnSchema(info) {

    var column = this._createColumnSchema();

    column.name = info['field'];
    column.allowNull = info['null'] === 'YES';
    column.isPrimaryKey = info['key'].indexOf('PRI') !== -1;
    column.autoIncrement = info['extra'].indexOf('auto_increment') !== -1;
    column.comment = info['comment'];

    column.dbType = info['type'];
    column.unsigned = column.dbType.indexOf('unsigned') !== -1;

    column.type = this.constructor.TYPE_STRING;
    var matches = column.dbType.match(/^(\w+)(?:\(([^\)]+)\))?/);
    if (matches) {
      var type = matches[1].toLowerCase();
      if (this.typeMap[type] !== undefined) {
        column.type = this.typeMap[type];
      }
      if (matches[2].length > 0) {
        if (type === 'enum') {
          var values = matches[2].split(',');
          values.forEach((value, i) => {
            values[i] = value.replace(/^[']+$/g, '');
          });
          column.enumValues = values;
        } else {
          values = matches[2].split(',');
          column.size = column.precision = parseInt(values[0]);
          if (values[1] !== undefined) {
            column.scale = parseInt(values[1]);
          }
          if (column.size === 1 && type === 'bit') {
            column.type = 'boolean';
          } else if (type === 'bit') {
            if (column.size > 32) {
              column.type = 'bigint';
            } else if (column.size === 32) {
              column.type = 'integer';
            }
          }
        }
      }
    }

    column.phpType = this._getColumnJsType(column);

    if (!column.isPrimaryKey) {
      if (column.type === 'timestamp' && info['default'] === 'CURRENT_TIMESTAMP') {
        column.defaultValue = new Expression('CURRENT_TIMESTAMP');
      } else if (type !== undefined && type === 'bit') {
        column.defaultValue = parseInt(info['default'].replace('b\'', ''), 2);
      } else {
        column.defaultValue = column.jsTypecast(info['default']);
      }
    }

    return column;
  }

}
exports.Schema = Schema;