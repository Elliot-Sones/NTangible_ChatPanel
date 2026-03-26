function computeConfidence({ dataPoints, minSample, pValue, effectSize, priorConsistency }) {
  let sampleScore = 0;
  if (dataPoints >= minSample * 3) sampleScore = 30;
  else if (dataPoints >= minSample) sampleScore = 15 + 15 * ((dataPoints - minSample) / (minSample * 2));
  else if (dataPoints > 0) sampleScore = 15 * (dataPoints / minSample);

  let significanceScore = 0;
  if (pValue !== null && pValue !== undefined) {
    if (pValue < 0.001) significanceScore = 30;
    else if (pValue < 0.01) significanceScore = 25;
    else if (pValue < 0.05) significanceScore = 20;
    else if (pValue < 0.1) significanceScore = 10;
  }

  let effectScore = 0;
  if (effectSize !== null && effectSize !== undefined) {
    const absEffect = Math.abs(effectSize);
    if (absEffect >= 0.8) effectScore = 20;
    else if (absEffect >= 0.5) effectScore = 15;
    else if (absEffect >= 0.2) effectScore = 10;
    else if (absEffect > 0) effectScore = 5;
  }

  const consistencyScore = priorConsistency ? 20 : 0;
  const score = Math.round(sampleScore + significanceScore + effectScore + consistencyScore);
  let label;
  if (score >= 70) label = 'High';
  else if (score >= 40) label = 'Medium';
  else label = 'Low';
  return { score, label, breakdown: { sampleSize: Math.round(sampleScore), significance: Math.round(significanceScore), effectSize: Math.round(effectScore), consistency: Math.round(consistencyScore) } };
}

module.exports = { computeConfidence };
