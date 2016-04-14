var SORT_ASC = require("../../dist/constants").SORT_ASC;
var SORT_DESC = require("../../dist/constants").SORT_DESC;

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

  it("testing from", function() {
    query.from('user');
    expect(query._from).toEqual(['user']);
  });

  it("testing where", function() {
    query.from('user');
    query.where('id = :id', {':id': 1});
    expect(query._where).toEqual('id = :id');
    expect(query._params).toEqual({':id': 1});
    query.andWhere('name = :name', {':name': 'something'});
    expect(query._where).toEqual(['and', 'id = :id', 'name = :name']);
    expect(query._params).toEqual({':id': 1,':name': 'something'});
    query.orWhere('age = :age', {':age': '30'});
    expect(query._where).toEqual(['or', ['and', 'id = :id', 'name = :name'], 'age = :age']);
    expect(query._params).toEqual({':id': 1,':name': 'something',':age': '30'});
  });

  it("testing groupBy", function() {
    query.groupBy('team');
    expect(query._groupBy).toEqual(['team']);
    query.addGroupBy('company');
    expect(query._groupBy).toEqual(['team', 'company']);
    query.addGroupBy('age');
    expect(query._groupBy).toEqual(['team', 'company', 'age']);
  });

  it("testing having", function() {
    query.having('id = :id', {':id': 1});
    expect(query._having).toEqual('id = :id');
    expect(query._params).toEqual({':id': 1});
    query.andHaving('name = :name', {':name': 'something'});
    expect(query._having).toEqual(['and', 'id = :id', 'name = :name']);
    expect(query._params).toEqual({':id': 1,':name': 'something'});
    query.orHaving('age = :age', {':age': '30'});
    expect(query._having).toEqual(['or', ['and', 'id = :id', 'name = :name'], 'age = :age']);
    expect(query._params).toEqual({':id': 1,':name': 'something',':age': '30'});
  });

  it("testing orderBy", function() {
    query.orderBy('team');
    expect(query._orderBy).toEqual({'team': SORT_ASC});
    query.addOrderBy('company');
    expect(query._orderBy).toEqual({'team': SORT_ASC, 'company': SORT_ASC});
    query.addOrderBy('age');
    expect(query._orderBy).toEqual({'team': SORT_ASC, 'company': SORT_ASC, 'age': SORT_ASC});
    query.addOrderBy({'age': SORT_DESC});
    expect(query._orderBy).toEqual({'team': SORT_ASC, 'company': SORT_ASC, 'age': SORT_DESC});
    query.addOrderBy('age ASC, company DESC');
    expect(query._orderBy).toEqual({'team': SORT_ASC, 'company': SORT_DESC, 'age': SORT_ASC});
  });

  it("testing limit and offset", function() {
    query.limit(10).offset(5);
    expect(query._limit).toEqual(10);
    expect(query._offset).toEqual(5);
  });

});