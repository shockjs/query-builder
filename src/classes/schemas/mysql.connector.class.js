import mysql from 'mysql';
import {QueryBuilder} from "../query.builder.class";
import {Command} from "../command.class";
import _ from "lodash";

/**
 * Simple mysql connector class.
 */
export class MySQLConnector {

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

  getQueryBuilder()
  {
    if (this._builder === null) {
      this._builder = this._createQueryBuilder();
    }

    return this._builder;
  }

  _createQueryBuilder()
  {
    return new QueryBuilder(this);
  }

  createCommand(sql = null, params = []) {
    return new Command({
      connection: this._connection,
      sql: sql,
      params: params
    });
  }

  end() {
    this._connection.end();
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
    return name.indexOf('`') !== -1 || name === '*' ? name : '`' + name + '`';
  }

  quoteSimpleTableName(name) {
    return name.indexOf("`") !== -1 ? name : "`" + name + "`";
  }
}