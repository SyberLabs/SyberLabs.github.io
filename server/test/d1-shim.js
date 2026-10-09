// A D1 binding over node:sqlite, so tests run the real migrations/*.sql. Only the surface server/ may
// use: prepare(sql).bind(...).first(col?) / all() / run() / raw(), batch([...]) and exec(sql).
// Like D1: every call is async, binding undefined throws, booleans bind as 1/0, batch is one transaction.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const MIGRATIONS = fileURLToPath(new URL('../../migrations/', import.meta.url));

const plain = row => (row ? { ...row } : row);

function toSqlite(value, i) {
  if (value === undefined) throw new TypeError(`D1_TYPE_ERROR: undefined bound at position ${i + 1}`);
  if (typeof value === 'boolean') return value ? 1 : 0;
  return value;
}

class Statement {
  constructor(db, sql, params = []) {
    this.db = db;
    this.sql = sql;
    this.params = params;
  }

  bind(...values) {
    return new Statement(this.db, this.sql, values.map(toSqlite));
  }

  // Sync core, shared by the async methods and batch().
  exec() {
    const stmt = this.db.sqlite.prepare(this.sql);
    if (stmt.columns().length > 0) {
      const results = stmt.all(...this.params).map(plain);
      // A write with RETURNING also has columns; report its changes like D1 does.
      const changes = /^\s*(insert|update|delete|replace)\b/i.test(this.sql)
        ? Number(this.db.sqlite.prepare('SELECT changes() AS n').get().n) : 0;
      return { results, success: true, meta: { changes, last_row_id: 0, changed_db: changes > 0, rows_read: results.length } };
    }
    const r = stmt.run(...this.params);
    const changes = Number(r.changes);
    return { results: [], success: true, meta: { changes, last_row_id: Number(r.lastInsertRowid), changed_db: changes > 0 } };
  }

  async first(col) {
    const row = plain(this.db.sqlite.prepare(this.sql).get(...this.params));
    if (!row) return null;
    if (col === undefined) return row;
    if (!(col in row)) throw new Error(`D1_COLUMN_NOTFOUND: ${col}`);
    return row[col];
  }

  async all() { return this.exec(); }
  async run() { return this.exec(); }

  async raw() {
    const stmt = this.db.sqlite.prepare(this.sql);
    stmt.setReturnArrays(true);
    return stmt.all(...this.params);
  }
}

export class D1Shim {
  constructor(sqlite) {
    this.sqlite = sqlite;
  }

  prepare(sql) { return new Statement(this, sql); }

  async batch(statements) {
    this.sqlite.exec('BEGIN');
    try {
      const out = statements.map(s => s.exec());
      this.sqlite.exec('COMMIT');
      return out;
    } catch (err) {
      this.sqlite.exec('ROLLBACK');
      throw err;
    }
  }

  async exec(sql) {
    this.sqlite.exec(sql);
    return { count: 1, duration: 0 };
  }

  // Test helpers (not part of D1): rows written so far, including trigger and cascade changes (and rows
  // a rolled-back batch wrote, so take a fresh baseline after a failure).
  totalChanges() {
    return Number(this.sqlite.prepare('SELECT total_changes() AS n').get().n);
  }

  count(table) {
    return Number(this.sqlite.prepare(`SELECT count(*) AS n FROM ${table}`).get().n);
  }
}

// A fresh in-memory database with every migration applied in file order.
export function freshDb() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  for (const file of readdirSync(MIGRATIONS).filter(f => f.endsWith('.sql')).sort()) {
    sqlite.exec(readFileSync(join(MIGRATIONS, file), 'utf8'));
  }
  return new D1Shim(sqlite);
}

// A binding whose every query rejects, for the "D1 throw -> 503" tests.
export function brokenDb() {
  const fail = async () => { throw new Error('D1_ERROR: simulated outage'); };
  const stmt = { bind: () => stmt, first: fail, all: fail, run: fail, raw: fail };
  return { prepare: () => stmt, batch: fail, exec: fail };
}
