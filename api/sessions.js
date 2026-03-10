const { getDb } = require('../lib/db');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sql = getDb();

  try {
    const sessions = await sql`
      SELECT
        session_id,
        (ARRAY_AGG(content ORDER BY created_at) FILTER (WHERE role = 'user'))[1] AS preview,
        MIN(created_at) AS created_at,
        MAX(created_at) AS last_active,
        COUNT(*) AS message_count
      FROM conversations
      GROUP BY session_id
      ORDER BY last_active DESC
      LIMIT 30
    `;

    return res.status(200).json({ sessions });
  } catch (error) {
    console.error('Sessions error:', error);
    return res.status(500).json({ error: error.message });
  }
};
