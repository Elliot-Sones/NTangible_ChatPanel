const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic();

async function narrateFinding(finding) {
  const prompt = `You are a statistician explaining a finding to a baseball coach.
Be direct, conversational, and honest. Use plain English — no jargon unless you define it.

RULES:
- State the finding first, then the evidence
- Always mention the sample size and confidence level
- If confidence is Low, say "early signal" and note it needs more data
- Never overstate what the data shows. "Associated with" not "causes"
- If the trend is weakening, mention that honestly
- Keep it to 2-3 sentences max

FINDING DATA (these numbers are computed from SQL — do not modify them):
Type: ${finding.findingType}
Title: ${finding.title}
Data Points: ${finding.dataPoints}
Confidence: ${finding.confidenceLabel}
Effect Size: ${finding.effectSize || 'N/A'}
P-Value: ${finding.pValue || 'N/A'}
Confidence Interval: ${finding.confidenceInterval ? `[${finding.confidenceInterval.lower}, ${finding.confidenceInterval.upper}]` : 'N/A'}
Trend: ${finding.trend}
Raw Results: ${JSON.stringify(finding.resultData)}

Write the coach-facing summary:`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 256,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.content[0].text;
}

async function narrateWeeklyDigest(findings) {
  if (findings.length === 0) {
    return 'No statistical findings yet. Log game data to start generating insights.';
  }

  const findingSummaries = findings.map(f =>
    `- ${f.title} (${f.confidence_label} confidence, trend: ${f.trend}): ${f.summary}`
  ).join('\n');

  const prompt = `You are a statistician writing a weekly digest for a baseball coach.
Summarize the key takeaways from this week's analysis. Be direct and actionable.

RULES:
- Lead with the most important or changed finding
- Group related findings together
- Mention any findings that strengthened or weakened
- End with 1-2 specific actions the coach could take based on the data
- 4-6 sentences max

CURRENT FINDINGS:
${findingSummaries}

Write the weekly summary:`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.content[0].text;
}

module.exports = { narrateFinding, narrateWeeklyDigest };
