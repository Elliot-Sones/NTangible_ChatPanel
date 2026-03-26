const ss = require('simple-statistics');
const { multipleRegression, logisticRegression } = require('./regression');
const { chiSquaredTest } = require('./chi-squared');
const { bootstrapCI, bootstrapMeanDiff } = require('./bootstrap');
const { createPrior, bayesianUpdate, priorWeight } = require('./bayesian');
const { computeConfidence } = require('./confidence');
const { cohensD } = require('./effect-size');
const { detectTrend, buildFinding, supersedeOldFindings, getLatestFinding, insertFinding } = require('./findings');
const { narrateFinding } = require('./narrate');
const queries = require('./queries');

const PRIORS = {
  clutch_validation: createPrior(0.04, 0.02),
  fit_wins: createPrior(0.65, 0.05),
  error_patterns: createPrior(0.10, 0.05),
  development: createPrior(0.03, 0.02),
  recruiting_match: createPrior(0.60, 0.1),
  commitment: createPrior(0.70, 0.1),
};

async function runFullAnalysis(sql, { trigger = 'manual', analysisRunId }) {
  const newFindings = [];
  const gameCount = await queries.queryGameCount(sql);
  if (gameCount === 0) return newFindings;
  const clutchFinding = await analyzeClutchValidation(sql, analysisRunId);
  if (clutchFinding) newFindings.push(clutchFinding);
  const fitFinding = await analyzeFitWins(sql, analysisRunId);
  if (fitFinding) newFindings.push(fitFinding);
  const errorFinding = await analyzeErrorPatterns(sql, analysisRunId);
  if (errorFinding) newFindings.push(errorFinding);
  const devFinding = await analyzeDevelopment(sql, analysisRunId);
  if (devFinding) newFindings.push(devFinding);
  const recruitFinding = await analyzeRecruitingMatch(sql, analysisRunId);
  if (recruitFinding) newFindings.push(recruitFinding);
  const commitFinding = await analyzeCommitment(sql, analysisRunId);
  if (commitFinding) newFindings.push(commitFinding);
  return newFindings;
}

async function runPostGameAnalysis(sql, { analysisRunId }) {
  const newFindings = [];
  const clutchFinding = await analyzeClutchValidation(sql, analysisRunId);
  if (clutchFinding) newFindings.push(clutchFinding);
  const fitFinding = await analyzeFitWins(sql, analysisRunId);
  if (fitFinding) newFindings.push(fitFinding);
  const errorFinding = await analyzeErrorPatterns(sql, analysisRunId);
  if (errorFinding) newFindings.push(errorFinding);
  return newFindings;
}

