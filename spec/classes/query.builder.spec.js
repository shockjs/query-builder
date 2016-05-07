const Schema = require("../../dist/classes/schema.class").Schema;
const Query = require('../../dist/classes/query.class').Query;

describe("Query Builder", function() {

  Query.connect({
    "host": "localhost",
    "user": "shock",
    "password": "123",
    "database": "testdb"
  });
  var builder = Query.getDb().getQueryBuilder();

  it("generates query for table creation string in mysql", function() {
    var create = builder.createTable('tbl_user', {
      id: 'pk',
      firstName: Schema.TYPE_STRING + '(200) NOT NULL',
      0: '`lastName` varchar(255) NOT NULL'
    });
    expect(create).toEqual(
      "CREATE TABLE `tbl_user` (\n" +
      "\t`lastName` varchar(255) NOT NULL,\n" +
      "\t`id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,\n" +
      "\t`firstName` varchar(255) NOT NULL\n" +
      ")"
    );
  });

  it("generates query for renaming a table in mysql", function() {
    var create = builder.renameTable('tbl_user', 'tbl_person');
    expect(create).toEqual(
      "RENAME TABLE `tbl_user` TO `tbl_person`"
    );
  });

  it("generates query for dropping a table in mysql", function() {
    var create = builder.dropTable('tbl_person');
    expect(create).toEqual(
      "DROP TABLE `tbl_person`"
    );
  });

  it("generates query for adding a primary key to a table in mysql", function() {
    var create = builder.addPrimaryKey('PRIMARY_KEY', 'tbl_person', ['id']);
    expect(create).toEqual(
      "ALTER TABLE `tbl_person` ADD CONSTRAINT `PRIMARY_KEY`  PRIMARY KEY (`id` )"
    );
  });

  it("generates query for dropping a primary key from a table in mysql", function() {
    var create = builder.dropPrimaryKey('PRIMARY_KEY', 'tbl_person');
    expect(create).toEqual(
      "ALTER TABLE `tbl_person` DROP CONSTRAINT `PRIMARY_KEY`"
    );
  });

  it("generates query for truncating a table in mysql", function() {
    var create = builder.truncateTable('tbl_person');
    expect(create).toEqual(
      "TRUNCATE TABLE `tbl_person`"
    );
  });

  it("generates query for adding a column in a table in mysql", function() {
    var create = builder.addColumn('tbl_person', 'fullName', 'string');
    expect(create).toEqual(
      "ALTER TABLE `tbl_person` ADD `fullName` varchar(255)"
    );
  });

  it("generates query for dropping a column in a table in mysql", function() {
    var create = builder.dropColumn('tbl_person', 'fullName');
    expect(create).toEqual(
      "ALTER TABLE `tbl_person` DROP COLUMN `fullName`"
    );
  });

  it("generates query for renaming a column in a table in mysql", function() {
    var create = builder.renameColumn('tbl_person', 'fullName', 'completeName', 'string');
      expect(create).toEqual(
        "ALTER TABLE `tbl_person` CHANGE `fullName` `completeName` varchar(255)"
      );

  });

  it("generates query for altering a column in a table in mysql", function() {
    var create = builder.alterColumn('tbl_person', 'fullName', 'varchar(1000)');
    expect(create).toEqual(
      "ALTER TABLE `tbl_person` CHANGE `fullName` `fullName` varchar(1000)"
    );
  });

  it("generates query for adding a foreign key to a table in mysql", function() {
    var create = builder.addForeignKey(
      'FK_tbl_person_tbl_post',
      'tbl_post',
      'person_id',
      'tbl_person',
      'id',
      'CASCADE',
      'CASCADE'
    );
    expect(create).toEqual(
      "ALTER TABLE `tbl_post` ADD CONSTRAINT `FK_tbl_person_tbl_post` " +
      "FOREIGN KEY (person_id) REFERENCES `tbl_person` (id) ON DELETE CASCADE ON UPDATE CASCADE"
    );
  });

  it("generates query for dropping a foreign key in mysql", function() {
    var create = builder.dropForeignKey('FK_tbl_person_tbl_post`', 'tbl_post');
    expect(create).toEqual(
      "ALTER TABLE `tbl_post` DROP CONSTRAINT FK_tbl_person_tbl_post`"
    );
  });

  it("generates query for creating a index in mysql", function() {
    var create = builder.createIndex('IX_post_name', 'tbl_post', 'postName');
    expect(create).toEqual(
      "ALTER TABLE `tbl_post` ADD INDEX `IX_post_name` (postName)"
    );
  });

  it("generates query for creating a unique index in mysql", function() {
    var create = builder.createIndex('IX_post_name', 'tbl_post', 'postName', true);
    expect(create).toEqual(
      "ALTER TABLE `tbl_post` ADD UNIQUE INDEX `IX_post_name` (postName)"
    );
  });

  it("generates query for dropping an index in mysql", function() {
    var create = builder.dropIndex('IX_post_name', 'tbl_post');
    expect(create).toEqual(
      "DROP INDEX `IX_post_name` ON `tbl_post`"
    );
  });

  it("generates query for resetting sequence in mysql", function() {
    var create = builder.resetSequence('tbl_person', 1);
    expect(create).toEqual(
      "ALTER TABLE `tbl_person` AUTO_INCREMENT=1"
    );
  });

  it("generates query for changing integrity in mysql", function() {
    var create = builder.checkIntegrity(false);
    expect(create).toEqual(
      "SET FOREIGN_KEY_CHECKS = 0"
    );
  });

});