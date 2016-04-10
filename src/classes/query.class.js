import _ from 'lodash';
import {SORT_ASC, SORT_DESC} from '../constants';
import {MySQLConnector} from "./mysql.connector.class";

export class Query {

  static connect(details) {
    Query._connector.connect(details);
  };

  static end() {
    Query._connector.end();
  };

  constructor() {
    this._select = null;
    this._selectOption = null;
    this._distinct = null;
    this._from = null;
    this._where = '';
    this._limit = null;
    this._offset = null;
    this._orderBy = null;
    this._groupBy = null;
    this._join = null;
    this._having = '';
    this._union = null;
    this._params = {};
  }

  createCommand() {
    var {0: sql, 1:params} = Query._connector.getQueryBuilder().build(this);
    return Query._connector.createCommand(sql, params);
  }

  all() {
    return this.createCommand().execute().then((data) => data.rows ? data.rows : null);
  }

  one() {
    return this.createCommand().execute().then((data) => data.rows ? data.rows.pop() : null);
  }

  /**
   * If value is a CSV String then split into an array
   * @param value
   * @returns {*}
   * @private
   */
  _CSVToArray(value) {
    if (!_.isArray(value) && !_.isObject(value)) {
      var temp = value.split(/\s*,\s*/, value.trim());
      if (temp.length > 0) {
        value = temp;
      } else {
        value = [value];
      }
    }
    return value;
  }

  /**
   * Merges like php arrays where numbered keys get merged and string keys overwrite.
   *
   * @param mergeTo
   * @param mergeFrom
   * @returns {Object}
   * @private
   */
  _mergeValues(mergeTo, mergeFrom) {

    //If both are arrays then there is nothing else to do
    if (_.isArray(mergeTo) && _.isArray(mergeFrom)) {
      return _.merge(mergeTo, mergeFrom);
    }

    //Extract numbered keys into an array and convert back to object so that values get combined.
    var numbered = _.reduce(
      _.filter(
        mergeTo,
        (v, k) => !isNaN(k)
      ).concat(
        _.filter(
          mergeFrom,
          (v, k) => !isNaN(k)
        )
      ),
      (o, v, i) => {
        o[i] = v;
        return o;
      },
      {}
    );

    // Extract aliased values from arrays
    var keyed = _.extend(
      _.omitBy(mergeTo, (v, k) => {
        return !isNaN(k);
      }),
      _.omitBy(mergeFrom, (v, k) => {
        return !isNaN(k);
      })
    );

    return _.extend(keyed, numbered);

  }

  select(columns, option = null) {
    columns = this._CSVToArray(columns);
    this._select = columns;
    this._selectOption = option;
    return this;
  }

  addSelect(columns) {
    columns = this._CSVToArray(columns);
    if (this._select === null) {
      this._select = columns;
    } else {
      this._select = this._mergeValues(this._select, columns);
    }
    return this;
  }

  distinct(value = true) {
    this._distinct = value;
    return this;
  }

  from(tables) {
    tables = this._CSVToArray(tables);
    this._from = tables;
    return this;
  }

  where(condition, params) {
    this._where = condition;
    this.addParams(params);
    return this;
  }

  andWhere(condition, params) {
    if (this._where === null) {
      this._where = condition;
    } else {
      this._where = ['and', this._where, condition];
    }
    this.addParams(params);
    return this;
  }

  orWhere(condition, params = []) {
    if (this._where === null) {
      this._where = condition;
    } else {
      this._where = ['or', this._where, condition];
    }
    this.addParams(params);
    return this;
  }

  join(type, table, on = '', params = []) {
    this._join.push([type, table, on]);
    return this.addParams(params);
  }

  innerJoin(table, on = '', params = []) {
    this._join.push(['INNER JOIN', table, on]);
    return this.addParams(params);
  }

  leftJoin(table, on = '', params = [])
  {
    this._join.push(['LEFT JOIN', table, on]);
    return this.addParams(params);
  }

  rightJoin(table, on = '', params = []) {
    this._join.push(['RIGHT JOIN', table, on]);
    return this.addParams(params);
  }

  groupBy(columns) {
    columns = this._CSVToArray(columns);
    this._groupBy = columns;
    return this;
  }

  addGroupBy(columns) {
    columns = this._CSVToArray(columns);
    if (this._groupBy === null) {
      this._groupBy = columns;
    } else {
      this._groupBy = _.merge(this._groupBy, columns);
    }
    return this;
  }

  having(condition, params = []) {
    this._having = condition;
    this.addParams(params);
    return this;
  }

  andHaving(condition, params = []) {
    if (this._having === null) {
      this._having = condition;
    } else {
      this._having = ['and', this._having, condition];
    }
    this.addParams(params);
    return this;
  }

  orHaving(condition, params = []) {
    if (this._having === null) {
      this._having = condition;
    } else {
      this._having = ['or', this._having, condition];
    }
    this.addParams(params);
    return this;
  }

  orderBy(columns)
  {
    this._orderBy = this.normalizeOrderBy(columns);
    return this;
  }

  normalizeOrderBy(columns)
  {
    if (_.isObject(columns)) {
      return columns;
    } else {
      columns = columns.trim().split(/\s*,\s*/).filter((value) => { return value != '' });
      var result = [];
      Object.keys(columns).forEach((key) => {
        var matches = columns[key].match(/^(.*?)\s+(asc|desc)$/i);
      if (matches) {
        result[matches[1]] = matches[2].localeCompare('desc') ? SORT_ASC : SORT_DESC;
      } else {
        result[columns[key]] = SORT_ASC;
      }
    });
      return result;
    }
  }

  union(sql, all = false) {
    this._union.push({query: sql, all: all});
    return this;
  }

  params(params)
  {
    this.params = params;
    return this;
  }

  addParams(params)
  {
    if (!_.isEmpty(params)) {
      if (_.isEmpty(this._params)) {
        this._params = params;
      } else {
        Object.keys(params).forEach((name) => {
          this._params[name] = params[name];
      });
      }
    }
    return this;
  }

}

Query._connector = new MySQLConnector();