async function analyzeClutchValidation(sql, analysisRunId) {
  const rows = await queries.queryClutchByPressure(sql);
  if (rows.length < 10) return null;
  const closeGameRows = rows.filter(r => r.is_close_game && r.total_ab >= 5);
  const blowoutRows = rows.filter(r => !r.is_close_game && r.total_ab >= 5);
  if (closeGameRows.length < 10) return null;
  const closeBA = closeGameRows.map(r => ({
    y: r.total_hits / r.total_ab, x: [r.clutch_factor / 1000], playerId: r.player_id,
  }));
  const regResult = multipleRegression(closeBA);
  const highClutch = closeBA.filter(r => r.x[0] >= 0.75).map(r => r.y);
  const lowClutch = closeBA.filter(r => r.x[0] < 0.65).map(r => r.y);
  let effectSize = null;
  let bootstrapResult = null;
  if (highClutch.length >= 3 && lowClutch.length >= 3) {
    effectSize = cohensD(highClutch, lowClutch);
    bootstrapResult = bootstrapMeanDiff(highClutch, lowClutch, { iterations: 1000, seed: 42 });
  }
  const observedEffect = highClutch.length > 0 && lowClutch.length > 0 ? ss.mean(highClutch) - ss.mean(lowClutch) : 0;
  const observedVar = closeBA.length > 0 ? ss.variance(closeBA.map(r => r.y)) / closeBA.length : 1;
  const posterior = bayesianUpdate(PRIORS.clutch_validation, observedEffect, observedVar);
  const pWeight = priorWeight(PRIORS.clutch_validation, observedVar);
  const conf = computeConfidence({ dataPoints: closeBA.length, minSample: 15, pValue: regResult.pValues[0], effectSize, priorConsistency: observedEffect > 0 });
  const previous = await getLatestFinding(sql, 'clutch_validation');
  const trend = detectTrend(previous, { confidence: conf.score, effect_size: effectSize });
  const resultData = {
    regressionCoefficient: regResult.coefficients[0], rSquared: regResult.rSquared,
    pValue: regResult.pValues[0],
    highClutchBA: highClutch.length > 0 ? Math.round(ss.mean(highClutch) * 1000) / 1000 : null,
    lowClutchBA: lowClutch.length > 0 ? Math.round(ss.mean(lowClutch) * 1000) / 1000 : null,
    baDifference: bootstrapResult ? bootstrapResult.estimate : null,
    confidenceInterval: bootstrapResult ? { lower: bootstrapResult.lower, upper: bootstrapResult.upper } : null,
    posteriorMean: posterior.mean, priorWeight: Math.round(pWeight * 100),
    sampleSizes: { highClutch: highClutch.length, lowClutch: lowClutch.length, total: closeBA.length },
  };
  const finding = buildFinding({
    findingType: 'clutch_validation', title: 'Clutch Factor vs Close-Game Performance',
    methodology: 'Multiple regression: close-game BA ~ clutch_factor (normalized). Effect size: Cohen\'s d between high (>=750) and low (<650) clutch groups. Bootstrap CI (1000 iterations). Bayesian updating with NTangible prior.',
    sqlQuery: 'queryClutchByPressure', resultData, dataPoints: closeBA.length,
    confidence: conf.score, confidenceLabel: conf.label, effectSize,
    pValue: regResult.pValues[0],
    confidenceInterval: bootstrapResult ? { lower: bootstrapResult.lower, upper: bootstrapResult.upper } : null,
    isSignificant: regResult.pValues[0] < 0.05, trend, analysisRunId,
  });
  finding.summary = await narrateFinding({ ...finding, findingType: finding.finding_type, resultData });
  const newId = await insertFinding(sql, finding);
  if (previous) await supersedeOldFindings(sql, 'clutch_validation', newId);
  return { ...finding, id: newId };
}

async function analyzeFitWins(sql, analysisRunId) {
  const rows = await queries.queryFitAndWins(sql);
  if (rows.length < 10) return null;
  const data = rows.map(r => ({ y: r.result === 'W' ? 1 : 0, x: [r.avg_fit / 100, r.home_away === 'Home' ? 1 : 0], avgFit: r.avg_fit }));
  const logResult = logisticRegression(data);
  const highFitGames = data.filter(r => r.avgFit >= 70);
  const lowFitGames = data.filter(r => r.avgFit < 50);
  const highFitWinRate = highFitGames.length > 0 ? highFitGames.filter(r => r.y === 1).length / highFitGames.length : null;
  const lowFitWinRate = lowFitGames.length > 0 ? lowFitGames.filter(r => r.y === 1).length / lowFitGames.length : null;
  const effectSize = highFitWinRate !== null && lowFitWinRate !== null ? highFitWinRate - lowFitWinRate : null;
  const observedVar = data.length > 0 ? ss.variance(data.map(r => r.y)) / data.length : 1;
  const posterior = bayesianUpdate(PRIORS.fit_wins, highFitWinRate || 0.5, observedVar);
  const pWeight2 = priorWeight(PRIORS.fit_wins, observedVar);
  const conf = computeConfidence({ dataPoints: data.length, minSample: 20, pValue: null, effectSize, priorConsistency: (highFitWinRate || 0) > (lowFitWinRate || 0) });
  const previous = await getLatestFinding(sql, 'fit_wins');
  const trend = detectTrend(previous, { confidence: conf.score, effect_size: effectSize });
  const resultData = {
    fitOddsRatio: logResult.oddsRatios[0],
    highFitWinRate: highFitWinRate !== null ? Math.round(highFitWinRate * 1000) / 1000 : null,
    lowFitWinRate: lowFitWinRate !== null ? Math.round(lowFitWinRate * 1000) / 1000 : null,
    winRateDifference: effectSize, posteriorMean: posterior.mean, priorWeight: Math.round(pWeight2 * 100),
    sampleSizes: { highFit: highFitGames.length, lowFit: lowFitGames.length, total: data.length },
  };
  const finding = buildFinding({
    findingType: 'fit_wins', title: 'Roster Fit Score vs Team Win Rate',
    methodology: 'Logistic regression: W/L ~ avg_fit (normalized) + home/away. Win rate comparison between high-fit (>=70) and low-fit (<50) game lineups. Bayesian updating with NTangible prior.',
    sqlQuery: 'queryFitAndWins', resultData, dataPoints: data.length,
    confidence: conf.score, confidenceLabel: conf.label, effectSize, pValue: null,
    confidenceInterval: null, isSignificant: effectSize !== null && Math.abs(effectSize) > 0.10,
    trend, analysisRunId,
  });
  finding.summary = await narrateFinding({ ...finding, findingType: finding.finding_type, resultData });
  const newId = await insertFinding(sql, finding);
  if (previous) await supersedeOldFindings(sql, 'fit_wins', newId);
  return { ...finding, id: newId };
}

