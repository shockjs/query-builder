import _ from "lodash";

/**
 * If value is a CSV String then split into an array
 * @param value
 * @returns {*}
 * @private
 */
export default function(value) {
  if (_.isString(value)) {
    var temp = value.trim().split(/\s*,\s*/);
    if (temp.length > 0) {
      value = temp;
    } else {
      value = [value];
    }
  }
  return value;
}