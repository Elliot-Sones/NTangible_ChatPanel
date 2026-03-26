const { cramersV } = require('./effect-size');

function chiSquaredPValue(chiSquared, df) {
  if (chiSquared <= 0) return 1.0;
  if (df <= 0) return 1.0;
  const k = df;
  const z = Math.pow(chiSquared / k, 1 / 3) - (1 - 2 / (9 * k));
  const se = Math.sqrt(2 / (9 * k));
  const zScore = z / se;
  return 1 - normalCDF(zScore);
}

function normalCDF(z) {
  if (z < -8) return 0;
  if (z > 8) return 1;
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

function chiSquaredTest(observed) {
  const rows = observed.length;
  const cols = observed[0].length;
  const n = observed.reduce((sum, row) => sum + row.reduce((s, v) => s + v, 0), 0);
  const rowTotals = observed.map(row => row.reduce((s, v) => s + v, 0));
  const colTotals = [];
  for (let j = 0; j < cols; j++) colTotals.push(observed.reduce((sum, row) => sum + row[j], 0));
  let chiSquared = 0;
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++) {
      const expected = (rowTotals[i] * colTotals[j]) / n;
      if (expected > 0) chiSquared += Math.pow(observed[i][j] - expected, 2) / expected;
    }
  const df = (rows - 1) * (cols - 1);
  const pValue = chiSquaredPValue(chiSquared, df);
  const v = cramersV(chiSquared, n, rows, cols);
  return {
    chiSquared: Math.round(chiSquared * 10000) / 10000,
    degreesOfFreedom: df,
    pValue: Math.round(pValue * 10000) / 10000,
    n,
    cramersV: Math.round(v * 10000) / 10000,
    significant: pValue < 0.05,
  };
}

module.exports = { chiSquaredTest, chiSquaredPValue, normalCDF };
