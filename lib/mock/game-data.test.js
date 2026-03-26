const { generateGameLogs, generateRecruitingOutcomes } = require('./game-data');

function testGenerateGameLogs() {
  const players = [
    { id: '1', name: 'Smith, John', position: 'SS', level: 'NCAA', type: 'ROSTER', clutch_factor: 800, fit_score: 85, comm_style: 'Direct' },
    { id: '2', name: 'Jones, Mike', position: 'P', level: 'NCAA', type: 'ROSTER', clutch_factor: 500, fit_score: 40, comm_style: 'Reserved' },
    { id: '3', name: 'Brown, Alex', position: '1B', level: 'High School', type: 'RECRUIT', clutch_factor: 750, fit_score: 70, comm_style: 'Expressive' },
  ];
  const logs = generateGameLogs(players, { seed: 42 });
  const playerIds = new Set(logs.map(l => l.player_id));
  console.assert(playerIds.size === 3, `Expected 3 players, got ${playerIds.size}`);
  for (const id of playerIds) {
    const count = logs.filter(l => l.player_id === id).length;
    console.assert(count >= 15 && count <= 30, `Player ${id} has ${count} games, expected 15-30`);
  }
  const log = logs[0];
  console.assert(typeof log.player_id === 'string', 'player_id should be string');
  console.assert(/^\d{4}-\d{2}-\d{2}$/.test(log.game_date), `game_date format wrong: ${log.game_date}`);
  console.assert(['Home', 'Away'].includes(log.home_away), `home_away invalid: ${log.home_away}`);
  console.assert(['W', 'L'].includes(log.result), `result invalid: ${log.result}`);
  console.assert(typeof log.is_close_game === 'boolean', 'is_close_game should be boolean');
  console.assert(log.hits <= log.at_bats, `hits (${log.hits}) should not exceed at_bats (${log.at_bats})`);
  console.log('PASS: generateGameLogs');
}

function testDeterministic() {
  const players = [
    { id: '1', name: 'Smith, John', position: 'SS', level: 'NCAA', type: 'ROSTER', clutch_factor: 800, fit_score: 85, comm_style: 'Direct' },
  ];
  const logs1 = generateGameLogs(players, { seed: 42 });
  const logs2 = generateGameLogs(players, { seed: 42 });
  console.assert(JSON.stringify(logs1) === JSON.stringify(logs2), 'Same seed should produce identical logs');
  console.log('PASS: deterministic');
}

function testClutchCorrelation() {
  const players = [
    { id: '1', name: 'Elite, Player', position: 'SS', level: 'NCAA', type: 'ROSTER', clutch_factor: 900, fit_score: 85, comm_style: 'Direct' },
    { id: '2', name: 'Low, Player', position: '2B', level: 'NCAA', type: 'ROSTER', clutch_factor: 400, fit_score: 40, comm_style: 'Reserved' },
  ];
  const logs = generateGameLogs(players, { seed: 42 });
  function avgBA(playerId, closeOnly) {
    const pLogs = logs.filter(l => l.player_id === playerId && (!closeOnly || l.is_close_game) && l.at_bats > 0);
    const totalH = pLogs.reduce((s, l) => s + l.hits, 0);
    const totalAB = pLogs.reduce((s, l) => s + l.at_bats, 0);
    return totalAB > 0 ? totalH / totalAB : 0;
  }
  const eliteCloseBA = avgBA('1', true);
  const eliteAllBA = avgBA('1', false);
  const lowCloseBA = avgBA('2', true);
  const lowAllBA = avgBA('2', false);
  const eliteDelta = eliteCloseBA - eliteAllBA;
  const lowDelta = lowCloseBA - lowAllBA;
  console.assert(eliteDelta > lowDelta, `Elite delta (${eliteDelta.toFixed(3)}) should be > Low delta (${lowDelta.toFixed(3)})`);
  console.log('PASS: clutchCorrelation');
}

function testGenerateRecruitingOutcomes() {
  const players = [
    { id: '1', name: 'High, Fit', type: 'RECRUIT', fit_score: 90, clutch_factor: 800 },
    { id: '2', name: 'Low, Fit', type: 'RECRUIT', fit_score: 30, clutch_factor: 500 },
  ];
  const outcomes = generateRecruitingOutcomes(players, { seed: 42 });
  console.assert(outcomes.length === 2, `Expected 2 outcomes, got ${outcomes.length}`);
  console.assert(typeof outcomes[0].player_id === 'string', 'player_id should be string');
  console.assert(['Starter', 'Rotation', 'Bench', 'Redshirt'].includes(outcomes[0].playing_time_yr1), `Invalid playing_time: ${outcomes[0].playing_time_yr1}`);
  console.assert(typeof outcomes[0].still_on_team === 'boolean', 'still_on_team should be boolean');
  console.log('PASS: generateRecruitingOutcomes');
}

testGenerateGameLogs();
testDeterministic();
testClutchCorrelation();
testGenerateRecruitingOutcomes();
console.log('All game-data tests passed');