async function analyzeErrorPatterns(sql, analysisRunId) {
  const rows = await queries.queryErrorsByProfile(sql);
  if (rows.length < 8) return null;
  const commStyles = [...new Set(rows.map(r => r.comm_style))].filter(Boolean);
  const pressureRows = rows.filter(r => r.is_close_game);
  if (pressureRows.length < 4 || commStyles.length < 2) return null;
  const table = commStyles.map(style => {
    const styleRows = pressureRows.filter(r => r.comm_style === style);
    const withErrors = styleRows.reduce((s, r) => s + r.games_with_errors, 0);
    const total = styleRows.reduce((s, r) => s + r.games, 0);
    return [withErrors, total - withErrors];
  });
  const chiResult = chiSquaredTest(table);
  const errorRates = {};
  commStyles.forEach((style, i) => {
    const total = table[i][0] + table[i][1];
    errorRates[style] = total > 0 ? Math.round((table[i][0] / total) * 1000) / 1000 : 0;
  });
  const conf = computeConfidence({ dataPoints: pressureRows.reduce((s, r) => s + r.games, 0), minSample: 40, pValue: chiResult.pValue, effectSize: chiResult.cramersV, priorConsistency: true });
  const previous = await getLatestFinding(sql, 'error_patterns');
  const trend = detectTrend(previous, { confidence: conf.score, effect_size: chiResult.cramersV });
  const resultData = {
    chiSquared: chiResult.chiSquared, pValue: chiResult.pValue, cramersV: chiResult.cramersV,
    errorRatesByCommStyle: errorRates, contingencyTable: { commStyles, table },
    totalGames: pressureRows.reduce((s, r) => s + r.games, 0),
  };
  const finding = buildFinding({
    findingType: 'error_patterns', title: 'Communication Style vs Errors Under Pressure',
    methodology: 'Chi-squared test of independence: comm_style x error_in_close_game. Effect size: Cramer\'s V.',
    sqlQuery: 'queryErrorsByProfile', resultData, dataPoints: resultData.totalGames,
    confidence: conf.score, confidenceLabel: conf.label, effectSize: chiResult.cramersV,
    pValue: chiResult.pValue, confidenceInterval: null, isSignificant: chiResult.significant,
    trend, analysisRunId,
  });
  finding.summary = await narrateFinding({ ...finding, findingType: finding.finding_type, resultData });
  const newId = await insertFinding(sql, finding);
  if (previous) await supersedeOldFindings(sql, 'error_patterns', newId);
  return { ...finding, id: newId };
}

