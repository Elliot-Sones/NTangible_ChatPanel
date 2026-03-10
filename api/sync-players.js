const { getDb } = require('../lib/db');
const { computeAllPlayerMetadata } = require('../lib/player-metadata');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { players } = req.body;
  if (!Array.isArray(players) || players.length === 0) {
    return res.status(400).json({ error: 'players array is required' });
  }

  const sql = getDb();

  try {
    // Normalize player fields for the metadata computation
    const normalizedPlayers = players.map(p => ({
      id: p.id,
      name: p.name,
      position: p.position || null,
      level: p.level || null,
      graduation_year: p.graduationYear || null,
      clutch_factor: p.clutchFactor || null,
      fit_score: p.fitScore || null,
      comm_style: p.commStyle || null,
      learning_style: p.learningStyle || null,
      motivation: p.motivation || null,
      type: p.type || null,
      round: p.round || null,
    }));

    // Compute extended metadata (rankings, exercises, psychometrics, etc.) for ALL players
    const extendedMetadata = computeAllPlayerMetadata(normalizedPlayers);

    let upserted = 0;

    for (const p of players) {
      const meta = {
        ...(p.metadata || {}),
        extended: extendedMetadata[p.id] || {},
      };

      await sql`
        INSERT INTO players (id, name, position, level, graduation_year, clutch_factor, fit_score, comm_style, learning_style, motivation, type, round, metadata, updated_at)
        VALUES (
          ${p.id},
          ${p.name},
          ${p.position || null},
          ${p.level || null},
          ${p.graduationYear || null},
          ${p.clutchFactor || null},
          ${p.fitScore || null},
          ${p.commStyle || null},
          ${p.learningStyle || null},
          ${p.motivation || null},
          ${p.type || null},
          ${p.round || null},
          ${JSON.stringify(meta)},
          NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          position = EXCLUDED.position,
          level = EXCLUDED.level,
          graduation_year = EXCLUDED.graduation_year,
          clutch_factor = EXCLUDED.clutch_factor,
          fit_score = EXCLUDED.fit_score,
          comm_style = EXCLUDED.comm_style,
          learning_style = EXCLUDED.learning_style,
          motivation = EXCLUDED.motivation,
          type = EXCLUDED.type,
          round = EXCLUDED.round,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
      `;
      upserted++;
    }

    return res.status(200).json({ success: true, upserted });
  } catch (error) {
    console.error('Sync error:', error);
    return res.status(500).json({ error: error.message });
  }
};
