#Query Builder

This is an attempt to port Query builder from Yii2. MySQL is currently all that is supported at this time.

Query builder allows you to construct a SQL query in a programmatic and DBMS-agnostic way. Compared to writing raw SQL statements, using query builder will help you write more readable SQL-related code and generate more secure SQL statements.

Using query builder usually involves two steps:

Build a Query object to represent different parts (e.g. SELECT, FROM) of a SELECT SQL statement.
Execute a query method (e.g. all()) of Query to retrieve data from the database.
The following code shows a typical way of using query builder:

```javascript
new Query()
    .select(['id', 'email'])
    .from('user')
    .where({'last_name': 'Smith'})
    .limit(10)
    .all()
    .then((rows) => {
        
    });
```

The above code generates and executes the following SQL query, where the :last_name parameter is bound with the string 'Smith'.

```sql
SELECT `id`, `email` 
FROM `user`
WHERE `last_name` = :last_name
LIMIT 10
```

Info: You usually mainly work with Query instead of QueryBuilder. The latter is invoked by the former implicitly when you call one of the query methods. QueryBuilder is the class responsible for generating DBMS-dependent SQL statements (e.g. quoting table/column names differently) from DBMS-independent Query objects.

## Connection settings

To open a connection.
```javascript
Query.connect({
    "schemaType": "mysql",
    "host": "xxxx",
    "user": "xxxx",
    "password": "xxxx",
    "database": "xxxx"
});
```

To close the connection.
```javascript
Query.end();
```

## Building Queries
To build a Query object, you call different query building methods to specify different parts of a SQL query. The names of these methods resemble the SQL keywords used in the corresponding parts of the SQL statement. For example, to specify the FROM part of a SQL query, you would call the from() method. All the query building methods return the query object itself, which allows you to chain multiple calls together.

In the following, we will describe the usage of each query building method.

### select()
The select() method specifies the SELECT fragment of a SQL statement. You can specify columns to be selected in either an array or a string, like the following. The column names being selected will be automatically quoted when the SQL statement is being generated from a query object.
```javascript
query.select(['id', 'email']);

// equivalent to:

query.select('id, email');
```

The column names being selected may include table prefixes and/or column aliases, like you do when writing raw SQL queries. For example,

```javascript
query.select(['user.id AS user_id', 'email']);

// equivalent to:

query.select('user.id AS user_id, email');
```

To use aliases with normal selections you will need to convert array to object and use numeral indexes to specify that it will use the same name; otherwise the key becomes the alias.
```javascript
query.select({'user_id': 'user.id', 0: 'email'});
```


If you do not call the select() method when building a query, * will be selected, which means selecting all columns.

Besides column names, you can also select DB expressions. You must use the array format when selecting a DB expression that contains commas to avoid incorrect automatic name quoting. For example,

```javascript
query.select(["CONCAT(first_name, ' ', last_name) AS full_name", 'email']); 
```

As with all places where raw SQL is involved, you may use the DBMS agnostic quoting syntax for table and column names when writing DB expressions in select.
You you may also select sub-queries. You should specify each sub-query in terms of a Query object. For example,
```javascript
subQuery = new Query().select('COUNT(*)').from('user');

// SELECT `id`, (SELECT COUNT(*) FROM `user`) AS `count` FROM `post`
query = new Query().select({0: 'id', count: subQuery}).from('post');
```

To select distinct rows, you may call distinct(), like the following:
```javascript
// SELECT DISTINCT `user_id` ...
query.select('user_id').distinct();
```

You can call addSelect() to select additional columns. For example,
```javascript
query.select(['id', 'username'])
    .addSelect(['email']);
```

### from()
The from() method specifies the FROM fragment of a SQL statement. For example,
```javascript
// SELECT * FROM `user`
query.from('user');
```

You can specify the table(s) being selected from in either a string or an array. The table names may contain schema prefixes and/or table aliases, like you do when writing raw SQL statements. For example,
```javascript
query.from(['public.user u', 'public.post p']);

// equivalent to:

query.from('public.user u, public.post p');
```

If you are using the array format, you can also use the array keys to specify the table aliases, like the following:
```javascript
query.from({'u': 'public.user', 'p': 'public.post'});
```

Besides table names, you can also select from sub-queries by specifying them in terms of Query objects. For example,
```javascript
subQuery = new Query().select('id').from('user').where('status=1');

// SELECT * FROM (SELECT `id` FROM `user` WHERE status=1) u 
query.from({'u': subQuery});
```

### where()
The where() method specifies the WHERE fragment of a SQL query. You can use one of the three formats to specify a WHERE condition:

* string format, e.g., 'status=1'
* hash format, e.g. {'status': 1, 'type': 2}
* operator format, e.g. ['like', 'name', 'test']

#### String Format
String format is best used to specify very simple conditions or if you need to use builtin functions of the DBMS. It works as if you are writing a raw SQL. For example,

```javascript
query.where('status=1');

// or use parameter binding to bind dynamic parameter values
query.where('status=:status', {':status': status});

// raw SQL using MySQL YEAR() function on a date field
query.where('YEAR(somedate) = 2015');
```

Do NOT embed variables directly in the condition like the following, especially if the variable values come from end user inputs, because this will make your application subject to SQL injection attacks.
```javascript
// Dangerous! Do NOT do this unless you are very certain status must be an integer.
query.where("status=status");
```

When using parameter binding, you may call params() or addParams() to specify parameters separately.

```javascript
query.where('status=:status')
    .addParams({':status': status});
```

As with all places where raw SQL is involved, you may use the DBMS agnostic quoting syntax for table and column names when writing conditions in string format.

#### Hash Format
Hash format is best used to specify multiple AND-concatenated sub-conditions each being a simple equality assertion. It is written as an array whose keys are column names and values the corresponding values that the columns should be. For example,

```javascript
// ...WHERE (`status` = 10) AND (`type` IS NULL) AND (`id` IN (4, 8, 15))
query.where({
    'status': 10,
    'type': null,
    'id': [4, 8, 15],
});
```

As you can see, the query builder is intelligent enough to properly handle values that are nulls or arrays.

You can also use sub-queries with hash format like the following:
```javascript
userQuery = new Query().select('id').from('user');

// ...WHERE `id` IN (SELECT `id` FROM `user`)
query.where({'id': userQuery});
```

Using the Hash Format, this Query Builder internally uses parameter binding so in contrast to the string format, here you do not have to add parameters manually.

#### Operator Format
Operator format allows you to specify arbitrary conditions in a programmatic way. It takes the following format:
```
[operator, operand1, operand2, ...]
```
where the operands can each be specified in string format, hash format or operator format recursively, while the operator can be one of the following:

* and: the operands should be concatenated together using AND. For example, ['and', 'id=1', 'id=2'] will generate id=1 AND id=2. If an operand is an array, it will be converted into a string using the rules described here. For example, ['and', 'type=1', ['or', 'id=1', 'id=2']] will generate type=1 AND (id=1 OR id=2). The method will NOT do any quoting or escaping.
* or: similar to the and operator except that the operands are concatenated using OR.
* between: operand 1 should be the column name, and operand 2 and 3 should be the starting and ending values of the range that the column is in. For example, ['between', 'id', 1, 10] will generate id BETWEEN 1 AND 10.
* not between: similar to between except the BETWEEN is replaced with NOT BETWEEN in the generated condition.
* in: operand 1 should be a column or DB expression. Operand 2 can be either an array or a Query object. It will generate an IN condition. If Operand 2 is an array, it will represent the range of the values that the column or DB expression should be; If Operand 2 is a Query object, a sub-query will be generated and used as the range of the column or DB expression. For example, ['in', 'id', [1, 2, 3]] will generate id IN (1, 2, 3). The method will properly quote the column name and escape values in the range. The in operator also supports composite columns. In this case, operand 1 should be an array of the columns, while operand 2 should be an array of arrays or a Query object representing the range of the columns.
* not in: similar to the in operator except that IN is replaced with NOT IN in the generated condition.
* like: operand 1 should be a column or DB expression, and operand 2 be a string or an array representing the values that the column or DB expression should be like. For example, ['like', 'name', 'tester'] will generate name LIKE '%tester%'. When the value range is given as an array, multiple LIKE predicates will be generated and concatenated using AND. For example, ['like', 'name', ['test', 'sample']] will generate name LIKE '%test%' AND name LIKE '%sample%'. You may also provide an optional third operand to specify how to escape special characters in the values. The operand should be an array of mappings from the special characters to their escaped counterparts. If this operand is not provided, a default escape mapping will be used. You may use false or an empty array to indicate the values are already escaped and no escape should be applied. Note that when using an escape mapping (or the third operand is not provided), the values will be automatically enclosed within a pair of percentage characters.
* or like: similar to the like operator except that OR is used to concatenate the LIKE predicates when operand 2 is an array.
* not like: similar to the like operator except that LIKE is replaced with NOT LIKE in the generated condition.
* or not like: similar to the not like operator except that OR is used to concatenate the NOT LIKE predicates.
* exists: requires one operand which must be an instance of Query representing the sub-query. It will build a EXISTS (sub-query) expression.
* not exists: similar to the exists operator and builds a NOT EXISTS (sub-query) expression.
* \>, <=, or any other valid DB operator that takes two operands: the first operand must be a column name while the second operand a value. For example, ['>', 'age', 10] will generate age>10.

