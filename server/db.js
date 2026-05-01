const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:LdqQngboDiJhTKgqLukaTDuXqoSNkvED@switchyard.proxy.rlwy.net:30694/railway',
  ssl: false
});

async function initDB() {
  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    avatar_color TEXT DEFAULT '#6366f1',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#6366f1',
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS project_members (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    role TEXT CHECK(role IN ('admin','member')) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, user_id)
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK(status IN ('todo','in_progress','done')) DEFAULT 'todo',
    priority TEXT CHECK(priority IN ('low','medium','high')) DEFAULT 'medium',
    due_date TEXT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    assigned_to INTEGER REFERENCES users(id),
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
}

async function all(sql, params = []) {
  const res = await pool.query(sql, params);
  return res.rows;
}

async function get(sql, params = []) {
  const res = await pool.query(sql, params);
  return res.rows[0] || null;
}

async function run(sql, params = []) {
  const res = await pool.query(sql + ' RETURNING *', params);
  const row = res.rows[0];
  return { lastInsertRowid: row ? row.id : null, changes: res.rowCount };
}

async function runNoReturn(sql, params = []) {
  const res = await pool.query(sql, params);
  return { changes: res.rowCount };
}

module.exports = { initDB, all, get, run, runNoReturn };
