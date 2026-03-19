const path = require('path');
// Load .env from project root — must happen before any other require
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check (no DB needed)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function start() {
  // Init DB first — routes require it to be ready
  const { initDB } = require('./database/db');
  await initDB();

  // Mount routes after DB is ready
  app.use('/api/users', require('./routes/users'));
  app.use('/api/projects', require('./routes/projects'));
  app.use('/api/tasks', require('./routes/tasks'));
  app.use('/api/scoring', require('./routes/scoring'));
  app.use('/api/friends', require('./routes/friends'));
  app.use('/api/messages', require('./routes/messages'));
  app.use('/api/ai', require('./routes/ai'));

  // Global error handler
  app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  });

  app.listen(PORT, () => {
    console.log(`Productivity Nexus backend running on port ${PORT}`);
    if (process.send) process.send('ready');
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

module.exports = app;
