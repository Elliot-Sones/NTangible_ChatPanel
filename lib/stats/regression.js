const ss = require('simple-statistics');

function multipleRegression(data) {
  const n = data.length;
  const k = data[0].x.length;
  const X = data.map(d => [1, ...d.x]);
  const Y = data.map(d => d.y);
  const Xt = transpose(X);
  const XtX = matMul(Xt, X);
  const XtY = matVecMul(Xt, Y);
  const XtXinv = invertMatrix(XtX);
  const beta = matVecMul(XtXinv, XtY);
  const intercept = beta[0];
  const coefficients = beta.slice(1);
  const predictions = data.map(d => intercept + coefficients.reduce((sum, c, i) => sum + c * d.x[i], 0));
  const residuals = Y.map((y, i) => y - predictions[i]);
  const yMean = ss.mean(Y);
  const ssTot = Y.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
  const ssRes = residuals.reduce((sum, r) => sum + r * r, 0);
  const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  const mse = ssRes / (n - k - 1);
  const standardErrors = [];
  const pValues = [];
  for (let j = 0; j <= k; j++) {
    const se = Math.sqrt(Math.abs(XtXinv[j][j]) * mse);
    standardErrors.push(se);
    const tStat = se === 0 ? 0 : beta[j] / se;
    pValues.push(2 * (1 - normalCDF(Math.abs(tStat))));
  }
  return {
    coefficients, intercept,
    rSquared: Math.round(rSquared * 10000) / 10000,
    residuals, pValues: pValues.slice(1),
    standardErrors: standardErrors.slice(1),
    predict: (x) => intercept + coefficients.reduce((sum, c, i) => sum + c * x[i], 0),
  };
}

function logisticRegression(data, { maxIter = 100, tol = 1e-6 } = {}) {
  const n = data.length;
  const k = data[0].x.length;
  let beta = new Array(k + 1).fill(0);
  function sigmoid(z) { return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, z)))); }
  function predictLocal(x, b) {
    let z = b[0];
    for (let j = 0; j < x.length; j++) z += b[j + 1] * x[j];
    return sigmoid(z);
  }
  let iter = 0;
  for (; iter < maxIter; iter++) {
    const p = data.map(d => predictLocal(d.x, beta));
    const X = data.map(d => [1, ...d.x]);
    const gradient = new Array(k + 1).fill(0);
    for (let i = 0; i < n; i++) {
      const diff = data[i].y - p[i];
      for (let j = 0; j <= k; j++) gradient[j] += X[i][j] * diff;
    }
    const H = Array.from({ length: k + 1 }, () => new Array(k + 1).fill(0));
    for (let i = 0; i < n; i++) {
      const w = p[i] * (1 - p[i]);
      for (let j = 0; j <= k; j++)
        for (let l = 0; l <= k; l++)
          H[j][l] -= X[i][j] * w * X[i][l];
    }
    const Hinv = invertMatrix(H);
    const step = matVecMul(Hinv, gradient);
    const newBeta = beta.map((b, j) => b - step[j]);
    const maxDelta = Math.max(...newBeta.map((b, j) => Math.abs(b - beta[j])));
    beta = newBeta;
    if (maxDelta < tol) break;
  }
  const intercept = beta[0];
  const coefficients = beta.slice(1);
  const oddsRatios = coefficients.map(c => Math.exp(c));
  return {
    coefficients, intercept, oddsRatios, iterations: iter,
    predict: (x) => {
      let z = intercept;
      for (let j = 0; j < x.length; j++) z += coefficients[j] * x[j];
      return sigmoid(z);
    },
  };
  function sigmoid(z) { return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, z)))); }
}

function transpose(m) {
  const rows = m.length, cols = m[0].length;
  const t = Array.from({ length: cols }, () => new Array(rows));
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) t[j][i] = m[i][j];
  return t;
}
function matMul(a, b) {
  const rows = a.length, cols = b[0].length, inner = b.length;
  const result = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) for (let k = 0; k < inner; k++) result[i][j] += a[i][k] * b[k][j];
  return result;
}
function matVecMul(m, v) { return m.map(row => row.reduce((sum, val, j) => sum + val * v[j], 0)); }
function invertMatrix(m) {
  const n = m.length;
  const aug = m.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => i === j ? 1 : 0)]);
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
    [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
    const pivot = aug[i][i];
    if (Math.abs(pivot) < 1e-12) { for (let j = 0; j < 2 * n; j++) aug[i][j] = 0; continue; }
    for (let j = 0; j < 2 * n; j++) aug[i][j] /= pivot;
    for (let k = 0; k < n; k++) {
      if (k === i) continue;
      const factor = aug[k][i];
      for (let j = 0; j < 2 * n; j++) aug[k][j] -= factor * aug[i][j];
    }
  }
  return aug.map(row => row.slice(n));
}
function normalCDF(z) {
  if (z < -8) return 0; if (z > 8) return 1;
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

module.exports = { multipleRegression, logisticRegression };
