/**
 * Server-side replication of the frontend's computed player metadata.
 * Computes rankings, prescribed exercises, psychometric dimensions,
 * scoring range, fit label, archetype, and NSights for each player.
 */

const EXERCISE_LIBRARY = [
  { id: 1, title: "Focus Interval Training (The Staircase)", youtubeUrl: "https://youtu.be/QliFmb9QFbA" },
  { id: 2, title: "Distraction Control (The Gating Drill)", youtubeUrl: "https://youtu.be/MnfsxL0yqmU" },
  { id: 3, title: "Wide-to-Narrow Toggles", youtubeUrl: "https://youtu.be/ZFSYk8qHxec" },
  { id: 4, title: "Box Breathing Reset (4-4-4-4)", youtubeUrl: "https://youtu.be/MDEsW3yE-K8" },
  { id: 5, title: "Cognitive Cooldown Walk", youtubeUrl: "https://youtu.be/FHwbZwAaLKk" },
  { id: 6, title: "Body Scan Check", youtubeUrl: "https://youtu.be/yNTzdDLGv-U" },
  { id: 7, title: "Post-Error Reset (The Flush)", youtubeUrl: "https://youtu.be/bMzY1OILR-k" },
  { id: 8, title: "Bounce-Back Planning (If-Then)", youtubeUrl: "https://youtu.be/rIYKDBFWUxE" },
  { id: 9, title: "Adversity Simulation (Worst Case)", youtubeUrl: "https://youtu.be/hx6QV34DJhI" },
  { id: 10, title: "Success Memory Bank (Highlight Reel)", youtubeUrl: "https://youtu.be/ZhJ_e2gxOC0" },
  { id: 11, title: "Confidence Scripting (I Am)", youtubeUrl: "https://youtu.be/Qc7q9L_NRlU" },
  { id: 12, title: "Self-Talk Optimization (Neutral Thinking)", youtubeUrl: "https://youtu.be/4nw7gEFyBuQ" },
  { id: 13, title: "Visualization (Perfect Rep)", youtubeUrl: "https://youtu.be/4SxwpRLBpUA" },
  { id: 14, title: "Post-Performance Journaling", youtubeUrl: "https://youtu.be/2KVr7IgVNOc" },
];

const PSYCHOMETRIC_DOMAINS = [
  "Role Definition", "Adaptability Support", "Communication Style",
  "Feedback Cadence", "Pressure Motivation", "Accountability Style",
  "Trust Formation", "Teaching Approach", "Decision-Making", "Team Culture"
];

const NTERPRET_RUBRIC = {
  communication: [
    { type: "Direct", desc: "Prioritizes clarity and efficiency. Speaks candidly and expects the same.", strategy: "Be concise. Focus on 'what' and 'when'. Avoid sugarcoating feedback. Give clear, bottom-line instructions." },
    { type: "Supportive", desc: "Prioritizes harmony and connection. Values tone, reassurance, and emotional safety.", strategy: "Start with the positive. Use a warm tone. Validate feelings before correcting. Emphasize that feedback is for their support." },
    { type: "Expressive", desc: "Prioritizes energy and vision. Thinks out loud, uses emotion, and is often enthusiastic.", strategy: "Match their enthusiasm. Allow space for them to verbalize ideas. Focus on the big picture and the 'feeling' of the play." },
    { type: "Reserved", desc: "Prioritizes observation and reflection. Speaks only when necessary and processes internally.", strategy: "Give them time to process before demanding an answer. Don't mistake silence for disinterest. Ask specific, open-ended questions." },
  ],
  learning: [
    { type: "Visual", desc: "Learns best by seeing. Processes information spatially and graphically.", strategy: "Use video analysis, diagrams, and demonstrations. 'Show, don't just tell'. Use visual cues for plays." },
    { type: "Auditory", desc: "Learns best by listening. Sensitive to tone, rhythm, and verbal cues.", strategy: "Use clear verbal cues. Ask them to repeat instructions back. Discuss concepts and 'talk shop' to reinforce learning." },
    { type: "Kinesthetic", desc: "Learns best by doing. Needs physical engagement and muscle memory.", strategy: "Prioritize reps and walkthroughs. Use physical cues/touch (with permission). Keep them moving; minimize long lectures." },
  ],
  motivation: [
    { type: "Intrinsic Growth", desc: "Driven by self-improvement, mastery, and the process of getting better.", strategy: "Focus on technical details and personal bests. Track individual progress metrics. Frame challenges as skill acquisition." },
    { type: "Competitive Edge", desc: "Driven by winning, ranking, and beating opponents. Thrives on comparison.", strategy: "Gamify practice. Use leaderboards. Frame challenges as win/loss scenarios. Put something on the line." },
    { type: "Team Commitment", desc: "Driven by belonging, loyalty, and not letting the team down.", strategy: "Emphasize their role in the team success. Use partner drills. Highlight collective goals and how their effort helps the group." },
    { type: "Recognition / Opportunity", desc: "Driven by visibility, status, and the chance to advance.", strategy: "Provide public praise for good performance. Clearly map out the path to starting roles or next-level opportunities. Showcase highlights." },
  ],
};

