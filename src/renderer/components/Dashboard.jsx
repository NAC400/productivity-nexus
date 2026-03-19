import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE, useUser } from '../App';
import RankBadge from './RankBadge';
import Leaderboard from './Leaderboard';
import Social from './Social';

function GameModeCard({ title, status, description, icon, onClick }) {
  const isActive = status === 'active';
  const isLocked = status === 'locked';

  return (
    <div
      onClick={isActive ? onClick : undefined}
      className={`relative p-4 border rounded transition-all ${
        isActive
          ? 'border-nexus-accent bg-nexus-accent/5 hover:bg-nexus-accent/10 cursor-pointer glow-accent'
          : 'border-nexus-border bg-nexus-panel/50 opacity-60 cursor-not-allowed'
      }`}
    >
      {isLocked && (
        <div className="absolute top-2 right-2">
          <svg className="w-4 h-4 text-nexus-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
      )}
      {isActive && (
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <div className="w-2 h-2 bg-nexus-success rounded-full pulse-glow" />
          <span className="text-nexus-success font-game text-xs tracking-wider">ONLINE</span>
        </div>
      )}
      <div className="text-2xl mb-2">{icon}</div>
      <div className="font-game font-bold text-sm tracking-wider mb-1" style={{ color: isActive ? '#00d4ff' : '#6b7fa3' }}>
        {title}
      </div>
      <div className="font-game text-xs text-nexus-muted">{description}</div>
      {isLocked && (
        <div className="mt-2 text-nexus-muted font-game text-xs tracking-wider">COMING SOON</div>
      )}
    </div>
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

function ProjectCard({ project, onQuestClick }) {
  const pct = project.total_tasks > 0
    ? Math.round((project.completed_tasks / project.total_tasks) * 100)
    : 0;

  const typeLabel = { short: 'SPRINT', long: 'CAMPAIGN', ongoing: 'ONGOING' };
  const phaseLabel = project.phase?.toUpperCase() || 'PLANNING';

  return (
    <div className="p-4 border border-nexus-border bg-nexus-panel/50 rounded hover:border-nexus-accent/50 transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 mr-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-nexus-muted font-game text-xs tracking-wider">
              {typeLabel[project.type] || project.type?.toUpperCase()}
            </span>
            <span className="text-nexus-border">•</span>
            <span className="text-nexus-accent font-game text-xs tracking-wider">{phaseLabel}</span>
          </div>
          <h3 className="font-game font-bold text-nexus-text text-sm truncate" title={project.title}>
            {project.title}
          </h3>
        </div>
        <button
          onClick={() => onQuestClick(project)}
          className="shrink-0 px-3 py-1.5 bg-nexus-accent/10 border border-nexus-accent/50 hover:bg-nexus-accent/20 hover:border-nexus-accent text-nexus-accent font-game text-xs tracking-wider rounded transition-all"
        >
          QUEST
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="flex justify-between mb-1">
          <span className="text-nexus-muted font-game text-xs">PROGRESS</span>
          <span className="text-nexus-text font-game text-xs">
            {project.completed_tasks}/{project.total_tasks} tasks • {pct}%
          </span>
        </div>
        <div className="h-1.5 bg-nexus-border rounded overflow-hidden">
          <div
            className="h-full bg-nexus-accent rounded transition-all duration-500 xp-fill"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {project.deadline && (
        <div className="text-nexus-muted font-game text-xs">
          Deadline: {new Date(project.deadline).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}

// ─── Quest Modal ──────────────────────────────────────────────────────────────

function QuestModal({ questModal, onClose, onEnter }) {
  const { project, task, loading, error } = questModal;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg mx-4 bg-nexus-panel border border-nexus-accent/40 rounded-lg shadow-2xl fade-in-up"
        style={{ boxShadow: '0 0 40px rgba(0,212,255,0.15)' }}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-nexus-border flex items-center justify-between">
          <div>
            <div className="text-nexus-muted font-game text-xs tracking-widest uppercase mb-1">
              {project?.title}
            </div>
            <div className="text-nexus-accent font-game font-bold text-lg tracking-wider uppercase">
              QUEST BRIEFING
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-nexus-muted hover:text-nexus-text transition-colors ml-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 min-h-[260px] flex flex-col justify-center">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-nexus-accent rounded-full pulse-glow"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
              <div className="text-nexus-muted font-game text-sm tracking-widest">GENERATING QUEST...</div>
            </div>
          )}

          {error && !loading && (
            <div className="text-center">
              <div className="text-nexus-danger font-game text-base mb-2">QUEST GENERATION FAILED</div>
              <div className="text-nexus-muted font-game text-sm">{error}</div>
            </div>
          )}

          {task && !loading && (
            <div className="space-y-4">
              {/* Title */}
              <div>
                <div className="text-nexus-muted font-game text-xs tracking-widest uppercase mb-1">Mission Title</div>
                <div className="text-nexus-text font-game font-bold text-base">{task.title}</div>
              </div>

              {/* Badges row */}
              <div className="flex items-center gap-3 flex-wrap">
                {task.difficulty && <DifficultyBadge difficulty={task.difficulty} />}
                <span className="text-nexus-gold font-game text-sm font-bold">+{task.xp_reward} XP</span>
                <span className="text-nexus-muted font-game text-xs">⏱ {task.estimated_minutes} min</span>
              </div>

              {/* Description */}
              <div>
                <div className="text-nexus-muted font-game text-xs tracking-widest uppercase mb-1">Objective</div>
                <p className="text-nexus-text font-game text-sm leading-relaxed">{task.description}</p>
              </div>

              {/* Deliverable */}
              {task.deliverable && (
                <div className="p-3 bg-nexus-accent/5 border border-nexus-accent/20 rounded">
                  <div className="text-nexus-muted font-game text-xs tracking-widest uppercase mb-1">Deliverable</div>
                  <p className="text-nexus-accent font-game text-sm">{task.deliverable}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-nexus-border flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 border border-nexus-border text-nexus-muted hover:border-nexus-accent/50 hover:text-nexus-text font-game text-sm tracking-wider rounded transition-all"
          >
            CANCEL
          </button>
          <button
            onClick={onEnter}
            disabled={!task || loading}
            className="px-6 py-2 bg-nexus-accent/10 border border-nexus-accent text-nexus-accent hover:bg-nexus-accent/20 font-game font-bold text-sm tracking-widest rounded transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ENTER QUEST →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard() {
  const { user, updateUser } = useUser();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('nexus'); // 'nexus' | 'leaderboard' | 'social'
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [questModal, setQuestModal] = useState({ open: false, project: null, task: null, loading: false, error: '' });

  useEffect(() => {
    if (!user?.id) return;
    loadData();
  }, [user?.id]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [projRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/projects/user/${user.id}`),
        fetch(`${API_BASE}/users/${user.id}/stats`),
      ]);

      if (projRes.ok) {
        const projData = await projRes.json();
        setProjects(projData);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
        updateUser({
          xp: statsData.xp,
          rank: statsData.rank,
          nextRankXP: statsData.nextRankXP,
          currentFloor: statsData.currentFloor,
          progressToNext: statsData.progressToNext,
        });
      }
    } catch {
      setError('Failed to load data. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  async function handleQuestClick(project) {
    setQuestModal({ open: true, project, task: null, loading: true, error: '' });
    try {
      const res = await fetch(`${API_BASE}/tasks/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: project.id, user_id: user.id }),
      });
      const data = await res.json();
      if (res.status === 503) {
        const msg = 'AI unavailable — check your GEMINI_API_KEY in .env file';
        setQuestModal((prev) => ({ ...prev, loading: false, error: msg }));
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Failed to generate task');
      setQuestModal((prev) => ({ ...prev, task: data, loading: false }));
    } catch (err) {
      setQuestModal((prev) => ({ ...prev, loading: false, error: err.message }));
    }
  }

  function handleQuestClose() {
    // If a task was generated but not entered, we leave it in DB as pending
    setQuestModal({ open: false, project: null, task: null, loading: false, error: '' });
  }

  function handleQuestEnter() {
    const { task, project } = questModal;
    if (!task) return;
    setQuestModal({ open: false, project: null, task: null, loading: false, error: '' });
    navigate(`/task/${task.id}?project=${project.id}`);
  }

  const activeProjects = projects.filter((p) => p.status === 'active');
  const xp = stats?.xp ?? user?.xp ?? 0;
  const rank = stats?.rank ?? user?.rank ?? 'Iron';
  const progressToNext = stats?.progressToNext ?? 0;
  const nextRankXP = stats?.nextRankXP ?? null;

  const tabs = [
    { id: 'nexus', label: '⬡ NEXUS' },
    { id: 'leaderboard', label: '🏆 LEADERBOARD' },
    { id: 'social', label: '👥 SOCIAL' },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Tab Bar */}
      <div className="flex items-center border-b border-nexus-border bg-nexus-panel shrink-0 px-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-5 py-3 font-game text-xs tracking-widest uppercase transition-all border-b-2 -mb-px ${
              activeTab === t.id
                ? 'border-nexus-accent text-nexus-accent'
                : 'border-transparent text-nexus-muted hover:text-nexus-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Quest Modal */}
      {questModal.open && (
        <QuestModal
          questModal={questModal}
          onClose={handleQuestClose}
          onEnter={handleQuestEnter}
        />
      )}

      {/* LEADERBOARD tab */}
      {activeTab === 'leaderboard' && (
        <div className="flex-1 overflow-hidden">
          <Leaderboard />
        </div>
      )}

      {/* SOCIAL tab */}
      {activeTab === 'social' && (
        <div className="flex-1 overflow-hidden">
          <Social />
        </div>
      )}

      {/* NEXUS tab */}
      {activeTab === 'nexus' && (
        <>
          {error && (
            <div className="mx-4 mt-3 px-4 py-2 bg-nexus-danger/10 border border-nexus-danger/30 rounded text-nexus-danger font-game text-sm">
              {error}
              <button onClick={loadData} className="ml-3 underline text-nexus-accent">Retry</button>
            </div>
          )}

          <div className="flex-1 grid grid-cols-3 gap-4 p-4 overflow-hidden">
            {/* Panel 1: Active Projects */}
            <div className="flex flex-col bg-nexus-panel border border-nexus-border rounded overflow-hidden slide-in-left">
              <div className="flex items-center justify-between px-4 py-3 border-b border-nexus-border shrink-0">
                <div>
                  <div className="text-nexus-muted font-game text-xs tracking-widest uppercase">Active Campaigns</div>
                  <div className="text-nexus-text font-game font-bold text-sm tracking-wider">YOUR CHAMPIONS</div>
                </div>
                <button
                  onClick={() => navigate('/project/new')}
                  className="px-3 py-1.5 bg-nexus-accent/10 border border-nexus-accent/50 hover:bg-nexus-accent/20 hover:border-nexus-accent text-nexus-accent font-game text-xs tracking-wider rounded transition-all"
                >
                  + NEW
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-nexus-muted font-game text-sm">Loading...</div>
                  </div>
                ) : activeProjects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-4">
                    <div className="text-4xl mb-4 opacity-30">🎯</div>
                    <div className="text-nexus-muted font-game text-sm mb-4">No active campaigns</div>
                    <button
                      onClick={() => navigate('/project/new')}
                      className="px-4 py-2 border border-nexus-accent text-nexus-accent font-game text-sm tracking-wider rounded hover:bg-nexus-accent/10 transition-all"
                    >
                      CREATE FIRST PROJECT
                    </button>
                  </div>
                ) : (
                  activeProjects.map((p) => (
                    <ProjectCard key={p.id} project={p} onQuestClick={handleQuestClick} />
                  ))
                )}
              </div>
            </div>

            {/* Panel 2: Game Modes */}
            <div className="flex flex-col bg-nexus-panel border border-nexus-border rounded overflow-hidden">
              <div className="px-4 py-3 border-b border-nexus-border shrink-0">
                <div className="text-nexus-muted font-game text-xs tracking-widest uppercase">Select Mode</div>
                <div className="text-nexus-text font-game font-bold text-sm tracking-wider">GAME MODES</div>
              </div>

              <div className="flex-1 p-3 grid grid-cols-2 gap-3 content-start">
                <div className="col-span-2">
                  <GameModeCard
                    title="RESEARCH MODE"
                    status="active"
                    description="Academic writing, papers, and research projects"
                    icon="📚"
                    onClick={() => {
                      const first = activeProjects[0];
                      if (first) handleQuestClick(first);
                      else navigate('/project/new');
                    }}
                  />
                </div>
                <GameModeCard
                  title="LANGUAGE MODE"
                  status="locked"
                  description="Language learning and practice quests"
                  icon="🌐"
                />
                <GameModeCard
                  title="CHESS MODE"
                  status="locked"
                  description="Strategic thinking and game analysis"
                  icon="♟️"
                />
                <GameModeCard
                  title="MUSIC MODE"
                  status="locked"
                  description="Composition, theory, and practice"
                  icon="🎵"
                />
                <GameModeCard
                  title="CODE MODE"
                  status="locked"
                  description="Programming challenges and projects"
                  icon="💻"
                />
              </div>
            </div>

            {/* Panel 3: Stats & Rank */}
            <div className="flex flex-col bg-nexus-panel border border-nexus-border rounded overflow-hidden slide-in-right">
              <div className="px-4 py-3 border-b border-nexus-border shrink-0">
                <div className="text-nexus-muted font-game text-xs tracking-widest uppercase">Operative Profile</div>
                <div className="text-nexus-text font-game font-bold text-sm tracking-wider">STATS & RANK</div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {/* Rank display */}
                <div className="flex flex-col items-center py-4 border border-nexus-border rounded bg-nexus-bg/50">
                  <RankBadge rank={rank} size="xl" />
                  <div className="mt-3 text-center">
                    <div className="text-nexus-text font-game font-bold text-2xl">
                      {xp.toLocaleString()}
                    </div>
                    <div className="text-nexus-muted font-game text-xs tracking-widest">TOTAL XP</div>
                  </div>
                </div>

                {/* XP progress bar */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-nexus-muted font-game text-xs tracking-wider">XP TO NEXT RANK</span>
                    <span className="text-nexus-text font-game text-xs">
                      {nextRankXP ? `${nextRankXP.toLocaleString()} needed` : 'MAX RANK'}
                    </span>
                  </div>
                  <div className="h-3 bg-nexus-border rounded overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-nexus-accent to-nexus-accent/60 rounded transition-all duration-1000 xp-fill"
                      style={{ width: `${progressToNext}%` }}
                    />
                  </div>
                  <div className="text-right mt-1 text-nexus-muted font-game text-xs">{progressToNext}%</div>
                </div>

                {/* Weekly stats */}
                <div>
                  <div className="text-nexus-muted font-game text-xs tracking-widest uppercase mb-3">Weekly Performance</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'TASKS', value: stats?.weeklyTasks ?? 0 },
                      { label: 'AVG SCORE', value: stats ? `${stats.weeklyAvgScore}` : '—' },
                      { label: 'XP EARNED', value: stats?.weeklyXP ?? 0 },
                    ].map(({ label, value }) => (
                      <div key={label} className="text-center p-2 border border-nexus-border rounded bg-nexus-bg/50">
                        <div className="text-nexus-accent font-game font-bold text-lg">{value}</div>
                        <div className="text-nexus-muted font-game text-xs">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* All-time stats */}
                <div>
                  <div className="text-nexus-muted font-game text-xs tracking-widest uppercase mb-3">All-Time Records</div>
                  <div className="space-y-2">
                    {[
                      { label: 'Tasks Completed', value: stats?.completedTasksCount ?? 0 },
                      { label: 'Avg Grammar Score', value: stats ? `${stats.avgGrammarScore}/100` : '—' },
                      { label: 'Avg Idea Score', value: stats ? `${stats.avgIdeaScore}/100` : '—' },
                      { label: 'Avg Execution Score', value: stats ? `${stats.avgExecutionScore}/100` : '—' },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between items-center">
                        <span className="text-nexus-muted font-game text-xs">{label}</span>
                        <span className="text-nexus-text font-game text-sm font-bold">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Dashboard;
