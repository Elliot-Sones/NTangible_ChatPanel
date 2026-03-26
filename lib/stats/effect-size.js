const ss = require('simple-statistics');

function cohensD(group1, group2) {
  const n1 = group1.length, n2 = group2.length;
  const mean1 = ss.mean(group1), mean2 = ss.mean(group2);
  const var1 = ss.sampleVariance(group1), var2 = ss.sampleVariance(group2);
  const pooledSd = Math.sqrt(((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2));
  if (pooledSd === 0) return 0;
  return (mean1 - mean2) / pooledSd;
}

function oddsRatio(table) {
  const [[a, b], [c, d]] = table;
  if (b * c === 0) return Infinity;
  return (a * d) / (b * c);
}

function cramersV(chiSquared, n, rows, cols) {
  const minDim = Math.min(rows, cols) - 1;
  if (minDim === 0 || n === 0) return 0;
  return Math.sqrt(chiSquared / (n * minDim));
}

module.exports = { cohensD, oddsRatio, cramersV };
