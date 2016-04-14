describe("Query", function() {
  var Query = require('../../dist/classes/query.class').Query;
  var query;

  beforeEach(function() {
    query = new Query();
  });

  it("testing select *", function() {
    query.select('*');
    expect(query._select).toEqual(['*']);
    expect(query._distinct).toEqual(null);
    expect(query._selectOption).toEqual(null);
  });

  it("testing select with string option and select option", function() {
    query.select('id, name', 'something').distinct(true);
    expect(query._select).toEqual(['id', 'name']);
    expect(query._distinct).toBeTruthy();
    expect(query._selectOption).toEqual('something');
  });

  it("testing select with string option", function() {
    query.select('email').distinct(true);
    expect(query._select).toEqual(['email']);
  });

  it("testing addSelect", function() {
    query.addSelect('email');
    expect(query._select).toEqual(['email']);
  });

  it("testing select with addSelect", function() {
    query.select('id, name');
    query.addSelect('email');
    expect(query._select).toEqual(['id', 'name', 'email']);
  });

});