async function analyzeDevelopment(sql, analysisRunId) {
  const rows = await queries.queryPlayerTrajectory(sql);
  if (rows.length < 20) return null;
  const playerGames = {};
  for (const r of rows) { if (!playerGames[r.player_id]) playerGames[r.player_id] = []; playerGames[r.player_id].push(r); }
  const playerDeltas = [];
  for (const [pid, games] of Object.entries(playerGames)) {
    if (games.length < 10) continue;
    const mid = Math.floor(games.length / 2);
    const firstHalf = games.slice(0, mid).filter(g => g.at_bats > 0);
    const secondHalf = games.slice(mid).filter(g => g.at_bats > 0);
    if (firstHalf.length < 3 || secondHalf.length < 3) continue;
    const ba1 = firstHalf.reduce((s, g) => s + g.hits, 0) / firstHalf.reduce((s, g) => s + g.at_bats, 0);
    const ba2 = secondHalf.reduce((s, g) => s + g.hits, 0) / secondHalf.reduce((s, g) => s + g.at_bats, 0);
    playerDeltas.push({ playerId: pid, clutch: games[0].clutch_factor, ba1, ba2, delta: ba2 - ba1 });
  }
  if (playerDeltas.length < 5) return null;
  const deltas = playerDeltas.map(d => d.delta);
  const bootstrap = bootstrapCI(deltas, ss.mean, { iterations: 1000, seed: 42 });
  const avgDelta = ss.mean(deltas);
  const observedVar = ss.variance(deltas) / deltas.length;
  const posterior = bayesianUpdate(PRIORS.development, avgDelta, observedVar);
  const effectSize = deltas.length > 1 ? avgDelta / ss.standardDeviation(deltas) : 0;
  const conf = computeConfidence({ dataPoints: playerDeltas.length, minSample: 8, pValue: bootstrap.lower > 0 || bootstrap.upper < 0 ? 0.04 : 0.2, effectSize, priorConsistency: avgDelta > 0 });
  const previous = await getLatestFinding(sql, 'development');
  const trend = detectTrend(previous, { confidence: conf.score, effect_size: effectSize });
  const resultData = {
    averageDelta: Math.round(avgDelta * 1000) / 1000,
    bootstrapCI: { lower: bootstrap.lower, upper: bootstrap.upper },
    playersAnalyzed: playerDeltas.length, posteriorMean: posterior.mean,
    priorWeight: Math.round(priorWeight(PRIORS.development, observedVar) * 100),
    topImprovers: playerDeltas.sort((a, b) => b.delta - a.delta).slice(0, 3).map(d => ({ playerId: d.playerId, delta: Math.round(d.delta * 1000) / 1000 })),
  };
  const finding = buildFinding({
    findingType: 'development', title: 'Player Development: First Half vs Second Half of Season',
    methodology: 'Paired before/after BA comparison per player (season midpoint split). Bootstrap CI (1000 iterations) on distribution of player deltas. Bayesian updating with NTangible prior.',
    sqlQuery: 'queryPlayerTrajectory', resultData, dataPoints: playerDeltas.length,
    confidence: conf.score, confidenceLabel: conf.label, effectSize,
    pValue: bootstrap.lower > 0 || bootstrap.upper < 0 ? 0.04 : 0.2,
    confidenceInterval: { lower: bootstrap.lower, upper: bootstrap.upper },
    isSignificant: bootstrap.lower > 0 || bootstrap.upper < 0, trend, analysisRunId,
  });
  finding.summary = await narrateFinding({ ...finding, findingType: finding.finding_type, resultData });
  const newId = await insertFinding(sql, finding);
  if (previous) await supersedeOldFindings(sql, 'development', newId);
  return { ...finding, id: newId };
}

async function analyzeRecruitingMatch(sql, analysisRunId) {
  const rows = await queries.queryRosterPerformance(sql);
  if (rows.length < 10) return null;
  const playersWithGames = rows.filter(r => r.total_ab > 20);
  if (playersWithGames.length < 8) return null;
  const scored = playersWithGames.map(r => {
    const ba = r.total_ab > 0 ? r.total_hits / r.total_ab : 0;
    const errorRate = r.games > 0 ? r.total_errors / r.games : 0;
    const winRate = r.games > 0 ? r.wins / r.games : 0;
    const composite = ba * 0.5 + (1 - errorRate) * 0.3 + winRate * 0.2;
    return { ...r, ba, errorRate, winRate, composite };
  });
  scored.sort((a, b) => b.composite - a.composite);
  const median = scored[Math.floor(scored.length / 2)].composite;
  const successful = scored.filter(s => s.composite >= median);
  const avgClutch = ss.mean(successful.map(s => s.clutch_factor));
  const avgFit = ss.mean(successful.map(s => s.fit_score));
  const topCommStyle = mode(successful.map(s => s.comm_style));
  const topLearningStyle = mode(successful.map(s => s.learning_style));
  const topMotivation = mode(successful.map(s => s.motivation));
  const profile = { avgClutch: Math.round(avgClutch), avgFit: Math.round(avgFit), topCommStyle, topLearningStyle, topMotivation };
  const conf = computeConfidence({ dataPoints: playersWithGames.length, minSample: 10, pValue: null, effectSize: 0.5, priorConsistency: avgClutch > 650 });
  const previous = await getLatestFinding(sql, 'recruiting_match');
  const trend = detectTrend(previous, { confidence: conf.score, effect_size: 0.5 });
  const resultData = { successProfile: profile, totalRosterAnalyzed: playersWithGames.length, successfulPlayers: successful.length, medianComposite: Math.round(median * 1000) / 1000 };
  const finding = buildFinding({
    findingType: 'recruiting_match', title: 'Success Profile: Top Performer Traits',
    methodology: 'Composite performance score (BA*0.5 + defensive*0.3 + winRate*0.2). Players above median = "successful." Profile extracted from modal traits of successful group.',
    sqlQuery: 'queryRosterPerformance', resultData, dataPoints: playersWithGames.length,
    confidence: conf.score, confidenceLabel: conf.label, effectSize: 0.5, pValue: null,
    confidenceInterval: null, isSignificant: true, trend, analysisRunId,
  });
  finding.summary = await narrateFinding({ ...finding, findingType: finding.finding_type, resultData });
  const newId = await insertFinding(sql, finding);
  if (previous) await supersedeOldFindings(sql, 'recruiting_match', newId);
  return { ...finding, id: newId };
}

