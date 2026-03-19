const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const claudeService = require('../services/claudeService');

// POST /generate — generate a task via Gemini AI
router.post('/generate', async (req, res) => {
  try {
    const { project_id, user_id } = req.body;
    if (!project_id || !user_id) {
      return res.status(400).json({ error: 'project_id and user_id are required' });
    }

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(project_id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Get user avg scores for difficulty calibration
    const avgScores = db
      .prepare(
        `SELECT AVG((grammar_score + idea_score + execution_score) / 3.0) as avg_overall
         FROM task_submissions WHERE user_id = ?`
      )
      .get(user_id);

    const skillRating = avgScores.avg_overall || 50;

    // Get recent tasks for context
    const recentTasks = db
      .prepare('SELECT title, status FROM tasks WHERE project_id = ? ORDER BY created_at DESC LIMIT 5')
      .all(project_id);

    // ── Roadmap logic ──────────────────────────────────────────────────────────
    let roadmapStep = null;

    // Check if project has a roadmap; if not, generate one
    if (!project.roadmap_json || project.roadmap_generated === 0) {
      let roadmap;
      try {
        roadmap = await claudeService.generateRoadmap(project);
      } catch (roadmapErr) {
        console.error('Roadmap generation failed:', roadmapErr);
        return res.status(503).json({
          error: 'AI task generation temporarily unavailable',
          details: roadmapErr.message,
        });
      }

      const roadmapStr = JSON.stringify(roadmap);
      db.prepare(
        'UPDATE projects SET roadmap_json = ?, roadmap_generated = 1, total_tasks = ? WHERE id = ?'
      ).run(roadmapStr, roadmap.steps.length, project_id);

      // Re-fetch project with updated roadmap
      const updatedProject = db.prepare('SELECT * FROM projects WHERE id = ?').get(project_id);
      Object.assign(project, updatedProject);
    }

    // Count completed tasks for this project to pick the right roadmap step
    const completedCount = db
      .prepare("SELECT COUNT(*) as count FROM tasks WHERE project_id = ? AND status = 'completed'")
      .get(project_id).count;

    try {
      const roadmap = JSON.parse(project.roadmap_json);
      if (roadmap && roadmap.steps && roadmap.steps.length > 0) {
        const stepIndex = completedCount % roadmap.steps.length;
        roadmapStep = roadmap.steps[stepIndex];
      }
    } catch (_) {
      // If roadmap parse fails, proceed without it
    }
    // ──────────────────────────────────────────────────────────────────────────

    let generatedTask;
    try {
      generatedTask = await claudeService.generateTask(project, user, skillRating, recentTasks, roadmapStep);
    } catch (claudeErr) {
      console.error('AI task generation failed:', claudeErr);
      return res.status(503).json({
        error: 'AI task generation temporarily unavailable',
        details: claudeErr.message,
      });
    }

    const id = uuidv4();
    const hintsJson = generatedTask.hints ? JSON.stringify(generatedTask.hints) : null;

    db.prepare(
      `INSERT INTO tasks (id, project_id, user_id, title, description, deliverable, estimated_minutes, difficulty, xp_reward, hints_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      project_id,
      user_id,
      generatedTask.task_title,
      generatedTask.task_description,
      generatedTask.deliverable,
      generatedTask.estimated_minutes || 30,
      generatedTask.difficulty || 'Bronze',
      generatedTask.xp_reward || 100,
      hintsJson
    );

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    res.status(201).json(task);
  } catch (err) {
    console.error('Generate task error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /project/:projectId/roadmap — return parsed roadmap for a project
router.get('/project/:projectId/roadmap', (req, res) => {
  try {
    const project = db.prepare('SELECT roadmap_json, roadmap_generated FROM projects WHERE id = ?').get(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!project.roadmap_json) return res.json({ steps: [] });

    try {
      const roadmap = JSON.parse(project.roadmap_json);
      res.json(roadmap);
    } catch (_) {
      res.json({ steps: [] });
    }
  } catch (err) {
    console.error('Get roadmap error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /project/:projectId — get all tasks for a project
router.get('/project/:projectId', (req, res) => {
  try {
    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const tasks = db
      .prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC')
      .all(req.params.projectId);

    res.json(tasks);
  } catch (err) {
    console.error('Get project tasks error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /:id — get single task
router.get('/:id', (req, res) => {
  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    console.error('Get task error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /:id/start — set task status to active
router.put('/:id/start', (req, res) => {
  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    db.prepare(
      "UPDATE tasks SET status = 'active', started_at = datetime('now') WHERE id = ?"
    ).run(req.params.id);

    const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error('Start task error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /:id/abandon — abandon task and deduct XP
router.put('/:id/abandon', (req, res) => {
  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    db.prepare("UPDATE tasks SET status = 'abandoned' WHERE id = ?").run(req.params.id);

    // Deduct 50 XP from user
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(task.user_id);
    if (user) {
      const { calculateRank } = require('./users');
      const newXP = Math.max(0, user.xp - 50);
      const newRank = calculateRank(newXP);
      db.prepare(
        "UPDATE users SET xp = ?, rank = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(newXP, newRank, task.user_id);
    }

    const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    res.json({ task: updated, xp_deducted: 50 });
  } catch (err) {
    console.error('Abandon task error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
