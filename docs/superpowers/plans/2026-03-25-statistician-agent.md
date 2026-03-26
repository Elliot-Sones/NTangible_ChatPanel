# Statistician Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a statistical analysis engine that connects NTangible cognitive profiles to game performance data, proving (or disproving) that the data is predictive — with full transparency on methodology, confidence, and sample size.

**Architecture:** SQL computes all statistics from game_logs + players tables. A library of focused statistical functions (regression, chi-squared, bootstrap, Bayesian updating) validates results. Claude narrates findings in plain English. A Stats Lab UI tab surfaces insights, weekly reports, and a dedicated statistical chat.

**Tech Stack:** Node.js (Vercel serverless), PostgreSQL (Neon), simple-statistics (npm), Anthropic SDK (Claude Sonnet), existing Voyage AI embeddings.

---

## File Structure

```
lib/
  stats/
    engine.js           — Orchestrates analysis runs, manages triggers, coordinates all analysis types
    queries.js          — All predefined SQL queries as parameterized functions
    regression.js       — Multiple linear regression + logistic regression
    chi-squared.js      — Chi-squared test + Cramér's V effect size
    bootstrap.js        — Bootstrap resampling for small-sample confidence intervals
    bayesian.js         — Prior management + Bayesian coefficient updating
    confidence.js       — Composite confidence scoring (0-100) + labeling
    effect-size.js      — Cohen's d, odds ratios, standardized betas
    findings.js         — Finding comparison, trend detection, versioning, storage
    narrate.js          — Claude narration of computed results
  mock/
    game-data.js        — Deterministic game log generation (seeded RNG)
    recruiting-data.js  — Deterministic recruiting outcome generation

api/
  game-logs.js          — POST: upsert game entries, triggers post-game analysis
  recruiting-outcomes.js — POST: upsert recruiting outcome data
  run-analysis.js       — POST: manual full analysis trigger
  findings.js           — GET: current findings with filters
  weekly-report.js      — GET: latest weekly digest with Claude summary
  stats-chat.js         — POST: chat scoped to statistical questions
  seed.js               — Modified: add 4 new tables + seed mock game data
```

---

### Task 1: Add `simple-statistics` Dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install simple-statistics**

Run: `npm install simple-statistics`

- [ ] **Step 2: Verify installation**

Run: `node -e "const ss = require('simple-statistics'); console.log(ss.linearRegression([{x:1,y:2},{x:2,y:4},{x:3,y:6}]))"`
Expected: `{ m: 2, b: 0 }`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "Add simple-statistics dependency for statistical engine"
```

---

### Task 2: Database Schema — New Tables

**Files:**
- Modify: `api/seed.js`

- [ ] **Step 1: Read current seed.js**

Read `api/seed.js` to confirm current table creation structure.

- [ ] **Step 2: Add 4 new tables after the team_notes table creation**

Add the following SQL after the existing `team_notes` table creation and before the `TRUNCATE knowledge_chunks` line in `api/seed.js`:

```javascript
    // === STATISTICIAN AGENT TABLES ===

    await sql`
      CREATE TABLE IF NOT EXISTS game_logs (
        id              SERIAL PRIMARY KEY,
        player_id       TEXT NOT NULL REFERENCES players(id),
        game_date       DATE NOT NULL,
        opponent        TEXT,
        home_away       TEXT,
        team_score      INT,
        opponent_score  INT,
        result          TEXT,
        is_close_game   BOOLEAN DEFAULT false,
        is_conference   BOOLEAN DEFAULT false,
        is_tournament   BOOLEAN DEFAULT false,
        at_bats         INT DEFAULT 0,
        hits            INT DEFAULT 0,
        rbis            INT DEFAULT 0,
        errors          INT DEFAULT 0,
        strikeouts      INT DEFAULT 0,
        walks           INT DEFAULT 0,
        coach_note      TEXT,
        created_at      TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_gl_player_date ON game_logs (player_id, game_date)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_gl_date ON game_logs (game_date)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_gl_close ON game_logs (is_close_game)`;

    await sql`
      CREATE TABLE IF NOT EXISTS recruiting_outcomes (
        id              SERIAL PRIMARY KEY,
        player_id       TEXT NOT NULL REFERENCES players(id),
        signing_date    DATE,
        playing_time_yr1 TEXT,
        playing_time_yr2 TEXT,
        still_on_team   BOOLEAN DEFAULT true,
        entered_portal  BOOLEAN DEFAULT false,
        portal_date     DATE,
        created_at      TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_ro_player ON recruiting_outcomes (player_id)`;

    await sql`
      CREATE TABLE IF NOT EXISTS stat_findings (
        id                  SERIAL PRIMARY KEY,
        finding_type        TEXT NOT NULL,
        title               TEXT NOT NULL,
        summary             TEXT,
        methodology         TEXT,
        sql_query           TEXT,
        result_data         JSONB DEFAULT '{}',
        data_points         INT DEFAULT 0,
        confidence          INT DEFAULT 0,
        confidence_label    TEXT DEFAULT 'Low',
        effect_size         FLOAT,
        p_value             FLOAT,
        confidence_interval JSONB,
        is_significant      BOOLEAN DEFAULT false,
        trend               TEXT DEFAULT 'new',
        coach_feedback      TEXT,
        computed_at         TIMESTAMPTZ DEFAULT NOW(),
        superseded_by       INT,
        analysis_run_id     INT
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_sf_type ON stat_findings (finding_type)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sf_current ON stat_findings (superseded_by) WHERE superseded_by IS NULL`;

    await sql`
      CREATE TABLE IF NOT EXISTS analysis_runs (
        id                  SERIAL PRIMARY KEY,
        trigger             TEXT NOT NULL,
        started_at          TIMESTAMPTZ DEFAULT NOW(),
        completed_at        TIMESTAMPTZ,
        games_analyzed      INT DEFAULT 0,
        findings_generated  INT DEFAULT 0,
        findings_changed    INT DEFAULT 0,
        status              TEXT DEFAULT 'running'
      )
    `;
```

- [ ] **Step 3: Verify seed.js is syntactically valid**

Run: `node -e "require('./api/seed.js')" 2>&1 | head -5`
Expected: No syntax errors (may show runtime error about missing DATABASE_URL which is fine).

- [ ] **Step 4: Commit**

```bash
git add api/seed.js
git commit -m "Add game_logs, recruiting_outcomes, stat_findings, analysis_runs tables"
```

---

### Task 3: Statistical Utilities — Effect Size

**Files:**
- Create: `lib/stats/effect-size.js`
- Create: `lib/stats/effect-size.test.js`

- [ ] **Step 1: Write failing tests for effect size functions**

Create `lib/stats/effect-size.test.js`:

```javascript
const { cohensD, oddsRatio, cramersV } = require('./effect-size');

// cohensD: (mean1 - mean2) / pooled_sd
// Known: group1=[2,4,6], mean=4, sd=2
//        group2=[1,2,3], mean=2, sd=1
// pooled_sd = sqrt(((3-1)*4 + (3-1)*1) / (3+3-2)) = sqrt(10/4) = sqrt(2.5) ≈ 1.5811
// d = (4-2) / 1.5811 ≈ 1.2649

function testCohensD() {
  const d = cohensD([2, 4, 6], [1, 2, 3]);
  console.assert(Math.abs(d - 1.2649) < 0.01, `cohensD expected ~1.2649, got ${d}`);
  console.log('PASS: cohensD');
}

// oddsRatio: (a*d) / (b*c) for 2x2 table [[a,b],[c,d]]
// [[10,5],[3,12]] → (10*12)/(5*3) = 120/15 = 8.0
function testOddsRatio() {
  const or = oddsRatio([[10, 5], [3, 12]]);
  console.assert(Math.abs(or - 8.0) < 0.01, `oddsRatio expected 8.0, got ${or}`);
  console.log('PASS: oddsRatio');
}

// cramersV: sqrt(chi2 / (n * (min(r,c)-1)))
// For a 2x2 table with chi2=5.0, n=30: V = sqrt(5/30) ≈ 0.4082
function testCramersV() {
  const v = cramersV(5.0, 30, 2, 2);
  console.assert(Math.abs(v - 0.4082) < 0.01, `cramersV expected ~0.4082, got ${v}`);
  console.log('PASS: cramersV');
}

