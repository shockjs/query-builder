"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
class TableSchema {
  constructor() {
    this.name = null;
    this.fullName = null;
    this.foreignKeys = [];
    this.primaryKey = [];
    this.schemaName = null;
    this.columns = {};
    this.sequenceName = null;
  }
}
exports.TableSchema = TableSchema;