import mysql from 'mysql';
import {Connector as BaseConnector} from "../../connector.class";
import {Schema} from "./schema.class";
import {QueryBuilder} from "./query.builder.class";

/**
 * Simple mysql connector class.
 */
export class Connector extends BaseConnector {

  connect(config) {
    this._connection = mysql.createConnection(config);
    this._connection.connect();
    this._connection.config.queryFormat = function(query, values) {
      if (!values) return query;
      return query.replace(/(\:\w+)/g, function (txt, key) {
        if (values.hasOwnProperty(key)) {
          return this.escape(values[key]);
        }
        return txt;
      }.bind(this));
    };
    this._builder = null;
  }

  /**
   * Creates a QueryBuilder instance.
   * @returns {QueryBuilder}
   * @private
   */
  _createQueryBuilder() {
    return new QueryBuilder(this);
  }

  end() {
    this._connection.end();
  }

  getSchema() {
    return new Schema(this);
  }

  getDriverName() {
    return 'mysql';
  }

  quoteSimpleColumnName(name) {
    return name.indexOf('`') !== -1 || name === '*' ? name : '`' + name + '`';
  }

  quoteSimpleTableName(name) {
    return name.indexOf("`") !== -1 ? name : "`" + name + "`";
  }
  
  
  
}