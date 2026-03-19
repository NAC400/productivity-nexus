const express = require('express');
const router = express.Router();
const claudeService = require('../services/claudeService');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// GET /test — verify Gemini API key works
router.get('/test', async (req, res) => {
  try {
    const reply = await claudeService.testConnection();
    res.json({ success: true, reply });
  } catch (err) {
    res.status(503).json({ success: false, error: err.message });
  }
});

// POST /chat — AI assistant chat
router.post('/chat', async (req, res) => {
  try {
    const { messages = [], context } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'GEMINI_API_KEY is not set in your .env file' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const systemPrompt = `You are a helpful AI assistant embedded in Productivity Nexus, a gamified productivity app designed for researchers, academics, and writers. You help users with:
- Research strategies and methodology
- Academic writing, structure, and argumentation
- Brainstorming ideas for papers and projects
- Explaining complex concepts clearly
- Suggesting sources, search strategies, and databases
- Reviewing and improving writing
- Breaking down large projects into manageable steps

Keep responses concise, practical, and encouraging. Use a slightly enthusiastic but professional tone that fits a gamified productivity context. Format responses with markdown when helpful (lists, bold text, etc.).
${context ? `\nCurrent context: ${context}` : ''}`;

    // Build conversation history for Gemini
    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) {
      return res.status(400).json({ error: 'No messages provided' });
    }

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'Understood! I\'m ready to help you with your research and productivity goals.' }] },
        ...history,
      ],
    });

    const result = await chat.sendMessage(lastMessage.content);
    const reply = result.response.text();

    res.json({ reply });
  } catch (err) {
    console.error('AI chat error:', err);
    res.status(503).json({ error: 'AI chat temporarily unavailable', details: err.message });
  }
});

module.exports = router;
