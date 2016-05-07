"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
class Command {

  constructor({ connection, sql, params }) {
    this._connection = connection;
    this._sql = sql;
    this._params = params;
  }

  execute() {
    //console.log('query:', this._sql, this._params);
    return new Promise((resolve, reject) => {
      this._connection.query(this._sql, this._params, function (err, rows, fields) {
        if (err) {
          reject(err);
        }
        resolve({ rows: rows, fields: fields });
      });
    });
  }
}
exports.Command = Command;