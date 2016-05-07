import Schema from "./schema.class";

export class ColumnSchema {

  constructor() {
    /**
     * @var string name of this column (without quotes).
     */
    this.name = null;
    /**
     * @var boolean whether this column can be null.
     */
    this.allowNull = null;
    /**
     * @var string abstract type of this column. Possible abstract types include:
     * string, text, boolean, smallint, integer, bigint, float, decimal, datetime,
     * timestamp, time, date, binary, and money.
     */
    this.type = null;
    /**
     * @var string the PHP type of this column. Possible PHP types include:
     * `string`, `boolean`, `integer`, `double`.
     */
    this.phpType = null;
    /**
     * @var string the DB type of this column. Possible DB types vary according to the type of DBMS.
     */
    this.dbType = null;
    /**
     * @var mixed default value of this column
     */
    this.defaultValue = null;
    /**
     * @var array enumerable values. This is set only if the column is declared to be an enumerable type.
     */
    this.enumValues = null;
    /**
     * @var integer display size of the column.
     */
    this.size = null;
    /**
     * @var integer precision of the column data, if it is numeric.
     */
    this.precision = null;
    /**
     * @var integer scale of the column data, if it is numeric.
     */
    this.scale = null;
    /**
     * @var boolean whether this column is a primary key
     */
    this.isPrimaryKey = null;
    /**
     * @var boolean whether this column is auto-incremental
     */
    this.autoIncrement = false;
    /**
     * @var boolean whether this column is unsigned. This is only meaningful
     * when [[type]] is `smallint`, `integer` or `bigint`.
     */
    this.unsigned = null;
    /**
     * @var string comment of this column. Not all DBMS support this.
     */
    this.comment = null;
  }

  /**
   * Converts the input value according to [[phpType]] after retrieval from the database.
   * If the value is null or an [[Expression]], it will not be converted.
   * @param {string} value input value
   * @return {string|number} converted value
   */
  jsTypecast(value) {
    return this.typecast(value);
  }

  /**
   * Converts the input value according to [[type]] and [[dbType]] for use in a db query.
   * If the value is null or an [[Expression]], it will not be converted.
   * @param {string|number} value input value
   * @return {string|number} converted value. This may also be an array containing the value as the first element
   * and the PDO type as the second element.
   */
  dbTypecast(value) {
    // the default implementation does the same as casting for PHP, but it should be possible
    // to override this with annotation of explicit PDO type.
    return this.typecast(value);
  }

  /**
   * Converts the input value according to [[phpType]] after retrieval from the database.
   * If the value is null it will not be converted.
   * @param {string} value input value
   * @return {string|number} converted value
   * @since 2.0.3
   */
  typecast(value) {
    if (value === '' && this.type !== Schema.TYPE_TEXT && this.type !== Schema.TYPE_STRING && this.type !== Schema.TYPE_BINARY) {
      return null;
    }
    if (value === null || gettype(value) === this.phpType) {
      return value;
    }
    switch (this.phpType) {
      case 'string':
        if (is_float(value)) {
          // ensure type cast always has . as decimal separator in all locales
          return str_replace(',', '.', value.toString());
        }
        return value.toString();
      case 'integer':
        return Number(value);
      case 'boolean':
        // treating a 0 bit value as false too
        // https://github.com/yiisoft/yii2/issues/9006
        return value && value !== "\0";
      case 'double':
        return parseFloat(value);
    }

    return value;
  }
}