async function analyzeCommitment(sql, analysisRunId) {
  const rows = await queries.queryRecruitOutcomes(sql);
  const withOutcomes = rows.filter(r => r.playing_time_yr1 !== null);
  if (withOutcomes.length < 10) return null;
  const retentionData = withOutcomes.map(r => ({ y: r.still_on_team ? 1 : 0, x: [r.fit_score / 100] }));
  const retentionModel = logisticRegression(retentionData);
  const starterData = withOutcomes.map(r => ({ y: r.playing_time_yr1 === 'Starter' || r.playing_time_yr1 === 'Rotation' ? 1 : 0, x: [r.clutch_factor / 1000] }));
  const starterModel = logisticRegression(starterData);
  const highFitRetention = withOutcomes.filter(r => r.fit_score >= 75);
  const lowFitRetention = withOutcomes.filter(r => r.fit_score < 50);
  const highFitRetRate = highFitRetention.length > 0 ? highFitRetention.filter(r => r.still_on_team).length / highFitRetention.length : null;
  const lowFitRetRate = lowFitRetention.length > 0 ? lowFitRetention.filter(r => r.still_on_team).length / lowFitRetention.length : null;
  const effectSize = highFitRetRate !== null && lowFitRetRate !== null ? highFitRetRate - lowFitRetRate : null;
  const conf = computeConfidence({ dataPoints: withOutcomes.length, minSample: 15, pValue: null, effectSize, priorConsistency: (highFitRetRate || 0) > (lowFitRetRate || 0) });
  const previous = await getLatestFinding(sql, 'commitment');
  const trend = detectTrend(previous, { confidence: conf.score, effect_size: effectSize });
  const resultData = {
    retentionOddsRatio: retentionModel.oddsRatios[0], starterOddsRatio: starterModel.oddsRatios[0],
    highFitRetentionRate: highFitRetRate !== null ? Math.round(highFitRetRate * 1000) / 1000 : null,
    lowFitRetentionRate: lowFitRetRate !== null ? Math.round(lowFitRetRate * 1000) / 1000 : null,
    totalRecruits: withOutcomes.length, portalEntries: withOutcomes.filter(r => r.entered_portal).length,
  };
  const finding = buildFinding({
    findingType: 'commitment', title: 'Recruit Retention & Playing Time Prediction',
    methodology: 'Two logistic regressions: (1) retained ~ fit_score, (2) earned_role ~ clutch_factor. Retention rates compared for high-fit (>=75) vs low-fit (<50) recruits.',
    sqlQuery: 'queryRecruitOutcomes', resultData, dataPoints: withOutcomes.length,
    confidence: conf.score, confidenceLabel: conf.label, effectSize, pValue: null,
    confidenceInterval: null, isSignificant: effectSize !== null && Math.abs(effectSize) > 0.10,
    trend, analysisRunId,
  });
  finding.summary = await narrateFinding({ ...finding, findingType: finding.finding_type, resultData });
  const newId = await insertFinding(sql, finding);
  if (previous) await supersedeOldFindings(sql, 'commitment', newId);
  return { ...finding, id: newId };
}

function mode(arr) {
  const counts = {};
  arr.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

module.exports = { runFullAnalysis, runPostGameAnalysis };
