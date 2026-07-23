const express = require('express');
const db = require('../db');

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Please log in first.' });
  next();
}

router.get('/search', (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);
  const users = db.prepare(`
    SELECT id, name, username, avatar_color FROM users
    WHERE username LIKE ? OR name LIKE ?
    LIMIT 20
  `).all(`%${q}%`, `%${q}%`);
  res.json(users);
});

router.get('/:username', (req, res) => {
  const user = db.prepare(
    'SELECT id, name, username, bio, avatar_color, created_at FROM users WHERE username = ?'
  ).get(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const followerCount = db.prepare('SELECT COUNT(*) as c FROM follows WHERE following_id = ?').get(user.id).c;
  const followingCount = db.prepare('SELECT COUNT(*) as c FROM follows WHERE follower_id = ?').get(user.id).c;
  const postCount = db.prepare('SELECT COUNT(*) as c FROM posts WHERE user_id = ?').get(user.id).c;
  const isFollowing = req.session.userId
    ? !!db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?')
        .get(req.session.userId, user.id)
    : false;

  const posts = db.prepare(`
    SELECT p.*, u.name as author_name, u.username as author_username, u.avatar_color
    FROM posts p JOIN users u ON u.id = p.user_id
    WHERE p.user_id = ?
    ORDER BY p.id DESC
  `).all(user.id).map(p => {
    const likeCount = db.prepare('SELECT COUNT(*) as c FROM likes WHERE post_id = ?').get(p.id).c;
    const commentCount = db.prepare('SELECT COUNT(*) as c FROM comments WHERE post_id = ?').get(p.id).c;
    const likedByMe = req.session.userId
      ? !!db.prepare('SELECT 1 FROM likes WHERE post_id = ? AND user_id = ?').get(p.id, req.session.userId)
      : false;
    return { ...p, likeCount, commentCount, likedByMe };
  });

  res.json({ ...user, followerCount, followingCount, postCount, isFollowing, isMe: req.session.userId === user.id, posts });
});

router.put('/me', requireAuth, (req, res) => {
  const { bio } = req.body;
  db.prepare('UPDATE users SET bio = ? WHERE id = ?').run(bio || '', req.session.userId);
  res.json({ ok: true });
});

router.post('/:username/follow', requireAuth, (req, res) => {
  const target = db.prepare('SELECT id FROM users WHERE username = ?').get(req.params.username);
  if (!target) return res.status(404).json({ error: 'User not found.' });
  if (target.id === req.session.userId) return res.status(400).json({ error: 'You cannot follow yourself.' });

  const existing = db.prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?')
    .get(req.session.userId, target.id);
  if (existing) {
    db.prepare('DELETE FROM follows WHERE id = ?').run(existing.id);
    res.json({ following: false });
  } else {
    db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)').run(req.session.userId, target.id);
    res.json({ following: true });
  }
});

router.get('/:username/followers', (req, res) => {
  const user = db.prepare('SELECT id FROM users WHERE username = ?').get(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  const followers = db.prepare(`
    SELECT u.id, u.name, u.username, u.avatar_color FROM follows f
    JOIN users u ON u.id = f.follower_id
    WHERE f.following_id = ?
  `).all(user.id);
  res.json(followers);
});

router.get('/:username/following', (req, res) => {
  const user = db.prepare('SELECT id FROM users WHERE username = ?').get(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  const following = db.prepare(`
    SELECT u.id, u.name, u.username, u.avatar_color FROM follows f
    JOIN users u ON u.id = f.following_id
    WHERE f.follower_id = ?
  `).all(user.id);
  res.json(following);
});

module.exports = router;
