import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE, useUser } from '../App';

const TOTAL_STEPS = 5;

function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
        const step = i + 1;
        const isComplete = step < currentStep;
        const isActive = step === currentStep;
        return (
          <React.Fragment key={step}>
            <div
              className={`w-8 h-8 rounded flex items-center justify-center font-game font-bold text-sm transition-all ${
                isComplete
                  ? 'bg-nexus-success/20 border border-nexus-success text-nexus-success'
                  : isActive
                  ? 'bg-nexus-accent/20 border border-nexus-accent text-nexus-accent glow-accent'
                  : 'bg-nexus-panel border border-nexus-border text-nexus-muted'
              }`}
            >
              {isComplete ? '✓' : step}
            </div>
            {i < TOTAL_STEPS - 1 && (
              <div
                className={`h-px w-8 transition-all ${
                  step < currentStep ? 'bg-nexus-success' : 'bg-nexus-border'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function TypeCard({ title, subtitle, icon, selected, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`p-5 border rounded cursor-pointer transition-all ${
        selected
          ? 'border-nexus-accent bg-nexus-accent/10 glow-accent'
          : 'border-nexus-border bg-nexus-panel hover:border-nexus-accent/50'
      }`}
    >
      <div className="text-3xl mb-3">{icon}</div>
      <div className="font-game font-bold text-nexus-text tracking-wider mb-1">{title}</div>
      <div className="font-game text-nexus-muted text-sm">{subtitle}</div>
    </div>
  );
}

function ProjectSetup() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    type: '',
    title: '',
    goal: '',
    publication_venue: '',
    deadline: '',
    creation_mode: '',
    idea: '',
    outline: '',
    working_hours_per_day: 2,
  });

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError('');
  }

  function handleNext() {
    setError('');
    if (step === 1 && !form.type) {
      setError('Please select a project type to continue.');
      return;
    }
    if (step === 2) {
      if (!form.title.trim()) {
        setError('Project title is required.');
        return;
      }
      if (!form.goal.trim()) {
        setError('Please describe the goal of this project.');
        return;
      }
    }
    if (step === 3 && !form.publication_venue) {
      setError('Please select a publication venue.');
      return;
    }
    if (step === 4 && !form.creation_mode) {
      setError('Please select a creation mode.');
      return;
    }
    setStep((s) => s + 1);
  }

  function handleBack() {
    setError('');
    setStep((s) => Math.max(1, s - 1));
  }

  async function handleCreate() {
    setError('');
    setLoading(true);
    try {
      const body = {
        user_id: user.id,
        title: form.title.trim(),
        goal: form.goal.trim(),
        type: form.type,
        publication_venue: form.publication_venue,
        deadline: form.deadline || null,
        working_hours_per_day: form.working_hours_per_day,
        outline: form.creation_mode === 'outline' ? form.outline : form.idea || null,
      };

      const res = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create project');
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const estimatedWeeks =
    form.working_hours_per_day > 0
      ? Math.max(
          1,
          Math.round(
            (form.type === 'short' ? 20 : form.type === 'long' ? 80 : 40) /
              (form.working_hours_per_day * 5)
          )
        )
      : '?';

  return (
    <div className="h-full flex flex-col overflow-hidden bg-nexus-bg">
      {/* Header */}
      <div className="px-8 pt-6 pb-4 border-b border-nexus-border shrink-0">
        <div className="text-nexus-muted font-game text-xs tracking-widest uppercase mb-1">New Campaign</div>
        <div className="text-nexus-text font-game font-bold text-2xl tracking-wider">PROJECT SETUP</div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <StepIndicator currentStep={step} />

        {/* Step 1: Project Type */}
        {step === 1 && (
          <div className="max-w-2xl mx-auto fade-in-up">
            <div className="text-center mb-8">
              <div className="text-nexus-accent font-game font-bold text-xl tracking-widest mb-2">
                STEP 1: CHOOSE YOUR CAMPAIGN TYPE
              </div>
              <div className="text-nexus-muted font-game">What kind of project are you undertaking?</div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <TypeCard
                title="Short-term Sprint"
                subtitle="A focused project with a clear end goal. 1-4 weeks."
                icon="⚡"
                selected={form.type === 'short'}
                onClick={() => update('type', 'short')}
              />
              <TypeCard
                title="Long-term Campaign"
                subtitle="An extended project requiring sustained effort. 1-6 months."
                icon="🗺️"
                selected={form.type === 'long'}
                onClick={() => update('type', 'long')}
              />
              <TypeCard
                title="Continuous Grind"
                subtitle="An ongoing effort with no fixed deadline. Habitual work."
                icon="♾️"
                selected={form.type === 'ongoing'}
                onClick={() => update('type', 'ongoing')}
              />
            </div>
          </div>
        )}

        {/* Step 2: Project Details */}
        {step === 2 && (
          <div className="max-w-xl mx-auto fade-in-up">
            <div className="text-center mb-8">
              <div className="text-nexus-accent font-game font-bold text-xl tracking-widest mb-2">
                STEP 2: PROJECT INTELLIGENCE
              </div>
              <div className="text-nexus-muted font-game">Define your mission objectives.</div>
            </div>
            <div className="space-y-5">
              <div>
                <label className="block text-nexus-muted font-game text-xs tracking-widest uppercase mb-2">
                  Project Title *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                  placeholder="e.g. The Impact of AI on Academic Research"
                  className="w-full bg-nexus-panel border border-nexus-border text-nexus-text font-game text-base px-4 py-3 rounded focus:outline-none focus:border-nexus-accent transition-colors placeholder-nexus-muted/50"
                  maxLength={120}
                />
              </div>
              <div>
                <label className="block text-nexus-muted font-game text-xs tracking-widest uppercase mb-2">
                  Mission Objective (Goal) *
                </label>
                <textarea
                  value={form.goal}
                  onChange={(e) => update('goal', e.target.value)}
                  placeholder="What is the main goal? What problem are you solving? What do you want to achieve?"
                  rows={4}
                  className="w-full bg-nexus-panel border border-nexus-border text-nexus-text font-game text-base px-4 py-3 rounded focus:outline-none focus:border-nexus-accent transition-colors placeholder-nexus-muted/50 resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Victory Condition */}
        {step === 3 && (
          <div className="max-w-xl mx-auto fade-in-up">
            <div className="text-center mb-8">
              <div className="text-nexus-accent font-game font-bold text-xl tracking-widest mb-2">
                STEP 3: VICTORY CONDITION
              </div>
              <div className="text-nexus-muted font-game">Where will your work be published or archived?</div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { key: 'academic', label: 'Academic Journal', icon: '🎓', desc: 'Peer-reviewed publication' },
                { key: 'blog', label: 'Blog / Medium', icon: '✍️', desc: 'Online article or post' },
                { key: 'social', label: 'Social Media', icon: '📣', desc: 'Thread or public content' },
                { key: 'archive', label: 'Personal Archive', icon: '📁', desc: 'Private notes or document' },
                { key: 'report', label: 'Formal Report', icon: '📊', desc: 'Business or technical report' },
                { key: 'book', label: 'Book / eBook', icon: '📖', desc: 'Long-form publication' },
              ].map(({ key, label, icon, desc }) => (
                <div
                  key={key}
                  onClick={() => update('publication_venue', key)}
                  className={`p-4 border rounded cursor-pointer transition-all flex items-start gap-3 ${
                    form.publication_venue === key
                      ? 'border-nexus-accent bg-nexus-accent/10'
                      : 'border-nexus-border bg-nexus-panel hover:border-nexus-accent/50'
                  }`}
                >
                  <span className="text-xl">{icon}</span>
                  <div>
                    <div className="font-game font-bold text-nexus-text text-sm">{label}</div>
                    <div className="font-game text-nexus-muted text-xs">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <label className="block text-nexus-muted font-game text-xs tracking-widest uppercase mb-2">
                Target Deadline (Optional)
              </label>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => update('deadline', e.target.value)}
                className="w-full bg-nexus-panel border border-nexus-border text-nexus-text font-game text-base px-4 py-3 rounded focus:outline-none focus:border-nexus-accent transition-colors"
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </div>
        )}

        {/* Step 4: Creation Mode */}
        {step === 4 && (
          <div className="max-w-2xl mx-auto fade-in-up">
            <div className="text-center mb-8">
              <div className="text-nexus-accent font-game font-bold text-xl tracking-widest mb-2">
                STEP 4: CREATION MODE
              </div>
              <div className="text-nexus-muted font-game">How do you want AI to assist your project?</div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <TypeCard
                title="IDEA MODE"
                subtitle="You have a topic or idea. AI will generate a task plan and guide you step by step."
                icon="💡"
                selected={form.creation_mode === 'idea'}
                onClick={() => update('creation_mode', 'idea')}
              />
              <TypeCard
                title="OUTLINE MODE"
                subtitle="You have a full structure or outline. AI will generate tasks from your existing plan."
                icon="📋"
                selected={form.creation_mode === 'outline'}
                onClick={() => update('creation_mode', 'outline')}
              />
            </div>

            {form.creation_mode === 'idea' && (
              <div className="fade-in-up">
                <label className="block text-nexus-muted font-game text-xs tracking-widest uppercase mb-2">
                  Your Topic / Idea
                </label>
                <textarea
                  value={form.idea}
                  onChange={(e) => update('idea', e.target.value)}
                  placeholder="Describe your idea, topic, or research question in as much detail as you have right now..."
                  rows={5}
                  className="w-full bg-nexus-panel border border-nexus-border text-nexus-text font-game text-sm px-4 py-3 rounded focus:outline-none focus:border-nexus-accent transition-colors placeholder-nexus-muted/50 resize-none"
                />
              </div>
            )}

            {form.creation_mode === 'outline' && (
              <div className="fade-in-up">
                <label className="block text-nexus-muted font-game text-xs tracking-widest uppercase mb-2">
                  Full Outline / Structure
                </label>
                <textarea
                  value={form.outline}
                  onChange={(e) => update('outline', e.target.value)}
                  placeholder="Paste or type your full outline here. Sections, subsections, key points — anything you have..."
                  rows={6}
                  className="w-full bg-nexus-panel border border-nexus-border text-nexus-text font-mono text-sm px-4 py-3 rounded focus:outline-none focus:border-nexus-accent transition-colors placeholder-nexus-muted/50 resize-none"
                />
              </div>
            )}
          </div>
        )}

        {/* Step 5: Time Commitment */}
        {step === 5 && (
          <div className="max-w-xl mx-auto fade-in-up">
            <div className="text-center mb-8">
              <div className="text-nexus-accent font-game font-bold text-xl tracking-widest mb-2">
                STEP 5: TIME INVESTMENT
              </div>
              <div className="text-nexus-muted font-game">How many hours per day can you dedicate?</div>
            </div>

            <div className="p-6 border border-nexus-border rounded bg-nexus-panel mb-6">
              <div className="text-center mb-6">
                <div className="text-nexus-accent font-game font-bold text-5xl mb-1">
                  {form.working_hours_per_day}
                </div>
                <div className="text-nexus-muted font-game text-sm tracking-wider">HOURS PER DAY</div>
              </div>

              <input
                type="range"
                min="0.5"
                max="8"
                step="0.5"
                value={form.working_hours_per_day}
                onChange={(e) => update('working_hours_per_day', parseFloat(e.target.value))}
                className="w-full accent-nexus-accent"
              />

              <div className="flex justify-between mt-1">
                <span className="text-nexus-muted font-game text-xs">0.5h</span>
                <span className="text-nexus-muted font-game text-xs">8h</span>
              </div>
            </div>

            {/* AI estimate */}
            <div className="p-4 border border-nexus-accent/30 bg-nexus-accent/5 rounded mb-6">
              <div className="flex items-start gap-3">
                <div className="text-nexus-accent mt-0.5">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-nexus-text font-game text-sm font-bold mb-1">AI PROJECTION</div>
                  <div className="text-nexus-muted font-game text-sm">
                    At <span className="text-nexus-accent">{form.working_hours_per_day}h/day</span>, your{' '}
                    <span className="text-nexus-text capitalize">{form.type}-term</span> project is estimated to take approximately{' '}
                    <span className="text-nexus-gold font-bold">{estimatedWeeks} week{estimatedWeeks !== 1 ? 's' : ''}</span>.
                  </div>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="p-4 border border-nexus-border rounded bg-nexus-panel/50 space-y-2">
              <div className="text-nexus-muted font-game text-xs tracking-widest uppercase mb-3">Mission Summary</div>
              {[
                { label: 'Project', value: form.title },
                { label: 'Type', value: form.type?.charAt(0).toUpperCase() + form.type?.slice(1) },
                { label: 'Venue', value: form.publication_venue },
                { label: 'Mode', value: form.creation_mode === 'idea' ? 'Idea Mode (AI guided)' : 'Outline Mode' },
                { label: 'Deadline', value: form.deadline || 'None set' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-nexus-muted font-game">{label}:</span>
                  <span className="text-nexus-text font-game font-bold truncate max-w-[200px]" title={value}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="max-w-xl mx-auto mt-4 px-4 py-3 bg-nexus-danger/10 border border-nexus-danger/30 rounded text-nexus-danger font-game text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Footer navigation */}
      <div className="px-8 py-4 border-t border-nexus-border flex justify-between items-center shrink-0">
        <button
          onClick={step === 1 ? () => navigate('/') : handleBack}
          className="px-6 py-2.5 border border-nexus-border text-nexus-muted hover:border-nexus-accent/50 hover:text-nexus-text font-game tracking-wider rounded transition-all"
        >
          {step === 1 ? 'CANCEL' : '← BACK'}
        </button>

        <div className="text-nexus-muted font-game text-xs tracking-widest">
          STEP {step} / {TOTAL_STEPS}
        </div>

        {step < TOTAL_STEPS ? (
          <button
            onClick={handleNext}
            className="px-6 py-2.5 bg-nexus-accent/10 border border-nexus-accent text-nexus-accent hover:bg-nexus-accent/20 font-game font-bold tracking-wider rounded transition-all glow-accent"
          >
            NEXT →
          </button>
        ) : (
          <button
            onClick={handleCreate}
            disabled={loading}
            className="px-8 py-2.5 bg-nexus-success/10 border border-nexus-success text-nexus-success hover:bg-nexus-success/20 font-game font-bold tracking-wider rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-nexus-success border-t-transparent rounded-full animate-spin" />
                DEPLOYING...
              </span>
            ) : (
              'LAUNCH CAMPAIGN ✓'
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default ProjectSetup;
