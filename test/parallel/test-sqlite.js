// Flags: --experimental-sqlite
'use strict';
const { spawnPromisified } = require('../common');
const tmpdir = require('../common/tmpdir');
const { join } = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { suite, test } = require('node:test');
let cnt = 0;

tmpdir.refresh();

function nextDb() {
  return join(tmpdir.path, `database-${cnt++}.db`);
}

suite('accessing the node:sqlite module', () => {
  test('cannot be accessed without the node: scheme', (t) => {
    t.assert.throws(() => {
      require('sqlite');
    }, {
      code: 'MODULE_NOT_FOUND',
      message: /Cannot find module 'sqlite'/,
    });
  });

  test('cannot be accessed without --experimental-sqlite flag', async (t) => {
    const {
      stdout,
      stderr,
      code,
      signal,
    } = await spawnPromisified(process.execPath, [
      '-e',
      'require("node:sqlite")',
    ]);

    t.assert.strictEqual(stdout, '');
    t.assert.match(stderr, /No such built-in module: node:sqlite/);
    t.assert.notStrictEqual(code, 0);
    t.assert.strictEqual(signal, null);
  });
});

test('ERR_SQLITE_ERROR is thrown for errors originating from SQLite', (t) => {
  const db = new DatabaseSync(nextDb());
  t.after(() => { db.close(); });
  const setup = db.exec(`
    CREATE TABLE test(
      key INTEGER PRIMARY KEY
    ) STRICT;
  `);
  t.assert.strictEqual(setup, undefined);
  const stmt = db.prepare('INSERT INTO test (key) VALUES (?)');
  t.assert.deepStrictEqual(stmt.run(1), { changes: 1, lastInsertRowid: 1 });
  t.assert.throws(() => {
    stmt.run(1);
  }, {
    code: 'ERR_SQLITE_ERROR',
    message: 'UNIQUE constraint failed: test.key',
    errcode: 1555,
    errstr: 'constraint failed',
  });
});

test('in-memory databases are supported', (t) => {
  const db1 = new DatabaseSync(':memory:');
  const db2 = new DatabaseSync(':memory:');
  const setup1 = db1.exec(`
    CREATE TABLE data(key INTEGER PRIMARY KEY);
    INSERT INTO data (key) VALUES (1);
  `);
  const setup2 = db2.exec(`
    CREATE TABLE data(key INTEGER PRIMARY KEY);
    INSERT INTO data (key) VALUES (1);
  `);
  t.assert.strictEqual(setup1, undefined);
  t.assert.strictEqual(setup2, undefined);
  t.assert.deepStrictEqual(
    db1.prepare('SELECT * FROM data').all(),
    [{ __proto__: null, key: 1 }]
  );
  t.assert.deepStrictEqual(
    db2.prepare('SELECT * FROM data').all(),
    [{ __proto__: null, key: 1 }]
  );
});

test('PRAGMAs are supported', (t) => {
  const db = new DatabaseSync(nextDb());
  t.after(() => { db.close(); });
  t.assert.deepStrictEqual(
    db.prepare('PRAGMA journal_mode = WAL').get(),
    { __proto__: null, journal_mode: 'wal' },
  );
  t.assert.deepStrictEqual(
    db.prepare('PRAGMA journal_mode').get(),
    { __proto__: null, journal_mode: 'wal' },
  );
});

suite('StatementSync.prototype.iterate()', () => {
  test('executes a query and returns an empty iterator on no results', (t) => {
    const db = new DatabaseSync(nextDb());
    const stmt = db.prepare('CREATE TABLE storage(key TEXT, val TEXT)');
    t.assert.deepStrictEqual(stmt.iterate().toArray(), []);
  });

  test('executes a query and returns all results', (t) => {
    const db = new DatabaseSync(nextDb());
    let stmt = db.prepare('CREATE TABLE storage(key TEXT, val TEXT)');
    t.assert.deepStrictEqual(stmt.run(), { changes: 0, lastInsertRowid: 0 });
    stmt = db.prepare('INSERT INTO storage (key, val) VALUES (?, ?)');
    t.assert.deepStrictEqual(
      stmt.run('key1', 'val1'),
      { changes: 1, lastInsertRowid: 1 },
    );
    t.assert.deepStrictEqual(
      stmt.run('key2', 'val2'),
      { changes: 1, lastInsertRowid: 2 },
    );
    stmt = db.prepare('SELECT * FROM storage ORDER BY key');
    t.assert.deepStrictEqual(stmt.iterate().toArray(), [
      { key: 'key1', val: 'val1' },
      { key: 'key2', val: 'val2' },
    ]);
  });
});