const ALIGNMENT_RUBRIC_DATA = [
  { range: [75, 100], rating: "EXCEPTIONAL", desc: "This player processes the game exactly like the coach. In high-pressure moments, they will instinctively make the decision the coach would have called." },
  { range: [62.5, 74.9], rating: "STRONG", desc: "This player agrees with the coach's goals but may see a different path. They will execute the system but ask questions in the film room." },
  { range: [50, 62.4], rating: "CONDITIONAL", desc: "Transactional fit. The player does not naturally 'get' the coach's philosophy. Requires constant maintenance." },
  { range: [37.5, 49.9], rating: "DEVELOPMENTAL", desc: "The player and coach process key decisions differently. Success possible with explicit role clarity and structure." },
  { range: [0, 37.4], rating: "LOW ALIGNMENT", desc: "High friction risk. Treat as a prompt for deeper conversation, expectation-setting, and context review." },
];

// ── Core helpers (exact replicas of frontend) ──

function deterministicNumberFromString(input = '') {
  const source = String(input);
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    hash = ((hash << 5) - hash) + source.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getPrescribedExercises(player) {
  const seed = deterministicNumberFromString(`${player.id || ''}-${player.name || ''}`);
  const firstIndex = seed % EXERCISE_LIBRARY.length;
  const secondIndex = (firstIndex + 2) % EXERCISE_LIBRARY.length;
  return [EXERCISE_LIBRARY[firstIndex], EXERCISE_LIBRARY[secondIndex]];
}

function getScoringRange(clutchFactor) {
  if (clutchFactor >= 850) return 'Elite';
  if (clutchFactor >= 700) return 'High Performer';
  if (clutchFactor >= 550) return 'Solid';
  if (clutchFactor >= 400) return 'Developmental';
  return 'Low';
}

function getFitLabel(fitScore) {
  if (fitScore >= 75) return 'Exceptional';
  if (fitScore >= 62.5) return 'Strong';
  if (fitScore >= 50) return 'Conditional';
  if (fitScore >= 37.5) return 'Developmental';
  return 'Poor';
}

function getArchetype(fitScore, clutchFactor) {
  const isHighFit = fitScore >= 62.5;
  const isHighClutch = clutchFactor >= 750;
  if (isHighFit && isHighClutch) return { category: "Trust / Anchors", action: "Maximize Role" };
  if (!isHighFit && isHighClutch) return { category: "High Reward / High Maintenance", action: "Monitor Impact" };
  if (isHighFit && !isHighClutch) return { category: "Culture Carriers", action: "Develop Skill" };
  return { category: "At Risk", action: "Evaluate Fit" };
}

function getFitDescription(fitScore) {
  const rub = ALIGNMENT_RUBRIC_DATA.find(r => fitScore >= r.range[0] && fitScore <= r.range[1]);
  return rub ? rub.desc : '';
}

function getPsychometricDimensions(player) {
  const score = player.fit_score || player.fitScore || 50;
  return PSYCHOMETRIC_DOMAINS.map(domain => {
    const val = deterministicNumberFromString(`${player.id}-${domain}`) % 100;
    let alignment = 'Moderate';
    if (score >= 75) {
      if (val > 20) alignment = 'High'; else if (val > 5) alignment = 'Moderate'; else alignment = 'Low';
    } else if (score >= 62.5) {
      if (val > 40) alignment = 'High'; else if (val > 10) alignment = 'Moderate'; else alignment = 'Low';
    } else if (score >= 50) {
      if (val > 60) alignment = 'High'; else if (val > 25) alignment = 'Moderate'; else alignment = 'Low';
    } else {
      if (val > 80) alignment = 'High'; else if (val > 40) alignment = 'Moderate'; else alignment = 'Low';
    }
    return { domain, alignment };
  });
}

function getNterpretDetails(player) {
  const commStyle = player.comm_style || player.commStyle;
  const learningStyle = player.learning_style || player.learningStyle;
  const motivation = player.motivation;

  const comm = NTERPRET_RUBRIC.communication.find(c => c.type === commStyle) || NTERPRET_RUBRIC.communication[0];
  const learn = NTERPRET_RUBRIC.learning.find(l => l.type === learningStyle) || NTERPRET_RUBRIC.learning[0];
  const motiv = NTERPRET_RUBRIC.motivation.find(m => m.type === motivation) || NTERPRET_RUBRIC.motivation[0];

  return {
    communication: { type: comm.type, description: comm.desc, strategy: comm.strategy },
    learning: { type: learn.type, description: learn.desc, strategy: learn.strategy },
    motivation: { type: motiv.type, description: motiv.desc, strategy: motiv.strategy },
  };
}

// ── Main function: compute all extended metadata for all players ──

function computeAllPlayerMetadata(players) {
  // Sort for rankings (by clutch_factor descending)
  const allSorted = [...players].sort((a, b) => (b.clutch_factor || 0) - (a.clutch_factor || 0));

  // Group by position and round for positional/round rankings
  const byPosition = {};
  const byRound = {};
  for (const p of allSorted) {
    const pos = p.position || 'Unknown';
    const rnd = p.round || 'Unknown';
    if (!byPosition[pos]) byPosition[pos] = [];
    if (!byRound[rnd]) byRound[rnd] = [];
    byPosition[pos].push(p);
    byRound[rnd].push(p);
  }

  const results = {};

  for (const player of players) {
    const clutch = player.clutch_factor || 0;
    const fit = player.fit_score || 0;

    // Rankings
    const overallRank = allSorted.findIndex(p => p.id === player.id) + 1;
    const posGroup = byPosition[player.position || 'Unknown'] || [];
    const positionalRank = posGroup.findIndex(p => p.id === player.id) + 1;
    const roundGroup = byRound[player.round || 'Unknown'] || [];
    const roundRank = roundGroup.findIndex(p => p.id === player.id) + 1;

    // Exercises
    const exercises = getPrescribedExercises(player);

    // Psychometrics
    const psychometrics = getPsychometricDimensions(player);

    // NTerpret
    const nterpret = getNterpretDetails(player);

    // Archetype + Fit
    const archetype = getArchetype(fit, clutch);
    const fitLabel = getFitLabel(fit);
    const fitDescription = getFitDescription(fit);
    const scoringRange = getScoringRange(clutch);

    results[player.id] = {
      overall_rank: overallRank,
      overall_total: allSorted.length,
      positional_rank: positionalRank,
      positional_total: posGroup.length,
      round_rank: roundRank,
      round_total: roundGroup.length,
      scoring_range: scoringRange,
      fit_label: fitLabel,
      fit_description: fitDescription,
      archetype_category: archetype.category,
      archetype_action: archetype.action,
      prescribed_exercises: exercises.map(e => ({ title: e.title, youtubeUrl: e.youtubeUrl })),
      psychometric_dimensions: psychometrics,
      nterpret: nterpret,
    };
  }

  return results;
}

module.exports = { computeAllPlayerMetadata, EXERCISE_LIBRARY, PSYCHOMETRIC_DOMAINS, getScoringRange, getFitLabel, getArchetype, getPsychometricDimensions };
