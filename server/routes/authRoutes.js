const express = require('express');
const bcrypt = require('bcryptjs');
const { all, get, run } = require('../db');
const { generateToken, auth } = require('../auth');
const router = express.Router();

const COLORS = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#8b5cf6','#14b8a6'];

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required' });
    if (password.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });
    if (!['admin', 'member'].includes(role)) return res.status(400).json({ error: 'Please select a valid role' });

    const exists = await get('SELECT id FROM users WHERE email = $1', [email]);
    if (exists) return res.status(400).json({ error: 'Email already registered' });

    const hash = bcrypt.hashSync(password, 10);
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const result = await run('INSERT INTO users (name, email, password, role, avatar_color) VALUES ($1, $2, $3, $4, $5)', [name, email, hash, role, color]);

    const user = { id: result.lastInsertRowid, name, email, role, avatar_color: color };
    res.json({ token: generateToken(user), user });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'All fields are required' });

    const user = await get('SELECT * FROM users WHERE email = $1', [email]);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { password: _, ...safeUser } = user;
    res.json({ token: generateToken(user), user: safeUser });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/me', auth, async (req, res) => {
  try {
    const user = await get('SELECT id, name, email, role, avatar_color, created_at FROM users WHERE id = $1', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
