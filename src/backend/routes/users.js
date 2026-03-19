const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const db = require('../database/db');

// ─── Rank helpers ────────────────────────────────────────────────────────────

function calculateRank(xp) {
  if (xp >= 100000) return 'Grandmaster';
  if (xp >= 40000) return 'Master';
  if (xp >= 20000) return 'Diamond';
  if (xp >= 10000) return 'Platinum';
  if (xp >= 5000) return 'Gold';
  if (xp >= 2500) return 'Silver';
  if (xp >= 1000) return 'Bronze';
  return 'Iron';
}

function getNextRankXP(xp) {
  if (xp >= 100000) return null;
  if (xp >= 40000) return 100000;
  if (xp >= 20000) return 40000;
  if (xp >= 10000) return 20000;
  if (xp >= 5000) return 10000;
  if (xp >= 2500) return 5000;
  if (xp >= 1000) return 2500;
  return 1000;
}

function getCurrentRankFloor(xp) {
  if (xp >= 100000) return 100000;
  if (xp >= 40000) return 40000;
  if (xp >= 20000) return 20000;
  if (xp >= 10000) return 10000;
  if (xp >= 5000) return 5000;
  if (xp >= 2500) return 2500;
  if (xp >= 1000) return 1000;
  return 0;
}

// ─── Password helpers ─────────────────────────────────────────────────────────

function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pw, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(pw, stored) {
  try {
    const [salt, hash] = stored.split(':');
    const derived = crypto.scryptSync(pw, salt, 64).toString('hex');
    return derived === hash;
  } catch (_) {
    return false;
  }
}

// Strip password_hash before sending a user object to the client
function safeUser(u) {
  if (!u) return u;
  const { password_hash, ...rest } = u;
  return rest;
}

// ─── POST / — create / register user ─────────────────────────────────────────

