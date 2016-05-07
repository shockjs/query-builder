export class Schema {
  static get TYPE_PK() { return 'pk'; };
  static get TYPE_BIGPK() { return 'bigpk'; };
  static get TYPE_STRING() { return 'string'; };
  static get TYPE_TEXT() { return 'text'; };
  static get TYPE_SMALLINT() { return 'smallint'; };
  static get TYPE_INTEGER() { return 'integer'; };
  static get TYPE_BIGINT() { return 'bigint'; };
  static get TYPE_FLOAT() { return 'float'; };
  static get TYPE_DOUBLE() { return 'double'; };
  static get TYPE_DECIMAL() { return 'decimal'; };
  static get TYPE_DATETIME() { return 'datetime'; };
  static get TYPE_TIMESTAMP() { return 'timestamp'; };
  static get TYPE_TIME() { return 'time'; };
  static get TYPE_DATE() { return 'date'; };
  static get TYPE_BINARY() { return 'binary'; };
  static get TYPE_BOOLEAN() { return 'boolean'; };
  static get TYPE_MONEY() { return 'money'; };

  /**
   * Obtains the metadata for the named table.
   * @param {String} name table name. The table name may contain schema name if any. Do not quote the table name.
   * @param {Boolean} refresh whether to reload the table schema even if it is found in the cache.
   * @return {Promise<TableSchema>} table metadata. Null if the named table does not exist.
   */
  getTableSchema(name, refresh = false) {
    if (this._tables[name] !== undefined && !refresh) {
      return Promise.resolve(this._tables[name]);
    }
    var realName = this.getRawTableName(name);
    return this._loadTableSchema(realName).then((data) => {
      this._tables[name] = data;
      return data;
    });
  }

  /**
   * Returns the actual name of a given table name.
   * This method will strip off curly brackets from the given table name
   * and replace the percentage character '%' with [[Connection::tablePrefix]].
   * @param {String} name the table name to be converted
   * @param {String} prefix to table name
   * @return {String} the real name of the given table name
   */
  getRawTableName(name, prefix='') {
    if (name.indexOf('{{') !== -1) {
      name = name.replace(/{{(.*?)}}/, '$1');
      return name.replace('%', prefix);
    } else {
      return name;
    }
  }

  /**
   * Extracts the JS type from abstract DB type.
   * @param {ColumnSchema} column the column schema information
   * @return {String} PHP type name
   */
  _getColumnJsType(column) {
    var typeMap = {
      'smallint': 'integer',
      'integer': 'integer',
      'bigint': 'integer',
      'boolean': 'boolean',
      'float': 'double',
      'double': 'double',
      'binary': 'resource'
    };
    if (typeMap[column.type] !== undefined) {
      if (column.type === 'bigint' || column.type === 'integer') {
        return 'integer';
      } else {
        return typeMap[column.type];
      }
    } else {
      return 'string';
    }
  }

}