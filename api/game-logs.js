const { getDb } = require('../lib/db');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { gameLogs } = req.body;
  if (!Array.isArray(gameLogs) || gameLogs.length === 0) return res.status(400).json({ error: 'gameLogs array is required' });
  const sql = getDb();
  try {
    let inserted = 0;
    for (const g of gameLogs) {
      const isCloseGame = Math.abs((g.teamScore || g.team_score || 0) - (g.opponentScore || g.opponent_score || 0)) <= 2;
      await sql`
        INSERT INTO game_logs (player_id, game_date, opponent, home_away, team_score, opponent_score, result, is_close_game, is_conference, is_tournament, at_bats, hits, rbis, errors, strikeouts, walks, coach_note)
        VALUES (${g.playerId || g.player_id}, ${g.gameDate || g.game_date}, ${g.opponent || null}, ${g.homeAway || g.home_away || null}, ${g.teamScore || g.team_score || 0}, ${g.opponentScore || g.opponent_score || 0}, ${g.result || ((g.teamScore || g.team_score || 0) > (g.opponentScore || g.opponent_score || 0) ? 'W' : 'L')}, ${isCloseGame}, ${g.isConference || g.is_conference || false}, ${g.isTournament || g.is_tournament || false}, ${g.atBats || g.at_bats || 0}, ${g.hits || 0}, ${g.rbis || 0}, ${g.errors || 0}, ${g.strikeouts || 0}, ${g.walks || 0}, ${g.coachNote || g.coach_note || null})
      `;
      inserted++;
    }
    return res.status(200).json({ success: true, inserted });
  } catch (error) {
    console.error('Game logs insert error:', error);
    return res.status(500).json({ error: error.message });
  }
};