router.post('/', (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const existingUser = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim());
    if (existingUser) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const id = uuidv4();
    const rank = calculateRank(0);
    const password_hash = password ? hashPassword(password) : null;

    db.prepare(
      'INSERT INTO users (id, username, email, xp, rank, password_hash) VALUES (?, ?, ?, 0, ?, ?)'
    ).run(id, username.trim(), email || null, rank, password_hash);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    res.status(201).json(safeUser(user));
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /login ──────────────────────────────────────────────────────────────

router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Backward compat: if the account has no password_hash, allow username-only login
    if (!user.password_hash) {
      if (password) {
        // They supplied a password but none is set — still let them in (legacy)
        // so existing users aren't locked out
      }
      const nextRankXP = getNextRankXP(user.xp);
      const currentFloor = getCurrentRankFloor(user.xp);
      const progressToNext = nextRankXP
        ? Math.round(((user.xp - currentFloor) / (nextRankXP - currentFloor)) * 100)
        : 100;
      return res.json({ ...safeUser(user), nextRankXP, currentFloor, progressToNext });
    }

    // Account has a password — verify it
    if (!password) {
      return res.status(401).json({ error: 'Password required', needsPassword: true });
    }

    if (!verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const nextRankXP = getNextRankXP(user.xp);
    const currentFloor = getCurrentRankFloor(user.xp);
    const progressToNext = nextRankXP
      ? Math.round(((user.xp - currentFloor) / (nextRankXP - currentFloor)) * 100)
      : 100;

    res.json({ ...safeUser(user), nextRankXP, currentFloor, progressToNext });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /leaderboard — must come BEFORE /:id ─────────────────────────────────

router.get('/leaderboard', (req, res) => {
  try {
    const users = db
      .prepare(
        `SELECT id, username, email, xp, rank, created_at, updated_at
         FROM users
         ORDER BY xp DESC
         LIMIT 50`
      )
      .all();

    // Attach weekly XP for each user
    const result = users.map((u) => {
      const weekly = db
        .prepare(
          `SELECT COALESCE(SUM(xp_earned), 0) as weekly_xp
           FROM task_submissions
           WHERE user_id = ? AND submitted_at >= datetime('now', '-7 days')`
        )
        .get(u.id);
      return { ...u, weeklyXP: weekly?.weekly_xp ?? 0 };
    });

    res.json(result);
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /search — must come BEFORE /:id ─────────────────────────────────────

router.get('/search', (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);

    const users = db
      .prepare(
        `SELECT id, username, rank, xp
         FROM users
         WHERE username LIKE ?
         LIMIT 10`
      )
      .all(`%${q}%`);

    res.json(users);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /:id — get user by id ────────────────────────────────────────────────

router.get('/:id', (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const nextRankXP = getNextRankXP(user.xp);
    const currentFloor = getCurrentRankFloor(user.xp);
    const progressToNext = nextRankXP
      ? Math.round(((user.xp - currentFloor) / (nextRankXP - currentFloor)) * 100)
      : 100;

    res.json({ ...safeUser(user), nextRankXP, currentFloor, progressToNext });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /:id/stats ───────────────────────────────────────────────────────────

router.get('/:id/stats', (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const completedTasks = db
      .prepare("SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND status = 'completed'")
      .get(req.params.id);

    const avgScores = db
      .prepare(
        `SELECT
          AVG(grammar_score) as avg_grammar,
          AVG(idea_score) as avg_idea,
          AVG(execution_score) as avg_execution,
          AVG((grammar_score + idea_score + execution_score) / 3.0) as avg_overall,
          SUM(xp_earned) as total_xp_earned,
          COUNT(*) as total_submissions
        FROM task_submissions WHERE user_id = ?`
      )
      .get(req.params.id);

    const weeklyStats = db
      .prepare(
        `SELECT
          COUNT(*) as weekly_tasks,
          SUM(xp_earned) as weekly_xp,
          AVG((grammar_score + idea_score + execution_score) / 3.0) as weekly_avg_score
        FROM task_submissions
        WHERE user_id = ? AND submitted_at >= datetime('now', '-7 days')`
      )
      .get(req.params.id);

    const nextRankXP = getNextRankXP(user.xp);
    const currentFloor = getCurrentRankFloor(user.xp);
    const progressToNext = nextRankXP
      ? Math.round(((user.xp - currentFloor) / (nextRankXP - currentFloor)) * 100)
      : 100;

    res.json({
      user: safeUser(user),
      rank: user.rank,
      xp: user.xp,
      nextRankXP,
      currentFloor,
      progressToNext,
      completedTasksCount: completedTasks.count,
      avgGrammarScore: Math.round(avgScores.avg_grammar || 0),
      avgIdeaScore: Math.round(avgScores.avg_idea || 0),
      avgExecutionScore: Math.round(avgScores.avg_execution || 0),
      avgOverallScore: Math.round(avgScores.avg_overall || 0),
      totalXPEarned: avgScores.total_xp_earned || 0,
      totalSubmissions: avgScores.total_submissions || 0,
      weeklyTasks: weeklyStats.weekly_tasks || 0,
      weeklyXP: weeklyStats.weekly_xp || 0,
      weeklyAvgScore: Math.round(weeklyStats.weekly_avg_score || 0),
    });
  } catch (err) {
    console.error('Get user stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /:id/xp ──────────────────────────────────────────────────────────────

router.put('/:id/xp', (req, res) => {
  try {
    const { xp_to_add } = req.body;
    if (typeof xp_to_add !== 'number') {
      return res.status(400).json({ error: 'xp_to_add must be a number' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const newXP = Math.max(0, user.xp + xp_to_add);
    const newRank = calculateRank(newXP);
    const rankChanged = newRank !== user.rank;

    db.prepare(
      "UPDATE users SET xp = ?, rank = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(newXP, newRank, req.params.id);

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    const nextRankXP = getNextRankXP(updatedUser.xp);
    const currentFloor = getCurrentRankFloor(updatedUser.xp);
    const progressToNext = nextRankXP
      ? Math.round(((updatedUser.xp - currentFloor) / (nextRankXP - currentFloor)) * 100)
      : 100;

    res.json({
      ...safeUser(updatedUser),
      nextRankXP,
      currentFloor,
      progressToNext,
      rankChanged,
      previousRank: user.rank,
    });
  } catch (err) {
    console.error('Update XP error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.calculateRank = calculateRank;
module.exports.getNextRankXP = getNextRankXP;
module.exports.getCurrentRankFloor = getCurrentRankFloor;
