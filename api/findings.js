const { getDb } = require('../lib/db');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const sql = getDb();
  const { type, min_confidence } = req.query || {};
  try {
    let rows;
    if (type && min_confidence) {
      rows = await sql`SELECT * FROM stat_findings WHERE superseded_by IS NULL AND finding_type = ${type} AND confidence >= ${parseInt(min_confidence)} ORDER BY confidence DESC`;
    } else if (type) {
      rows = await sql`SELECT * FROM stat_findings WHERE superseded_by IS NULL AND finding_type = ${type} ORDER BY confidence DESC`;
    } else if (min_confidence) {
      rows = await sql`SELECT * FROM stat_findings WHERE superseded_by IS NULL AND confidence >= ${parseInt(min_confidence)} ORDER BY confidence DESC`;
    } else {
      rows = await sql`SELECT * FROM stat_findings WHERE superseded_by IS NULL ORDER BY confidence DESC`;
    }
    return res.status(200).json({ findings: rows });
  } catch (error) {
    console.error('Findings fetch error:', error);
    return res.status(500).json({ error: error.message });
  }
};
