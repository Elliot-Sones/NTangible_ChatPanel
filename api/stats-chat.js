const Anthropic = require('@anthropic-ai/sdk');
const { getDb } = require('../lib/db');

const anthropic = new Anthropic();

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { message, sessionId } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });
  const sql = getDb();
  try {
    const findings = await sql`
      SELECT finding_type, title, summary, confidence_label, data_points, effect_size, trend, result_data, methodology
      FROM stat_findings WHERE superseded_by IS NULL ORDER BY confidence DESC
    `;
    const history = await sql`
      SELECT role, content FROM conversations
      WHERE session_id = ${sessionId || 'stats-default'}
      ORDER BY created_at DESC LIMIT 10
    `;
    history.reverse();
    const findingsContext = findings.length > 0
      ? findings.map(f =>
          `### ${f.title} (${f.confidence_label} confidence, trend: ${f.trend})\n${f.summary}\n- Data points: ${f.data_points}\n- Effect size: ${f.effect_size || 'N/A'}\n- Methodology: ${f.methodology}\n- Raw data: ${JSON.stringify(f.result_data)}`
        ).join('\n\n')
      : 'No statistical findings computed yet. The coach needs to log game data first.';
    const systemPrompt = `You are the NTangible Statistician — a data analyst for baseball coaches.

RULES:
- Answer ONLY from the computed findings below. Never estimate, guess, or generate statistics.
- If a question can't be answered from the findings, say "I don't have enough data to answer that yet" and suggest what data would help.
- Always cite the confidence level and sample size when referencing a finding.
- Use plain language. Define any statistical term you use.
- Never claim causation. Use "associated with", "predicts", "correlated with".
- If a finding has Low confidence, flag it: "This is an early signal and may change as more games are logged."

CURRENT STATISTICAL FINDINGS:
${findingsContext}

Answer the coach's question using these findings:`;
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        ...history.map(h => ({ role: h.role, content: h.content })),
        { role: 'user', content: message },
      ],
    });
    const assistantMessage = response.content[0].text;
    if (sessionId) {
      await sql`INSERT INTO conversations (session_id, role, content, metadata) VALUES (${sessionId}, 'user', ${message}, ${JSON.stringify({ context: 'stats-chat' })})`;
      await sql`INSERT INTO conversations (session_id, role, content, metadata) VALUES (${sessionId}, 'assistant', ${assistantMessage}, ${JSON.stringify({ context: 'stats-chat', findingsUsed: findings.map(f => f.finding_type) })})`;
    }
    return res.status(200).json({ message: assistantMessage });
  } catch (error) {
    console.error('Stats chat error:', error);
    return res.status(500).json({ error: error.message });
  }
};
