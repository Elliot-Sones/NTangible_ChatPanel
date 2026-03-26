function seededRng(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const OPPONENTS = [
  'Central High', 'Westside Academy', 'North State', 'South Valley CC',
  'Eastern University', 'Lakewood Prep', 'Mountain View', 'Coastal College',
  'Riverdale High', 'Summit Prep', 'Bayshore CC', 'Prairie State',
];

function generateGameLogs(players, { seed = 42, seasonYear = 2026 } = {}) {
  const rng = seededRng(seed);
  const allLogs = [];
  const gameDates = [];
  const startDate = new Date(seasonYear, 1, 10);
  for (let i = 0; i < 40; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + Math.floor(i * 2.5) + Math.floor(rng() * 2));
    gameDates.push(d.toISOString().split('T')[0]);
  }
  const gameContexts = gameDates.map((date, i) => {
    const opponent = OPPONENTS[Math.floor(rng() * OPPONENTS.length)];
    const homeAway = rng() > 0.5 ? 'Home' : 'Away';
    const isConference = rng() > 0.4;
    const isTournament = i >= 35 && rng() > 0.3;
    const teamBaseRuns = 3 + Math.floor(rng() * 5);
    const oppBaseRuns = 2 + Math.floor(rng() * 5);
    return { date, opponent, homeAway, isConference, isTournament, teamBaseRuns, oppBaseRuns };
  });
  for (const player of players) {
    const numGames = 15 + Math.floor(rng() * 16);
    const gameIndices = [];
    const available = [...Array(40).keys()];
    for (let i = 0; i < numGames && available.length > 0; i++) {
      const idx = Math.floor(rng() * available.length);
      gameIndices.push(available.splice(idx, 1)[0]);
    }
    gameIndices.sort((a, b) => a - b);
    const clutch = player.clutch_factor || 500;
    const fit = player.fit_score || 50;
    const commStyle = player.comm_style || 'Direct';
    const baseBA = 0.200 + (clutch / 1000) * 0.100 + rng() * 0.050;
    for (const gi of gameIndices) {
      const ctx = gameContexts[gi];
      const fitBonus = fit > 70 ? 1 : fit < 40 ? -1 : 0;
      const teamScore = Math.max(0, ctx.teamBaseRuns + fitBonus + Math.floor(rng() * 3 - 1));
      const oppScore = Math.max(0, ctx.oppBaseRuns + Math.floor(rng() * 3 - 1));
      const isCloseGame = Math.abs(teamScore - oppScore) <= 2;
      const result = teamScore > oppScore ? 'W' : 'L';
      const atBats = 2 + Math.floor(rng() * 4);
      let hitProb = baseBA;
      if (isCloseGame) {
        if (clutch >= 750) hitProb += 0.035 + rng() * 0.015;
        else if (clutch < 650) hitProb -= 0.030 + rng() * 0.025;
      }
      if (ctx.homeAway === 'Away' && commStyle === 'Reserved') hitProb -= 0.015;
      let hits = 0;
      for (let ab = 0; ab < atBats; ab++) { if (rng() < hitProb) hits++; }
      const rbis = Math.min(hits + (rng() > 0.7 ? 1 : 0), atBats);
      let errorProb = 0.05;
      if (isCloseGame && ctx.homeAway === 'Away' && commStyle === 'Reserved') errorProb = 0.15;
      else if (commStyle === 'Expressive' && ctx.homeAway === 'Away') errorProb = 0.08;
      const errors = rng() < errorProb ? 1 : 0;
      let kProb = 0.20;
      if (isCloseGame && clutch < 650) kProb = 0.30;
      let strikeouts = 0;
      for (let ab = 0; ab < atBats; ab++) { if (rng() < kProb && strikeouts + hits <= atBats) strikeouts++; }
      strikeouts = Math.min(strikeouts, atBats - hits);
      const walks = rng() < 0.12 ? 1 : 0;
      allLogs.push({
        player_id: String(player.id), game_date: ctx.date, opponent: ctx.opponent,
        home_away: ctx.homeAway, team_score: teamScore, opponent_score: oppScore,
        result, is_close_game: isCloseGame, is_conference: ctx.isConference,
        is_tournament: ctx.isTournament, at_bats: atBats, hits, rbis, errors,
        strikeouts, walks, coach_note: null,
      });
    }
  }
  return allLogs;
}

function generateRecruitingOutcomes(players, { seed = 42 } = {}) {
  const rng = seededRng(seed);
  const recruits = players.filter(p => p.type === 'RECRUIT');
  return recruits.map(p => {
    const fit = p.fit_score || 50;
    const clutch = p.clutch_factor || 500;
    const retentionProb = fit >= 75 ? 0.85 : fit >= 50 ? 0.60 : 0.35;
    const stillOnTeam = rng() < retentionProb;
    const enteredPortal = !stillOnTeam && rng() > 0.3;
    let playingTime;
    const ptRoll = rng();
    if (clutch >= 700) playingTime = ptRoll > 0.4 ? 'Starter' : ptRoll > 0.15 ? 'Rotation' : 'Bench';
    else if (clutch >= 500) playingTime = ptRoll > 0.7 ? 'Starter' : ptRoll > 0.3 ? 'Rotation' : ptRoll > 0.1 ? 'Bench' : 'Redshirt';
    else playingTime = ptRoll > 0.85 ? 'Rotation' : ptRoll > 0.5 ? 'Bench' : 'Redshirt';
    let playingTimeYr2 = null;
    if (stillOnTeam) {
      const yr2Roll = rng();
      if (playingTime === 'Starter') playingTimeYr2 = yr2Roll > 0.2 ? 'Starter' : 'Rotation';
      else if (playingTime === 'Rotation') playingTimeYr2 = yr2Roll > 0.4 ? 'Starter' : 'Rotation';
      else playingTimeYr2 = yr2Roll > 0.5 ? 'Rotation' : 'Bench';
    }
    const signingMonth = 10 + Math.floor(rng() * 3);
    const signingDay = 1 + Math.floor(rng() * 28);
    return {
      player_id: String(p.id),
      signing_date: `2025-${String(signingMonth).padStart(2, '0')}-${String(signingDay).padStart(2, '0')}`,
      playing_time_yr1: playingTime, playing_time_yr2: playingTimeYr2,
      still_on_team: stillOnTeam, entered_portal: enteredPortal,
      portal_date: enteredPortal ? '2026-04-15' : null,
    };
  });
}

module.exports = { generateGameLogs, generateRecruitingOutcomes };
