'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Command = exports.Command = function () {
  function Command(_ref) {
    var connection = _ref.connection;
    var sql = _ref.sql;
    var params = _ref.params;

    _classCallCheck(this, Command);

    this._connection = connection;
    this._sql = sql;
    this._params = params;
  }

  _createClass(Command, [{
    key: 'execute',
    value: function execute() {
      var _this = this;

      console.log('query:', this._sql, this._params);
      return new Promise(function (resolve, reject) {
        _this._connection.query(_this._sql, _this._params, function (err, rows, fields) {
          if (err) {
            reject(err);
          }
          resolve({ rows: rows, fields: fields });
        });
      });
    }
  }]);

  return Command;
}();