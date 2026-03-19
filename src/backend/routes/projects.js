const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');

function calculatePhase(completedTasks, totalTasks) {
  if (totalTasks === 0) return 'planning';
  const pct = completedTasks / totalTasks;
  if (pct === 0) return 'kickoff';
  if (pct < 0.25) return 'early';
  if (pct < 0.5) return 'mid';
  if (pct < 0.75) return 'late';
  if (pct < 1.0) return 'final';
  return 'complete';
}

// POST / — create project
router.post('/', (req, res) => {
  try {
    const {
      user_id,
      title,
      goal,
      type,
      publication_venue,
      deadline,
      working_hours_per_day,
      outline,
    } = req.body;

    if (!user_id || !title || !type) {
      return res.status(400).json({ error: 'user_id, title, and type are required' });
    }

    const validTypes = ['short', 'long', 'ongoing'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'type must be short, long, or ongoing' });
    }

    const userExists = db.prepare('SELECT id FROM users WHERE id = ?').get(user_id);
    if (!userExists) return res.status(404).json({ error: 'User not found' });

    const id = uuidv4();
    const hoursPerDay = parseFloat(working_hours_per_day) || 1.0;

    db.prepare(
      `INSERT INTO projects
        (id, user_id, title, goal, type, publication_venue, deadline, working_hours_per_day, outline)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      user_id,
      title.trim(),
      goal || null,
      type,
      publication_venue || null,
      deadline || null,
      hoursPerDay,
      outline || null
    );

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    res.status(201).json(project);
  } catch (err) {
    console.error('Create project error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /user/:userId — get all projects for user
router.get('/user/:userId', (req, res) => {
  try {
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const projects = db
      .prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC')
      .all(req.params.userId);

    // Enrich with task counts
    const enriched = projects.map((p) => {
      const taskCounts = db
        .prepare(
          `SELECT
            COUNT(*) as total,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
           FROM tasks WHERE project_id = ?`
        )
        .get(p.id);
      return {
        ...p,
        total_tasks: taskCounts.total || 0,
        completed_tasks: taskCounts.completed || 0,
        progress_pct:
          taskCounts.total > 0
            ? Math.round((taskCounts.completed / taskCounts.total) * 100)
            : 0,
      };
    });

    res.json(enriched);
  } catch (err) {
    console.error('Get user projects error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /:id — get project by id
router.get('/:id', (req, res) => {
  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const taskCounts = db
      .prepare(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active
         FROM tasks WHERE project_id = ?`
      )
      .get(req.params.id);

    res.json({
      ...project,
      total_tasks: taskCounts.total || 0,
      completed_tasks: taskCounts.completed || 0,
      active_tasks: taskCounts.active || 0,
      progress_pct:
        taskCounts.total > 0
          ? Math.round((taskCounts.completed / taskCounts.total) * 100)
          : 0,
    });
  } catch (err) {
    console.error('Get project error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /:id/progress — update completed_tasks count
router.put('/:id/progress', (req, res) => {
  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Recount from actual tasks
    const taskCounts = db
      .prepare(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
         FROM tasks WHERE project_id = ?`
      )
      .get(req.params.id);

    const newCompleted = taskCounts.completed || 0;
    const newTotal = taskCounts.total || 0;
    const newPhase = calculatePhase(newCompleted, newTotal);
    const newStatus = newPhase === 'complete' ? 'completed' : 'active';

    db.prepare(
      'UPDATE projects SET completed_tasks = ?, total_tasks = ?, phase = ?, status = ? WHERE id = ?'
    ).run(newCompleted, newTotal, newPhase, newStatus, req.params.id);

    const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    res.json({
      ...updated,
      progress_pct: newTotal > 0 ? Math.round((newCompleted / newTotal) * 100) : 0,
    });
  } catch (err) {
    console.error('Update project progress error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /:id — delete project
router.delete('/:id', (req, res) => {
  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    console.error('Delete project error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
