const ss = require('simple-statistics');

function seededRng(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function bootstrapCI(data, statFn, { iterations = 1000, confidenceLevel = 0.95, seed = 42 } = {}) {
  const rng = seededRng(seed);
  const n = data.length;
  const estimate = statFn(data);
  const bootstrapStats = [];
  for (let i = 0; i < iterations; i++) {
    const sample = [];
    for (let j = 0; j < n; j++) sample.push(data[Math.floor(rng() * n)]);
    bootstrapStats.push(statFn(sample));
  }
  bootstrapStats.sort((a, b) => a - b);
  const alpha = 1 - confidenceLevel;
  const lowerIdx = Math.floor((alpha / 2) * iterations);
  const upperIdx = Math.floor((1 - alpha / 2) * iterations);
  return {
    estimate: Math.round(estimate * 10000) / 10000,
    lower: Math.round(bootstrapStats[lowerIdx] * 10000) / 10000,
    upper: Math.round(bootstrapStats[upperIdx] * 10000) / 10000,
    standardError: Math.round(ss.standardDeviation(bootstrapStats) * 10000) / 10000,
  };
}

function bootstrapMeanDiff(group1, group2, { iterations = 1000, confidenceLevel = 0.95, seed = 42 } = {}) {
  const rng = seededRng(seed);
  const n1 = group1.length, n2 = group2.length;
  const estimate = ss.mean(group1) - ss.mean(group2);
  const diffs = [];
  for (let i = 0; i < iterations; i++) {
    const s1 = [], s2 = [];
    for (let j = 0; j < n1; j++) s1.push(group1[Math.floor(rng() * n1)]);
    for (let j = 0; j < n2; j++) s2.push(group2[Math.floor(rng() * n2)]);
    diffs.push(ss.mean(s1) - ss.mean(s2));
  }
  diffs.sort((a, b) => a - b);
  const alpha = 1 - confidenceLevel;
  const lowerIdx = Math.floor((alpha / 2) * iterations);
  const upperIdx = Math.floor((1 - alpha / 2) * iterations);
  return {
    estimate: Math.round(estimate * 10000) / 10000,
    lower: Math.round(diffs[lowerIdx] * 10000) / 10000,
    upper: Math.round(diffs[upperIdx] * 10000) / 10000,
    standardError: Math.round(ss.standardDeviation(diffs) * 10000) / 10000,
  };
}

module.exports = { bootstrapCI, bootstrapMeanDiff, seededRng };
