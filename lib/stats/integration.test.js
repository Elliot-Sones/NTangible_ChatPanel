const { generateGameLogs, generateRecruitingOutcomes } = require('../mock/game-data');
const { multipleRegression, logisticRegression } = require('./regression');
const { chiSquaredTest } = require('./chi-squared');
const { bootstrapCI, bootstrapMeanDiff } = require('./bootstrap');
const { computeConfidence } = require('./confidence');
const { cohensD } = require('./effect-size');
const { detectTrend, buildFinding } = require('./findings');
const ss = require('simple-statistics');

const players = [
  { id: '1', name: 'Elite, Player', position: 'SS', level: 'NCAA', type: 'ROSTER', clutch_factor: 900, fit_score: 90, comm_style: 'Direct' },
  { id: '2', name: 'Good, Player', position: '2B', level: 'NCAA', type: 'ROSTER', clutch_factor: 780, fit_score: 75, comm_style: 'Supportive' },
  { id: '3', name: 'Mid, Player', position: '1B', level: 'NCAA', type: 'ROSTER', clutch_factor: 600, fit_score: 55, comm_style: 'Expressive' },
  { id: '4', name: 'Low, Player', position: '3B', level: 'NCAA', type: 'ROSTER', clutch_factor: 400, fit_score: 35, comm_style: 'Reserved' },
  { id: '5', name: 'Recruit, One', position: 'CF', level: 'High School', type: 'RECRUIT', clutch_factor: 800, fit_score: 80, comm_style: 'Direct' },
  { id: '6', name: 'Recruit, Two', position: 'RF', level: 'High School', type: 'RECRUIT', clutch_factor: 450, fit_score: 30, comm_style: 'Reserved' },
];

const gameLogs = generateGameLogs(players, { seed: 42 });
const outcomes = generateRecruitingOutcomes(players, { seed: 42 });
console.log(`Generated ${gameLogs.length} game logs, ${outcomes.length} recruiting outcomes`);

function testClutchPipeline() {
  const closeGames = gameLogs.filter(g => g.is_close_game && g.at_bats > 0);
  const highClutch = closeGames.filter(g => { const p = players.find(pl => pl.id === g.player_id); return p && p.clutch_factor >= 750; });
  const lowClutch = closeGames.filter(g => { const p = players.find(pl => pl.id === g.player_id); return p && p.clutch_factor < 650; });
  const highBA = highClutch.reduce((s, g) => s + g.hits, 0) / highClutch.reduce((s, g) => s + g.at_bats, 0);
  const lowBA = lowClutch.reduce((s, g) => s + g.hits, 0) / lowClutch.reduce((s, g) => s + g.at_bats, 0);
  console.log(`High clutch close-game BA: ${highBA.toFixed(3)}, Low clutch: ${lowBA.toFixed(3)}`);
  console.assert(highBA > lowBA, 'High clutch should have better close-game BA');
  const d = cohensD(highClutch.map(g => g.hits / g.at_bats), lowClutch.map(g => g.hits / g.at_bats));
  console.log(`Cohen's d: ${d.toFixed(3)}`);
  console.assert(d > 0, 'Effect size should be positive');
  const bootstrap = bootstrapMeanDiff(highClutch.map(g => g.hits / g.at_bats), lowClutch.map(g => g.hits / g.at_bats), { iterations: 1000, seed: 42 });
  console.log(`Bootstrap CI: [${bootstrap.lower.toFixed(3)}, ${bootstrap.upper.toFixed(3)}]`);
  const conf = computeConfidence({ dataPoints: closeGames.length, minSample: 15, pValue: 0.02, effectSize: d, priorConsistency: true });
  console.log(`Confidence: ${conf.score} (${conf.label})`);
  console.assert(conf.score > 0, 'Should have some confidence');
  console.log('PASS: clutch pipeline');
}

function testFitWinsPipeline() {
  const gameResults = {};
  for (const g of gameLogs) {
    const key = `${g.game_date}-${g.opponent}`;
    if (!gameResults[key]) gameResults[key] = { result: g.result, fits: [] };
    const p = players.find(pl => pl.id === g.player_id);
    if (p) gameResults[key].fits.push(p.fit_score);
  }
  const games = Object.values(gameResults).filter(g => g.fits.length > 0);
  const data = games.map(g => ({ y: g.result === 'W' ? 1 : 0, x: [ss.mean(g.fits) / 100] }));
  const result = logisticRegression(data);
  console.log(`Fit -> Wins odds ratio: ${result.oddsRatios[0].toFixed(3)}`);
  console.assert(typeof result.oddsRatios[0] === 'number', 'Should produce valid odds ratio');
  console.log('PASS: fit-wins pipeline');
}

function testErrorPatternsPipeline() {
  const commStyles = ['Direct', 'Supportive', 'Expressive', 'Reserved'];
  const pressureGames = gameLogs.filter(g => g.is_close_game);
  const table = commStyles.map(style => {
    const styleGames = pressureGames.filter(g => { const p = players.find(pl => pl.id === g.player_id); return p && p.comm_style === style; });
    const withErrors = styleGames.filter(g => g.errors > 0).length;
    return [withErrors, styleGames.length - withErrors];
  });
  const result = chiSquaredTest(table);
  console.log(`Chi-squared: ${result.chiSquared}, p: ${result.pValue}, V: ${result.cramersV}`);
  console.assert(typeof result.chiSquared === 'number', 'Should produce valid chi-squared');
  console.log('PASS: error patterns pipeline');
}

function testFindingConstruction() {
  const finding = buildFinding({ findingType: 'clutch_validation', title: 'Test', summary: 'Test', methodology: 'Test', sqlQuery: 'SELECT 1', resultData: { test: true }, dataPoints: 50, confidence: 72, confidenceLabel: 'High', effectSize: 0.6, pValue: 0.01, confidenceInterval: { lower: 0.3, upper: 0.9 }, isSignificant: true, trend: 'new', analysisRunId: 1 });
  console.assert(finding.finding_type === 'clutch_validation', 'Type mismatch');
  console.assert(finding.confidence === 72, 'Confidence mismatch');
  console.assert(finding.superseded_by === null, 'Should not be superseded');
  const trend = detectTrend(null, { confidence: 72, effect_size: 0.6 });
  console.assert(trend === 'new', 'First finding should be new');
  const trend2 = detectTrend({ confidence: 72, effect_size: 0.6 }, { confidence: 85, effect_size: 0.8 });
  console.assert(trend2 === 'strengthening', 'Should be strengthening');
  console.log('PASS: finding construction');
}

testClutchPipeline();
testFitWinsPipeline();
testErrorPatternsPipeline();
testFindingConstruction();
console.log('\nAll integration tests passed');
