const { getDb } = require('../lib/db');
const { runFullAnalysis } = require('../lib/stats/engine');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const sql = getDb();
  const trigger = req.body?.trigger || 'manual';
  try {
    const runRows = await sql`INSERT INTO analysis_runs (trigger, started_at, status) VALUES (${trigger}, NOW(), 'running') RETURNING id`;
    const runId = runRows[0].id;
    const findings = await runFullAnalysis(sql, { trigger, analysisRunId: runId });
    const gameCountRows = await sql`SELECT COUNT(DISTINCT game_date) AS c FROM game_logs`;
    const gameCount = gameCountRows[0]?.c || 0;
    await sql`UPDATE analysis_runs SET completed_at = NOW(), games_analyzed = ${gameCount}, findings_generated = ${findings.length}, findings_changed = ${findings.filter(f => f.trend !== 'stable').length}, status = 'complete' WHERE id = ${runId}`;
    return res.status(200).json({ success: true, runId, findings: findings.map(f => ({ id: f.id, type: f.finding_type, title: f.title, summary: f.summary, confidence: f.confidence_label, trend: f.trend })) });
  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({ error: error.message });
  }
};