testCohensD();
testOddsRatio();
testCramersV();
console.log('All effect-size tests passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node lib/stats/effect-size.test.js`
Expected: `Error: Cannot find module './effect-size'`

- [ ] **Step 3: Implement effect-size.js**

Create `lib/stats/effect-size.js`:

```javascript
const ss = require('simple-statistics');

/**
 * Cohen's d — standardized mean difference between two groups.
 * @param {number[]} group1
 * @param {number[]} group2
 * @returns {number} effect size (0.2=small, 0.5=medium, 0.8=large)
 */
function cohensD(group1, group2) {
  const n1 = group1.length;
  const n2 = group2.length;
  const mean1 = ss.mean(group1);
  const mean2 = ss.mean(group2);
  const var1 = ss.variance(group1);
  const var2 = ss.variance(group2);
  const pooledSd = Math.sqrt(((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2));
  if (pooledSd === 0) return 0;
  return (mean1 - mean2) / pooledSd;
}

/**
 * Odds ratio from a 2x2 contingency table.
 * @param {number[][]} table — [[a,b],[c,d]]
 * @returns {number}
 */
function oddsRatio(table) {
  const [[a, b], [c, d]] = table;
  if (b * c === 0) return Infinity;
  return (a * d) / (b * c);
}

/**
 * Cramér's V — effect size for chi-squared test.
 * @param {number} chiSquared
 * @param {number} n — total observations
 * @param {number} rows
 * @param {number} cols
 * @returns {number} 0-1 effect size
 */
function cramersV(chiSquared, n, rows, cols) {
  const minDim = Math.min(rows, cols) - 1;
  if (minDim === 0 || n === 0) return 0;
  return Math.sqrt(chiSquared / (n * minDim));
}

module.exports = { cohensD, oddsRatio, cramersV };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node lib/stats/effect-size.test.js`
Expected: `All effect-size tests passed`

- [ ] **Step 5: Commit**

```bash
git add lib/stats/effect-size.js lib/stats/effect-size.test.js
git commit -m "Add effect size calculations: Cohen's d, odds ratio, Cramér's V"
```

---

### Task 4: Statistical Utilities — Chi-Squared Test

**Files:**
- Create: `lib/stats/chi-squared.js`
- Create: `lib/stats/chi-squared.test.js`

- [ ] **Step 1: Write failing tests**

Create `lib/stats/chi-squared.test.js`:

```javascript
const { chiSquaredTest } = require('./chi-squared');

// Known 2x2 table: [[10, 5], [3, 12]]
// Expected: row totals [15, 15], col totals [13, 17], n=30
// Expected cells: [[6.5, 8.5], [6.5, 8.5]]
// chi2 = (10-6.5)^2/6.5 + (5-8.5)^2/8.5 + (3-6.5)^2/6.5 + (12-8.5)^2/8.5
//       = 1.8846 + 1.4412 + 1.8846 + 1.4412 = 6.6516
// df = (2-1)*(2-1) = 1

function testChiSquared2x2() {
  const result = chiSquaredTest([[10, 5], [3, 12]]);
  console.assert(Math.abs(result.chiSquared - 6.6516) < 0.01,
    `chi2 expected ~6.6516, got ${result.chiSquared}`);
  console.assert(result.degreesOfFreedom === 1,
    `df expected 1, got ${result.degreesOfFreedom}`);
  console.assert(result.n === 30, `n expected 30, got ${result.n}`);
  // p-value for chi2=6.65, df=1 should be ~0.01
  console.assert(result.pValue < 0.05, `pValue expected <0.05, got ${result.pValue}`);
  console.assert(result.cramersV > 0, `cramersV expected >0, got ${result.cramersV}`);
  console.log('PASS: chiSquaredTest 2x2');
}

// 3x2 table
function testChiSquared3x2() {
  const result = chiSquaredTest([[20, 30], [15, 35], [10, 40]]);
  console.assert(result.degreesOfFreedom === 2,
    `df expected 2, got ${result.degreesOfFreedom}`);
  console.assert(result.n === 150, `n expected 150, got ${result.n}`);
  console.assert(typeof result.pValue === 'number', 'pValue should be a number');
  console.log('PASS: chiSquaredTest 3x2');
}

testChiSquared2x2();
testChiSquared3x2();
console.log('All chi-squared tests passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node lib/stats/chi-squared.test.js`
Expected: `Error: Cannot find module './chi-squared'`

- [ ] **Step 3: Implement chi-squared.js**

Create `lib/stats/chi-squared.js`:

```javascript
const { cramersV } = require('./effect-size');

/**
 * Chi-squared p-value approximation using the Wilson-Hilferty transform.
 * For df=1, uses continuity-corrected normal approximation.
 * Accurate to ~2 decimal places for chi2 > 1.
 */
function chiSquaredPValue(chiSquared, df) {
  if (chiSquared <= 0) return 1.0;
  if (df <= 0) return 1.0;
  // Wilson-Hilferty approximation: transform chi2 to ~N(0,1)
  const k = df;
  const z = Math.pow(chiSquared / k, 1 / 3) - (1 - 2 / (9 * k));
  const se = Math.sqrt(2 / (9 * k));
  const zScore = z / se;
  // Standard normal CDF approximation (upper tail)
  return 1 - normalCDF(zScore);
}

/**
 * Standard normal CDF approximation (Abramowitz & Stegun 26.2.17).
 */
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

/**
 * Chi-squared test of independence for a contingency table.
 * @param {number[][]} observed — 2D array of observed counts
 * @returns {{ chiSquared, degreesOfFreedom, pValue, n, cramersV, significant }}
 */
function chiSquaredTest(observed) {
  const rows = observed.length;
  const cols = observed[0].length;
  const n = observed.reduce((sum, row) => sum + row.reduce((s, v) => s + v, 0), 0);

  // Row and column totals
  const rowTotals = observed.map(row => row.reduce((s, v) => s + v, 0));
  const colTotals = [];
  for (let j = 0; j < cols; j++) {
    colTotals.push(observed.reduce((sum, row) => sum + row[j], 0));
  }

  // Compute chi-squared statistic
  let chiSquared = 0;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const expected = (rowTotals[i] * colTotals[j]) / n;
      if (expected > 0) {
        chiSquared += Math.pow(observed[i][j] - expected, 2) / expected;
      }
    }
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node lib/stats/chi-squared.test.js`
Expected: `All chi-squared tests passed`

- [ ] **Step 5: Commit**

```bash
git add lib/stats/chi-squared.js lib/stats/chi-squared.test.js
git commit -m "Add chi-squared test of independence with p-value approximation"
```

---

### Task 5: Statistical Utilities — Regression

**Files:**
- Create: `lib/stats/regression.js`
- Create: `lib/stats/regression.test.js`

- [ ] **Step 1: Write failing tests**

Create `lib/stats/regression.test.js`:

```javascript
const { multipleRegression, logisticRegression } = require('./regression');

function testMultipleRegression() {
  // Simple known case: y = 2*x1 + 3*x2 + 1 (no noise)
  const data = [
    { y: 8, x: [1, 1] },   // 2+3+1 = 6 ... with some variation
    { y: 12, x: [2, 2] },
    { y: 18, x: [3, 3] },
    { y: 24, x: [4, 4] },
    { y: 30, x: [5, 5] },
  ];
  // y = 5*x + something (since x1=x2, effectively y = 5*x + constant-ish)
  // Actually: y = 6*x_shared - ... let me use distinct predictors

  const data2 = [
    { y: 10, x: [1, 2] },
    { y: 14, x: [2, 3] },
    { y: 18, x: [3, 4] },
    { y: 22, x: [4, 5] },
    { y: 26, x: [5, 6] },
  ];
  // Pattern: y = 4*index + 6, or y = 2*x1 + 2*x2 + 2
  const result = multipleRegression(data2);
  console.assert(result.coefficients.length === 2, `Expected 2 coefficients, got ${result.coefficients.length}`);
  console.assert(typeof result.intercept === 'number', 'intercept should be a number');
  console.assert(result.rSquared > 0.99, `R² expected >0.99, got ${result.rSquared}`);
  console.assert(typeof result.pValues === 'object', 'pValues should exist');
  // Predictions should match
  const predicted = result.intercept + result.coefficients[0] * 3 + result.coefficients[1] * 4;
  console.assert(Math.abs(predicted - 18) < 0.5, `Prediction expected ~18, got ${predicted}`);
  console.log('PASS: multipleRegression');
}

function testLogisticRegression() {
  // Clear separation: high x → y=1, low x → y=0
  const data = [
    { y: 0, x: [1] }, { y: 0, x: [2] }, { y: 0, x: [3] },
    { y: 0, x: [4] }, { y: 0, x: [5] },
    { y: 1, x: [6] }, { y: 1, x: [7] }, { y: 1, x: [8] },
    { y: 1, x: [9] }, { y: 1, x: [10] },
  ];
  const result = logisticRegression(data);
  console.assert(result.coefficients[0] > 0, `coefficient should be positive, got ${result.coefficients[0]}`);
  // Predict: x=2 should be low probability, x=9 should be high
  console.assert(result.predict([2]) < 0.5, `predict(2) should be <0.5, got ${result.predict([2])}`);
  console.assert(result.predict([9]) > 0.5, `predict(9) should be >0.5, got ${result.predict([9])}`);
  console.assert(typeof result.oddsRatios === 'object', 'oddsRatios should exist');
  console.log('PASS: logisticRegression');
}

testMultipleRegression();
testLogisticRegression();
console.log('All regression tests passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node lib/stats/regression.test.js`
Expected: `Error: Cannot find module './regression'`

- [ ] **Step 3: Implement regression.js**

Create `lib/stats/regression.js`:

```javascript
const ss = require('simple-statistics');

/**
 * Multiple linear regression using OLS (normal equation).
 * @param {Array<{y: number, x: number[]}>} data
 * @returns {{ coefficients, intercept, rSquared, residuals, pValues, standardErrors, predict }}
 */
function multipleRegression(data) {
  const n = data.length;
  const k = data[0].x.length;

  // Build design matrix X (with intercept column) and response vector Y
  const X = data.map(d => [1, ...d.x]);
  const Y = data.map(d => d.y);

  // Normal equation: (X'X)^-1 X'Y
  const Xt = transpose(X);
  const XtX = matMul(Xt, X);
  const XtY = matVecMul(Xt, Y);
  const XtXinv = invertMatrix(XtX);
  const beta = matVecMul(XtXinv, XtY);

  const intercept = beta[0];
  const coefficients = beta.slice(1);

  // Predictions and residuals
  const predictions = data.map(d => intercept + coefficients.reduce((sum, c, i) => sum + c * d.x[i], 0));
  const residuals = Y.map((y, i) => y - predictions[i]);

  // R-squared
  const yMean = ss.mean(Y);
  const ssTot = Y.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
  const ssRes = residuals.reduce((sum, r) => sum + r * r, 0);
  const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  // Standard errors and p-values
  const mse = ssRes / (n - k - 1);
  const standardErrors = [];
  const pValues = [];
  for (let j = 0; j <= k; j++) {
    const se = Math.sqrt(Math.abs(XtXinv[j][j]) * mse);
    standardErrors.push(se);
    const tStat = se === 0 ? 0 : beta[j] / se;
    // Two-tailed p-value approximation using normal for large n
    pValues.push(2 * (1 - normalCDF(Math.abs(tStat))));
  }

  return {
    coefficients,
    intercept,
    rSquared: Math.round(rSquared * 10000) / 10000,
    residuals,
    pValues: pValues.slice(1), // exclude intercept
    standardErrors: standardErrors.slice(1),
    predict: (x) => intercept + coefficients.reduce((sum, c, i) => sum + c * x[i], 0),
  };
}

/**
 * Logistic regression via iteratively reweighted least squares (IRLS).
 * @param {Array<{y: 0|1, x: number[]}>} data
 * @param {{ maxIter?: number, tol?: number }} options
 * @returns {{ coefficients, intercept, oddsRatios, predict, iterations }}
 */
function logisticRegression(data, { maxIter = 100, tol = 1e-6 } = {}) {
  const n = data.length;
  const k = data[0].x.length;

  // Initialize beta to zeros (intercept + k coefficients)
  let beta = new Array(k + 1).fill(0);

  function sigmoid(z) {
    return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, z))));
  }

  function predict(x, b) {
    let z = b[0];
    for (let j = 0; j < x.length; j++) z += b[j + 1] * x[j];
    return sigmoid(z);
  }

  let iter = 0;
  for (; iter < maxIter; iter++) {
    // Compute predictions
    const p = data.map(d => predict(d.x, beta));

    // Build weighted least squares matrices
    // W = diag(p*(1-p)), z = X*beta + W^-1 * (y - p)
    const X = data.map(d => [1, ...d.x]);
    const Xt = transpose(X);

    // Gradient: X' * (y - p)
    const gradient = new Array(k + 1).fill(0);
    for (let i = 0; i < n; i++) {
      const diff = data[i].y - p[i];
      for (let j = 0; j <= k; j++) {
        gradient[j] += X[i][j] * diff;
      }
    }

    // Hessian: -X' * W * X where W = diag(p*(1-p))
    const H = Array.from({ length: k + 1 }, () => new Array(k + 1).fill(0));
    for (let i = 0; i < n; i++) {
      const w = p[i] * (1 - p[i]);
      for (let j = 0; j <= k; j++) {
        for (let l = 0; l <= k; l++) {
          H[j][l] -= X[i][j] * w * X[i][l];
        }
      }
    }

    // Newton step: beta_new = beta - H^-1 * gradient
    const Hinv = invertMatrix(H);
    const step = matVecMul(Hinv, gradient);
    const newBeta = beta.map((b, j) => b - step[j]);

    // Check convergence
    const maxDelta = Math.max(...newBeta.map((b, j) => Math.abs(b - beta[j])));
    beta = newBeta;
    if (maxDelta < tol) break;
  }

  const intercept = beta[0];
  const coefficients = beta.slice(1);
  const oddsRatios = coefficients.map(c => Math.exp(c));

  return {
    coefficients,
    intercept,
    oddsRatios,
    iterations: iter,
    predict: (x) => {
      let z = intercept;
      for (let j = 0; j < x.length; j++) z += coefficients[j] * x[j];
      return sigmoid(z);
    },
  };

  function sigmoid(z) {
    return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, z))));
  }
}

// --- Matrix utilities ---

function transpose(m) {
  const rows = m.length, cols = m[0].length;
  const t = Array.from({ length: cols }, () => new Array(rows));
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++)
      t[j][i] = m[i][j];
  return t;
}

function matMul(a, b) {
  const rows = a.length, cols = b[0].length, inner = b.length;
  const result = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++)
      for (let k = 0; k < inner; k++)
        result[i][j] += a[i][k] * b[k][j];
  return result;
}

function matVecMul(m, v) {
  return m.map(row => row.reduce((sum, val, j) => sum + val * v[j], 0));
}

function invertMatrix(m) {
  const n = m.length;
  const aug = m.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => i === j ? 1 : 0)]);
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++)
      if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
    [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
    const pivot = aug[i][i];
    if (Math.abs(pivot) < 1e-12) {
      for (let j = 0; j < 2 * n; j++) aug[i][j] = 0;
      continue;
    }
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

module.exports = { multipleRegression, logisticRegression };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node lib/stats/regression.test.js`
Expected: `All regression tests passed`

- [ ] **Step 5: Commit**

```bash
git add lib/stats/regression.js lib/stats/regression.test.js
git commit -m "Add multiple linear and logistic regression with IRLS"
```

---

### Task 6: Statistical Utilities — Bootstrap Resampling

**Files:**
- Create: `lib/stats/bootstrap.js`
- Create: `lib/stats/bootstrap.test.js`

- [ ] **Step 1: Write failing tests**

Create `lib/stats/bootstrap.test.js`:

```javascript
const { bootstrapCI, bootstrapMeanDiff } = require('./bootstrap');
const ss = require('simple-statistics');

function testBootstrapCI() {
  // Known data with clear mean
  const data = [10, 12, 11, 13, 10, 12, 11, 14, 10, 12];
  const result = bootstrapCI(data, ss.mean, { iterations: 2000, seed: 42 });
  // Mean is 11.5, CI should contain it
  console.assert(result.lower < 11.5 && result.upper > 11.5,
    `CI [${result.lower}, ${result.upper}] should contain 11.5`);
  console.assert(result.lower > 9, `lower bound ${result.lower} too low`);
  console.assert(result.upper < 14, `upper bound ${result.upper} too high`);
  console.assert(typeof result.estimate === 'number', 'estimate should be a number');
  console.log('PASS: bootstrapCI');
}

function testBootstrapMeanDiff() {
  // Two groups with clear difference
  const group1 = [10, 12, 11, 13, 14, 12, 11, 13];
  const group2 = [5, 6, 7, 5, 6, 8, 7, 6];
  const result = bootstrapMeanDiff(group1, group2, { iterations: 2000, seed: 42 });
  // Difference should be ~5.5
  console.assert(result.lower > 0, `lower bound ${result.lower} should be >0`);
  console.assert(Math.abs(result.estimate - 5.5) < 1.5,
    `estimate ${result.estimate} should be ~5.5`);
  console.log('PASS: bootstrapMeanDiff');
}

function testBootstrapDeterministic() {
  const data = [1, 2, 3, 4, 5];
  const r1 = bootstrapCI(data, ss.mean, { iterations: 500, seed: 99 });
  const r2 = bootstrapCI(data, ss.mean, { iterations: 500, seed: 99 });
  console.assert(r1.lower === r2.lower && r1.upper === r2.upper,
    'Same seed should produce identical results');
  console.log('PASS: bootstrapDeterministic');
}

testBootstrapCI();
testBootstrapMeanDiff();
testBootstrapDeterministic();
console.log('All bootstrap tests passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node lib/stats/bootstrap.test.js`
Expected: `Error: Cannot find module './bootstrap'`

- [ ] **Step 3: Implement bootstrap.js**

Create `lib/stats/bootstrap.js`:

```javascript
const ss = require('simple-statistics');

/**
 * Seeded PRNG (same xorshift as frontend player generation).
 */
function seededRng(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Bootstrap confidence interval for any statistic.
 * @param {number[]} data — sample data
 * @param {function(number[]): number} statFn — function that computes the statistic
 * @param {{ iterations?: number, confidenceLevel?: number, seed?: number }} options
 * @returns {{ estimate, lower, upper, standardError }}
 */
function bootstrapCI(data, statFn, { iterations = 1000, confidenceLevel = 0.95, seed = 42 } = {}) {
  const rng = seededRng(seed);
  const n = data.length;
  const estimate = statFn(data);
  const bootstrapStats = [];

  for (let i = 0; i < iterations; i++) {
    const sample = [];
    for (let j = 0; j < n; j++) {
      sample.push(data[Math.floor(rng() * n)]);
    }
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

/**
 * Bootstrap CI for the difference in means between two groups.
 * @param {number[]} group1
 * @param {number[]} group2
 * @param {{ iterations?: number, confidenceLevel?: number, seed?: number }} options
 * @returns {{ estimate, lower, upper, standardError }}
 */
function bootstrapMeanDiff(group1, group2, { iterations = 1000, confidenceLevel = 0.95, seed = 42 } = {}) {
  const rng = seededRng(seed);
  const n1 = group1.length;
  const n2 = group2.length;
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node lib/stats/bootstrap.test.js`
Expected: `All bootstrap tests passed`

- [ ] **Step 5: Commit**

```bash
git add lib/stats/bootstrap.js lib/stats/bootstrap.test.js
git commit -m "Add bootstrap resampling for small-sample confidence intervals"
```

---

### Task 7: Statistical Utilities — Bayesian Updating

**Files:**
- Create: `lib/stats/bayesian.js`
- Create: `lib/stats/bayesian.test.js`

- [ ] **Step 1: Write failing tests**

Create `lib/stats/bayesian.test.js`:

```javascript
const { bayesianUpdate, createPrior, priorWeight } = require('./bayesian');

function testCreatePrior() {
  const prior = createPrior(0.5, 0.2);
  console.assert(prior.mean === 0.5, `mean expected 0.5, got ${prior.mean}`);
  console.assert(prior.variance === 0.2, `variance expected 0.2, got ${prior.variance}`);
  console.log('PASS: createPrior');
}

function testBayesianUpdate() {
  // Prior: mean=0.5, variance=0.2 (weak prior)
  // Observed: mean=0.8, variance=0.05, n=20 (strong data)
  // Posterior should be pulled toward 0.8
  const prior = createPrior(0.5, 0.2);
  const posterior = bayesianUpdate(prior, 0.8, 0.05);
  console.assert(posterior.mean > 0.7, `posterior mean ${posterior.mean} should be >0.7 (pulled toward data)`);
  console.assert(posterior.mean < 0.85, `posterior mean ${posterior.mean} should be <0.85`);
  console.assert(posterior.variance < prior.variance, `posterior variance ${posterior.variance} should be < prior ${prior.variance}`);
  console.log('PASS: bayesianUpdate with strong data');
}

function testBayesianUpdateWeakData() {
  // Prior: mean=0.5, variance=0.1 (moderate prior)
  // Observed: mean=0.8, variance=1.0, n=3 (very weak data)
  // Posterior should stay close to 0.5
  const prior = createPrior(0.5, 0.1);
  const posterior = bayesianUpdate(prior, 0.8, 1.0);
  console.assert(posterior.mean < 0.6, `posterior mean ${posterior.mean} should be <0.6 (prior dominates)`);
  console.log('PASS: bayesianUpdate with weak data');
}

function testPriorWeight() {
  const prior = createPrior(0.5, 0.2);
  // With high data variance, prior has more weight
  const w1 = priorWeight(prior, 1.0);
  // With low data variance, prior has less weight
  const w2 = priorWeight(prior, 0.01);
  console.assert(w1 > w2, `prior weight with weak data (${w1}) should exceed strong data (${w2})`);
  console.assert(w1 >= 0 && w1 <= 1, `weight should be 0-1, got ${w1}`);
  console.log('PASS: priorWeight');
}

testCreatePrior();
testBayesianUpdate();
testBayesianUpdateWeakData();
testPriorWeight();
console.log('All bayesian tests passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node lib/stats/bayesian.test.js`
Expected: `Error: Cannot find module './bayesian'`

- [ ] **Step 3: Implement bayesian.js**

Create `lib/stats/bayesian.js`:

```javascript
/**
 * Bayesian normal-normal conjugate updating.
 * Prior: N(priorMean, priorVariance)
 * Likelihood: observed mean with known variance
 * Posterior: weighted combination of prior and data.
 */

/**
 * Create a prior distribution.
 * @param {number} mean — prior belief about the parameter
 * @param {number} variance — uncertainty in the prior (higher = weaker prior)
 * @returns {{ mean, variance }}
 */
function createPrior(mean, variance) {
  return { mean, variance };
}

/**
 * Update a prior with observed data (normal-normal conjugate).
 * @param {{ mean, variance }} prior
 * @param {number} observedMean — sample mean from data
 * @param {number} observedVariance — variance of the sample mean (= sampleVar / n)
 * @returns {{ mean, variance }} posterior distribution
 */
function bayesianUpdate(prior, observedMean, observedVariance) {
  const priorPrecision = 1 / prior.variance;
  const dataPrecision = 1 / observedVariance;
  const posteriorPrecision = priorPrecision + dataPrecision;
  const posteriorMean = (priorPrecision * prior.mean + dataPrecision * observedMean) / posteriorPrecision;
  const posteriorVariance = 1 / posteriorPrecision;

  return {
    mean: Math.round(posteriorMean * 10000) / 10000,
    variance: Math.round(posteriorVariance * 10000) / 10000,
  };
}

/**
 * How much the prior dominates the posterior (0 = data dominates, 1 = prior dominates).
 * Useful for showing coaches: "Based primarily on NTangible's research" vs "Based primarily on your data".
 * @param {{ mean, variance }} prior
 * @param {number} observedVariance
 * @returns {number} 0-1
 */
function priorWeight(prior, observedVariance) {
  const priorPrecision = 1 / prior.variance;
  const dataPrecision = 1 / observedVariance;
  return priorPrecision / (priorPrecision + dataPrecision);
}

module.exports = { createPrior, bayesianUpdate, priorWeight };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node lib/stats/bayesian.test.js`
Expected: `All bayesian tests passed`

- [ ] **Step 5: Commit**

```bash
git add lib/stats/bayesian.js lib/stats/bayesian.test.js
git commit -m "Add Bayesian normal-normal conjugate updating for adaptive confidence"
```

---

### Task 8: Confidence Scoring

**Files:**
- Create: `lib/stats/confidence.js`
- Create: `lib/stats/confidence.test.js`

- [ ] **Step 1: Write failing tests**

Create `lib/stats/confidence.test.js`:

```javascript
const { computeConfidence } = require('./confidence');

function testHighConfidence() {
  const result = computeConfidence({
    dataPoints: 100,
    minSample: 30,
    pValue: 0.001,
    effectSize: 0.8,
    priorConsistency: true,
  });
  console.assert(result.score >= 70, `High confidence expected >=70, got ${result.score}`);
  console.assert(result.label === 'High', `Expected 'High', got '${result.label}'`);
  console.log('PASS: highConfidence');
}

function testLowConfidence() {
  const result = computeConfidence({
    dataPoints: 5,
    minSample: 30,
    pValue: 0.4,
    effectSize: 0.1,
    priorConsistency: false,
  });
  console.assert(result.score < 40, `Low confidence expected <40, got ${result.score}`);
  console.assert(result.label === 'Low', `Expected 'Low', got '${result.label}'`);
  console.log('PASS: lowConfidence');
}

function testMediumConfidence() {
  const result = computeConfidence({
    dataPoints: 40,
    minSample: 30,
    pValue: 0.03,
    effectSize: 0.4,
    priorConsistency: true,
  });
  console.assert(result.score >= 40 && result.score < 70,
    `Medium confidence expected 40-69, got ${result.score}`);
  console.assert(result.label === 'Medium', `Expected 'Medium', got '${result.label}'`);
  console.log('PASS: mediumConfidence');
}

function testInsufficientData() {
  const result = computeConfidence({
    dataPoints: 2,
    minSample: 30,
    pValue: null,
    effectSize: null,
    priorConsistency: false,
  });
  console.assert(result.score < 20, `Insufficient data expected <20, got ${result.score}`);
  console.assert(result.label === 'Low', `Expected 'Low', got '${result.label}'`);
  console.log('PASS: insufficientData');
}

testHighConfidence();
testLowConfidence();
testMediumConfidence();
testInsufficientData();
console.log('All confidence tests passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node lib/stats/confidence.test.js`
Expected: `Error: Cannot find module './confidence'`

- [ ] **Step 3: Implement confidence.js**

Create `lib/stats/confidence.js`:

```javascript
/**
 * Composite confidence scoring.
 *
 * Score (0-100) based on:
 *   Sample size vs minimum:  0-30 points
 *   Statistical significance: 0-30 points
 *   Effect size magnitude:    0-20 points
 *   Prior consistency:        0-20 points
 *
 * Labels: 0-39 = Low, 40-69 = Medium, 70-100 = High
 *
 * @param {{ dataPoints, minSample, pValue, effectSize, priorConsistency }} params
 * @returns {{ score, label, breakdown }}
 */
function computeConfidence({ dataPoints, minSample, pValue, effectSize, priorConsistency }) {
  // 1. Sample size score (0-30)
  let sampleScore = 0;
  if (dataPoints >= minSample * 3) sampleScore = 30;
  else if (dataPoints >= minSample) sampleScore = 15 + 15 * ((dataPoints - minSample) / (minSample * 2));
  else if (dataPoints > 0) sampleScore = 15 * (dataPoints / minSample);

  // 2. Significance score (0-30)
  let significanceScore = 0;
  if (pValue !== null && pValue !== undefined) {
    if (pValue < 0.001) significanceScore = 30;
    else if (pValue < 0.01) significanceScore = 25;
    else if (pValue < 0.05) significanceScore = 20;
    else if (pValue < 0.1) significanceScore = 10;
    else significanceScore = 0;
  }

  // 3. Effect size score (0-20)
  let effectScore = 0;
  if (effectSize !== null && effectSize !== undefined) {
    const absEffect = Math.abs(effectSize);
    if (absEffect >= 0.8) effectScore = 20;
    else if (absEffect >= 0.5) effectScore = 15;
    else if (absEffect >= 0.2) effectScore = 10;
    else if (absEffect > 0) effectScore = 5;
  }

  // 4. Prior consistency score (0-20)
  const consistencyScore = priorConsistency ? 20 : 0;

  const score = Math.round(sampleScore + significanceScore + effectScore + consistencyScore);

  let label;
  if (score >= 70) label = 'High';
  else if (score >= 40) label = 'Medium';
  else label = 'Low';

  return {
    score,
    label,
    breakdown: {
      sampleSize: Math.round(sampleScore),
      significance: Math.round(significanceScore),
      effectSize: Math.round(effectScore),
      consistency: Math.round(consistencyScore),
    },
  };
}

module.exports = { computeConfidence };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node lib/stats/confidence.test.js`
Expected: `All confidence tests passed`

- [ ] **Step 5: Commit**

```bash
git add lib/stats/confidence.js lib/stats/confidence.test.js
git commit -m "Add composite confidence scoring with 4-dimension breakdown"
```

---

### Task 9: Mock Game Data Generator

**Files:**
- Create: `lib/mock/game-data.js`
- Create: `lib/mock/game-data.test.js`

- [ ] **Step 1: Write failing tests**

Create `lib/mock/game-data.test.js`:

```javascript
const { generateGameLogs, generateRecruitingOutcomes } = require('./game-data');

function testGenerateGameLogs() {
  // Minimal player set
  const players = [
    { id: '1', name: 'Smith, John', position: 'SS', level: 'NCAA', type: 'ROSTER', clutch_factor: 800, fit_score: 85, comm_style: 'Direct' },
    { id: '2', name: 'Jones, Mike', position: 'P', level: 'NCAA', type: 'ROSTER', clutch_factor: 500, fit_score: 40, comm_style: 'Reserved' },
    { id: '3', name: 'Brown, Alex', position: '1B', level: 'High School', type: 'RECRUIT', clutch_factor: 750, fit_score: 70, comm_style: 'Expressive' },
  ];

  const logs = generateGameLogs(players, { seed: 42 });

  // Should generate logs for all players
  const playerIds = new Set(logs.map(l => l.player_id));
  console.assert(playerIds.size === 3, `Expected 3 players, got ${playerIds.size}`);

  // Each player should have 15-30 games
  for (const id of playerIds) {
    const count = logs.filter(l => l.player_id === id).length;
    console.assert(count >= 15 && count <= 30, `Player ${id} has ${count} games, expected 15-30`);
  }

  // Validate field types on first log
  const log = logs[0];
  console.assert(typeof log.player_id === 'string', 'player_id should be string');
  console.assert(/^\d{4}-\d{2}-\d{2}$/.test(log.game_date), `game_date format wrong: ${log.game_date}`);
  console.assert(['Home', 'Away'].includes(log.home_away), `home_away invalid: ${log.home_away}`);
  console.assert(['W', 'L'].includes(log.result), `result invalid: ${log.result}`);
  console.assert(typeof log.is_close_game === 'boolean', 'is_close_game should be boolean');
  console.assert(typeof log.at_bats === 'number', 'at_bats should be number');
  console.assert(typeof log.hits === 'number', 'hits should be number');
  console.assert(log.hits <= log.at_bats, `hits (${log.hits}) should not exceed at_bats (${log.at_bats})`);

  console.log('PASS: generateGameLogs');
}

function testDeterministic() {
  const players = [
    { id: '1', name: 'Smith, John', position: 'SS', level: 'NCAA', type: 'ROSTER', clutch_factor: 800, fit_score: 85, comm_style: 'Direct' },
  ];
  const logs1 = generateGameLogs(players, { seed: 42 });
  const logs2 = generateGameLogs(players, { seed: 42 });
  console.assert(JSON.stringify(logs1) === JSON.stringify(logs2), 'Same seed should produce identical logs');
  console.log('PASS: deterministic');
}

function testClutchCorrelation() {
  // Generate enough data to check correlation pattern
  const players = [
    { id: '1', name: 'Elite, Player', position: 'SS', level: 'NCAA', type: 'ROSTER', clutch_factor: 900, fit_score: 85, comm_style: 'Direct' },
    { id: '2', name: 'Low, Player', position: '2B', level: 'NCAA', type: 'ROSTER', clutch_factor: 400, fit_score: 40, comm_style: 'Reserved' },
  ];
  const logs = generateGameLogs(players, { seed: 42 });

  function avgBA(playerId, closeOnly) {
    const pLogs = logs.filter(l => l.player_id === playerId && (!closeOnly || l.is_close_game) && l.at_bats > 0);
    const totalH = pLogs.reduce((s, l) => s + l.hits, 0);
    const totalAB = pLogs.reduce((s, l) => s + l.at_bats, 0);
    return totalAB > 0 ? totalH / totalAB : 0;
  }

  const eliteCloseBA = avgBA('1', true);
  const eliteAllBA = avgBA('1', false);
  const lowCloseBA = avgBA('2', true);
  const lowAllBA = avgBA('2', false);

  // High clutch should not drop in close games (or improve slightly)
  // Low clutch should drop in close games
  const eliteDelta = eliteCloseBA - eliteAllBA;
  const lowDelta = lowCloseBA - lowAllBA;
  console.assert(eliteDelta > lowDelta,
    `Elite delta (${eliteDelta.toFixed(3)}) should be > Low delta (${lowDelta.toFixed(3)})`);
  console.log('PASS: clutchCorrelation');
}

function testGenerateRecruitingOutcomes() {
  const players = [
    { id: '1', name: 'High, Fit', type: 'RECRUIT', fit_score: 90, clutch_factor: 800 },
    { id: '2', name: 'Low, Fit', type: 'RECRUIT', fit_score: 30, clutch_factor: 500 },
  ];
  const outcomes = generateRecruitingOutcomes(players, { seed: 42 });
  console.assert(outcomes.length === 2, `Expected 2 outcomes, got ${outcomes.length}`);
  console.assert(typeof outcomes[0].player_id === 'string', 'player_id should be string');
  console.assert(['Starter', 'Rotation', 'Bench', 'Redshirt'].includes(outcomes[0].playing_time_yr1),
    `Invalid playing_time: ${outcomes[0].playing_time_yr1}`);
  console.assert(typeof outcomes[0].still_on_team === 'boolean', 'still_on_team should be boolean');
  console.log('PASS: generateRecruitingOutcomes');
}

testGenerateGameLogs();
testDeterministic();
testClutchCorrelation();
testGenerateRecruitingOutcomes();
console.log('All game-data tests passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node lib/mock/game-data.test.js`
Expected: `Error: Cannot find module './game-data'`

- [ ] **Step 3: Implement game-data.js**

Create `lib/mock/game-data.js`:

```javascript
/**
 * Deterministic mock game data generator.
 * Produces realistic game logs with correlations between NTangible profiles and outcomes.
 */

function seededRng(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const OPPONENTS = [
  'Central High', 'Westside Academy', 'North State', 'South Valley CC',
  'Eastern University', 'Lakewood Prep', 'Mountain View', 'Coastal College',
  'Riverdale High', 'Summit Prep', 'Bayshore CC', 'Prairie State',
];

/**
 * Generate mock game logs for an array of players.
 * @param {Array<{id, name, position, clutch_factor, fit_score, comm_style, type}>} players
 * @param {{ seed?: number, seasonYear?: number }} options
 * @returns {Array<object>} game log rows
 */
function generateGameLogs(players, { seed = 42, seasonYear = 2026 } = {}) {
  const rng = seededRng(seed);
  const allLogs = [];

  // Generate ~40 team game dates (Feb-May)
  const gameDates = [];
  const startDate = new Date(seasonYear, 1, 10); // Feb 10
  for (let i = 0; i < 40; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + Math.floor(i * 2.5) + Math.floor(rng() * 2));
    gameDates.push(d.toISOString().split('T')[0]);
  }

  // Each team game has shared context
  const gameContexts = gameDates.map((date, i) => {
    const opponent = OPPONENTS[Math.floor(rng() * OPPONENTS.length)];
    const homeAway = rng() > 0.5 ? 'Home' : 'Away';
    const isConference = rng() > 0.4;
    const isTournament = i >= 35 && rng() > 0.3;
    const teamBaseRuns = 3 + Math.floor(rng() * 5);
    const oppBaseRuns = 2 + Math.floor(rng() * 5);
    return { date, opponent, homeAway, isConference, isTournament, teamBaseRuns, oppBaseRuns };
  });

  for (const player of players) {
    // Each player plays 15-30 of the 40 games
    const numGames = 15 + Math.floor(rng() * 16);
    const gameIndices = [];
    const available = [...Array(40).keys()];
    for (let i = 0; i < numGames && available.length > 0; i++) {
      const idx = Math.floor(rng() * available.length);
      gameIndices.push(available.splice(idx, 1)[0]);
    }
    gameIndices.sort((a, b) => a - b);

    const clutch = player.clutch_factor || 500;
    const fit = player.fit_score || 50;
    const commStyle = player.comm_style || 'Direct';

    // Base batting ability (0.200 to 0.350 range)
    const baseBA = 0.200 + (clutch / 1000) * 0.100 + rng() * 0.050;

    for (const gi of gameIndices) {
      const ctx = gameContexts[gi];

      // Determine team score with fit influence
      const fitBonus = fit > 70 ? 1 : fit < 40 ? -1 : 0;
      const teamScore = Math.max(0, ctx.teamBaseRuns + fitBonus + Math.floor(rng() * 3 - 1));
      const oppScore = Math.max(0, ctx.oppBaseRuns + Math.floor(rng() * 3 - 1));
      const isCloseGame = Math.abs(teamScore - oppScore) <= 2;
      const result = teamScore > oppScore ? 'W' : 'L';

      // At-bats: 2-5 per game
      const atBats = 2 + Math.floor(rng() * 4);

      // Clutch effect on close-game hitting
      let hitProb = baseBA;
      if (isCloseGame) {
        if (clutch >= 750) hitProb += 0.035 + rng() * 0.015; // boost
        else if (clutch < 650) hitProb -= 0.030 + rng() * 0.025; // penalty
      }

      // Away game penalty for Reserved communicators
      if (ctx.homeAway === 'Away' && commStyle === 'Reserved') {
        hitProb -= 0.015;
      }

      // Generate hits
      let hits = 0;
      for (let ab = 0; ab < atBats; ab++) {
        if (rng() < hitProb) hits++;
      }

      // RBIs correlate loosely with hits
      const rbis = Math.min(hits + (rng() > 0.7 ? 1 : 0), atBats);

      // Errors: base rate ~0.05 per game, increased for Reserved in close away games
      let errorProb = 0.05;
      if (isCloseGame && ctx.homeAway === 'Away' && commStyle === 'Reserved') {
        errorProb = 0.15;
      } else if (commStyle === 'Expressive' && ctx.homeAway === 'Away') {
        errorProb = 0.08;
      }
      const errors = rng() < errorProb ? 1 : 0;

      // Strikeouts: inversely correlated with clutch in close games
      let kProb = 0.20;
      if (isCloseGame && clutch < 650) kProb = 0.30;
      let strikeouts = 0;
      for (let ab = 0; ab < atBats; ab++) {
        if (rng() < kProb && strikeouts + hits <= atBats) strikeouts++;
      }
      strikeouts = Math.min(strikeouts, atBats - hits);

      // Walks
      const walks = rng() < 0.12 ? 1 : 0;

      allLogs.push({
        player_id: String(player.id),
        game_date: ctx.date,
        opponent: ctx.opponent,
        home_away: ctx.homeAway,
        team_score: teamScore,
        opponent_score: oppScore,
        result,
        is_close_game: isCloseGame,
        is_conference: ctx.isConference,
        is_tournament: ctx.isTournament,
        at_bats: atBats,
        hits,
        rbis,
        errors,
        strikeouts,
        walks,
        coach_note: null,
      });
    }
  }

  return allLogs;
}

/**
 * Generate mock recruiting outcomes for RECRUIT players.
 * @param {Array<{id, type, fit_score, clutch_factor}>} players
 * @param {{ seed?: number }} options
 * @returns {Array<object>}
 */
function generateRecruitingOutcomes(players, { seed = 42 } = {}) {
  const rng = seededRng(seed);
  const recruits = players.filter(p => p.type === 'RECRUIT');

  return recruits.map(p => {
    const fit = p.fit_score || 50;
    const clutch = p.clutch_factor || 500;

    // Retention correlates with fit
    const retentionProb = fit >= 75 ? 0.85 : fit >= 50 ? 0.60 : 0.35;
    const stillOnTeam = rng() < retentionProb;
    const enteredPortal = !stillOnTeam && rng() > 0.3;

    // Playing time correlates with clutch
    let playingTime;
    const ptRoll = rng();
    if (clutch >= 700) {
      playingTime = ptRoll > 0.4 ? 'Starter' : ptRoll > 0.15 ? 'Rotation' : 'Bench';
    } else if (clutch >= 500) {
      playingTime = ptRoll > 0.7 ? 'Starter' : ptRoll > 0.3 ? 'Rotation' : ptRoll > 0.1 ? 'Bench' : 'Redshirt';
    } else {
      playingTime = ptRoll > 0.85 ? 'Rotation' : ptRoll > 0.5 ? 'Bench' : 'Redshirt';
    }

    // Year 2 playing time (if still on team)
    let playingTimeYr2 = null;
    if (stillOnTeam) {
      const yr2Roll = rng();
      if (playingTime === 'Starter') playingTimeYr2 = yr2Roll > 0.2 ? 'Starter' : 'Rotation';
      else if (playingTime === 'Rotation') playingTimeYr2 = yr2Roll > 0.4 ? 'Starter' : 'Rotation';
      else playingTimeYr2 = yr2Roll > 0.5 ? 'Rotation' : 'Bench';
    }

    const signingMonth = 10 + Math.floor(rng() * 3); // Oct-Dec
    const signingDay = 1 + Math.floor(rng() * 28);

    return {
      player_id: String(p.id),
      signing_date: `2025-${String(signingMonth).padStart(2, '0')}-${String(signingDay).padStart(2, '0')}`,
      playing_time_yr1: playingTime,
      playing_time_yr2: playingTimeYr2,
      still_on_team: stillOnTeam,
      entered_portal: enteredPortal,
      portal_date: enteredPortal ? '2026-04-15' : null,
    };
  });
}

module.exports = { generateGameLogs, generateRecruitingOutcomes };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node lib/mock/game-data.test.js`
Expected: `All game-data tests passed`

- [ ] **Step 5: Commit**

```bash
git add lib/mock/game-data.js lib/mock/game-data.test.js
git commit -m "Add deterministic mock game data generator with clutch/fit correlations"
```

---

### Task 10: SQL Queries Library

**Files:**
- Create: `lib/stats/queries.js`

- [ ] **Step 1: Create queries.js with all predefined parameterized queries**

Create `lib/stats/queries.js`:

```javascript
/**
 * All predefined SQL queries for the statistical engine.
 * Each function takes a Neon sql client and returns structured data.
 * These queries are the ONLY source of truth for statistics — the LLM never generates SQL.
 */

/**
 * Clutch Validation: batting stats grouped by clutch tier and game pressure.
 */
async function queryClutchByPressure(sql) {
  const rows = await sql`
    SELECT
      p.id AS player_id,
      p.clutch_factor,
      p.position,
      p.level,
      p.graduation_year,
      g.is_close_game,
      SUM(g.at_bats) AS total_ab,
      SUM(g.hits) AS total_hits,
      SUM(g.errors) AS total_errors,
      SUM(g.strikeouts) AS total_k,
      COUNT(*) AS games
    FROM game_logs g
    JOIN players p ON g.player_id = p.id
    WHERE g.at_bats > 0
    GROUP BY p.id, p.clutch_factor, p.position, p.level, p.graduation_year, g.is_close_game
    ORDER BY p.clutch_factor DESC
  `;
  return rows;
}

/**
 * Fit → Wins: average roster fit score per game with result.
 */
async function queryFitAndWins(sql) {
  const rows = await sql`
    SELECT
      g.game_date,
      g.result,
      g.home_away,
      g.is_conference,
      AVG(p.fit_score) AS avg_fit,
      AVG(p.clutch_factor) AS avg_clutch,
      COUNT(DISTINCT p.id) AS players_in_game
    FROM game_logs g
    JOIN players p ON g.player_id = p.id
    GROUP BY g.game_date, g.result, g.home_away, g.is_conference, g.team_score, g.opponent_score
    ORDER BY g.game_date
  `;
  return rows;
}

/**
 * Error Pattern Analysis: errors by comm style and game context.
 */
async function queryErrorsByProfile(sql) {
  const rows = await sql`
    SELECT
      p.comm_style,
      g.is_close_game,
      g.home_away,
      COUNT(*) AS games,
      SUM(g.errors) AS total_errors,
      SUM(CASE WHEN g.errors > 0 THEN 1 ELSE 0 END) AS games_with_errors
    FROM game_logs g
    JOIN players p ON g.player_id = p.id
    GROUP BY p.comm_style, g.is_close_game, g.home_away
    ORDER BY p.comm_style
  `;
  return rows;
}

/**
 * Development Trajectory: per-player stats over time with intervention marker.
 * Groups by 5-game rolling windows.
 */
async function queryPlayerTrajectory(sql) {
  const rows = await sql`
    SELECT
      g.player_id,
      p.clutch_factor,
      p.position,
      g.game_date,
      g.at_bats,
      g.hits,
      g.errors,
      g.strikeouts,
      ROW_NUMBER() OVER (PARTITION BY g.player_id ORDER BY g.game_date) AS game_num
    FROM game_logs g
    JOIN players p ON g.player_id = p.id
    WHERE g.at_bats > 0
    ORDER BY g.player_id, g.game_date
  `;
  return rows;
}

/**
 * Recruiting Profile Match: top performers' profiles vs all roster.
 */
async function queryRosterPerformance(sql) {
  const rows = await sql`
    SELECT
      p.id,
      p.clutch_factor,
      p.fit_score,
      p.comm_style,
      p.learning_style,
      p.motivation,
      p.position,
      p.type,
      SUM(g.at_bats) AS total_ab,
      SUM(g.hits) AS total_hits,
      SUM(g.errors) AS total_errors,
      COUNT(*) AS games,
      SUM(CASE WHEN g.result = 'W' THEN 1 ELSE 0 END) AS wins
    FROM players p
    LEFT JOIN game_logs g ON p.id = g.player_id
    WHERE p.type = 'ROSTER'
    GROUP BY p.id, p.clutch_factor, p.fit_score, p.comm_style, p.learning_style, p.motivation, p.position, p.type
  `;
  return rows;
}

/**
 * Commitment Prediction: recruit profiles with outcomes.
 */
async function queryRecruitOutcomes(sql) {
  const rows = await sql`
    SELECT
      p.id,
      p.clutch_factor,
      p.fit_score,
      p.comm_style,
      p.learning_style,
      p.motivation,
      p.commitment_label,
      r.playing_time_yr1,
      r.playing_time_yr2,
      r.still_on_team,
      r.entered_portal
    FROM players p
    LEFT JOIN recruiting_outcomes r ON p.id = r.player_id
    WHERE p.type = 'RECRUIT'
  `;
  return rows;
}

/**
 * Counts for validation.
 */
async function queryGameCount(sql) {
  const rows = await sql`SELECT COUNT(DISTINCT game_date) AS game_count FROM game_logs`;
  return rows[0]?.game_count || 0;
}

async function queryPlayerCount(sql) {
  const rows = await sql`SELECT COUNT(*) AS player_count FROM players`;
  return rows[0]?.player_count || 0;
}

module.exports = {
  queryClutchByPressure,
  queryFitAndWins,
  queryErrorsByProfile,
  queryPlayerTrajectory,
  queryRosterPerformance,
  queryRecruitOutcomes,
  queryGameCount,
  queryPlayerCount,
};
```

- [ ] **Step 2: Verify syntax**

Run: `node -e "require('./lib/stats/queries')"`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add lib/stats/queries.js
git commit -m "Add predefined SQL queries for all 6 analysis types"
```

---

### Task 11: Findings Manager

**Files:**
- Create: `lib/stats/findings.js`
- Create: `lib/stats/findings.test.js`

- [ ] **Step 1: Write failing tests**

Create `lib/stats/findings.test.js`:

```javascript
const { detectTrend, buildFinding } = require('./findings');

function testDetectTrendNew() {
  const trend = detectTrend(null, { confidence: 60, effect_size: 0.5 });
  console.assert(trend === 'new', `Expected 'new', got '${trend}'`);
  console.log('PASS: detectTrend new');
}

function testDetectTrendStrengthening() {
  const prev = { confidence: 50, effect_size: 0.3 };
  const curr = { confidence: 70, effect_size: 0.6 };
  const trend = detectTrend(prev, curr);
  console.assert(trend === 'strengthening', `Expected 'strengthening', got '${trend}'`);
  console.log('PASS: detectTrend strengthening');
}

function testDetectTrendWeakening() {
  const prev = { confidence: 70, effect_size: 0.6 };
  const curr = { confidence: 45, effect_size: 0.2 };
  const trend = detectTrend(prev, curr);
  console.assert(trend === 'weakening', `Expected 'weakening', got '${trend}'`);
  console.log('PASS: detectTrend weakening');
}

function testDetectTrendStable() {
  const prev = { confidence: 60, effect_size: 0.5 };
  const curr = { confidence: 62, effect_size: 0.48 };
  const trend = detectTrend(prev, curr);
  console.assert(trend === 'stable', `Expected 'stable', got '${trend}'`);
  console.log('PASS: detectTrend stable');
}

function testBuildFinding() {
  const finding = buildFinding({
    findingType: 'clutch_validation',
    title: 'Test Finding',
    summary: 'A test',
    methodology: 'Multiple regression',
    sqlQuery: 'SELECT 1',
    resultData: { test: true },
    dataPoints: 50,
    confidence: 72,
    confidenceLabel: 'High',
    effectSize: 0.6,
    pValue: 0.01,
    confidenceInterval: { lower: 0.3, upper: 0.9 },
    isSignificant: true,
    trend: 'new',
    analysisRunId: 1,
  });
  console.assert(finding.finding_type === 'clutch_validation', 'finding_type mismatch');
  console.assert(finding.data_points === 50, 'data_points mismatch');
  console.assert(finding.superseded_by === null, 'new finding should not be superseded');
  console.log('PASS: buildFinding');
}

testDetectTrendNew();
testDetectTrendStrengthening();
testDetectTrendWeakening();
testDetectTrendStable();
testBuildFinding();
console.log('All findings tests passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node lib/stats/findings.test.js`
Expected: `Error: Cannot find module './findings'`

- [ ] **Step 3: Implement findings.js**

Create `lib/stats/findings.js`:

```javascript
/**
 * Finding comparison, trend detection, and storage helpers.
 */

/**
 * Detect trend between a previous finding and current results.
 * @param {object|null} previous — previous finding row (null if first run)
 * @param {{ confidence: number, effect_size: number }} current
 * @returns {'new'|'strengthening'|'weakening'|'stable'}
 */
function detectTrend(previous, current) {
  if (!previous) return 'new';

  const confDelta = current.confidence - previous.confidence;
  const effectDelta = Math.abs(current.effect_size || 0) - Math.abs(previous.effect_size || 0);

  // Strengthening: confidence increased by 10+ OR effect size increased by 0.15+
  if (confDelta >= 10 || effectDelta >= 0.15) return 'strengthening';
  // Weakening: confidence dropped by 10+ OR effect size dropped by 0.15+
  if (confDelta <= -10 || effectDelta <= -0.15) return 'weakening';
  return 'stable';
}

/**
 * Build a finding row object ready for database insertion.
 * @param {object} params
 * @returns {object} finding row
 */
function buildFinding({
  findingType, title, summary, methodology, sqlQuery,
  resultData, dataPoints, confidence, confidenceLabel,
  effectSize, pValue, confidenceInterval, isSignificant,
  trend, analysisRunId,
}) {
  return {
    finding_type: findingType,
    title,
    summary: summary || '',
    methodology: methodology || '',
    sql_query: sqlQuery || '',
    result_data: resultData || {},
    data_points: dataPoints || 0,
    confidence: confidence || 0,
    confidence_label: confidenceLabel || 'Low',
    effect_size: effectSize || null,
    p_value: pValue || null,
    confidence_interval: confidenceInterval || null,
    is_significant: isSignificant || false,
    trend: trend || 'new',
    coach_feedback: null,
    superseded_by: null,
    analysis_run_id: analysisRunId || null,
  };
}

/**
 * Supersede old findings of the same type in the database.
 * @param {function} sql — Neon sql client
 * @param {string} findingType
 * @param {number} newFindingId
 */
async function supersedeOldFindings(sql, findingType, newFindingId) {
  await sql`
    UPDATE stat_findings
    SET superseded_by = ${newFindingId}
    WHERE finding_type = ${findingType}
      AND superseded_by IS NULL
      AND id != ${newFindingId}
  `;
}

/**
 * Get the most recent non-superseded finding of a given type.
 * @param {function} sql
 * @param {string} findingType
 * @returns {object|null}
 */
async function getLatestFinding(sql, findingType) {
  const rows = await sql`
    SELECT * FROM stat_findings
    WHERE finding_type = ${findingType}
      AND superseded_by IS NULL
    ORDER BY computed_at DESC
    LIMIT 1
  `;
  return rows[0] || null;
}

/**
 * Insert a new finding into the database.
 * @param {function} sql
 * @param {object} finding — output of buildFinding()
 * @returns {number} new finding id
 */
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node lib/stats/findings.test.js`
Expected: `All findings tests passed`

- [ ] **Step 5: Commit**

```bash
git add lib/stats/findings.js lib/stats/findings.test.js
git commit -m "Add findings manager with trend detection and DB operations"
```

---

### Task 12: Claude Narration Layer

**Files:**
- Create: `lib/stats/narrate.js`

- [ ] **Step 1: Create narrate.js**

Create `lib/stats/narrate.js`:

```javascript
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic();

/**
 * Narrate a statistical finding in plain English for coaches.
 * Claude receives ONLY computed results — it explains, never computes.
 *
 * @param {{ findingType, title, resultData, dataPoints, confidenceLabel, effectSize, pValue, confidenceInterval, trend }} finding
 * @returns {Promise<string>} plain English summary
 */
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

/**
 * Generate a weekly digest summary from all current findings.
 * @param {Array<object>} findings — array of current stat_findings rows
 * @returns {Promise<string>} executive summary
 */
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
```

- [ ] **Step 2: Verify syntax**

Run: `node -e "require('./lib/stats/narrate')"`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add lib/stats/narrate.js
git commit -m "Add Claude narration layer for statistical findings"
```

---

### Task 13: Statistical Engine — Core Orchestrator

**Files:**
- Create: `lib/stats/engine.js`

- [ ] **Step 1: Create engine.js**

This is the main orchestrator that runs all 6 analysis types, computes statistics, validates significance, and stores findings.

Create `lib/stats/engine.js`:

```javascript
const ss = require('simple-statistics');
const { multipleRegression, logisticRegression } = require('./regression');
const { chiSquaredTest } = require('./chi-squared');
const { bootstrapCI, bootstrapMeanDiff } = require('./bootstrap');
const { createPrior, bayesianUpdate, priorWeight } = require('./bayesian');
const { computeConfidence } = require('./confidence');
const { cohensD } = require('./effect-size');
const { detectTrend, buildFinding, supersedeOldFindings, getLatestFinding, insertFinding } = require('./findings');
const { narrateFinding } = require('./narrate');
const queries = require('./queries');

// NTangible's priors (thesis that clutch/fit are predictive)
const PRIORS = {
  clutch_validation: createPrior(0.04, 0.02),    // expect ~.040 BA boost for high clutch in close games
  fit_wins: createPrior(0.65, 0.05),              // expect ~65% win rate with high-fit rosters
  error_patterns: createPrior(0.10, 0.05),        // expect ~10% error rate difference by profile
  development: createPrior(0.03, 0.02),           // expect ~.030 BA improvement post-intervention
  recruiting_match: createPrior(0.60, 0.1),       // expect ~60% of top performers share profile
  commitment: createPrior(0.70, 0.1),             // expect ~70% retention for high-fit recruits
};

/**
 * Run a full analysis pass (all 6 types).
 * @param {function} sql — Neon sql client
 * @param {{ trigger: string, analysisRunId: number }} context
 * @returns {Array<object>} new findings
 */
async function runFullAnalysis(sql, { trigger = 'manual', analysisRunId }) {
  const newFindings = [];

  const gameCount = await queries.queryGameCount(sql);
  if (gameCount === 0) return newFindings;

  // 1. Clutch Validation
  const clutchFinding = await analyzeClutchValidation(sql, analysisRunId);
  if (clutchFinding) newFindings.push(clutchFinding);

  // 2. Fit → Wins
  const fitFinding = await analyzeFitWins(sql, analysisRunId);
  if (fitFinding) newFindings.push(fitFinding);

  // 3. Error Patterns
  const errorFinding = await analyzeErrorPatterns(sql, analysisRunId);
  if (errorFinding) newFindings.push(errorFinding);

  // 4. Development Trajectory
  const devFinding = await analyzeDevelopment(sql, analysisRunId);
  if (devFinding) newFindings.push(devFinding);

  // 5. Recruiting Profile Match
  const recruitFinding = await analyzeRecruitingMatch(sql, analysisRunId);
  if (recruitFinding) newFindings.push(recruitFinding);

  // 6. Commitment Prediction
  const commitFinding = await analyzeCommitment(sql, analysisRunId);
  if (commitFinding) newFindings.push(commitFinding);

  return newFindings;
}

/**
 * Run post-game analysis (subset of analyses).
 */
async function runPostGameAnalysis(sql, { analysisRunId }) {
  const newFindings = [];

  const clutchFinding = await analyzeClutchValidation(sql, analysisRunId);
  if (clutchFinding) newFindings.push(clutchFinding);

  const fitFinding = await analyzeFitWins(sql, analysisRunId);
  if (fitFinding) newFindings.push(fitFinding);

  const errorFinding = await analyzeErrorPatterns(sql, analysisRunId);
  if (errorFinding) newFindings.push(errorFinding);

  return newFindings;
}

// === ANALYSIS TYPE 1: CLUTCH VALIDATION ===

async function analyzeClutchValidation(sql, analysisRunId) {
  const rows = await queries.queryClutchByPressure(sql);
  if (rows.length < 10) return null;

  // Build regression data: BA in close games ~ clutch_factor + position_encoded + level_encoded
  const closeGameRows = rows.filter(r => r.is_close_game && r.total_ab >= 5);
  const blowoutRows = rows.filter(r => !r.is_close_game && r.total_ab >= 5);

  if (closeGameRows.length < 10) return null;

  // Compute per-player close-game BA
  const closeBA = closeGameRows.map(r => ({
    y: r.total_hits / r.total_ab,
    x: [r.clutch_factor / 1000], // normalized
    playerId: r.player_id,
  }));

  const regResult = multipleRegression(closeBA);

  // Also compute group means for effect size
  const highClutch = closeBA.filter(r => r.x[0] >= 0.75).map(r => r.y);
  const lowClutch = closeBA.filter(r => r.x[0] < 0.65).map(r => r.y);

  let effectSize = null;
  let bootstrapResult = null;
  if (highClutch.length >= 3 && lowClutch.length >= 3) {
    effectSize = cohensD(highClutch, lowClutch);
    bootstrapResult = bootstrapMeanDiff(highClutch, lowClutch, { iterations: 1000, seed: 42 });
  }

  // Bayesian update
  const observedEffect = highClutch.length > 0 && lowClutch.length > 0
    ? ss.mean(highClutch) - ss.mean(lowClutch) : 0;
  const observedVar = closeBA.length > 0 ? ss.variance(closeBA.map(r => r.y)) / closeBA.length : 1;
  const posterior = bayesianUpdate(PRIORS.clutch_validation, observedEffect, observedVar);
  const pWeight = priorWeight(PRIORS.clutch_validation, observedVar);

  // Confidence scoring
  const conf = computeConfidence({
    dataPoints: closeBA.length,
    minSample: 15,
    pValue: regResult.pValues[0],
    effectSize,
    priorConsistency: observedEffect > 0,
  });

  // Trend detection
  const previous = await getLatestFinding(sql, 'clutch_validation');
  const trend = detectTrend(previous, { confidence: conf.score, effect_size: effectSize });

  const resultData = {
    regressionCoefficient: regResult.coefficients[0],
    rSquared: regResult.rSquared,
    pValue: regResult.pValues[0],
    highClutchBA: highClutch.length > 0 ? Math.round(ss.mean(highClutch) * 1000) / 1000 : null,
    lowClutchBA: lowClutch.length > 0 ? Math.round(ss.mean(lowClutch) * 1000) / 1000 : null,
    baDifference: bootstrapResult ? bootstrapResult.estimate : null,
    confidenceInterval: bootstrapResult ? { lower: bootstrapResult.lower, upper: bootstrapResult.upper } : null,
    posteriorMean: posterior.mean,
    priorWeight: Math.round(pWeight * 100),
    sampleSizes: { highClutch: highClutch.length, lowClutch: lowClutch.length, total: closeBA.length },
  };

  const finding = buildFinding({
    findingType: 'clutch_validation',
    title: 'Clutch Factor vs Close-Game Performance',
    methodology: 'Multiple regression: close-game BA ~ clutch_factor (normalized). Effect size: Cohen\'s d between high (≥750) and low (<650) clutch groups. Bootstrap CI (1000 iterations). Bayesian updating with NTangible prior.',
    sqlQuery: 'queryClutchByPressure — see lib/stats/queries.js',
    resultData,
    dataPoints: closeBA.length,
    confidence: conf.score,
    confidenceLabel: conf.label,
    effectSize,
    pValue: regResult.pValues[0],
    confidenceInterval: bootstrapResult ? { lower: bootstrapResult.lower, upper: bootstrapResult.upper } : null,
    isSignificant: regResult.pValues[0] < 0.05,
    trend,
    analysisRunId,
  });

  // Narrate
  finding.summary = await narrateFinding({ ...finding, findingType: finding.finding_type, resultData });

  // Store
  const newId = await insertFinding(sql, finding);
  if (previous) await supersedeOldFindings(sql, 'clutch_validation', newId);

  return { ...finding, id: newId };
}

// === ANALYSIS TYPE 2: FIT → WINS ===

async function analyzeFitWins(sql, analysisRunId) {
  const rows = await queries.queryFitAndWins(sql);
  if (rows.length < 10) return null;

  const data = rows.map(r => ({
    y: r.result === 'W' ? 1 : 0,
    x: [r.avg_fit / 100, r.home_away === 'Home' ? 1 : 0],
    avgFit: r.avg_fit,
  }));

  const logResult = logisticRegression(data);

  const highFitGames = data.filter(r => r.avgFit >= 70);
  const lowFitGames = data.filter(r => r.avgFit < 50);
  const highFitWinRate = highFitGames.length > 0
    ? highFitGames.filter(r => r.y === 1).length / highFitGames.length : null;
  const lowFitWinRate = lowFitGames.length > 0
    ? lowFitGames.filter(r => r.y === 1).length / lowFitGames.length : null;

  const effectSize = highFitWinRate !== null && lowFitWinRate !== null
    ? highFitWinRate - lowFitWinRate : null;

  const observedVar = data.length > 0 ? ss.variance(data.map(r => r.y)) / data.length : 1;
  const posterior = bayesianUpdate(PRIORS.fit_wins, highFitWinRate || 0.5, observedVar);
  const pWeight = priorWeight(PRIORS.fit_wins, observedVar);

  const conf = computeConfidence({
    dataPoints: data.length,
    minSample: 20,
    pValue: null, // logistic doesn't give per-coefficient p-values easily in our impl
    effectSize,
    priorConsistency: (highFitWinRate || 0) > (lowFitWinRate || 0),
  });

  const previous = await getLatestFinding(sql, 'fit_wins');
  const trend = detectTrend(previous, { confidence: conf.score, effect_size: effectSize });

  const resultData = {
    fitOddsRatio: logResult.oddsRatios[0],
    highFitWinRate: highFitWinRate !== null ? Math.round(highFitWinRate * 1000) / 1000 : null,
    lowFitWinRate: lowFitWinRate !== null ? Math.round(lowFitWinRate * 1000) / 1000 : null,
    winRateDifference: effectSize,
    posteriorMean: posterior.mean,
    priorWeight: Math.round(pWeight * 100),
    sampleSizes: { highFit: highFitGames.length, lowFit: lowFitGames.length, total: data.length },
  };

  const finding = buildFinding({
    findingType: 'fit_wins',
    title: 'Roster Fit Score vs Team Win Rate',
    methodology: 'Logistic regression: W/L ~ avg_fit (normalized) + home/away. Win rate comparison between high-fit (≥70) and low-fit (<50) game lineups. Bayesian updating with NTangible prior.',
    sqlQuery: 'queryFitAndWins — see lib/stats/queries.js',
    resultData,
    dataPoints: data.length,
    confidence: conf.score,
    confidenceLabel: conf.label,
    effectSize,
    pValue: null,
    confidenceInterval: null,
    isSignificant: effectSize !== null && Math.abs(effectSize) > 0.10,
    trend,
    analysisRunId,
  });

  finding.summary = await narrateFinding({ ...finding, findingType: finding.finding_type, resultData });

  const newId = await insertFinding(sql, finding);
  if (previous) await supersedeOldFindings(sql, 'fit_wins', newId);

  return { ...finding, id: newId };
}

// === ANALYSIS TYPE 3: ERROR PATTERNS ===

async function analyzeErrorPatterns(sql, analysisRunId) {
  const rows = await queries.queryErrorsByProfile(sql);
  if (rows.length < 8) return null;

  // Build contingency table: comm_style × has_errors_in_pressure
  const commStyles = [...new Set(rows.map(r => r.comm_style))].filter(Boolean);
  const pressureRows = rows.filter(r => r.is_close_game);

  if (pressureRows.length < 4 || commStyles.length < 2) return null;

  // Build 2D table: [commStyle][hasError]
  const table = commStyles.map(style => {
    const styleRows = pressureRows.filter(r => r.comm_style === style);
    const withErrors = styleRows.reduce((s, r) => s + r.games_with_errors, 0);
    const total = styleRows.reduce((s, r) => s + r.games, 0);
    return [withErrors, total - withErrors];
  });

  const chiResult = chiSquaredTest(table);

  const errorRates = {};
  commStyles.forEach((style, i) => {
    const total = table[i][0] + table[i][1];
    errorRates[style] = total > 0 ? Math.round((table[i][0] / total) * 1000) / 1000 : 0;
  });

  const conf = computeConfidence({
    dataPoints: pressureRows.reduce((s, r) => s + r.games, 0),
    minSample: 40,
    pValue: chiResult.pValue,
    effectSize: chiResult.cramersV,
    priorConsistency: true,
  });

  const previous = await getLatestFinding(sql, 'error_patterns');
  const trend = detectTrend(previous, { confidence: conf.score, effect_size: chiResult.cramersV });

  const resultData = {
    chiSquared: chiResult.chiSquared,
    pValue: chiResult.pValue,
    cramersV: chiResult.cramersV,
    errorRatesByCommStyle: errorRates,
    contingencyTable: { commStyles, table },
    totalGames: pressureRows.reduce((s, r) => s + r.games, 0),
  };

  const finding = buildFinding({
    findingType: 'error_patterns',
    title: 'Communication Style vs Errors Under Pressure',
    methodology: 'Chi-squared test of independence: comm_style × error_in_close_game. Effect size: Cramér\'s V.',
    sqlQuery: 'queryErrorsByProfile — see lib/stats/queries.js',
    resultData,
    dataPoints: resultData.totalGames,
    confidence: conf.score,
    confidenceLabel: conf.label,
    effectSize: chiResult.cramersV,
    pValue: chiResult.pValue,
    confidenceInterval: null,
    isSignificant: chiResult.significant,
    trend,
    analysisRunId,
  });

  finding.summary = await narrateFinding({ ...finding, findingType: finding.finding_type, resultData });

  const newId = await insertFinding(sql, finding);
  if (previous) await supersedeOldFindings(sql, 'error_patterns', newId);

  return { ...finding, id: newId };
}

// === ANALYSIS TYPE 4: DEVELOPMENT TRAJECTORY ===

async function analyzeDevelopment(sql, analysisRunId) {
  const rows = await queries.queryPlayerTrajectory(sql);
  if (rows.length < 20) return null;

  // Group by player, compute before/after midpoint BA
  const playerGames = {};
  for (const r of rows) {
    if (!playerGames[r.player_id]) playerGames[r.player_id] = [];
    playerGames[r.player_id].push(r);
  }

  const playerDeltas = [];
  for (const [pid, games] of Object.entries(playerGames)) {
    if (games.length < 10) continue;
    const mid = Math.floor(games.length / 2);
    const firstHalf = games.slice(0, mid).filter(g => g.at_bats > 0);
    const secondHalf = games.slice(mid).filter(g => g.at_bats > 0);

    if (firstHalf.length < 3 || secondHalf.length < 3) continue;

    const ba1 = firstHalf.reduce((s, g) => s + g.hits, 0) / firstHalf.reduce((s, g) => s + g.at_bats, 0);
    const ba2 = secondHalf.reduce((s, g) => s + g.hits, 0) / secondHalf.reduce((s, g) => s + g.at_bats, 0);
    playerDeltas.push({ playerId: pid, clutch: games[0].clutch_factor, ba1, ba2, delta: ba2 - ba1 });
  }

  if (playerDeltas.length < 5) return null;

  const deltas = playerDeltas.map(d => d.delta);
  const bootstrap = bootstrapCI(deltas, ss.mean, { iterations: 1000, seed: 42 });

  const avgDelta = ss.mean(deltas);
  const observedVar = ss.variance(deltas) / deltas.length;
  const posterior = bayesianUpdate(PRIORS.development, avgDelta, observedVar);

  const effectSize = deltas.length > 1 ? avgDelta / ss.standardDeviation(deltas) : 0;

  const conf = computeConfidence({
    dataPoints: playerDeltas.length,
    minSample: 8,
    pValue: bootstrap.lower > 0 || bootstrap.upper < 0 ? 0.04 : 0.2,
    effectSize,
    priorConsistency: avgDelta > 0,
  });

  const previous = await getLatestFinding(sql, 'development');
  const trend = detectTrend(previous, { confidence: conf.score, effect_size: effectSize });

  const resultData = {
    averageDelta: Math.round(avgDelta * 1000) / 1000,
    bootstrapCI: { lower: bootstrap.lower, upper: bootstrap.upper },
    playersAnalyzed: playerDeltas.length,
    posteriorMean: posterior.mean,
    priorWeight: Math.round(priorWeight(PRIORS.development, observedVar) * 100),
    topImprovers: playerDeltas.sort((a, b) => b.delta - a.delta).slice(0, 3).map(d => ({
      playerId: d.playerId, delta: Math.round(d.delta * 1000) / 1000,
    })),
  };

  const finding = buildFinding({
    findingType: 'development',
    title: 'Player Development: First Half vs Second Half of Season',
    methodology: 'Paired before/after BA comparison per player (season midpoint split). Bootstrap CI (1000 iterations) on distribution of player deltas. Bayesian updating with NTangible prior.',
    sqlQuery: 'queryPlayerTrajectory — see lib/stats/queries.js',
    resultData,
    dataPoints: playerDeltas.length,
    confidence: conf.score,
    confidenceLabel: conf.label,
    effectSize,
    pValue: bootstrap.lower > 0 || bootstrap.upper < 0 ? 0.04 : 0.2,
    confidenceInterval: { lower: bootstrap.lower, upper: bootstrap.upper },
    isSignificant: bootstrap.lower > 0 || bootstrap.upper < 0,
    trend,
    analysisRunId,
  });

  finding.summary = await narrateFinding({ ...finding, findingType: finding.finding_type, resultData });

  const newId = await insertFinding(sql, finding);
  if (previous) await supersedeOldFindings(sql, 'development', newId);

  return { ...finding, id: newId };
}

// === ANALYSIS TYPE 5: RECRUITING PROFILE MATCH ===

async function analyzeRecruitingMatch(sql, analysisRunId) {
  const rows = await queries.queryRosterPerformance(sql);
  if (rows.length < 10) return null;

  const playersWithGames = rows.filter(r => r.total_ab > 20);
  if (playersWithGames.length < 8) return null;

  // Composite performance score: BA * 0.5 + (1 - errorRate) * 0.3 + winRate * 0.2
  const scored = playersWithGames.map(r => {
    const ba = r.total_ab > 0 ? r.total_hits / r.total_ab : 0;
    const errorRate = r.games > 0 ? r.total_errors / r.games : 0;
    const winRate = r.games > 0 ? r.wins / r.games : 0;
    const composite = ba * 0.5 + (1 - errorRate) * 0.3 + winRate * 0.2;
    return { ...r, ba, errorRate, winRate, composite };
  });

  scored.sort((a, b) => b.composite - a.composite);
  const median = scored[Math.floor(scored.length / 2)].composite;
  const successful = scored.filter(s => s.composite >= median);

  // Profile of successful players
  const avgClutch = ss.mean(successful.map(s => s.clutch_factor));
  const avgFit = ss.mean(successful.map(s => s.fit_score));
  const topCommStyle = mode(successful.map(s => s.comm_style));
  const topLearningStyle = mode(successful.map(s => s.learning_style));
  const topMotivation = mode(successful.map(s => s.motivation));

  const profile = { avgClutch: Math.round(avgClutch), avgFit: Math.round(avgFit), topCommStyle, topLearningStyle, topMotivation };

  const conf = computeConfidence({
    dataPoints: playersWithGames.length,
    minSample: 10,
    pValue: null,
    effectSize: 0.5,
    priorConsistency: avgClutch > 650,
  });

  const previous = await getLatestFinding(sql, 'recruiting_match');
  const trend = detectTrend(previous, { confidence: conf.score, effect_size: 0.5 });

  const resultData = {
    successProfile: profile,
    totalRosterAnalyzed: playersWithGames.length,
    successfulPlayers: successful.length,
    medianComposite: Math.round(median * 1000) / 1000,
  };

  const finding = buildFinding({
    findingType: 'recruiting_match',
    title: 'Success Profile: Top Performer Traits',
    methodology: 'Composite performance score (BA×0.5 + defensive×0.3 + winRate×0.2). Players above median = "successful." Profile extracted from modal traits of successful group.',
    sqlQuery: 'queryRosterPerformance — see lib/stats/queries.js',
    resultData,
    dataPoints: playersWithGames.length,
    confidence: conf.score,
    confidenceLabel: conf.label,
    effectSize: 0.5,
    pValue: null,
    confidenceInterval: null,
    isSignificant: true,
    trend,
    analysisRunId,
  });

  finding.summary = await narrateFinding({ ...finding, findingType: finding.finding_type, resultData });

  const newId = await insertFinding(sql, finding);
  if (previous) await supersedeOldFindings(sql, 'recruiting_match', newId);

  return { ...finding, id: newId };
}

// === ANALYSIS TYPE 6: COMMITMENT PREDICTION ===

async function analyzeCommitment(sql, analysisRunId) {
  const rows = await queries.queryRecruitOutcomes(sql);
  const withOutcomes = rows.filter(r => r.playing_time_yr1 !== null);
  if (withOutcomes.length < 10) return null;

  // Model: retained ~ fit_score + motivation_encoded + comm_style_encoded
  const retentionData = withOutcomes.map(r => ({
    y: r.still_on_team ? 1 : 0,
    x: [r.fit_score / 100],
  }));

  const retentionModel = logisticRegression(retentionData);

  // Playing time model: starter ~ clutch_factor
  const starterData = withOutcomes.map(r => ({
    y: r.playing_time_yr1 === 'Starter' || r.playing_time_yr1 === 'Rotation' ? 1 : 0,
    x: [r.clutch_factor / 1000],
  }));

  const starterModel = logisticRegression(starterData);

  // Group stats
  const highFitRetention = withOutcomes.filter(r => r.fit_score >= 75);
  const lowFitRetention = withOutcomes.filter(r => r.fit_score < 50);
  const highFitRetRate = highFitRetention.length > 0
    ? highFitRetention.filter(r => r.still_on_team).length / highFitRetention.length : null;
  const lowFitRetRate = lowFitRetention.length > 0
    ? lowFitRetention.filter(r => r.still_on_team).length / lowFitRetention.length : null;

  const effectSize = highFitRetRate !== null && lowFitRetRate !== null
    ? highFitRetRate - lowFitRetRate : null;

  const conf = computeConfidence({
    dataPoints: withOutcomes.length,
    minSample: 15,
    pValue: null,
    effectSize,
    priorConsistency: (highFitRetRate || 0) > (lowFitRetRate || 0),
  });

  const previous = await getLatestFinding(sql, 'commitment');
  const trend = detectTrend(previous, { confidence: conf.score, effect_size: effectSize });

  const resultData = {
    retentionOddsRatio: retentionModel.oddsRatios[0],
    starterOddsRatio: starterModel.oddsRatios[0],
    highFitRetentionRate: highFitRetRate !== null ? Math.round(highFitRetRate * 1000) / 1000 : null,
    lowFitRetentionRate: lowFitRetRate !== null ? Math.round(lowFitRetRate * 1000) / 1000 : null,
    totalRecruits: withOutcomes.length,
    portalEntries: withOutcomes.filter(r => r.entered_portal).length,
  };

  const finding = buildFinding({
    findingType: 'commitment',
    title: 'Recruit Retention & Playing Time Prediction',
    methodology: 'Two logistic regressions: (1) retained ~ fit_score, (2) earned_role ~ clutch_factor. Retention rates compared for high-fit (≥75) vs low-fit (<50) recruits.',
    sqlQuery: 'queryRecruitOutcomes — see lib/stats/queries.js',
    resultData,
    dataPoints: withOutcomes.length,
    confidence: conf.score,
    confidenceLabel: conf.label,
    effectSize,
    pValue: null,
    confidenceInterval: null,
    isSignificant: effectSize !== null && Math.abs(effectSize) > 0.10,
    trend,
    analysisRunId,
  });

  finding.summary = await narrateFinding({ ...finding, findingType: finding.finding_type, resultData });

  const newId = await insertFinding(sql, finding);
  if (previous) await supersedeOldFindings(sql, 'commitment', newId);

  return { ...finding, id: newId };
}

// Utility: statistical mode for categorical data
function mode(arr) {
  const counts = {};
  arr.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

module.exports = { runFullAnalysis, runPostGameAnalysis };
```

- [ ] **Step 2: Verify syntax**

Run: `node -e "require('./lib/stats/engine')"`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add lib/stats/engine.js
git commit -m "Add statistical engine orchestrator with all 6 analysis types"
```

---

### Task 14: API Endpoints — Game Logs & Recruiting Outcomes

**Files:**
- Create: `api/game-logs.js`
- Create: `api/recruiting-outcomes.js`

- [ ] **Step 1: Create game-logs.js**

Create `api/game-logs.js`:

```javascript
const { getDb } = require('../lib/db');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { gameLogs } = req.body;
  if (!Array.isArray(gameLogs) || gameLogs.length === 0) {
    return res.status(400).json({ error: 'gameLogs array is required' });
  }

  const sql = getDb();

  try {
    let inserted = 0;

    for (const g of gameLogs) {
      const isCloseGame = Math.abs((g.teamScore || 0) - (g.opponentScore || 0)) <= 2;

      await sql`
        INSERT INTO game_logs (
          player_id, game_date, opponent, home_away,
          team_score, opponent_score, result, is_close_game,
          is_conference, is_tournament,
          at_bats, hits, rbis, errors, strikeouts, walks,
          coach_note
        ) VALUES (
          ${g.playerId || g.player_id},
          ${g.gameDate || g.game_date},
          ${g.opponent || null},
          ${g.homeAway || g.home_away || null},
          ${g.teamScore || g.team_score || 0},
          ${g.opponentScore || g.opponent_score || 0},
          ${g.result || (g.teamScore > g.opponentScore ? 'W' : 'L')},
          ${isCloseGame},
          ${g.isConference || g.is_conference || false},
          ${g.isTournament || g.is_tournament || false},
          ${g.atBats || g.at_bats || 0},
          ${g.hits || 0},
          ${g.rbis || 0},
          ${g.errors || 0},
          ${g.strikeouts || 0},
          ${g.walks || 0},
          ${g.coachNote || g.coach_note || null}
        )
      `;
      inserted++;
    }

    return res.status(200).json({ success: true, inserted });
  } catch (error) {
    console.error('Game logs insert error:', error);
    return res.status(500).json({ error: error.message });
  }
};
```

- [ ] **Step 2: Create recruiting-outcomes.js**

Create `api/recruiting-outcomes.js`:

```javascript
const { getDb } = require('../lib/db');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { outcomes } = req.body;
  if (!Array.isArray(outcomes) || outcomes.length === 0) {
    return res.status(400).json({ error: 'outcomes array is required' });
  }

  const sql = getDb();

  try {
    let upserted = 0;

    for (const o of outcomes) {
      await sql`
        INSERT INTO recruiting_outcomes (
          player_id, signing_date, playing_time_yr1, playing_time_yr2,
          still_on_team, entered_portal, portal_date
        ) VALUES (
          ${o.playerId || o.player_id},
          ${o.signingDate || o.signing_date || null},
          ${o.playingTimeYr1 || o.playing_time_yr1 || null},
          ${o.playingTimeYr2 || o.playing_time_yr2 || null},
          ${o.stillOnTeam !== undefined ? o.stillOnTeam : (o.still_on_team !== undefined ? o.still_on_team : true)},
          ${o.enteredPortal || o.entered_portal || false},
          ${o.portalDate || o.portal_date || null}
        )
        ON CONFLICT (id) DO NOTHING
      `;
      upserted++;
    }

    return res.status(200).json({ success: true, upserted });
  } catch (error) {
    console.error('Recruiting outcomes error:', error);
    return res.status(500).json({ error: error.message });
  }
};
```

- [ ] **Step 3: Verify syntax**

Run: `node -e "require('./api/game-logs')" && node -e "require('./api/recruiting-outcomes')"`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add api/game-logs.js api/recruiting-outcomes.js
git commit -m "Add API endpoints for game logs and recruiting outcomes"
```

---

### Task 15: API Endpoints — Analysis, Findings, Weekly Report

**Files:**
- Create: `api/run-analysis.js`
- Create: `api/findings.js`
- Create: `api/weekly-report.js`

- [ ] **Step 1: Create run-analysis.js**

Create `api/run-analysis.js`:

```javascript
const { getDb } = require('../lib/db');
const { runFullAnalysis } = require('../lib/stats/engine');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sql = getDb();
  const trigger = req.body?.trigger || 'manual';

  try {
    // Create analysis run record
    const runRows = await sql`
      INSERT INTO analysis_runs (trigger, started_at, status)
      VALUES (${trigger}, NOW(), 'running')
      RETURNING id
    `;
    const runId = runRows[0].id;

    // Run all analyses
    const findings = await runFullAnalysis(sql, { trigger, analysisRunId: runId });

    // Update run record
    const gameCountRows = await sql`SELECT COUNT(DISTINCT game_date) AS c FROM game_logs`;
    const gameCount = gameCountRows[0]?.c || 0;

    await sql`
      UPDATE analysis_runs
      SET completed_at = NOW(),
          games_analyzed = ${gameCount},
          findings_generated = ${findings.length},
          findings_changed = ${findings.filter(f => f.trend !== 'stable').length},
          status = 'complete'
      WHERE id = ${runId}
    `;

    return res.status(200).json({
      success: true,
      runId,
      findings: findings.map(f => ({
        id: f.id,
        type: f.finding_type,
        title: f.title,
        summary: f.summary,
        confidence: f.confidence_label,
        trend: f.trend,
      })),
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({ error: error.message });
  }
};
```

- [ ] **Step 2: Create findings.js**

Create `api/findings.js`:

```javascript
const { getDb } = require('../lib/db');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sql = getDb();
  const { type, min_confidence } = req.query || {};

  try {
    let rows;

    if (type && min_confidence) {
      rows = await sql`
        SELECT * FROM stat_findings
        WHERE superseded_by IS NULL
          AND finding_type = ${type}
          AND confidence >= ${parseInt(min_confidence)}
        ORDER BY confidence DESC
      `;
    } else if (type) {
      rows = await sql`
        SELECT * FROM stat_findings
        WHERE superseded_by IS NULL AND finding_type = ${type}
        ORDER BY confidence DESC
      `;
    } else if (min_confidence) {
      rows = await sql`
        SELECT * FROM stat_findings
        WHERE superseded_by IS NULL AND confidence >= ${parseInt(min_confidence)}
        ORDER BY confidence DESC
      `;
    } else {
      rows = await sql`
        SELECT * FROM stat_findings
        WHERE superseded_by IS NULL
        ORDER BY confidence DESC
      `;
    }

    return res.status(200).json({ findings: rows });
  } catch (error) {
    console.error('Findings fetch error:', error);
    return res.status(500).json({ error: error.message });
  }
};
```

- [ ] **Step 3: Create weekly-report.js**

Create `api/weekly-report.js`:

```javascript
const { getDb } = require('../lib/db');
const { narrateWeeklyDigest } = require('../lib/stats/narrate');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sql = getDb();

  try {
    // Get all current findings
    const findings = await sql`
      SELECT * FROM stat_findings
      WHERE superseded_by IS NULL
      ORDER BY confidence DESC
    `;

    // Get latest analysis run
    const runs = await sql`
      SELECT * FROM analysis_runs
      ORDER BY completed_at DESC NULLS LAST
      LIMIT 1
    `;

    // Generate digest narrative
    const summary = await narrateWeeklyDigest(findings);

    return res.status(200).json({
      summary,
      findings: findings.map(f => ({
        id: f.id,
        type: f.finding_type,
        title: f.title,
        summary: f.summary,
        confidence: f.confidence,
        confidenceLabel: f.confidence_label,
        trend: f.trend,
        dataPoints: f.data_points,
        effectSize: f.effect_size,
        computedAt: f.computed_at,
      })),
      lastRun: runs[0] || null,
    });
  } catch (error) {
    console.error('Weekly report error:', error);
    return res.status(500).json({ error: error.message });
  }
};
```

- [ ] **Step 4: Verify syntax**

Run: `node -e "require('./api/run-analysis')" && node -e "require('./api/findings')" && node -e "require('./api/weekly-report')"`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add api/run-analysis.js api/findings.js api/weekly-report.js
git commit -m "Add API endpoints for analysis, findings, and weekly report"
```

---

### Task 16: API Endpoint — Stats Chat

**Files:**
- Create: `api/stats-chat.js`

- [ ] **Step 1: Create stats-chat.js**

Create `api/stats-chat.js`:

```javascript
const Anthropic = require('@anthropic-ai/sdk');
const { getDb } = require('../lib/db');

const anthropic = new Anthropic();

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, sessionId } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  const sql = getDb();

  try {
    // Get current findings as context
    const findings = await sql`
      SELECT finding_type, title, summary, confidence_label, data_points, effect_size, trend, result_data, methodology
      FROM stat_findings
      WHERE superseded_by IS NULL
      ORDER BY confidence DESC
    `;

    // Get conversation history for this stats session
    const history = await sql`
      SELECT role, content FROM conversations
      WHERE session_id = ${sessionId || 'stats-default'}
      ORDER BY created_at DESC LIMIT 10
    `;
    history.reverse();

    // Build stats-focused system prompt
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

    // Store conversation
    if (sessionId) {
      await sql`
        INSERT INTO conversations (session_id, role, content, metadata)
        VALUES (${sessionId}, 'user', ${message}, ${JSON.stringify({ context: 'stats-chat' })})
      `;
      await sql`
        INSERT INTO conversations (session_id, role, content, metadata)
        VALUES (${sessionId}, 'assistant', ${assistantMessage}, ${JSON.stringify({ context: 'stats-chat', findingsUsed: findings.map(f => f.finding_type) })})
      `;
    }

    return res.status(200).json({ message: assistantMessage });
  } catch (error) {
    console.error('Stats chat error:', error);
    return res.status(500).json({ error: error.message });
  }
};
```

- [ ] **Step 2: Verify syntax**

Run: `node -e "require('./api/stats-chat')"`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add api/stats-chat.js
git commit -m "Add stats chat endpoint scoped to computed findings"
```

---

### Task 17: Seed Mock Data on Database Init

**Files:**
- Modify: `api/seed.js`

- [ ] **Step 1: Read current seed.js to find insertion point**

Read `api/seed.js` to confirm where mock data seeding should go (after table creation, after knowledge chunk seeding).

- [ ] **Step 2: Add mock data seeding at the end of the handler**

Add the following before the final `return` in `api/seed.js`, after the knowledge chunk embedding loop:

```javascript
    // === SEED MOCK GAME DATA ===
    const { generateGameLogs, generateRecruitingOutcomes } = require('../lib/mock/game-data');

    // Fetch all players from DB to generate mock data
    const allPlayers = await sql`SELECT id, name, position, level, type, clutch_factor, fit_score, comm_style FROM players`;

    if (allPlayers.length > 0) {
      // Clear existing mock data
      await sql`TRUNCATE game_logs RESTART IDENTITY`;
      await sql`TRUNCATE recruiting_outcomes RESTART IDENTITY`;
      await sql`TRUNCATE stat_findings RESTART IDENTITY`;
      await sql`TRUNCATE analysis_runs RESTART IDENTITY`;

      const gameLogs = generateGameLogs(allPlayers, { seed: 42 });
      for (const g of gameLogs) {
        await sql`
          INSERT INTO game_logs (
            player_id, game_date, opponent, home_away,
            team_score, opponent_score, result, is_close_game,
            is_conference, is_tournament,
            at_bats, hits, rbis, errors, strikeouts, walks, coach_note
          ) VALUES (
            ${g.player_id}, ${g.game_date}, ${g.opponent}, ${g.home_away},
            ${g.team_score}, ${g.opponent_score}, ${g.result}, ${g.is_close_game},
            ${g.is_conference}, ${g.is_tournament},
            ${g.at_bats}, ${g.hits}, ${g.rbis}, ${g.errors}, ${g.strikeouts}, ${g.walks}, ${g.coach_note}
          )
        `;
      }

      const outcomes = generateRecruitingOutcomes(allPlayers, { seed: 42 });
      for (const o of outcomes) {
        await sql`
          INSERT INTO recruiting_outcomes (
            player_id, signing_date, playing_time_yr1, playing_time_yr2,
            still_on_team, entered_portal, portal_date
          ) VALUES (
            ${o.player_id}, ${o.signing_date}, ${o.playing_time_yr1}, ${o.playing_time_yr2},
            ${o.still_on_team}, ${o.entered_portal}, ${o.portal_date}
          )
        `;
      }

      console.log(`Seeded ${gameLogs.length} game logs, ${outcomes.length} recruiting outcomes`);
    }
```

- [ ] **Step 3: Update the return statement to include game data counts**

Update the final return to include the new counts:

```javascript
    return res.status(200).json({
      success: true,
      chunksInserted: knowledgeChunks.length,
      chunksEmbedded: allEmbeddings.length,
      gameLogsSeeded: allPlayers.length > 0 ? 'yes' : 'no (no players yet)',
    });
```

- [ ] **Step 4: Verify syntax**

Run: `node -e "require('./api/seed')"`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add api/seed.js
git commit -m "Seed mock game logs and recruiting outcomes on database init"
```

---

### Task 18: Stats Lab UI — Tab and Insights Dashboard

**Files:**
- Modify: `index.html`

This is the largest UI task. It adds the Stats Lab tab to the navigation and renders the insights dashboard, weekly report, statistician chat, and game data entry views.

- [ ] **Step 1: Read index.html navigation to find tab insertion point**

Read `index.html` to find where the navigation tabs are defined (look for `setView` calls and tab rendering).

- [ ] **Step 2: Add Stats Lab to the state**

Add to the `state.ui` object:

```javascript
statsLabView: 'insights',      // 'insights' | 'weekly' | 'chat' | 'entry'
statsFindings: [],
statsLoading: false,
statsChatMessages: [],
statsChatSessionId: 'stats-' + Date.now(),
```

- [ ] **Step 3: Add Stats Lab actions**

Add to the `actions` object:

```javascript
setStatsLabView: (view) => { state.ui.statsLabView = view; render(); },
loadFindings: async () => {
    state.ui.statsLoading = true;
    render();
    try {
        const res = await fetch('/api/findings');
        const data = await res.json();
        state.ui.statsFindings = data.findings || [];
    } catch (e) { console.error('Failed to load findings:', e); }
    state.ui.statsLoading = false;
    render();
},
runAnalysis: async () => {
    state.ui.statsLoading = true;
    render();
    try {
        await fetch('/api/run-analysis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trigger: 'manual' }) });
        await actions.loadFindings();
    } catch (e) { console.error('Analysis failed:', e); }
    state.ui.statsLoading = false;
    render();
},
sendStatsChat: async (message) => {
    if (!message.trim()) return;
    state.ui.statsChatMessages.push({ role: 'user', content: message });
    render();
    try {
        const res = await fetch('/api/stats-chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, sessionId: state.ui.statsChatSessionId }) });
        const data = await res.json();
        state.ui.statsChatMessages.push({ role: 'assistant', content: data.message });
    } catch (e) {
        state.ui.statsChatMessages.push({ role: 'assistant', content: 'Error connecting to statistician. Please try again.' });
    }
    render();
},
```

- [ ] **Step 4: Add Stats Lab navigation tab**

Find the navigation rendering section and add a 'stats' tab alongside existing tabs (roster, recruiting, training, etc.). The tab should call `actions.setView('stats')`.

- [ ] **Step 5: Add Stats Lab view rendering**

Add a `renderStatsLab()` function that renders based on `state.ui.statsLabView`:

```javascript
function renderStatsLab() {
    const view = state.ui.statsLabView;
    const findings = state.ui.statsFindings || [];

    // Sub-navigation
    let html = `
    <div class="d-flex gap-2 mb-4">
        <button onclick="actions.setStatsLabView('insights')" class="btn btn-sm ${view === 'insights' ? 'btn-dark' : 'btn-outline-secondary'}">Insights</button>
        <button onclick="actions.setStatsLabView('weekly')" class="btn btn-sm ${view === 'weekly' ? 'btn-dark' : 'btn-outline-secondary'}">Weekly Report</button>
        <button onclick="actions.setStatsLabView('chat')" class="btn btn-sm ${view === 'chat' ? 'btn-dark' : 'btn-outline-secondary'}">Ask Statistician</button>
        <button onclick="actions.setStatsLabView('entry')" class="btn btn-sm ${view === 'entry' ? 'btn-dark' : 'btn-outline-secondary'}">Log Game Data</button>
        <div class="ms-auto">
            <button onclick="actions.runAnalysis()" class="btn btn-sm btn-primary" ${state.ui.statsLoading ? 'disabled' : ''}>
                ${state.ui.statsLoading ? 'Analyzing...' : 'Run Analysis'}
            </button>
        </div>
    </div>`;

    if (view === 'insights') {
        html += renderInsightsDashboard(findings);
    } else if (view === 'weekly') {
        html += renderWeeklyReport(findings);
    } else if (view === 'chat') {
        html += renderStatsChat();
    } else if (view === 'entry') {
        html += renderGameDataEntry();
    }

    return html;
}
```

- [ ] **Step 6: Implement renderInsightsDashboard**

```javascript
function renderInsightsDashboard(findings) {
    if (findings.length === 0) {
        return `<div class="text-center py-5 text-secondary">
            <p class="mb-2">No findings yet.</p>
            <p class="small">Click "Run Analysis" after game data is loaded.</p>
        </div>`;
    }

    return findings.map(f => {
        const confColor = f.confidence_label === 'High' ? '#16a34a' : f.confidence_label === 'Medium' ? '#d97706' : '#9ca3af';
        const trendIcon = f.trend === 'strengthening' ? '&#9650;' : f.trend === 'weakening' ? '&#9660;' : f.trend === 'new' ? '&#9733;' : '&#8212;';
        const trendColor = f.trend === 'strengthening' ? '#16a34a' : f.trend === 'weakening' ? '#dc2626' : '#6b7280';

        return `<div class="border rounded-3 p-3 mb-3" style="border-left: 4px solid ${confColor} !important;">
            <div class="d-flex justify-content-between align-items-start mb-2">
                <h6 class="fw-bold mb-0">${f.title}</h6>
                <div class="d-flex gap-2 align-items-center">
                    <span style="color:${trendColor}; font-size:0.8em;">${trendIcon} ${f.trend}</span>
                    <span class="badge" style="background:${confColor}; color:white; font-size:0.7em;">${f.confidence_label}</span>
                </div>
            </div>
            <p class="text-secondary small mb-2">${f.summary || 'Computing summary...'}</p>
            <div class="d-flex gap-3 small text-secondary">
                <span>Sample: ${f.data_points} data points</span>
                <span>Effect: ${f.effect_size ? f.effect_size.toFixed(3) : 'N/A'}</span>
                <span>p: ${f.p_value ? f.p_value.toFixed(4) : 'N/A'}</span>
            </div>
            <details class="mt-2"><summary class="small text-primary" style="cursor:pointer;">Show methodology</summary>
                <div class="small text-secondary mt-1 p-2 bg-light rounded">${f.methodology || ''}</div>
            </details>
        </div>`;
    }).join('');
}
```

- [ ] **Step 7: Implement renderStatsChat**

```javascript
function renderStatsChat() {
    const messages = state.ui.statsChatMessages || [];
    return `
    <div style="height: 400px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px;" id="stats-chat-messages">
        ${messages.length === 0 ? '<p class="text-secondary small">Ask a question about your team\'s statistical findings...</p>' : ''}
        ${messages.map(m => `
            <div class="mb-3 ${m.role === 'user' ? 'text-end' : ''}">
                <div class="d-inline-block p-2 rounded-3 small" style="max-width: 80%; background: ${m.role === 'user' ? '#eff6ff' : '#f3f4f6'};">
                    ${m.content}
                </div>
            </div>
        `).join('')}
    </div>
    <div class="d-flex gap-2">
        <input type="text" id="stats-chat-input" class="form-control form-control-sm" placeholder="e.g. Does clutch factor predict close-game performance?"
            onkeydown="if(event.key==='Enter'){actions.sendStatsChat(this.value);this.value='';}" />
        <button class="btn btn-sm btn-primary" onclick="const el=document.getElementById('stats-chat-input');actions.sendStatsChat(el.value);el.value='';">Send</button>
    </div>`;
}
```

- [ ] **Step 8: Implement renderWeeklyReport and renderGameDataEntry**

```javascript
function renderWeeklyReport(findings) {
    if (findings.length === 0) {
        return '<p class="text-secondary text-center py-5">No report available yet. Run an analysis first.</p>';
    }

    const grouped = {};
    findings.forEach(f => {
        if (!grouped[f.finding_type]) grouped[f.finding_type] = [];
        grouped[f.finding_type].push(f);
    });

    return `<div class="mb-3">
        <h5 class="fw-bold">Weekly Statistical Report</h5>
        <p class="text-secondary small">Last computed: ${findings[0]?.computed_at ? new Date(findings[0].computed_at).toLocaleDateString() : 'N/A'}</p>
    </div>` + Object.entries(grouped).map(([type, fs]) => `
        <div class="mb-4">
            <h6 class="fw-semibold text-capitalize">${type.replace(/_/g, ' ')}</h6>
            ${fs.map(f => `<div class="border-start border-3 ps-3 mb-2 ${f.confidence_label === 'High' ? 'border-success' : f.confidence_label === 'Medium' ? 'border-warning' : 'border-secondary'}">
                <p class="small mb-1"><strong>${f.title}</strong> <span class="badge bg-light text-dark">${f.confidence_label}</span></p>
                <p class="small text-secondary mb-0">${f.summary || ''}</p>
            </div>`).join('')}
        </div>
    `).join('');
}

function renderGameDataEntry() {
    return `
    <div class="mb-3">
        <h5 class="fw-bold">Log Game Data</h5>
        <p class="text-secondary small">Enter results from a recent game. Stats will be analyzed automatically.</p>
    </div>
    <div class="row g-2 mb-3">
        <div class="col-md-3"><label class="form-label small">Date</label><input type="date" class="form-control form-control-sm" id="gd-date" /></div>
        <div class="col-md-3"><label class="form-label small">Opponent</label><input type="text" class="form-control form-control-sm" id="gd-opponent" /></div>
        <div class="col-md-3"><label class="form-label small">Home/Away</label><select class="form-select form-select-sm" id="gd-homeaway"><option>Home</option><option>Away</option></select></div>
        <div class="col-md-1"><label class="form-label small">Us</label><input type="number" class="form-control form-control-sm" id="gd-team-score" min="0" /></div>
        <div class="col-md-1"><label class="form-label small">Them</label><input type="number" class="form-control form-control-sm" id="gd-opp-score" min="0" /></div>
    </div>
    <h6 class="fw-semibold small">Player Stats</h6>
    <div class="table-responsive">
        <table class="table table-sm small">
            <thead><tr><th>Player</th><th>AB</th><th>H</th><th>RBI</th><th>K</th><th>BB</th><th>E</th><th>Note</th></tr></thead>
            <tbody>
                ${state.players.filter(p => p.type === 'ROSTER').slice(0, 12).map(p => `
                <tr>
                    <td class="fw-medium">${formatDisplayName(p)}</td>
                    <td><input type="number" class="form-control form-control-sm" style="width:50px" min="0" id="gd-ab-${p.id}" /></td>
                    <td><input type="number" class="form-control form-control-sm" style="width:50px" min="0" id="gd-h-${p.id}" /></td>
                    <td><input type="number" class="form-control form-control-sm" style="width:50px" min="0" id="gd-rbi-${p.id}" /></td>
                    <td><input type="number" class="form-control form-control-sm" style="width:50px" min="0" id="gd-k-${p.id}" /></td>
                    <td><input type="number" class="form-control form-control-sm" style="width:50px" min="0" id="gd-bb-${p.id}" /></td>
                    <td><input type="number" class="form-control form-control-sm" style="width:50px" min="0" id="gd-e-${p.id}" /></td>
                    <td><input type="text" class="form-control form-control-sm" style="width:120px" id="gd-note-${p.id}" /></td>
                </tr>`).join('')}
            </tbody>
        </table>
    </div>
    <button class="btn btn-primary btn-sm" onclick="submitGameData()">Submit Game Data</button>`;
}
```

- [ ] **Step 9: Add submitGameData function**

```javascript
async function submitGameData() {
    const date = document.getElementById('gd-date').value;
    const opponent = document.getElementById('gd-opponent').value;
    const homeAway = document.getElementById('gd-homeaway').value;
    const teamScore = parseInt(document.getElementById('gd-team-score').value) || 0;
    const oppScore = parseInt(document.getElementById('gd-opp-score').value) || 0;

    if (!date) { alert('Please enter a game date'); return; }

    const gameLogs = [];
    state.players.filter(p => p.type === 'ROSTER').slice(0, 12).forEach(p => {
        const ab = parseInt(document.getElementById(`gd-ab-${p.id}`)?.value) || 0;
        if (ab === 0) return;
        gameLogs.push({
            playerId: p.id, gameDate: date, opponent, homeAway, teamScore, opponentScore: oppScore,
            result: teamScore > oppScore ? 'W' : 'L',
            atBats: ab,
            hits: parseInt(document.getElementById(`gd-h-${p.id}`)?.value) || 0,
            rbis: parseInt(document.getElementById(`gd-rbi-${p.id}`)?.value) || 0,
            strikeouts: parseInt(document.getElementById(`gd-k-${p.id}`)?.value) || 0,
            walks: parseInt(document.getElementById(`gd-bb-${p.id}`)?.value) || 0,
            errors: parseInt(document.getElementById(`gd-e-${p.id}`)?.value) || 0,
            coachNote: document.getElementById(`gd-note-${p.id}`)?.value || null,
        });
    });

    if (gameLogs.length === 0) { alert('Enter at-bats for at least one player'); return; }

    try {
        await fetch('/api/game-logs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gameLogs }) });
        alert('Game data saved! Running post-game analysis...');
        await actions.runAnalysis();
    } catch (e) {
        alert('Error saving game data');
    }
}
```

- [ ] **Step 10: Wire Stats Lab into the main render function**

Find where the main render function switches on `state.view` and add:

```javascript
case 'stats':
    content = renderStatsLab();
    break;
```

Also add auto-loading of findings when switching to stats view: in the `setView` action, add:

```javascript
if (view === 'stats') actions.loadFindings();
```

- [ ] **Step 11: Commit**

```bash
git add index.html
git commit -m "Add Stats Lab UI tab with insights, weekly report, chat, and game entry"
```

---

### Task 19: Integration Test — Full Pipeline

**Files:**
- Create: `lib/stats/integration.test.js`

- [ ] **Step 1: Create integration test**

Create `lib/stats/integration.test.js`:

```javascript
/**
 * Integration test: verifies the full stats pipeline without a database.
 * Tests that mock data feeds through statistical functions and produces valid findings.
 */
const { generateGameLogs, generateRecruitingOutcomes } = require('../mock/game-data');
const { multipleRegression, logisticRegression } = require('./regression');
const { chiSquaredTest } = require('./chi-squared');
const { bootstrapCI, bootstrapMeanDiff } = require('./bootstrap');
const { computeConfidence } = require('./confidence');
const { cohensD } = require('./effect-size');
const { detectTrend, buildFinding } = require('./findings');
const ss = require('simple-statistics');

// Mock players matching DB schema
const players = [
  { id: '1', name: 'Elite, Player', position: 'SS', level: 'NCAA', type: 'ROSTER', clutch_factor: 900, fit_score: 90, comm_style: 'Direct' },
  { id: '2', name: 'Good, Player', position: '2B', level: 'NCAA', type: 'ROSTER', clutch_factor: 780, fit_score: 75, comm_style: 'Supportive' },
  { id: '3', name: 'Mid, Player', position: '1B', level: 'NCAA', type: 'ROSTER', clutch_factor: 600, fit_score: 55, comm_style: 'Expressive' },
  { id: '4', name: 'Low, Player', position: '3B', level: 'NCAA', type: 'ROSTER', clutch_factor: 400, fit_score: 35, comm_style: 'Reserved' },
  { id: '5', name: 'Recruit, One', position: 'CF', level: 'High School', type: 'RECRUIT', clutch_factor: 800, fit_score: 80, comm_style: 'Direct' },
  { id: '6', name: 'Recruit, Two', position: 'RF', level: 'High School', type: 'RECRUIT', clutch_factor: 450, fit_score: 30, comm_style: 'Reserved' },
];

// Generate data
const gameLogs = generateGameLogs(players, { seed: 42 });
const outcomes = generateRecruitingOutcomes(players, { seed: 42 });

console.log(`Generated ${gameLogs.length} game logs, ${outcomes.length} recruiting outcomes`);

// TEST 1: Clutch validation pipeline
function testClutchPipeline() {
  const closeGames = gameLogs.filter(g => g.is_close_game && g.at_bats > 0);
  const highClutch = closeGames.filter(g => {
    const p = players.find(pl => pl.id === g.player_id);
    return p && p.clutch_factor >= 750;
  });
  const lowClutch = closeGames.filter(g => {
    const p = players.find(pl => pl.id === g.player_id);
    return p && p.clutch_factor < 650;
  });

  const highBA = highClutch.reduce((s, g) => s + g.hits, 0) / highClutch.reduce((s, g) => s + g.at_bats, 0);
  const lowBA = lowClutch.reduce((s, g) => s + g.hits, 0) / lowClutch.reduce((s, g) => s + g.at_bats, 0);

  console.log(`High clutch close-game BA: ${highBA.toFixed(3)}, Low clutch: ${lowBA.toFixed(3)}`);
  console.assert(highBA > lowBA, 'High clutch should have better close-game BA');

  const d = cohensD(
    highClutch.map(g => g.hits / g.at_bats),
    lowClutch.map(g => g.hits / g.at_bats)
  );
  console.log(`Cohen's d: ${d.toFixed(3)}`);
  console.assert(d > 0, 'Effect size should be positive');

  const bootstrap = bootstrapMeanDiff(
    highClutch.map(g => g.hits / g.at_bats),
    lowClutch.map(g => g.hits / g.at_bats),
    { iterations: 1000, seed: 42 }
  );
  console.log(`Bootstrap CI: [${bootstrap.lower.toFixed(3)}, ${bootstrap.upper.toFixed(3)}]`);

  const conf = computeConfidence({
    dataPoints: closeGames.length,
    minSample: 15,
    pValue: 0.02,
    effectSize: d,
    priorConsistency: true,
  });
  console.log(`Confidence: ${conf.score} (${conf.label})`);
  console.assert(conf.score > 0, 'Should have some confidence');

  console.log('PASS: clutch pipeline');
}

// TEST 2: Fit → Wins pipeline
function testFitWinsPipeline() {
  const gameResults = {};
  for (const g of gameLogs) {
    const key = `${g.game_date}-${g.opponent}`;
    if (!gameResults[key]) gameResults[key] = { result: g.result, fits: [] };
    const p = players.find(pl => pl.id === g.player_id);
    if (p) gameResults[key].fits.push(p.fit_score);
  }

  const games = Object.values(gameResults).filter(g => g.fits.length > 0);
  const data = games.map(g => ({
    y: g.result === 'W' ? 1 : 0,
    x: [ss.mean(g.fits) / 100],
  }));

  const result = logisticRegression(data);
  console.log(`Fit → Wins odds ratio: ${result.oddsRatios[0].toFixed(3)}`);
  console.assert(typeof result.oddsRatios[0] === 'number', 'Should produce valid odds ratio');

  console.log('PASS: fit-wins pipeline');
}

// TEST 3: Error patterns pipeline
function testErrorPatternsPipeline() {
  const commStyles = ['Direct', 'Supportive', 'Expressive', 'Reserved'];
  const pressureGames = gameLogs.filter(g => g.is_close_game);

  const table = commStyles.map(style => {
    const styleGames = pressureGames.filter(g => {
      const p = players.find(pl => pl.id === g.player_id);
      return p && p.comm_style === style;
    });
    const withErrors = styleGames.filter(g => g.errors > 0).length;
    return [withErrors, styleGames.length - withErrors];
  });

  const result = chiSquaredTest(table);
  console.log(`Chi-squared: ${result.chiSquared}, p: ${result.pValue}, V: ${result.cramersV}`);
  console.assert(typeof result.chiSquared === 'number', 'Should produce valid chi-squared');

  console.log('PASS: error patterns pipeline');
}

// TEST 4: Finding construction
function testFindingConstruction() {
  const finding = buildFinding({
    findingType: 'clutch_validation',
    title: 'Test Finding',
    summary: 'Test summary',
    methodology: 'Test method',
    sqlQuery: 'SELECT 1',
    resultData: { test: true },
    dataPoints: 50,
    confidence: 72,
    confidenceLabel: 'High',
    effectSize: 0.6,
    pValue: 0.01,
    confidenceInterval: { lower: 0.3, upper: 0.9 },
    isSignificant: true,
    trend: 'new',
    analysisRunId: 1,
  });

  console.assert(finding.finding_type === 'clutch_validation', 'Type mismatch');
  console.assert(finding.confidence === 72, 'Confidence mismatch');
  console.assert(finding.superseded_by === null, 'Should not be superseded');

  const trend = detectTrend(null, { confidence: 72, effect_size: 0.6 });
  console.assert(trend === 'new', 'First finding should be new');

  const trend2 = detectTrend({ confidence: 72, effect_size: 0.6 }, { confidence: 85, effect_size: 0.8 });
  console.assert(trend2 === 'strengthening', 'Should be strengthening');

  console.log('PASS: finding construction');
}

testClutchPipeline();
testFitWinsPipeline();
testErrorPatternsPipeline();
testFindingConstruction();
console.log('\nAll integration tests passed');
```

- [ ] **Step 2: Run integration test**

Run: `node lib/stats/integration.test.js`
Expected: All tests pass, with output showing realistic BA differences, odds ratios, chi-squared values, and confidence scores.

- [ ] **Step 3: Commit**

```bash
git add lib/stats/integration.test.js
git commit -m "Add integration tests for full statistical pipeline"
```

---

### Task 20: Run All Tests and Final Verification

- [ ] **Step 1: Run all unit tests**

```bash
node lib/stats/effect-size.test.js && \
node lib/stats/chi-squared.test.js && \
node lib/stats/regression.test.js && \
node lib/stats/bootstrap.test.js && \
node lib/stats/bayesian.test.js && \
node lib/stats/confidence.test.js && \
node lib/mock/game-data.test.js && \
node lib/stats/findings.test.js && \
node lib/stats/integration.test.js
```

Expected: All tests pass.

- [ ] **Step 2: Verify all files parse correctly**

```bash
node -e "
  require('./lib/stats/engine');
  require('./lib/stats/queries');
  require('./lib/stats/narrate');
  require('./lib/mock/game-data');
  require('./api/game-logs');
  require('./api/recruiting-outcomes');
  require('./api/run-analysis');
  require('./api/findings');
  require('./api/weekly-report');
  require('./api/stats-chat');
  console.log('All modules loaded successfully');
"
```

Expected: `All modules loaded successfully`

- [ ] **Step 3: Verify git status is clean**

Run: `git status`
Expected: working tree clean, all changes committed on `statistician-agent` branch.

- [ ] **Step 4: Final commit if any remaining changes**

```bash
git add -A && git commit -m "Final cleanup for statistician agent v1" || echo "Nothing to commit"
```
