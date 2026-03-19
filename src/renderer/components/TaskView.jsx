import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE, useUser } from '../App';

function TimerDisplay({ seconds }) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [];
  if (h > 0) parts.push(String(h).padStart(2, '0'));
  parts.push(String(m).padStart(2, '0'));
  parts.push(String(s).padStart(2, '0'));
  return (
    <span className="font-mono text-nexus-accent text-lg tracking-widest">
      {parts.join(':')}
    </span>
  );
}

function DifficultyBadge({ difficulty }) {
  const colors = {
    Bronze: '#cd7f32',
    Silver: '#c0c0c0',
    Gold: '#f5c518',
    Platinum: '#e5e4e2',
    Diamond: '#b9f2ff',
  };
  const color = colors[difficulty] || '#6b7fa3';
  return (
    <span
      className="font-game text-xs font-bold tracking-widest px-2 py-0.5 rounded border"
      style={{ color, borderColor: color, background: `${color}15` }}
    >
      {difficulty?.toUpperCase()}
    </span>
  );
}

// ─── Project Side Panel ───────────────────────────────────────────────────────

function ProjectPanel({ project, allTasks, onClose }) {
  const [roadmap, setRoadmap] = useState(null);
  const [panelTab, setPanelTab] = useState('tasks'); // 'tasks' | 'roadmap'

  const pct = project?.total_tasks > 0
    ? Math.round((project.completed_tasks / project.total_tasks) * 100)
    : 0;

  const typeLabel = { short: 'SPRINT', long: 'CAMPAIGN', ongoing: 'ONGOING' };

  // Count completed tasks to highlight current roadmap step
  const completedCount = allTasks.filter((t) => t.status === 'completed').length;

  useEffect(() => {
    if (!project?.id) return;
    fetch(`${API_BASE}/tasks/project/${project.id}/roadmap`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data && data.steps) setRoadmap(data); })
      .catch(() => {});
  }, [project?.id]);

  const phaseColors = {
    research: '#00d4ff',
    writing: '#f5c518',
    review: '#00ff88',
    polish: '#b9f2ff',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full w-72 z-40 bg-nexus-panel border-l border-nexus-accent/40 flex flex-col shadow-2xl slide-in-right"
        style={{ boxShadow: '-4px 0 30px rgba(0,212,255,0.1)' }}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-nexus-border flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <div className="text-nexus-muted font-game text-xs tracking-widest uppercase mb-0.5">Project</div>
            <div className="text-nexus-accent font-game font-bold text-sm truncate" title={project?.title}>
              {project?.title}
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-3 shrink-0 text-nexus-muted hover:text-nexus-text transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Project meta */}
        <div className="px-4 py-3 border-b border-nexus-border shrink-0 space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-nexus-muted font-game text-xs">TYPE</span>
            <span className="text-nexus-text font-game text-xs font-bold">
              {typeLabel[project?.type] || project?.type?.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-nexus-muted font-game text-xs">PHASE</span>
            <span className="text-nexus-accent font-game text-xs font-bold">
              {project?.phase?.toUpperCase()}
            </span>
          </div>

          {/* Progress */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-nexus-muted font-game text-xs">PROGRESS</span>
              <span className="text-nexus-text font-game text-xs">
                {project?.completed_tasks}/{project?.total_tasks} • {pct}%
              </span>
            </div>
            <div className="h-1.5 bg-nexus-border rounded overflow-hidden">
              <div
                className="h-full bg-nexus-accent rounded transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-nexus-border shrink-0">
          {['tasks', 'roadmap'].map((tab) => (
            <button
              key={tab}
              onClick={() => setPanelTab(tab)}
              className={`flex-1 py-2 font-game text-xs tracking-widest uppercase transition-all border-b-2 -mb-px ${
                panelTab === tab
                  ? 'border-nexus-accent text-nexus-accent'
                  : 'border-transparent text-nexus-muted hover:text-nexus-text'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Task list tab */}
        {panelTab === 'tasks' && (
          <div className="flex-1 overflow-y-auto">
            {allTasks.length === 0 ? (
              <div className="px-4 py-6 text-nexus-muted font-game text-xs text-center">No tasks yet</div>
            ) : (
              <div className="divide-y divide-nexus-border/50">
                {allTasks.map((t) => {
                  const isComplete = t.status === 'completed';
                  const isActive = t.status === 'active';
                  return (
                    <div key={t.id} className="px-4 py-2.5 flex items-start gap-2.5">
                      <span
                        className="shrink-0 mt-0.5 text-sm"
                        style={{ color: isComplete ? '#00ff88' : isActive ? '#00d4ff' : '#6b7fa3' }}
                      >
                        {isComplete ? '✓' : isActive ? '▶' : '○'}
                      </span>
                      <div className="min-w-0">
                        <div
                          className={`font-game text-xs leading-snug ${
                            isComplete ? 'text-nexus-muted line-through' : 'text-nexus-text'
                          }`}
                        >
                          {t.title}
                        </div>
                        {t.difficulty && (
                          <div className="mt-0.5 text-nexus-muted font-game text-xs opacity-70">
                            {t.difficulty} • {t.estimated_minutes}m
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Roadmap tab */}
        {panelTab === 'roadmap' && (
          <div className="flex-1 overflow-y-auto">
            {!roadmap ? (
              <div className="px-4 py-6 text-nexus-muted font-game text-xs text-center">
                Roadmap generates on first quest.
              </div>
            ) : roadmap.steps.length === 0 ? (
              <div className="px-4 py-6 text-nexus-muted font-game text-xs text-center">
                No roadmap steps yet.
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {roadmap.steps.map((step, idx) => {
                  const isDone = idx < completedCount;
                  const isCurrent = idx === completedCount % roadmap.steps.length;
                  const phaseColor = phaseColors[step.phase] || '#6b7fa3';
                  return (
                    <div
                      key={step.stepNumber}
                      className={`flex items-start gap-2.5 p-2.5 rounded border transition-all ${
                        isCurrent
                          ? 'border-nexus-accent/50 bg-nexus-accent/5'
                          : isDone
                          ? 'border-nexus-border/30 opacity-50'
                          : 'border-nexus-border/50'
                      }`}
                    >
                      {/* Step icon */}
                      <div
                        className="shrink-0 w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold mt-0.5"
                        style={{
                          borderColor: isDone ? '#00ff88' : isCurrent ? '#00d4ff' : '#6b7fa3',
                          color: isDone ? '#00ff88' : isCurrent ? '#00d4ff' : '#6b7fa3',
                          background: isDone
                            ? 'rgba(0,255,136,0.1)'
                            : isCurrent
                            ? 'rgba(0,212,255,0.1)'
                            : 'transparent',
                        }}
                      >
                        {isDone ? '✓' : step.stepNumber}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div
                          className={`font-game text-xs font-bold leading-snug ${
                            isDone ? 'text-nexus-muted line-through' : 'text-nexus-text'
                          }`}
                        >
                          {step.title}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span
                            className="font-game text-xs"
                            style={{ color: phaseColor, opacity: 0.8 }}
                          >
                            {step.phase?.toUpperCase()}
                          </span>
                          <span className="text-nexus-muted font-game text-xs opacity-60">
                            ~{step.estimatedMinutes}m
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ─── TaskView ─────────────────────────────────────────────────────────────────

function TaskView() {
  const { taskId } = useParams();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('project');
  const { user } = useUser();
  const navigate = useNavigate();

  const [task, setTask] = useState(null);
  const [project, setProject] = useState(null);
  const [allTasks, setAllTasks] = useState([]);
  const [submission, setSubmission] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [abandoning, setAbandoning] = useState(false);
  const [error, setError] = useState('');
  const [hintsOpen, setHintsOpen] = useState(false);
  const [projectPanelOpen, setProjectPanelOpen] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [draftSaved, setDraftSaved] = useState(false);

  const timerRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    loadTask();
  }, [taskId]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // Load draft from localStorage
  useEffect(() => {
    if (taskId) {
      const draft = localStorage.getItem(`nexus_draft_${taskId}`);
      if (draft) setSubmission(draft);
    }
  }, [taskId]);

  async function loadTask() {
    setLoading(true);
    setError('');
    try {
      const taskRes = await fetch(`${API_BASE}/tasks/${taskId}`);
      if (!taskRes.ok) {
        const d = await taskRes.json();
        throw new Error(d.error || 'Task not found');
      }
      const taskData = await taskRes.json();
      setTask(taskData);

      // Start task if pending
      if (taskData.status === 'pending') {
        await fetch(`${API_BASE}/tasks/${taskId}/start`, { method: 'PUT' });
      }

      // Load project + all its tasks
      const pid = taskData.project_id || projectId;
      if (pid) {
        const projRes = await fetch(`${API_BASE}/projects/${pid}`);
        if (projRes.ok) {
          setProject(await projRes.json());
        }
        // Load all tasks for the project
        const tasksRes = await fetch(`${API_BASE}/tasks/project/${pid}`);
        if (tasksRes.ok) {
          setAllTasks(await tasksRes.json());
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function saveDraft() {
    if (taskId && submission.trim()) {
      localStorage.setItem(`nexus_draft_${taskId}`, submission);
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2000);
    }
  }

  async function handleSubmit() {
    if (!submission.trim()) {
      setError('Please write something before submitting.');
      return;
    }
    if (submission.trim().split(/\s+/).length < 5) {
      setError('Your submission is too short. Write at least a few sentences.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const timeTakenMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
      const res = await fetch(`${API_BASE}/scoring/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: taskId,
          user_id: user.id,
          submission_text: submission,
          time_taken_minutes: timeTakenMinutes,
        }),
      });
      const data = await res.json();
      if (res.status === 503) {
        throw new Error('AI scoring unavailable — check your GEMINI_API_KEY in .env file');
      }
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      localStorage.removeItem(`nexus_draft_${taskId}`);
      navigate(`/results/${taskId}`, { state: { result: data } });
    } catch (err) {
      setError(`Submission failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAbandon() {
    if (!window.confirm('Abandon this task? You will lose 50 XP.')) return;

    setAbandoning(true);
    try {
      await fetch(`${API_BASE}/tasks/${taskId}/abandon`, { method: 'PUT' });
      localStorage.removeItem(`nexus_draft_${taskId}`);
      navigate('/', { replace: true });
    } catch {
      setError('Failed to abandon task.');
    } finally {
      setAbandoning(false);
    }
  }

  const wordCount = submission.trim() ? submission.trim().split(/\s+/).length : 0;
  const charCount = submission.length;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-nexus-bg">
        <div className="text-center">
          <div className="text-nexus-accent font-game text-xl tracking-widest mb-4">LOADING QUEST...</div>
          <div className="flex justify-center gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-nexus-accent rounded-full pulse-glow"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && !task) {
    return (
      <div className="h-full flex items-center justify-center bg-nexus-bg">
        <div className="text-center max-w-md px-8">
          <div className="text-nexus-danger font-game text-xl mb-4">QUEST ERROR</div>
          <div className="text-nexus-muted font-game text-sm mb-6">{error}</div>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2.5 border border-nexus-accent text-nexus-accent font-game tracking-wider rounded hover:bg-nexus-accent/10 transition-all"
          >
            RETURN TO BASE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-nexus-bg overflow-hidden">
      {/* Project side panel */}
      {projectPanelOpen && project && (
        <ProjectPanel
          project={project}
          allTasks={allTasks}
          onClose={() => setProjectPanelOpen(false)}
        />
      )}

      {/* Task Header */}
      <div className="px-6 py-3 bg-nexus-panel border-b border-nexus-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={() => navigate('/')}
            className="text-nexus-muted hover:text-nexus-accent transition-colors shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="min-w-0">
            <div className="text-nexus-muted font-game text-xs tracking-widest uppercase">
              {project?.title || 'Project'}
            </div>
            <div className="text-nexus-text font-game font-bold text-base truncate" title={task?.title}>
              {task?.title}
            </div>
          </div>
          {task?.difficulty && <DifficultyBadge difficulty={task.difficulty} />}
          {/* VIEW PROJECT button */}
          {project && (
            <button
              onClick={() => setProjectPanelOpen(true)}
              className="shrink-0 px-3 py-1 bg-nexus-panel border border-nexus-border hover:border-nexus-accent/60 hover:text-nexus-accent text-nexus-muted font-game text-xs tracking-wider rounded transition-all"
            >
              PROJECT
            </button>
          )}
        </div>

        <div className="flex items-center gap-6 shrink-0">
          {/* Timer */}
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-nexus-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <TimerDisplay seconds={elapsedSeconds} />
          </div>
          {/* XP Reward */}
          <div className="flex items-center gap-1">
            <span className="text-nexus-gold font-game text-sm font-bold">+{task?.xp_reward}</span>
            <span className="text-nexus-muted font-game text-xs">XP</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Task info + hints */}
        <div className="w-80 flex flex-col border-r border-nexus-border overflow-hidden shrink-0">
          {/* Objective */}
          <div className="p-4 border-b border-nexus-border">
            <div className="text-nexus-muted font-game text-xs tracking-widest uppercase mb-3">Mission Objective</div>
            <p className="text-nexus-text font-game text-sm leading-relaxed">
              {task?.description}
            </p>
          </div>

          {/* Deliverable */}
          <div className="p-4 border-b border-nexus-border">
            <div className="text-nexus-muted font-game text-xs tracking-widest uppercase mb-2">Deliverable</div>
            <div className="p-3 bg-nexus-accent/5 border border-nexus-accent/20 rounded">
              <p className="text-nexus-accent font-game text-sm">{task?.deliverable}</p>
            </div>
          </div>

          {/* Est. Time */}
          <div className="px-4 py-3 border-b border-nexus-border flex items-center justify-between">
            <span className="text-nexus-muted font-game text-xs">Est. Time</span>
            <span className="text-nexus-text font-game text-sm font-bold">{task?.estimated_minutes} min</span>
          </div>

          {/* Hints */}
          <div className="flex-1 overflow-y-auto">
            <button
              onClick={() => setHintsOpen(!hintsOpen)}
              className="w-full px-4 py-3 flex items-center justify-between text-nexus-muted hover:text-nexus-text transition-colors border-b border-nexus-border"
            >
              <span className="font-game text-xs tracking-widest uppercase">Hints & Tips</span>
              <svg
                className={`w-4 h-4 transition-transform ${hintsOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {hintsOpen && (
              <div className="p-4 space-y-3 fade-in-up">
                {(() => {
                  // Parse task-specific hints from hints_json, fall back gracefully
                  let hints = null;
                  if (task?.hints_json) {
                    try { hints = JSON.parse(task.hints_json); } catch (_) {}
                  }
                  if (hints && Array.isArray(hints) && hints.length > 0) {
                    const icons = ['💡', '✍️', '🎯', '⚡', '🔬', '📖'];
                    return hints.map((hint, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-base shrink-0">{icons[i % icons.length]}</span>
                        <p className="text-nexus-muted font-game text-xs leading-relaxed">{hint}</p>
                      </div>
                    ));
                  }
                  // No hints for this task (old task or generation failed)
                  return (
                    <div className="text-nexus-muted font-game text-xs text-center py-2">
                      No hints available for this task.
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Right: Submission area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor */}
          <div className="flex-1 p-4 relative overflow-hidden">
            <textarea
              value={submission}
              onChange={(e) => setSubmission(e.target.value)}
              placeholder={'Begin writing here...\n\nYour response to the task objective. Be clear, focused, and specific.'}
              className="w-full h-full bg-nexus-panel border border-nexus-border text-nexus-text font-mono text-sm px-5 py-4 rounded resize-none focus:outline-none focus:border-nexus-accent transition-colors placeholder-nexus-muted/30 leading-relaxed"
              style={{ fontFamily: '"Fira Code", monospace' }}
              spellCheck
            />
          </div>

          {/* Status bar */}
          <div className="px-4 py-2 border-t border-nexus-border flex items-center justify-between shrink-0 bg-nexus-panel/50">
            <div className="flex items-center gap-4 text-nexus-muted font-mono text-xs">
              <span>{wordCount} words</span>
              <span>{charCount} chars</span>
              {draftSaved && (
                <span className="text-nexus-success">✓ Draft saved</span>
              )}
            </div>
            {error && (
              <div className="text-nexus-danger font-game text-xs max-w-xs truncate">{error}</div>
            )}
          </div>

          {/* Action buttons */}
          <div className="px-4 py-3 border-t border-nexus-border flex items-center gap-3 shrink-0">
            <button
              onClick={handleAbandon}
              disabled={abandoning}
              className="px-4 py-2 border border-nexus-danger/30 text-nexus-danger/70 hover:border-nexus-danger hover:text-nexus-danger font-game text-sm tracking-wider rounded transition-all disabled:opacity-50"
            >
              {abandoning ? 'ABANDONING...' : '✗ ABANDON (-50 XP)'}
            </button>

            <button
              onClick={saveDraft}
              className="px-4 py-2 border border-nexus-border text-nexus-muted hover:border-nexus-accent/50 hover:text-nexus-text font-game text-sm tracking-wider rounded transition-all"
            >
              SAVE DRAFT
            </button>

            <div className="flex-1" />

            <button
              onClick={handleSubmit}
              disabled={submitting || !submission.trim()}
              className="px-8 py-2.5 bg-nexus-success/10 border border-nexus-success text-nexus-success hover:bg-nexus-success/20 font-game font-bold text-base tracking-widest rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-nexus-success border-t-transparent rounded-full animate-spin" />
                  SCORING...
                </span>
              ) : (
                '⚡ SUBMIT TASK'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaskView;
