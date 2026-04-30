const express = require('express');
const bcrypt = require('bcryptjs');
const { all, get, run } = require('../db');
const { generateToken, auth } = require('../auth');
const router = express.Router();

const COLORS = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#8b5cf6','#14b8a6'];

router.post('/signup', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required' });
  if (password.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });

  const exists = get('SELECT id FROM users WHERE email = ?', [email]);
  if (exists) return res.status(400).json({ error: 'Email already registered' });

  const hash = bcrypt.hashSync(password, 10);
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const result = run('INSERT INTO users (name, email, password, avatar_color) VALUES (?, ?, ?, ?)', [name, email, hash, color]);

  const user = { id: result.lastInsertRowid, name, email, avatar_color: color };
  res.json({ token: generateToken(user), user });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'All fields are required' });

  const user = get('SELECT * FROM users WHERE email = ?', [email]);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const { password: _, ...safeUser } = user;
  res.json({ token: generateToken(user), user: safeUser });
});

router.get('/me', auth, (req, res) => {
  const user = get('SELECT id, name, email, avatar_color, created_at FROM users WHERE id = ?', [req.user.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

module.exports = router;
