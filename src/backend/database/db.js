const path = require('path');
const fs = require('fs');
const os = require('os');

const DB_DIR = path.join(os.homedir(), '.productivity-nexus');
const DB_PATH = path.join(DB_DIR, 'data.db');

// Internal sql.js database instance — set by initDB()
let _sqlDb = null;

function saveDB() {
  if (!_sqlDb) return;
  try {
    const data = _sqlDb.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch (e) {
    console.error('DB save error:', e.message);
  }
}

function assertReady() {
  if (!_sqlDb) throw new Error('Database not initialized — call initDB() first');
}

/**
 * Compatibility wrapper that mirrors the better-sqlite3 API:
 *   db.prepare(sql).run(arg1, arg2, ...)  → { lastInsertRowid, changes }
 *   db.prepare(sql).get(arg1, arg2, ...)  → row | undefined
 *   db.prepare(sql).all(arg1, arg2, ...)  → row[]
 *   db.exec(sql)
 *   db.pragma(text)
 *
 * All existing routes (which use ? positional params) work unchanged.
 */
const db = {
  prepare(sql) {
    return {
      // Execute a write query (INSERT / UPDATE / DELETE)
      run(...args) {
        assertReady();
        _sqlDb.run(sql, args.length > 0 ? args : []);
        let lastInsertRowid = null;
        try {
          const r = _sqlDb.exec('SELECT last_insert_rowid()');
          lastInsertRowid = r[0]?.values[0][0] ?? null;
        } catch (_) {}
        saveDB();
        return { lastInsertRowid, changes: 1 };
      },

      // Fetch a single row
      get(...args) {
        assertReady();
        const stmt = _sqlDb.prepare(sql);
        try {
          if (args.length > 0) stmt.bind(args);
          return stmt.step() ? stmt.getAsObject() : undefined;
        } finally {
          stmt.free();
        }
      },

      // Fetch all matching rows
      all(...args) {
        assertReady();
        const stmt = _sqlDb.prepare(sql);
        const rows = [];
        try {
          if (args.length > 0) stmt.bind(args);
          while (stmt.step()) rows.push(stmt.getAsObject());
        } finally {
          stmt.free();
        }
        return rows;
      },
    };
  },

  // Execute raw SQL (schema init, no params)
  exec(sql) {
    assertReady();
    _sqlDb.run(sql);
    saveDB();
  },

  // Run a PRAGMA (best-effort — some may be no-ops in WASM build)
  pragma(text) {
    if (!_sqlDb) return;
    try { _sqlDb.run(`PRAGMA ${text}`); } catch (_) {}
  },
};

/**
 * Async init — call once at server startup before mounting routes.
 * Loads or creates the SQLite file and runs the schema.
 */
async function initDB() {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    _sqlDb = new SQL.Database(buf);
  } else {
    _sqlDb = new SQL.Database();
  }

  // Apply schema (idempotent — all tables use CREATE TABLE IF NOT EXISTS)
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  for (const stmt of schema.split(';').filter(s => s.trim())) {
    try { _sqlDb.run(stmt + ';'); } catch (e) { console.error('Schema:', e.message); }
  }

  // Run migrations (best-effort — safe to fail if column already exists)
  const migrations = [
    'ALTER TABLE users ADD COLUMN password_hash TEXT',
    'ALTER TABLE tasks ADD COLUMN hints_json TEXT',
    'ALTER TABLE projects ADD COLUMN roadmap_json TEXT',
    'ALTER TABLE projects ADD COLUMN roadmap_generated INTEGER DEFAULT 0',
  ];
  for (const m of migrations) {
    try { _sqlDb.run(m); } catch (_) {}
  }

  saveDB();
  console.log('Database ready:', DB_PATH);
  return db;
}

module.exports = db;
module.exports.initDB = initDB;
