import {QueryBuilder as BaseQueryBuilder} from "../../query.builder.class";
import {Schema} from "./schema.class";

export class QueryBuilder extends BaseQueryBuilder {

  /**
   * @param {Object} db The database connector.
   */
  constructor(db) {
    super(db);
    this.typeMap = {};
    this.typeMap[Schema.TYPE_PK] = 'int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY';
    this.typeMap[Schema.TYPE_BIGPK] = 'bigint(20) NOT NULL AUTO_INCREMENT PRIMARY KEY';
    this.typeMap[Schema.TYPE_STRING] = 'varchar(255)';
    this.typeMap[Schema.TYPE_TEXT] = 'text';
    this.typeMap[Schema.TYPE_SMALLINT] = 'smallint(6)';
    this.typeMap[Schema.TYPE_INTEGER] = 'int(11)';
    this.typeMap[Schema.TYPE_BIGINT] = 'bigint(20)';
    this.typeMap[Schema.TYPE_FLOAT] = 'float';
    this.typeMap[Schema.TYPE_DOUBLE] = 'double';
    this.typeMap[Schema.TYPE_DECIMAL] = 'decimal(10,0)';
    this.typeMap[Schema.TYPE_DATETIME] = 'datetime';
    this.typeMap[Schema.TYPE_TIMESTAMP] = 'timestamp';
    this.typeMap[Schema.TYPE_TIME] = 'time';
    this.typeMap[Schema.TYPE_DATE] = 'date';
    this.typeMap[Schema.TYPE_BINARY] = 'blob';
    this.typeMap[Schema.TYPE_BOOLEAN] = 'tinyint(1)';
    this.typeMap[Schema.TYPE_MONEY] = 'decimal(19,4)';
  }

  /**
   * Builds a SQL statement for renaming a column.
   * @param {String} table the table whose column is to be renamed. The name will be properly quoted by the method.
   * @param {String} oldName the old name of the column. The name will be properly quoted by the method.
   * @param {String} newName the new name of the column. The name will be properly quoted by the method.
   * @param {String} type The column type.
   * @return {String} the SQL statement for renaming a DB column.
   * @throws Exception
   */
  renameColumn(table, oldName, newName, type='') {
    var quotedTable = this._db.quoteTableName(table);
    // try to give back a SQL anyway
    return `ALTER TABLE ${quotedTable} CHANGE `
      + this._db.quoteColumnName(oldName) + ' '
      + this._db.quoteColumnName(newName) + ' '
      + this.getColumnType(type);
  }

  /**
   * @inheritdoc
   */
  resetSequence(tableName, value = 1) {
    return `ALTER TABLE ${this._db.quoteTableName(tableName)} AUTO_INCREMENT=${value}`;
  }

  /**
   * Builds a SQL statement for enabling or disabling integrity check.
   * @param {Boolean} check whether to turn on or off the integrity check.
   * @param {String} schema the schema of the tables. Meaningless for MySQL.
   * @param {String} table the table name. Meaningless for MySQL.
   * @return string the SQL statement for checking integrity
   */
  checkIntegrity(check = true, schema = '', table = '') {
    return 'SET FOREIGN_KEY_CHECKS = ' + (check ? 1 : 0);
  }

  /**
   * @inheritdoc
   */
  createIndex(name, table, columns, unique = false) {
    return 'ALTER TABLE '
      + this._db.quoteTableName(table)
    + (unique ? ' ADD UNIQUE INDEX ' : ' ADD INDEX ')
    + this._db.quoteTableName(name)
    + ' (' + this.buildColumns(columns) + ')';
  }

}