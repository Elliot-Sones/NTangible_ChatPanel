async function queryClutchByPressure(sql) {
  const rows = await sql`
    SELECT p.id AS player_id, p.clutch_factor, p.position, p.level, p.graduation_year,
      g.is_close_game, SUM(g.at_bats) AS total_ab, SUM(g.hits) AS total_hits,
      SUM(g.errors) AS total_errors, SUM(g.strikeouts) AS total_k, COUNT(*) AS games
    FROM game_logs g JOIN players p ON g.player_id = p.id
    WHERE g.at_bats > 0
    GROUP BY p.id, p.clutch_factor, p.position, p.level, p.graduation_year, g.is_close_game
    ORDER BY p.clutch_factor DESC
  `;
  return rows;
}

async function queryFitAndWins(sql) {
  const rows = await sql`
    SELECT g.game_date, g.result, g.home_away, g.is_conference,
      AVG(p.fit_score) AS avg_fit, AVG(p.clutch_factor) AS avg_clutch,
      COUNT(DISTINCT p.id) AS players_in_game
    FROM game_logs g JOIN players p ON g.player_id = p.id
    GROUP BY g.game_date, g.result, g.home_away, g.is_conference, g.team_score, g.opponent_score
    ORDER BY g.game_date
  `;
  return rows;
}

async function queryErrorsByProfile(sql) {
  const rows = await sql`
    SELECT p.comm_style, g.is_close_game, g.home_away, COUNT(*) AS games,
      SUM(g.errors) AS total_errors,
      SUM(CASE WHEN g.errors > 0 THEN 1 ELSE 0 END) AS games_with_errors
    FROM game_logs g JOIN players p ON g.player_id = p.id
    GROUP BY p.comm_style, g.is_close_game, g.home_away
    ORDER BY p.comm_style
  `;
  return rows;
}

async function queryPlayerTrajectory(sql) {
  const rows = await sql`
    SELECT g.player_id, p.clutch_factor, p.position, g.game_date,
      g.at_bats, g.hits, g.errors, g.strikeouts,
      ROW_NUMBER() OVER (PARTITION BY g.player_id ORDER BY g.game_date) AS game_num
    FROM game_logs g JOIN players p ON g.player_id = p.id
    WHERE g.at_bats > 0
    ORDER BY g.player_id, g.game_date
  `;
  return rows;
}

async function queryRosterPerformance(sql) {
  const rows = await sql`
    SELECT p.id, p.clutch_factor, p.fit_score, p.comm_style, p.learning_style,
      p.motivation, p.position, p.type,
      SUM(g.at_bats) AS total_ab, SUM(g.hits) AS total_hits,
      SUM(g.errors) AS total_errors, COUNT(*) AS games,
      SUM(CASE WHEN g.result = 'W' THEN 1 ELSE 0 END) AS wins
    FROM players p LEFT JOIN game_logs g ON p.id = g.player_id
    WHERE p.type = 'ROSTER'
    GROUP BY p.id, p.clutch_factor, p.fit_score, p.comm_style, p.learning_style, p.motivation, p.position, p.type
  `;
  return rows;
}

async function queryRecruitOutcomes(sql) {
  const rows = await sql`
    SELECT p.id, p.clutch_factor, p.fit_score, p.comm_style, p.learning_style,
      p.motivation, p.commitment_label,
      r.playing_time_yr1, r.playing_time_yr2, r.still_on_team, r.entered_portal
    FROM players p LEFT JOIN recruiting_outcomes r ON p.id = r.player_id
    WHERE p.type = 'RECRUIT'
  `;
  return rows;
}

async function queryGameCount(sql) {
  const rows = await sql`SELECT COUNT(DISTINCT game_date) AS game_count FROM game_logs`;
  return rows[0]?.game_count || 0;
}

async function queryPlayerCount(sql) {
  const rows = await sql`SELECT COUNT(*) AS player_count FROM players`;
  return rows[0]?.player_count || 0;
}

module.exports = {
  queryClutchByPressure, queryFitAndWins, queryErrorsByProfile,
  queryPlayerTrajectory, queryRosterPerformance, queryRecruitOutcomes,
  queryGameCount, queryPlayerCount,
};
