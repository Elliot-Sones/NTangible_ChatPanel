const { getDb } = require('../lib/db');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { outcomes } = req.body;
  if (!Array.isArray(outcomes) || outcomes.length === 0) return res.status(400).json({ error: 'outcomes array is required' });
  const sql = getDb();
  try {
    let upserted = 0;
    for (const o of outcomes) {
      await sql`
        INSERT INTO recruiting_outcomes (player_id, signing_date, playing_time_yr1, playing_time_yr2, still_on_team, entered_portal, portal_date)
        VALUES (${o.playerId || o.player_id}, ${o.signingDate || o.signing_date || null}, ${o.playingTimeYr1 || o.playing_time_yr1 || null}, ${o.playingTimeYr2 || o.playing_time_yr2 || null}, ${o.stillOnTeam !== undefined ? o.stillOnTeam : (o.still_on_team !== undefined ? o.still_on_team : true)}, ${o.enteredPortal || o.entered_portal || false}, ${o.portalDate || o.portal_date || null})
        ON CONFLICT (id) DO NOTHING
      `;
      upserted++;
    }
    return res.status(200).json({ success: true, upserted });
  } catch (error) {
    console.error('Recruiting outcomes error:', error);
    return res.status(500).json({ error: error.message });
  }
};
