import {QueryBuilder} from "./query.builder.class";
import _ from "lodash";
import {Command} from "./command.class";

export class Connector {

  /**
   * Fetches or creates a new QueryBuilder.
   * @returns {QueryBuilder}
   */
  getQueryBuilder() {
    if (this._builder === null) {
      this._builder = this._createQueryBuilder();
    }

    return this._builder;
  }

  /**
   * Creates a QueryBuilder instance.
   * @returns {QueryBuilder}
   * @private
   */
  _createQueryBuilder() {
    return new QueryBuilder(this);
  }

  createCommand(sql = null, params = []) {
    return new Command({
      connection: this._connection,
      sql: sql,
      params: params
    });
  }

  quoteColumnName(name) {

    name = _.isString(name) ? name : name.toString();

    if (name.indexOf('(') !== -1 || name.indexOf('[[') !== -1 || name.indexOf('{{') !== -1) {
      return name;
    }
    var prefix;
    var pos = name.indexOf('.');
    if (pos !== -1) {
      prefix = this.quoteTableName(name.slice(0, pos)) + '.';
      name = name.slice(pos + 1);
    } else {
      prefix = '';
    }

    return prefix + this.quoteSimpleColumnName(name);
  }

  quoteTableName(name) {

    name = _.isString(name) ? name : name.toString();

    if (name.indexOf('(') !== -1 || name.indexOf('{{') !== -1) {
      return name;
    }
    if (name.indexOf('.') === -1) {
      return this.quoteSimpleTableName(name);
    }
    var parts = name.split('.');
    parts.forEach((i, part) => {
      parts[i] = this.quoteSimpleTableName(part);
    });

    return parts.join('.');
  }

  quoteSimpleColumnName(name) {
    throw new Error(`quoteSimpleColumnName must be implemented in ${this.name}`);
  }

  quoteSimpleTableName(name) {
    throw new Error(`quoteSimpleColumnName must be implemented in ${this.name}`);
  }

}