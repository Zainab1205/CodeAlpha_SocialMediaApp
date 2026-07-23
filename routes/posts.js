const express = require('express');
const db = require('../db');

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Please log in first.' });
  next();
}

function withPostMeta(post, viewerId) {
  const likeCount = db.prepare('SELECT COUNT(*) as c FROM likes WHERE post_id = ?').get(post.id).c;
  const commentCount = db.prepare('SELECT COUNT(*) as c FROM comments WHERE post_id = ?').get(post.id).c;
  const likedByMe = viewerId
    ? !!db.prepare('SELECT 1 FROM likes WHERE post_id = ? AND user_id = ?').get(post.id, viewerId)
    : false;
  return { ...post, likeCount, commentCount, likedByMe };
}

// Global feed (everyone's posts), newest first
router.get('/', (req, res) => {
  const posts = db.prepare(`
    SELECT p.*, u.name as author_name, u.username as author_username, u.avatar_color
    FROM posts p JOIN users u ON u.id = p.user_id
    ORDER BY p.id DESC
    LIMIT 100
  `).all();
  res.json(posts.map(p => withPostMeta(p, req.session.userId)));
});

// Personalized feed: posts from people the current user follows + own posts
router.get('/following', requireAuth, (req, res) => {
  const posts = db.prepare(`
    SELECT p.*, u.name as author_name, u.username as author_username, u.avatar_color
    FROM posts p JOIN users u ON u.id = p.user_id
    WHERE p.user_id = ? OR p.user_id IN (
      SELECT following_id FROM follows WHERE follower_id = ?
    )
    ORDER BY p.id DESC
    LIMIT 100
  `).all(req.session.userId, req.session.userId);
  res.json(posts.map(p => withPostMeta(p, req.session.userId)));
});

router.post('/', requireAuth, (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Post content cannot be empty.' });
  }
  const info = db.prepare('INSERT INTO posts (user_id, content) VALUES (?, ?)')
    .run(req.session.userId, content.trim());
  const post = db.prepare(`
    SELECT p.*, u.name as author_name, u.username as author_username, u.avatar_color
    FROM posts p JOIN users u ON u.id = p.user_id WHERE p.id = ?
  `).get(info.lastInsertRowid);
  res.json(withPostMeta(post, req.session.userId));
});

router.delete('/:id', requireAuth, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found.' });
  if (post.user_id !== req.session.userId) return res.status(403).json({ error: 'Not your post.' });
  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.post('/:id/like', requireAuth, (req, res) => {
  const postId = req.params.id;
  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
  if (!post) return res.status(404).json({ error: 'Post not found.' });
  const existing = db.prepare('SELECT id FROM likes WHERE post_id = ? AND user_id = ?')
    .get(postId, req.session.userId);
  if (existing) {
    db.prepare('DELETE FROM likes WHERE id = ?').run(existing.id);
    res.json({ liked: false });
  } else {
    db.prepare('INSERT INTO likes (post_id, user_id) VALUES (?, ?)').run(postId, req.session.userId);
    res.json({ liked: true });
  }
});

router.get('/:id/comments', (req, res) => {
  const comments = db.prepare(`
    SELECT c.*, u.name as author_name, u.username as author_username, u.avatar_color
    FROM comments c JOIN users u ON u.id = c.user_id
    WHERE c.post_id = ?
    ORDER BY c.id ASC
  `).all(req.params.id);
  res.json(comments);
});

router.post('/:id/comments', requireAuth, (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Comment cannot be empty.' });
  }
  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found.' });
  const info = db.prepare('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)')
    .run(req.params.id, req.session.userId, content.trim());
  const comment = db.prepare(`
    SELECT c.*, u.name as author_name, u.username as author_username, u.avatar_color
    FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?
  `).get(info.lastInsertRowid);
  res.json(comment);
});

module.exports = router;
