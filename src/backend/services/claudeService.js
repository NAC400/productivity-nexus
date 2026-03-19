const Groq = require('groq-sdk');

const MODEL = 'llama-3.3-70b-versatile';

function getClient() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not set in your .env file');
  }
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

function pickDifficulty(skillRating) {
  if (skillRating >= 90) return 'Diamond';
  if (skillRating >= 75) return 'Platinum';
  if (skillRating >= 50) return 'Gold';
  if (skillRating >= 25) return 'Silver';
  return 'Bronze';
}

async function callJSON(systemPrompt, userPrompt) {
  const client = getClient();
  const res = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 1500,
  });
  return JSON.parse(res.choices[0].message.content);
}

async function generateTask(project, user, skillRating = 50, recentTasks = [], roadmapStep = null) {
  const difficulty = pickDifficulty(skillRating);
  const xpRewardMap = { Bronze: 100, Silver: 150, Gold: 200, Platinum: 275, Diamond: 350 };
  const recentTaskTitles = recentTasks.map((t) => `- ${t.title} (${t.status})`).join('\n');

  const roadmapContext = roadmapStep
    ? `CURRENT ROADMAP STEP (base the task on this):
- Step ${roadmapStep.stepNumber}: ${roadmapStep.title}
- Description: ${roadmapStep.description}
- Deliverable: ${roadmapStep.deliverable}
- Phase: ${roadmapStep.phase}
- Est. minutes: ${roadmapStep.estimatedMinutes}`
    : '';

  const system = `You are a quest designer for a gamified productivity app called Productivity Nexus. Generate focused, achievable writing tasks for researchers and students. Always respond with valid JSON only.`;

  const user_prompt = `Generate ONE specific, actionable writing task for this project.

PROJECT:
- Title: ${project.title}
- Goal: ${project.goal || 'Not specified'}
- Type: ${project.type}
- Publication: ${project.publication_venue || 'Not specified'}
- Deadline: ${project.deadline || 'Not specified'}
- Hours/day: ${project.working_hours_per_day}
- Outline: ${project.outline || 'None provided'}

USER: ${user.username} | Rank: ${user.rank} | XP: ${user.xp}

RECENT TASKS:
${recentTaskTitles || 'None yet — this is their first task'}

${roadmapContext}

DIFFICULTY: ${difficulty}

The task must be completable in 25-45 minutes and produce a concrete written deliverable.
Generate 4-5 specific hints tailored to this exact project.

Return this JSON:
{
  "task_title": "concise action-oriented title under 60 chars",
  "task_description": "2-3 sentences describing what to do and why it matters",
  "deliverable": "specific measurable output (e.g. 300-word introduction, 5-point outline)",
  "estimated_minutes": 30,
  "difficulty": "${difficulty}",
  "xp_reward": ${xpRewardMap[difficulty]},
  "hints": ["hint 1", "hint 2", "hint 3", "hint 4"]
}`;

  return callJSON(system, user_prompt);
}

async function scoreSubmission(task, project, submissionText) {
  const system = `You are an expert academic writing evaluator for a gamified productivity app. Score submissions fairly and constructively. Always respond with valid JSON only.

IMPORTANT: If the submission is gibberish, random characters, nonsensical, or clearly not a genuine attempt, score ALL criteria between 0 and 20.`;

  const user_prompt = `Score this writing submission.

TASK: ${task.title}
DESCRIPTION: ${task.description}
EXPECTED DELIVERABLE: ${task.deliverable}
DIFFICULTY: ${task.difficulty}

PROJECT: ${project.title} | Goal: ${project.goal || 'N/A'} | Publication: ${project.publication_venue || 'N/A'}

SUBMISSION:
"""
${submissionText}
"""

Score each criterion 0-100. For ${task.difficulty} difficulty: Bronze = 60-80 for decent work, Diamond = expect 80+ for strong work.

Return this JSON:
{
  "grammar_score": 0,
  "grammar_feedback": "1-2 sentences of constructive feedback",
  "idea_score": 0,
  "idea_feedback": "1-2 sentences of constructive feedback",
  "execution_score": 0,
  "execution_feedback": "1-2 sentences of constructive feedback"
}`;

  return callJSON(system, user_prompt);
}

async function generateRoadmap(project) {
  const system = `You are a project planning expert for a gamified academic productivity app. Generate structured project roadmaps. Always respond with valid JSON only.`;

  const user_prompt = `Generate a project roadmap for this research/writing project.

PROJECT:
- Title: ${project.title}
- Goal: ${project.goal || 'Not specified'}
- Type: ${project.type}
- Publication: ${project.publication_venue || 'Not specified'}
- Deadline: ${project.deadline || 'Not specified'}
- Hours/day: ${project.working_hours_per_day}
- Outline: ${project.outline || 'None provided'}

Generate 6-15 numbered steps depending on scope. Each step = a discrete focused task (25-60 min). Steps should progress logically: research → writing → review → polish.

Phases: research, writing, review, polish

Return this JSON:
{
  "steps": [
    {
      "stepNumber": 1,
      "title": "step title under 60 chars",
      "description": "2-3 sentences describing this step",
      "deliverable": "specific measurable output",
      "estimatedMinutes": 30,
      "phase": "research"
    }
  ]
}`;

  return callJSON(system, user_prompt);
}

async function chatWithAI(messages) {
  const client = getClient();

  const systemPrompt = `You are a helpful AI assistant embedded in Productivity Nexus, a gamified productivity app for researchers, academics, and writers. You help users with:
- Research strategies and methodology
- Academic writing, structure, and argumentation
- Brainstorming ideas for papers and projects
- Explaining complex concepts clearly
- Suggesting sources, search strategies, and databases
- Reviewing and improving writing
- Breaking down large projects into manageable steps

Keep responses concise, practical, and encouraging. Use markdown formatting when helpful.`;

  const history = messages.map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  }));

  const res = await client.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'system', content: systemPrompt }, ...history],
    temperature: 0.8,
    max_tokens: 1024,
  });

  return res.choices[0].message.content;
}

async function testConnection() {
  const client = getClient();
  const res = await client.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: 'Reply with exactly the word: OK' }],
    max_tokens: 10,
  });
  return res.choices[0].message.content.trim();
}

module.exports = { generateTask, scoreSubmission, generateRoadmap, chatWithAI, testConnection };
