const claudeService = require('./claudeService');

const DIFFICULTY_MULTIPLIERS = {
  Bronze: 1.0,
  Silver: 1.2,
  Gold: 1.5,
  Platinum: 1.8,
  Diamond: 2.0,
};

function getPaceMultiplier(timeTakenMinutes) {
  if (timeTakenMinutes < 30) return 1.2;
  if (timeTakenMinutes <= 40) return 1.0;
  if (timeTakenMinutes <= 60) return 0.8;
  return 0.6;
}

async function scoreSubmission(task, project, submissionText, timeTakenMinutes) {
  const aiScores = await claudeService.scoreSubmission(task, project, submissionText);

  const paceMultiplier = getPaceMultiplier(timeTakenMinutes);
  const difficultyMultiplier = DIFFICULTY_MULTIPLIERS[task.difficulty] || 1.0;

  const avgScore = (aiScores.grammar_score + aiScores.idea_score + aiScores.execution_score) / 3;
  const baseXP = task.xp_reward || 100;

  // XP formula: baseXP * (avgScore/100) * paceMultiplier * difficultyMultiplier
  const finalXP = Math.round(baseXP * (avgScore / 100) * paceMultiplier * difficultyMultiplier);

  return {
    grammar_score: aiScores.grammar_score,
    grammar_feedback: aiScores.grammar_feedback,
    idea_score: aiScores.idea_score,
    idea_feedback: aiScores.idea_feedback,
    execution_score: aiScores.execution_score,
    execution_feedback: aiScores.execution_feedback,
    paceMultiplier,
    difficultyMultiplier,
    avgScore: Math.round(avgScore),
    finalXP: Math.max(finalXP, 1), // minimum 1 XP
  };
}

module.exports = { scoreSubmission };
