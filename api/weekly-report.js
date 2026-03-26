const { getDb } = require('../lib/db');
const { narrateWeeklyDigest } = require('../lib/stats/narrate');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const sql = getDb();
  try {
    const findings = await sql`SELECT * FROM stat_findings WHERE superseded_by IS NULL ORDER BY confidence DESC`;
    const runs = await sql`SELECT * FROM analysis_runs ORDER BY completed_at DESC NULLS LAST LIMIT 1`;
    const summary = await narrateWeeklyDigest(findings);
    return res.status(200).json({
      summary,
      findings: findings.map(f => ({ id: f.id, type: f.finding_type, title: f.title, summary: f.summary, confidence: f.confidence, confidenceLabel: f.confidence_label, trend: f.trend, dataPoints: f.data_points, effectSize: f.effect_size, computedAt: f.computed_at })),
      lastRun: runs[0] || null,
    });
  } catch (error) {
    console.error('Weekly report error:', error);
    return res.status(500).json({ error: error.message });
  }
};