Using the Operator Format, Query Builder internally uses parameter binding so in contrast to the string format, here you do not have to add parameters manually.

#### Appending Conditions
You can use andWhere() or orWhere() to append additional conditions to an existing one. You can call them multiple times to append multiple conditions separately. For example,
```javascript
var status = 10;
var search = 'search';

query.where({'status': status});

if (search.length > 0) {
    query.andWhere(['like', 'title', search]);
}
```

If search is not empty, the following WHERE condition will be generated:
```sql
WHERE (`status` = 10) AND (`title` LIKE '%search%')
```

### orderBy()

The orderBy() method specifies the ORDER BY fragment of a SQL query. For example,

```javascript
// ... ORDER BY `id` ASC, `name` DESC
query.orderBy({
    'id': SORT_ASC, // Needs to be imported
    'name': SORT_DESC, //Needs to be imported
});
```

In the above code, the object keys are column names while the object values are the corresponding order-by directions. The constant SORT_ASC specifies ascending sort and SORT_DESC descending sort.

If ORDER BY only involves simple column names, you can specify it using a string, just like you do when writing raw SQL statements. For example,
```javascript
query.orderBy('id ASC, name DESC');
```

You can call addOrderBy() to add additional columns to the ORDER BY fragment. For example,
```javascript
query.orderBy('id ASC')
    .addOrderBy('name DESC');
```

### groupBy()
The groupBy() method specifies the GROUP BY fragment of a SQL query. For example,
```javascript
// ... GROUP BY `id`, `status`
query.groupBy(['id', 'status']);
```
If GROUP BY only involves simple column names, you can specify it using a string, just like you do when writing raw SQL statements. For example,
```javascript
query.groupBy('id, status');
```

You can call addGroupBy() to add additional columns to the GROUP BY fragment. For example,
```
query.groupBy(['id', 'status'])
    .addGroupBy('age');
```

### having()
The having() method specifies the HAVING fragment of a SQL query. It takes a condition which can be specified in the same way as that for where(). For example

```javascript
// ... HAVING `status` = 1
query.having({'status': 1});
```

Please refer to the documentation for where() for more details about how to specify a condition.

You can call andHaving() or orHaving() to append additional conditions to the HAVING fragment. For example,
```javascript
// ... HAVING (`status` = 1) AND (`age` > 30)
query.having({'status': 1})
    .andHaving(['>', 'age', 30]);
```

### limit() and offset()
The limit() and offset() methods specify the LIMIT and OFFSET fragments of a SQL query. For example,
```javascript
// ... LIMIT 10 OFFSET 20
query.limit(10).offset(20);
```
If you specify an invalid limit or offset (e.g. a negative value), it will be ignored.

### join
The join() method specifies the JOIN fragment of a SQL query. For example,
```javascript
// ... LEFT JOIN `post` ON `post`.`user_id` = `user`.`id`
query.join('LEFT JOIN', 'post', 'post.user_id = user.id');
```

The join() method takes four parameters:
* type: join type, e.g., 'INNER JOIN', 'LEFT JOIN'.
* table: the name of the table to be joined.
* on: optional, the join condition, i.e., the ON fragment. Please refer to where() for details about specifying a condition. Note, that the array syntax does not work for specifying a column based condition, e.g. ['user.id' => 'comment.userId'] will result in a condition where the user id must be equal to the string 'comment.userId'. You should use the string syntax instead and specify the condition as 'user.id = comment.userId'.
* params: optional, the parameters to be bound to the join condition.

You can use the following shortcut methods to specify INNER JOIN, LEFT JOIN and RIGHT JOIN, respectively.
* innerJoin()
* leftJoin()
* rightJoin()

For example,
```javascript
query.leftJoin('post', 'post.user_id = user.id');
```

To join with multiple tables, call the above join methods multiple times, once for each table.

Besides joining with tables, you can also join with sub-queries. To do so, specify the sub-queries to be joined as Query objects. For example,
```javascript
subQuery = Query().from('post');
query.leftJoin({'u': subQuery], 'u.id = author_id');
```
In this case, you should put the sub-query in an object and use the object key to specify the alias.

### union()
The union() method specifies the UNION fragment of a SQL query. For example,
```javascript
var query1 = new Query()
    .select("id, category_id AS type, name")
    .from('post')
    .limit(10);

var query2 = Query()
    .select('id, type, name')
    .from('user')
    .limit(10);

query1.union(query2);
```

You can call union() multiple times to append more UNION fragments.