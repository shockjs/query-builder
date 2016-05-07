const Query = require("./src/classes/query.class").Query;
const constants = require("./dist/constants");

module.exports = {
  Query: Query,
  SORT_ASC: constants.SORT_ASC,
  SORT_DESC: constants.SORT_DESC
};
