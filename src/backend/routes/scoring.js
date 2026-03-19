const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const scoringService = require('../services/scoringService');
const { calculateRank, getNextRankXP, getCurrentRankFloor } = require('./users');

const ACHIEVEMENTS = [
  {
    key: 'first_task',
    title: 'First Blood',
    description: 'Complete your very first task',
    check: (stats) => stats.totalCompleted >= 1,
  },
  {
    key: 'five_tasks',
    title: 'Getting Started',
    description: 'Complete 5 tasks',
    check: (stats) => stats.totalCompleted >= 5,
  },
  {
    key: 'ten_tasks',
    title: 'On a Roll',
    description: 'Complete 10 tasks',
    check: (stats) => stats.totalCompleted >= 10,
  },
  {
    key: 'perfect_score',
    title: 'Perfection',
    description: 'Score 95+ on all three criteria in a single task',
    check: (stats) =>
      stats.lastGrammar >= 95 && stats.lastIdea >= 95 && stats.lastExecution >= 95,
  },
  {
    key: 'speed_demon',
    title: 'Speed Demon',
    description: 'Complete a task with a pace multiplier of 1.2x',
    check: (stats) => stats.lastPaceMultiplier >= 1.2,
  },
  {
    key: 'rank_up_bronze',
    title: 'Bronze Ascension',
    description: 'Reach Bronze rank',
    check: (stats) => stats.newRank !== 'Iron',
  },
  {
    key: 'rank_up_silver',
    title: 'Silver Ascension',
    description: 'Reach Silver rank',
    check: (stats) =>
      ['Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster'].includes(stats.newRank),
  },
  {
    key: 'rank_up_gold',
    title: 'Gold Ascension',
    description: 'Reach Gold rank',
    check: (stats) =>
      ['Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster'].includes(stats.newRank),
  },
  {
    key: 'thousand_xp',
    title: 'XP Hunter',
    description: 'Earn 1000 total XP',
    check: (stats) => stats.totalXP >= 1000,
  },
];

function checkAchievements(userId, scoreResult, user) {
  const totalCompleted = db
    .prepare("SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND status = 'completed'")
    .get(userId).count;

  const stats = {
    totalCompleted,
    totalXP: user.xp,
    newRank: user.rank,
    lastGrammar: scoreResult.grammar_score,
    lastIdea: scoreResult.idea_score,
    lastExecution: scoreResult.execution_score,
    lastPaceMultiplier: scoreResult.paceMultiplier,
  };

  const newlyUnlocked = [];

  for (const achievement of ACHIEVEMENTS) {
    const alreadyUnlocked = db
      .prepare('SELECT id FROM achievements WHERE user_id = ? AND achievement_key = ?')
      .get(userId, achievement.key);

    if (!alreadyUnlocked && achievement.check(stats)) {
      const id = uuidv4();
      try {
        db.prepare(
          'INSERT INTO achievements (id, user_id, achievement_key, title, description) VALUES (?, ?, ?, ?, ?)'
        ).run(id, userId, achievement.key, achievement.title, achievement.description);
        newlyUnlocked.push({ key: achievement.key, title: achievement.title, description: achievement.description });
      } catch (err) {
        // Duplicate, skip
      }
    }
  }

  return newlyUnlocked;
}

// POST /submit
router.post('/submit', async (req, res) => {
  try {
    const { task_id, user_id, submission_text, time_taken_minutes } = req.body;

    if (!task_id || !user_id || !submission_text) {
      return res.status(400).json({ error: 'task_id, user_id, and submission_text are required' });
    }

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(task_id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(task.project_id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const timeTaken = parseInt(time_taken_minutes) || 30;

    // Score the submission — no silent fallback; propagate AI errors to the client
    let scoreResult;
    try {
      scoreResult = await scoringService.scoreSubmission(task, project, submission_text, timeTaken);
    } catch (scoringErr) {
      console.error('AI scoring failed:', scoringErr);
      return res.status(503).json({
        error: 'AI scoring temporarily unavailable',
        details: scoringErr.message,
      });
    }

    // Save submission
    const submissionId = uuidv4();
    const feedbackJson = JSON.stringify({
      grammar_feedback: scoreResult.grammar_feedback,
      idea_feedback: scoreResult.idea_feedback,
      execution_feedback: scoreResult.execution_feedback,
    });

    db.prepare(
      `INSERT INTO task_submissions
        (id, task_id, user_id, submission_text, grammar_score, idea_score, execution_score,
         pace_multiplier, xp_earned, time_taken_minutes, feedback_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      submissionId,
      task_id,
      user_id,
      submission_text,
      scoreResult.grammar_score,
      scoreResult.idea_score,
      scoreResult.execution_score,
      scoreResult.paceMultiplier,
      scoreResult.finalXP,
      timeTaken,
      feedbackJson
    );

    // Update task status to completed
    db.prepare("UPDATE tasks SET status = 'completed' WHERE id = ?").run(task_id);

    // Add XP to user
    const newXP = user.xp + scoreResult.finalXP;
    const newRank = calculateRank(newXP);
    const rankChanged = newRank !== user.rank;

    db.prepare(
      "UPDATE users SET xp = ?, rank = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(newXP, newRank, user_id);

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id);

    // Check achievements
    const newAchievements = checkAchievements(user_id, scoreResult, updatedUser);

    // Update project progress
    const taskCounts = db
      .prepare(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
         FROM tasks WHERE project_id = ?`
      )
      .get(task.project_id);

    if (taskCounts.total > 0) {
      const pct = taskCounts.completed / taskCounts.total;
      let phase = 'kickoff';
      if (pct < 0.25) phase = 'early';
      else if (pct < 0.5) phase = 'mid';
      else if (pct < 0.75) phase = 'late';
      else if (pct < 1.0) phase = 'final';
      else phase = 'complete';

      db.prepare('UPDATE projects SET completed_tasks = ?, total_tasks = ?, phase = ? WHERE id = ?').run(
        taskCounts.completed,
        taskCounts.total,
        phase,
        task.project_id
      );
    }

    const nextRankXP = getNextRankXP(newXP);
    const currentFloor = getCurrentRankFloor(newXP);
    const progressToNext = nextRankXP
      ? Math.round(((newXP - currentFloor) / (nextRankXP - currentFloor)) * 100)
      : 100;

    res.json({
      submission_id: submissionId,
      scores: {
        grammar_score: scoreResult.grammar_score,
        grammar_feedback: scoreResult.grammar_feedback,
        idea_score: scoreResult.idea_score,
        idea_feedback: scoreResult.idea_feedback,
        execution_score: scoreResult.execution_score,
        execution_feedback: scoreResult.execution_feedback,
        pace_multiplier: scoreResult.paceMultiplier,
        xp_earned: scoreResult.finalXP,
      },
      user: {
        ...updatedUser,
        nextRankXP,
        currentFloor,
        progressToNext,
      },
      rankChanged,
      previousRank: user.rank,
      newRank,
      newAchievements,
    });
  } catch (err) {
    console.error('Submit scoring error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
