const express = require('express');
const router = express.Router();
const { chatWithAI, testConnection } = require('../services/claudeService');

// GET /test — verify API key works
router.get('/test', async (req, res) => {
  try {
    if (!process.env.GROQ_API_KEY) {
      return res.status(503).json({ success: false, error: 'GROQ_API_KEY is not set in your .env file' });
    }
    const reply = await testConnection();
    res.json({ success: true, reply });
  } catch (err) {
    res.status(503).json({ success: false, error: err.message });
  }
});

// POST /chat — AI assistant
router.post('/chat', async (req, res) => {
  try {
    if (!process.env.GROQ_API_KEY) {
      return res.status(503).json({ error: 'GROQ_API_KEY is not set in your .env file' });
    }

    const { messages = [] } = req.body;
    if (!messages.length) {
      return res.status(400).json({ error: 'No messages provided' });
    }

    const reply = await chatWithAI(messages);
    res.json({ reply });
  } catch (err) {
    console.error('AI chat error:', err);

    const msg = err.message || '';
    const isRateLimit =
      msg.includes('429') || msg.includes('rate_limit') || msg.includes('Rate limit');

    let retrySeconds = null;
    try {
      const match = msg.match(/try again in (\d+)/i) || msg.match(/retryDelay['":\s]+(\d+)/i);
      if (match) retrySeconds = parseInt(match[1]);
    } catch (_) {}

    if (isRateLimit) {
      const waitMsg = retrySeconds
        ? `Rate limit reached — please wait ${retrySeconds} seconds.`
        : 'Rate limit reached — please wait a moment before trying again.';
      return res.status(429).json({ error: waitMsg, retryAfter: retrySeconds });
    }

    res.status(503).json({ error: 'AI chat temporarily unavailable', details: msg });
  }
});

module.exports = router;
