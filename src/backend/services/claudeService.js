const { GoogleGenerativeAI } = require('@google/generative-ai');

function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set in your .env file');
  }
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

function pickDifficulty(skillRating) {
  if (skillRating >= 90) return 'Diamond';
  if (skillRating >= 75) return 'Platinum';
  if (skillRating >= 50) return 'Gold';
  if (skillRating >= 25) return 'Silver';
  return 'Bronze';
}

function extractJSON(text) {
  // Strip markdown code fences if present
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];
  return text;
}

async function generateTask(project, user, skillRating = 50, recentTasks = [], roadmapStep = null) {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const difficulty = pickDifficulty(skillRating);

  const xpRewardMap = {
    Bronze: 100,
    Silver: 150,
    Gold: 200,
    Platinum: 275,
    Diamond: 350,
  };

  const recentTaskTitles = recentTasks.map((t) => `- ${t.title} (${t.status})`).join('\n');

  const roadmapContext = roadmapStep
    ? `
CURRENT ROADMAP STEP (you MUST base the task on this step):
- Step Number: ${roadmapStep.stepNumber}
- Step Title: ${roadmapStep.title}
- Step Description: ${roadmapStep.description}
- Expected Deliverable: ${roadmapStep.deliverable}
- Phase: ${roadmapStep.phase}
- Estimated Minutes: ${roadmapStep.estimatedMinutes}

The task title, description, and deliverable MUST directly correspond to this roadmap step.
`
    : '';

  const prompt = `You are a quest designer for a gamified productivity app called Productivity Nexus. Your job is to generate focused, achievable writing tasks for a researcher.

PROJECT INFORMATION:
- Title: ${project.title}
- Goal: ${project.goal || 'Not specified'}
- Type: ${project.type}
- Publication Venue: ${project.publication_venue || 'Not specified'}
- Deadline: ${project.deadline || 'Not specified'}
- Hours per Day Available: ${project.working_hours_per_day}
- Outline/Context: ${project.outline || 'None provided'}

USER INFORMATION:
- Username: ${user.username}
- Rank: ${user.rank}
- Current XP: ${user.xp}

RECENT TASKS:
${recentTaskTitles || 'No recent tasks - this is their first task'}
${roadmapContext}
TASK DIFFICULTY: ${difficulty}

Generate ONE specific, actionable writing task appropriate for this project and difficulty level.
The task should be completable in 25-45 minutes and produce a concrete written deliverable.
Also generate 4-5 specific, actionable hints tailored to this exact project and task.

Respond ONLY with a valid JSON object (no markdown, no explanation):
{
  "task_title": "A concise, action-oriented task title (under 60 chars)",
  "task_description": "A detailed 2-3 sentence description of what the user needs to do and why it matters for the project",
  "deliverable": "A specific, measurable output (e.g., '300-word introduction paragraph', '5-point argument outline', '2 paragraph lit review section')",
  "estimated_minutes": 30,
  "difficulty": "${difficulty}",
  "xp_reward": ${xpRewardMap[difficulty]},
  "hints": [
    "Specific hint 1 tailored to this project and task",
    "Specific hint 2 tailored to this project and task",
    "Specific hint 3 tailored to this project and task",
    "Specific hint 4 tailored to this project and task"
  ]
}`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();
  const jsonStr = extractJSON(responseText);
  return JSON.parse(jsonStr);
}

async function scoreSubmission(task, project, submissionText) {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `You are an expert academic writing evaluator for a gamified productivity app. Evaluate this writing submission fairly and constructively.

IMPORTANT: If the submission is gibberish, nonsensical, random characters, or clearly not a genuine attempt, score ALL criteria between 0 and 20 regardless of difficulty level.

TASK INFORMATION:
- Task Title: ${task.title}
- Task Description: ${task.description}
- Expected Deliverable: ${task.deliverable}
- Difficulty Level: ${task.difficulty}

PROJECT CONTEXT:
- Project: ${project.title}
- Goal: ${project.goal || 'Not specified'}
- Publication Venue: ${project.publication_venue || 'Not specified'}

SUBMISSION:
"""
${submissionText}
"""

Evaluate the submission on three criteria, each scored 0-100:

1. GRAMMAR & WRITING QUALITY (0-100): Assess sentence structure, clarity, flow, vocabulary, grammar errors, and professional writing quality.

2. IDEA QUALITY (0-100): Assess the depth of thinking, originality, relevance to the task, quality of arguments/insights, and intellectual contribution.

3. EXECUTION (0-100): Assess how well the submission matches the deliverable requirements, completeness, adherence to the task instructions, and practical usefulness.

Score leniently for ${task.difficulty} difficulty. For Bronze, scores of 60-80 are appropriate for decent work. For Diamond, be rigorous and expect 80+ for strong submissions.

Respond ONLY with a valid JSON object (no markdown, no explanation):
{
  "grammar_score": <integer 0-100>,
  "grammar_feedback": "<1-2 sentence constructive feedback>",
  "idea_score": <integer 0-100>,
  "idea_feedback": "<1-2 sentence constructive feedback>",
  "execution_score": <integer 0-100>,
  "execution_feedback": "<1-2 sentence constructive feedback>"
}`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();
  const jsonStr = extractJSON(responseText);
  return JSON.parse(jsonStr);
}

async function generateRoadmap(project) {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `You are a project planning expert for a gamified academic productivity app called Productivity Nexus. Generate a structured project roadmap for the following research/writing project.

PROJECT INFORMATION:
- Title: ${project.title}
- Goal: ${project.goal || 'Not specified'}
- Type: ${project.type}
- Publication Venue: ${project.publication_venue || 'Not specified'}
- Deadline: ${project.deadline || 'Not specified'}
- Hours per Day Available: ${project.working_hours_per_day}
- Outline/Context: ${project.outline || 'None provided'}

Generate a roadmap with 6-15 numbered steps depending on project scope. Each step should be a discrete, focused writing or research task completable in 25-60 minutes. Steps should progress logically from early research/brainstorming through drafting, revision, and polish.

Phases available: research, writing, review, polish

Respond ONLY with a valid JSON object (no markdown, no explanation):
{
  "steps": [
    {
      "stepNumber": 1,
      "title": "Step title (under 60 chars)",
      "description": "2-3 sentence description of what this step involves and why it matters",
      "deliverable": "Specific measurable output for this step",
      "estimatedMinutes": 30,
      "phase": "research"
    }
  ]
}`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();
  const jsonStr = extractJSON(responseText);
  return JSON.parse(jsonStr);
}

async function testConnection() {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const result = await model.generateContent('Reply with exactly: OK');
  return result.response.text().trim();
}

module.exports = { generateTask, scoreSubmission, generateRoadmap, testConnection };
