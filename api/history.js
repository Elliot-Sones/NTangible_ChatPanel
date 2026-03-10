const { getDb } = require('../lib/db');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sessionId = req.query.sessionId;
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  const sql = getDb();

  try {
    const messages = await sql`
      SELECT role, content, metadata, created_at
      FROM conversations
      WHERE session_id = ${sessionId}
      ORDER BY created_at ASC
      LIMIT 100
    `;

    return res.status(200).json({ messages });
  } catch (error) {
    console.error('History error:', error);
    return res.status(500).json({ error: error.message });
  }
};
