"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (value) {
  if (_lodash2.default.isString(value)) {
    var temp = value.trim().split(/\s*,\s*/);
    if (temp.length > 0) {
      value = temp;
    } else {
      value = [value];
    }
  }
  return value;
};

var _lodash = require("lodash");

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }