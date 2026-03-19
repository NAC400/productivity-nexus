import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { API_BASE, useUser } from '../App';
import RankBadge from './RankBadge';

function ScoreRing({ score, label, color, feedback, delay = 0 }) {
  const [displayed, setDisplayed] = useState(0);
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = (displayed / 100) * circumference;

  useEffect(() => {
    const timeout = setTimeout(() => {
      let current = 0;
      const interval = setInterval(() => {
        current += 2;
        if (current >= score) {
          setDisplayed(score);
          clearInterval(interval);
        } else {
          setDisplayed(current);
        }
      }, 16);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [score, delay]);

  return (
    <div className="flex flex-col items-center p-4 bg-nexus-panel border border-nexus-border rounded">
      <div className="relative mb-3">
        <svg width="90" height="90" className="-rotate-90">
          <circle
            cx="45"
            cy="45"
            r={radius}
            fill="none"
            stroke="#1e2d4a"
            strokeWidth="6"
          />
          <circle
            cx="45"
            cy="45"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeDasharray={`${strokeDash} ${circumference}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.05s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-game font-bold text-xl" style={{ color }}>
            {displayed}
          </span>
        </div>
      </div>
      <div className="font-game font-bold text-nexus-text text-xs tracking-wider mb-2">{label}</div>
      {feedback && (
        <p className="font-game text-nexus-muted text-xs text-center leading-relaxed">{feedback}</p>
      )}
    </div>
  );
}

function AnimatedXP({ targetXP, delay = 800 }) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      let current = 0;
      const step = Math.max(1, Math.ceil(targetXP / 60));
      const interval = setInterval(() => {
        current = Math.min(current + step, targetXP);
        setDisplayed(current);
        if (current >= targetXP) clearInterval(interval);
      }, 20);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [targetXP, delay]);

  return <span>{displayed}</span>;
}

function StarsBurst() {
  return (
    <div className="flex justify-center gap-3 mb-6">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="star-pop text-3xl"
          style={{ animationDelay: `${i * 0.15}s` }}
        >
          ⭐
        </div>
      ))}
    </div>
  );
}

function Results() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUser } = useUser();

  const [result, setResult] = useState(location.state?.result || null);
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(!result);
  const [error, setError] = useState('');

  useEffect(() => {
    if (result) {
      // Update user context with new XP/rank
      if (result.user) {
        updateUser({
          xp: result.user.xp,
          rank: result.user.rank,
          nextRankXP: result.user.nextRankXP,
          progressToNext: result.user.progressToNext,
        });
      }
    }

    // Load task info
    fetch(`${API_BASE}/tasks/${taskId}`)
      .then((r) => r.json())
      .then(setTask)
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-nexus-bg">
        <div className="text-nexus-accent font-game text-xl tracking-widest">CALCULATING RESULTS...</div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="h-full flex items-center justify-center bg-nexus-bg">
        <div className="text-center max-w-md px-8">
          <div className="text-nexus-danger font-game text-xl mb-4">RESULTS ERROR</div>
          <div className="text-nexus-muted font-game text-sm mb-6">{error || 'No result data found.'}</div>
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

  const { scores, rankChanged, previousRank, newRank, newAchievements = [] } = result;
  const updatedUser = result.user;

  const paceLabel =
    scores.pace_multiplier >= 1.2
      ? 'BLAZING (×1.2)'
      : scores.pace_multiplier >= 1.0
      ? 'ON TIME (×1.0)'
      : scores.pace_multiplier >= 0.8
      ? 'LATE (×0.8)'
      : 'VERY LATE (×0.6)';

  const paceColor =
    scores.pace_multiplier >= 1.2
      ? '#00ff88'
      : scores.pace_multiplier >= 1.0
      ? '#00d4ff'
      : scores.pace_multiplier >= 0.8
      ? '#f5c518'
      : '#ff4757';

  const avgScore = Math.round(
    (scores.grammar_score + scores.idea_score + scores.execution_score) / 3
  );

  const overallGrade =
    avgScore >= 90 ? 'S' : avgScore >= 80 ? 'A' : avgScore >= 70 ? 'B' : avgScore >= 60 ? 'C' : 'D';

  const gradeColor =
    overallGrade === 'S'
      ? '#b9f2ff'
      : overallGrade === 'A'
      ? '#00ff88'
      : overallGrade === 'B'
      ? '#00d4ff'
      : overallGrade === 'C'
      ? '#f5c518'
      : '#ff4757';

  return (
    <div className="h-full overflow-y-auto bg-nexus-bg">
      {/* Background effect */}
      <div
        className="fixed inset-0 pointer-events-none opacity-5"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0,255,136,0.3) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8 fade-in-up">
          <StarsBurst />
          <div className="text-nexus-success font-game font-bold text-4xl tracking-widest mb-2">
            TASK COMPLETE!
          </div>
          <div className="text-nexus-muted font-game tracking-wider">
            {task?.title || 'Quest completed successfully'}
          </div>
        </div>

        {/* Overall grade */}
        <div className="flex justify-center mb-8">
          <div
            className="flex items-center justify-center w-24 h-24 rounded border-4"
            style={{ borderColor: gradeColor, background: `${gradeColor}15` }}
          >
            <span className="font-game font-bold text-5xl" style={{ color: gradeColor }}>
              {overallGrade}
            </span>
          </div>
        </div>

        {/* Score breakdown */}
        <div className="grid grid-cols-3 gap-4 mb-6 fade-in-up" style={{ animationDelay: '0.2s' }}>
          <ScoreRing
            score={scores.grammar_score}
            label="WRITING QUALITY"
            color="#00d4ff"
            feedback={scores.grammar_feedback}
            delay={200}
          />
          <ScoreRing
            score={scores.idea_score}
            label="IDEA QUALITY"
            color="#f5c518"
            feedback={scores.idea_feedback}
            delay={400}
          />
          <ScoreRing
            score={scores.execution_score}
            label="EXECUTION"
            color="#00ff88"
            feedback={scores.execution_feedback}
            delay={600}
          />
        </div>

        {/* Pace bonus + XP */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Pace */}
          <div className="p-4 bg-nexus-panel border border-nexus-border rounded">
            <div className="text-nexus-muted font-game text-xs tracking-widest uppercase mb-3">Pace Bonus</div>
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ background: paceColor, boxShadow: `0 0 8px ${paceColor}` }}
              />
              <span className="font-game font-bold text-lg" style={{ color: paceColor }}>
                {paceLabel}
              </span>
            </div>
          </div>

          {/* XP Earned */}
          <div className="p-4 bg-nexus-panel border border-nexus-border rounded">
            <div className="text-nexus-muted font-game text-xs tracking-widest uppercase mb-3">XP Earned</div>
            <div className="flex items-baseline gap-2">
              <span className="font-game font-bold text-4xl text-nexus-gold">
                +<AnimatedXP targetXP={scores.xp_earned} delay={800} />
              </span>
              <span className="text-nexus-muted font-game text-sm">XP</span>
            </div>
          </div>
        </div>

        {/* Rank progress */}
        <div className="p-5 bg-nexus-panel border border-nexus-border rounded mb-6 fade-in-up">
          <div className="text-nexus-muted font-game text-xs tracking-widest uppercase mb-4">Rank Progress</div>
          <div className="flex items-center gap-4">
            <RankBadge rank={newRank} size="lg" />
            <div className="flex-1">
              <div className="flex justify-between mb-2">
                <span className="text-nexus-muted font-game text-xs">
                  {updatedUser?.xp?.toLocaleString()} XP
                </span>
                <span className="text-nexus-muted font-game text-xs">
                  {updatedUser?.nextRankXP ? `${updatedUser.nextRankXP.toLocaleString()} next rank` : 'MAX RANK'}
                </span>
              </div>
              <div className="h-3 bg-nexus-border rounded overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-nexus-accent to-nexus-accent/60 rounded xp-fill"
                  style={{ width: `${updatedUser?.progressToNext || 0}%` }}
                />
              </div>
              <div className="text-right mt-1 text-nexus-muted font-game text-xs">
                {updatedUser?.progressToNext || 0}% to next rank
              </div>
            </div>
          </div>

          {rankChanged && (
            <div className="mt-4 p-3 bg-nexus-gold/10 border border-nexus-gold/30 rounded text-center">
              <div className="text-nexus-gold font-game font-bold tracking-widest">
                RANK UP! {previousRank} → {newRank}
              </div>
            </div>
          )}
        </div>

        {/* Achievements */}
        {newAchievements.length > 0 && (
          <div className="mb-6 fade-in-up">
            <div className="text-nexus-muted font-game text-xs tracking-widest uppercase mb-3">Achievements Unlocked</div>
            <div className="space-y-2">
              {newAchievements.map((ach) => (
                <div
                  key={ach.key}
                  className="flex items-center gap-3 p-3 bg-nexus-gold/5 border border-nexus-gold/30 rounded glow-gold"
                >
                  <span className="text-2xl">🏆</span>
                  <div>
                    <div className="text-nexus-gold font-game font-bold text-sm tracking-wider">{ach.title}</div>
                    <div className="text-nexus-muted font-game text-xs">{ach.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-4 justify-center fade-in-up">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 border border-nexus-border text-nexus-muted hover:border-nexus-accent/50 hover:text-nexus-text font-game tracking-wider rounded transition-all"
          >
            ⬡ BACK TO BASE
          </button>

          {task?.project_id && (
            <button
              onClick={() => {
                // Generate new task for same project
                fetch(`${API_BASE}/tasks/generate`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ project_id: task.project_id, user_id: user.id }),
                })
                  .then((r) => r.json())
                  .then((newTask) => navigate(`/task/${newTask.id}?project=${task.project_id}`))
                  .catch(() => navigate('/'));
              }}
              className="px-8 py-3 bg-nexus-accent/10 border border-nexus-accent text-nexus-accent hover:bg-nexus-accent/20 font-game font-bold tracking-widest rounded transition-all glow-accent"
            >
              ⚡ NEXT QUEST
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Results;
