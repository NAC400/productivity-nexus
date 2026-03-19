const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');

// GET /conversation/:friendId — messages between two users
router.get('/conversation/:friendId', (req, res) => {
  try {
    const { user_id } = req.query;
    const { friendId } = req.params;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });

    const messages = db
      .prepare(
        `SELECT * FROM messages
         WHERE (sender_id = ? AND receiver_id = ?)
            OR (sender_id = ? AND receiver_id = ?)
         ORDER BY sent_at ASC`
      )
      .all(user_id, friendId, friendId, user_id);

    // Mark received messages as read
    db.prepare(
      `UPDATE messages SET read = 1
       WHERE receiver_id = ? AND sender_id = ? AND read = 0`
    ).run(user_id, friendId);

    res.json(messages);
  } catch (err) {
    console.error('Conversation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /send — send a message
router.post('/send', (req, res) => {
  try {
    const { sender_id, receiver_id, content } = req.body;
    if (!sender_id || !receiver_id || !content) {
      return res.status(400).json({ error: 'sender_id, receiver_id, and content required' });
    }

    const id = uuidv4();
    db.prepare(
      'INSERT INTO messages (id, sender_id, receiver_id, content, read) VALUES (?, ?, ?, ?, 0)'
    ).run(id, sender_id, receiver_id, content.trim());

    const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
    res.status(201).json(message);
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /unread-count — total unread messages for a user
router.get('/unread-count', (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });

    const result = db
      .prepare('SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND read = 0')
      .get(user_id);

    res.json({ count: result?.count ?? 0 });
  } catch (err) {
    console.error('Unread count error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
