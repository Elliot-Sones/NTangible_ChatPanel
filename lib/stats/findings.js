function detectTrend(previous, current) {
  if (!previous) return 'new';
  const confDelta = current.confidence - previous.confidence;
  const effectDelta = Math.abs(current.effect_size || 0) - Math.abs(previous.effect_size || 0);
  if (confDelta >= 10 || effectDelta >= 0.15) return 'strengthening';
  if (confDelta <= -10 || effectDelta <= -0.15) return 'weakening';
  return 'stable';
}

function buildFinding({ findingType, title, summary, methodology, sqlQuery, resultData, dataPoints, confidence, confidenceLabel, effectSize, pValue, confidenceInterval, isSignificant, trend, analysisRunId }) {
  return {
    finding_type: findingType, title, summary: summary || '', methodology: methodology || '',
    sql_query: sqlQuery || '', result_data: resultData || {}, data_points: dataPoints || 0,
    confidence: confidence || 0, confidence_label: confidenceLabel || 'Low',
    effect_size: effectSize || null, p_value: pValue || null,
    confidence_interval: confidenceInterval || null, is_significant: isSignificant || false,
    trend: trend || 'new', coach_feedback: null, superseded_by: null,
    analysis_run_id: analysisRunId || null,
  };
}

async function supersedeOldFindings(sql, findingType, newFindingId) {
  await sql`
    UPDATE stat_findings SET superseded_by = ${newFindingId}
    WHERE finding_type = ${findingType} AND superseded_by IS NULL AND id != ${newFindingId}
  `;
}

async function getLatestFinding(sql, findingType) {
  const rows = await sql`
    SELECT * FROM stat_findings
    WHERE finding_type = ${findingType} AND superseded_by IS NULL
    ORDER BY computed_at DESC LIMIT 1
  `;
  return rows[0] || null;
}

async function insertFinding(sql, finding) {
  const rows = await sql`
    INSERT INTO stat_findings (
      finding_type, title, summary, methodology, sql_query,
      result_data, data_points, confidence, confidence_label,
      effect_size, p_value, confidence_interval, is_significant,
      trend, coach_feedback, superseded_by, analysis_run_id
    ) VALUES (
      ${finding.finding_type}, ${finding.title}, ${finding.summary},
      ${finding.methodology}, ${finding.sql_query},
      ${JSON.stringify(finding.result_data)}, ${finding.data_points},
      ${finding.confidence}, ${finding.confidence_label},
      ${finding.effect_size}, ${finding.p_value},
      ${finding.confidence_interval ? JSON.stringify(finding.confidence_interval) : null},
      ${finding.is_significant}, ${finding.trend},
      ${finding.coach_feedback}, ${finding.superseded_by},
      ${finding.analysis_run_id}
    ) RETURNING id
  `;
  return rows[0].id;
}

module.exports = { detectTrend, buildFinding, supersedeOldFindings, getLatestFinding, insertFinding };
