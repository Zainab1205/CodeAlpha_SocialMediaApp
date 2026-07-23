const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');

const router = express.Router();

const COLORS = ['#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c', '#0891b2', '#db2777'];
function randomColor() { return COLORS[Math.floor(Math.random() * COLORS.length)]; }

router.post('/register', (req, res) => {
  const { name, username, email, password } = req.body;
  if (!name || !username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (cleanUsername.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters (letters, numbers, underscore only).' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, cleanUsername);
  if (existing) {
    return res.status(409).json({ error: 'Email or username already taken.' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare(
    'INSERT INTO users (name, username, email, password, avatar_color) VALUES (?, ?, ?, ?, ?)'
  ).run(name, cleanUsername, email, hash, randomColor());
  req.session.userId = info.lastInsertRowid;
  res.json({ id: info.lastInsertRowid, name, username: cleanUsername, email });
});

router.post('/login', (req, res) => {
  const { emailOrUsername, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ? OR username = ?')
    .get(emailOrUsername, emailOrUsername);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  req.session.userId = user.id;
  res.json({ id: user.id, name: user.name, username: user.username });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get('/me', (req, res) => {
  if (!req.session.userId) return res.json(null);
  const user = db.prepare('SELECT id, name, username, email, bio, avatar_color FROM users WHERE id = ?')
    .get(req.session.userId);
  res.json(user || null);
});

module.exports = router;
