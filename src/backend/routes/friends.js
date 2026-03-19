const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');

// Helper: strip password_hash
function safeUser(u) {
  if (!u) return u;
  const { password_hash, ...rest } = u;
  return rest;
}

// GET / — list accepted friends for a user
router.get('/', (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });

    const rows = db
      .prepare(
        `SELECT f.id as friendship_id, f.status, f.created_at,
                u.id, u.username, u.rank, u.xp
         FROM friends f
         JOIN users u ON (
           CASE
             WHEN f.requester_id = ? THEN f.addressee_id
             ELSE f.requester_id
           END = u.id
         )
         WHERE (f.requester_id = ? OR f.addressee_id = ?)
           AND f.status = 'accepted'`
      )
      .all(user_id, user_id, user_id);

    res.json(rows);
  } catch (err) {
    console.error('Friends list error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /pending — incoming pending requests
router.get('/pending', (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });

    const rows = db
      .prepare(
        `SELECT f.id as friendship_id, f.created_at,
                u.id, u.username, u.rank, u.xp
         FROM friends f
         JOIN users u ON f.requester_id = u.id
         WHERE f.addressee_id = ? AND f.status = 'pending'`
      )
      .all(user_id);

    res.json(rows);
  } catch (err) {
    console.error('Pending requests error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /request — send friend request
router.post('/request', (req, res) => {
  try {
    const { requester_id, addressee_id } = req.body;
    if (!requester_id || !addressee_id) {
      return res.status(400).json({ error: 'requester_id and addressee_id required' });
    }
    if (requester_id === addressee_id) {
      return res.status(400).json({ error: 'Cannot send request to yourself' });
    }

    // Check if a relationship already exists in either direction
    const existing = db
      .prepare(
        `SELECT * FROM friends
         WHERE (requester_id = ? AND addressee_id = ?)
            OR (requester_id = ? AND addressee_id = ?)`
      )
      .get(requester_id, addressee_id, addressee_id, requester_id);

    if (existing) {
      return res.status(409).json({ error: 'Friend request already exists', friendship: existing });
    }

    const id = uuidv4();
    db.prepare(
      'INSERT INTO friends (id, requester_id, addressee_id, status) VALUES (?, ?, ?, ?)'
    ).run(id, requester_id, addressee_id, 'pending');

    const friendship = db.prepare('SELECT * FROM friends WHERE id = ?').get(id);
    res.status(201).json(friendship);
  } catch (err) {
    console.error('Friend request error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /accept/:id — accept a friend request
router.put('/accept/:id', (req, res) => {
  try {
    const friendship = db.prepare('SELECT * FROM friends WHERE id = ?').get(req.params.id);
    if (!friendship) return res.status(404).json({ error: 'Friend request not found' });

    db.prepare("UPDATE friends SET status = 'accepted' WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Accept friend error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /reject/:id — reject a friend request
router.put('/reject/:id', (req, res) => {
  try {
    const friendship = db.prepare('SELECT * FROM friends WHERE id = ?').get(req.params.id);
    if (!friendship) return res.status(404).json({ error: 'Friend request not found' });

    db.prepare("UPDATE friends SET status = 'rejected' WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Reject friend error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /:id — unfriend
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM friends WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Unfriend error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
