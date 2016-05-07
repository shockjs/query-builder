const TableSchema = require("../../dist/classes/table.schema.class").TableSchema;
var Schema = require("../../dist/classes/schema.class").Schema;
var Query = require('../../dist/classes/query.class').Query;

describe("Schema", function() {
  
  Query.connect({
    "host": "localhost",
    "user": "shock",
    "password": "123",
    "database": "testdb"
  });
  var schema = Query.getDb().getSchema();

  it("testing getTableSchema", function(done) {
    schema.getTableSchema('tbl_person').then((data) => {
      expect(data instanceof TableSchema).toEqual(true);
      expect(data.name).toEqual('tbl_person');
      expect(data.primaryKey).toEqual(['id']);
      done();
    });
  });
  
});