# Statistician Agent — Design Spec

## Problem

Coaches have NTangible cognitive data (clutch factor, fit score, NTerpret profiles) but no way to prove it matters. Without game outcome data and rigorous statistical analysis, the platform asks coaches to trust scores on faith. The statistician agent connects cognitive profiles to real performance, proving (or disproving) that the data is predictive — and surfacing findings coaches didn't know to ask for.

## Core Thesis

NTangible claims clutch factor predicts performance under pressure, fit score predicts team chemistry and retention, and NTerpret profiles inform coaching strategy. The statistician agent's job is to **test these claims against game data** and present honest, transparent findings — including when the data doesn't support a claim.

## User Experience

### Who uses it
Baseball coaches at high school, JUCO, and small college programs. They don't have analytics departments. They track basic box score stats in spreadsheets. They want actionable findings, not academic papers — but they need to trust the numbers.

### How they interact
Two modes, both in a new **Stats Lab** tab in the UI:

1. **Insights Dashboard + Weekly Report** — Pre-computed findings ranked by confidence. Weekly digest comparing this week to last. Post-game analysis when new data is logged. The agent surfaces things the coach didn't ask for.

2. **Ask the Statistician** — Chat interface scoped to statistical questions. Claude answers using computed findings from the database, not generated estimates. If the data doesn't support an answer, it says so.

### Transparency model
Full transparency (coach-selected preference). Every finding shows:
- The result in plain English
- Sample size and confidence level (Low/Medium/High)
- "Show methodology" expandable with the statistical method used, the exact query, and the confidence interval
- Trend indicator (strengthening/weakening/stable since last analysis)
- Data points count and date range

## Data Model

### New Tables

#### `game_logs`
One row per player per game. The core game data that small programs actually track.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PK | |
| player_id | TEXT → players.id | |
| game_date | DATE | |
| opponent | TEXT | |
| home_away | TEXT | 'Home' or 'Away' |
| team_score | INT | |
| opponent_score | INT | |
| result | TEXT | 'W' or 'L' |
| is_close_game | BOOLEAN | Derived: score difference ≤ 2 runs |
| is_conference | BOOLEAN | Conference vs non-conference |
| is_tournament | BOOLEAN | Tournament/playoff flag |
| at_bats | INT | |
| hits | INT | |
| rbis | INT | |
| errors | INT | |
| strikeouts | INT | |
| walks | INT | |
| coach_note | TEXT | Optional qualitative note |
| created_at | TIMESTAMPTZ | |

Indexes: `(player_id, game_date)`, `(game_date)`, `(is_close_game)`

#### `recruiting_outcomes`
One row per recruit. Tracks what happened after commitment.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PK | |
| player_id | TEXT → players.id | |
| signing_date | DATE | |
| playing_time_yr1 | TEXT | Starter / Rotation / Bench / Redshirt |
| playing_time_yr2 | TEXT | Same options |
| still_on_team | BOOLEAN | |
| entered_portal | BOOLEAN | |
| portal_date | DATE | Nullable |
| created_at | TIMESTAMPTZ | |

#### `stat_findings`
Cached computed insights. Every finding is versioned — old findings are superseded, not deleted.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PK | |
| finding_type | TEXT | One of 6 analysis types |
| title | TEXT | Human-readable title |
| summary | TEXT | Plain English finding |
| methodology | TEXT | Statistical method description |
| sql_query | TEXT | Exact query that produced the result |
| result_data | JSONB | Raw computed output |
| data_points | INT | Sample size |
| confidence | INT 0-100 | Computed confidence score |
| confidence_label | TEXT | Low / Medium / High |
| effect_size | FLOAT | Cohen's d or equivalent |
| p_value | FLOAT | Statistical significance |
| confidence_interval | JSONB | {lower, upper} bounds |
| is_significant | BOOLEAN | Meets threshold for reporting |
| trend | TEXT | strengthening / weakening / stable / new |
| coach_feedback | TEXT | useful / not_useful / null |
| computed_at | TIMESTAMPTZ | |
| superseded_by | INT | → stat_findings.id, null if current |
| analysis_run_id | INT | → analysis_runs.id |

#### `analysis_runs`
Audit trail. When analyses ran and why.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PK | |
| trigger | TEXT | weekly / post_game / manual |
| started_at | TIMESTAMPTZ | |
| completed_at | TIMESTAMPTZ | |
| games_analyzed | INT | |
| findings_generated | INT | |
| findings_changed | INT | Findings that shifted from last run |
| status | TEXT | running / complete / failed |

### Mock Data Generation

Mock game data is generated deterministically (seeded RNG, same as existing player generation) with realistic correlations baked in:

- High clutch (>750) players get a weighted boost to hits/at_bats ratio in close games (~+.040 BA) with noise
- High fit (>70) players correlate with team wins at ~65% rate vs ~48% for low fit
- Error rates increase for certain comm styles under away/close game conditions, with variance
- Development trajectories show improvement after "intervention dates" for some players, no change for others
- Recruiting outcomes correlate with fit score for retention, clutch for playing time earned

Correlations are **not deterministic** — noise and exceptions exist so the agent must handle messy, imperfect patterns. Some high-clutch players underperform. Some low-fit players stay on the team. The mock data is realistic, not a proof-by-construction.

Each player gets 15-30 game log entries spanning a season (Feb–May). ~40 games total per team with varying lineups.

## Statistical Engine

### Core Principle
**SQL computes. Statistical libraries validate. Claude explains.** At no point does the LLM generate, estimate, or approximate a number. Claude receives computed results and writes the narrative.

### Computation Pipeline

```
Trigger (weekly/post_game/manual)
  → Run predefined SQL queries against game_logs + players
  → Feed raw results to statistical validation layer
  → Compute: effect size, p-value, confidence interval, sample size check
  → Determine confidence label (Low/Medium/High)
  → Compare to previous finding (trend: strengthening/weakening/stable)
  → Store in stat_findings
  → Pass computed results to Claude for plain-English narration
  → Surface to UI
```

### Statistical Methods by Analysis Type

#### 1. Clutch Validation
**Question:** Does clutch factor actually predict performance in high-pressure games?

**Method:** Multiple regression
- Dependent variable: batting average in close games (hits / at_bats WHERE is_close_game = true)
- Independent variables: clutch_factor (continuous), position (categorical), level (categorical), graduation_year (proxy for experience)
- Output: regression coefficient for clutch_factor, R-squared, p-value, 95% confidence interval
- Effect size: standardized beta coefficient

**Why this method:** Isolates clutch factor's contribution after controlling for position, level, and experience. Without controls, a finding like "high clutch = better BA" could just mean "upperclassmen are better."

**Minimum sample:** 30 player-game observations per group. Below this, finding is labeled "Early signal — insufficient data."

**Coach-facing output:** "Clutch factor is a [strong/moderate/weak] predictor of close-game performance. For every 100-point increase in clutch score, close-game batting average increases by approximately [X] points, after accounting for position and experience. Confidence: [High/Medium/Low] based on [N] players across [M] games."

#### 2. Fit → Wins Correlation
**Question:** Does roster-level fit score predict winning?

**Method:** Logistic regression
- Dependent variable: game result (W=1, L=0)
- Independent variables: average fit score of starters, average clutch of starters, home/away, conference flag
- Output: odds ratio for fit_score, p-value, confidence interval

**Why this method:** Win/loss is binary — logistic regression is the standard for binary outcomes. Controls for home advantage and opponent quality proxy (conference).

**Minimum sample:** 20 games. Below this, labeled "Early signal."

**Coach-facing output:** "Games where your starting lineup's average fit score is above [X] result in wins [Y]% of the time vs [Z]% when below, after accounting for home/away advantage. Confidence: [High/Medium/Low] based on [N] games."

#### 3. Error Pattern Analysis
**Question:** Do behavioral profiles predict who makes errors under pressure?

**Method:** Chi-squared test + effect size (Cramér's V)
- Contingency table: comm_style × error_in_pressure (yes/no, where pressure = close game or away game)
- Output: chi-squared statistic, p-value, Cramér's V (effect size)
- Follow-up: standardized residuals to identify which cells drive the relationship

**Why this method:** Both variables are categorical (comm style = Direct/Supportive/Expressive/Reserved, error = yes/no). Chi-squared tests whether the distribution of errors is independent of comm style.

**Minimum sample:** 5 expected observations per cell. With 4 comm styles × 2 error states = 8 cells, need ~40 observations minimum.

**Coach-facing output:** "Communication style has a [significant/no significant] relationship with errors in high-pressure situations. [If significant:] [Style] players show [X]% error rate in close games vs [Y]% for [Style] players. Confidence: [High/Medium/Low]."

#### 4. Development Trajectory
**Question:** Do players improve after NTangible interventions?

**Method:** Mixed-effects model (repeated measures)
- Fixed effects: time period (pre-intervention vs post-intervention), clutch_factor, position
- Random effects: player (intercept) — accounts for each player having their own baseline
- Dependent variable: rolling batting average (5-game window)

**Why this method:** Same player measured across many games = repeated measures. Treating each game as independent inflates significance. Mixed-effects models handle this correctly by modeling within-player correlation.

**Minimum sample:** 10 games pre-intervention and 10 post per player, minimum 8 players.

**Coach-facing output:** "Players who completed prescribed exercises showed a [X]-point improvement in batting average over [N] weeks, compared to [Y]-point change for those who didn't. This accounts for natural improvement over time. Confidence: [High/Medium/Low]."

#### 5. Recruiting Profile Match
**Question:** What cognitive/behavioral profile predicts success on this roster?

**Method:** Logistic regression + similarity scoring
- Step 1: Define "success" = top 50% in composite game performance (BA + low errors + team wins when starting)
- Step 2: Logistic regression — successful(1/0) ~ clutch_factor + fit_score + comm_style + learning_style + motivation
- Step 3: Extract significant predictors → build profile template
- Step 4: Score each recruit as % match to the profile template

**Why this method:** Builds the "success profile" from actual data, not assumptions. The regression identifies which traits actually matter for *this specific team*, which may differ from NTangible's general thesis.

**Minimum sample:** 20 roster players with game data.

**Coach-facing output:** "Your most successful players share these traits: [list]. This recruit matches [X]% of the profile. Strongest match: [trait]. Gap: [trait]. Based on [N] current roster players."

#### 6. Commitment Prediction
**Question:** Which recruit traits predict signing, earning playing time, and retention?

**Method:** Logistic regression (three separate models)
- Model A: signed(1/0) ~ clutch_factor + fit_score + motivation + comm_style
- Model B: earned_starter(1/0) ~ clutch_factor + fit_score + position + learning_style
- Model C: retained(1/0) ~ fit_score + motivation + comm_style + playing_time_yr1

**Why this method:** Three distinct binary outcomes, each potentially driven by different factors. Fit score might predict retention but not playing time. Clutch might predict playing time but not commitment.

**Minimum sample:** 15 recruits with outcomes per model.

**Coach-facing output:** "Recruits most likely to sign share [traits]. Once signed, those most likely to earn starting roles have [traits]. Retention is most strongly predicted by [trait]. Based on [N] historical recruits."

### Cross-Cutting Statistical Infrastructure

#### Small Sample Handling — Bootstrap Resampling
When sample sizes fall below classical thresholds (n < 30 for regression, n < 40 for chi-squared), use bootstrap:
- Resample the dataset with replacement 1000 times
- Compute the statistic of interest for each resample
- Use the distribution of resampled statistics for confidence intervals
- Report bootstrap CI instead of classical CI

This produces honest confidence intervals even with 15 players.

#### Bayesian Updating
Each finding type maintains a prior:
- Initial prior: NTangible's thesis (e.g., "clutch factor is moderately predictive of close-game performance")
- Encoded as a prior distribution on the regression coefficient
- Updated with each analysis run using Bayes' theorem
- Early in the season (few games): prior dominates → findings are cautious
- Mid-season (many games): data dominates → findings are data-driven
- The shift from prior to data is visible to the coach: "Based primarily on NTangible's research (5 games)" → "Based primarily on your team's data (45 games)"

#### Confidence Scoring
Each finding gets a composite confidence score (0-100) based on:
- Sample size relative to minimum threshold (0-30 points)
- Statistical significance / p-value (0-30 points)
- Effect size magnitude (0-20 points)
- Consistency with prior runs (0-20 points)

Labels:
- 0-39: **Low** — "Early signal, needs more data"
- 40-69: **Medium** — "Moderate evidence, worth monitoring"
- 70-100: **High** — "Strong evidence, actionable finding"

Only findings with confidence ≥ 40 are surfaced proactively. Below 40, they're available in "All findings" but not highlighted.

### Implementation: Server-Side Computation

Statistical computations run in Node.js serverless functions using:
- **SQL queries** via Neon PostgreSQL for data retrieval and aggregation
- **simple-statistics** (npm) for regression, standard deviation, correlation, t-tests
- **Custom functions** for bootstrap resampling, chi-squared, confidence intervals, Bayesian updating, effect size calculation

No Python/R dependency. All statistics computed in JavaScript to stay within the existing Vercel serverless stack.

Key npm packages:
- `simple-statistics` — regression, descriptive stats, t-test, bayesian
- No additional heavy dependencies — chi-squared, bootstrap, effect size implemented as focused utility functions
- Mixed-effects for Development Trajectory: simplified as paired before/after comparison per player with bootstrap CIs, aggregated across players. Not a full REML solver — a pragmatic approximation that still accounts for within-player correlation by computing per-player deltas first, then testing the distribution of deltas.

## Analysis Triggers

### Weekly Digest
- Runs all 6 analysis types
- Compares each finding to its previous version
- Computes trend (strengthening/weakening/stable)
- Generates a Claude-narrated summary of what changed
- Stored as a complete analysis run for audit

### Post-Game
- Triggered when new rows are inserted into `game_logs`
- Runs only analyses affected by the new data:
  - Always: Clutch Validation (player-level)
  - Always: Error Pattern Analysis (if errors logged)
  - If enough new games: Fit → Wins, Development Trajectory
  - Never on post-game: Recruiting Profile Match, Commitment Prediction (these are roster-level, weekly only)
- Surfaces immediate changes: "After today's game, [finding] shifted from X to Y"

### Manual
- Coach clicks "Run Analysis" in Stats Lab
- Runs all 6 types with current data
- Useful after bulk CSV upload of historical games

## API Endpoints

### `POST /api/game-logs`
Upsert game log entries. Accepts array of game entries (manual entry or CSV parse). Triggers post-game analysis.

### `POST /api/recruiting-outcomes`
Upsert recruiting outcome data for a player.

### `POST /api/run-analysis`
Manually trigger a full analysis run. Returns analysis_run_id.

### `GET /api/findings`
Return current (non-superseded) findings, ordered by confidence. Supports filters: `?type=clutch_validation`, `?min_confidence=40`.

### `GET /api/findings/:id`
Return a single finding with full methodology, SQL query, result data, and version history.

### `GET /api/weekly-report`
Return the latest weekly digest: all current findings + week-over-week changes + Claude-narrated summary.

### `POST /api/stats-chat`
Chat endpoint scoped to statistical questions. System prompt includes current findings from stat_findings table. Claude answers using computed data, cites finding IDs, and says "insufficient data" when no finding supports the question.

## UI: Stats Lab Tab

### Views

#### Insights Dashboard (default)
- Cards for each current finding, sorted by confidence (highest first)
- Each card shows: title, plain English summary, confidence badge (Low/Medium/High), sample size, trend arrow, date computed
- Click card → expanded view with methodology, confidence interval, exact numbers, version history
- Coach feedback buttons: "Useful" / "Not useful" per finding
- Filter bar: by analysis type, confidence level

#### Weekly Report
- Date-stamped digest
- Section per analysis type with findings + week-over-week delta
- Claude-narrated executive summary at top
- "Previous reports" dropdown to view history

#### Ask the Statistician
- Chat interface (separate from main coaching chat)
- System prompt includes all current findings as context
- Claude scoped to statistical questions only
- Cites specific findings with confidence levels
- Refuses to speculate beyond what the data supports

#### Game Data Entry
- Form for logging game results per player
- CSV upload option (map columns to schema)
- After submission: triggers post-game analysis, shows "Analyzing..." then surfaces any changed findings

## Mock Data Generation

### Approach
Extend the existing seeded RNG system in `index.html` and the server-side sync to generate realistic game logs.

### Per player: 15-30 game entries across a season (Feb–May)
- Game dates spread across ~40 team games
- Opponents drawn from a pool of 12 fictional team names
- Home/away split ~50/50
- Score generation: team scores 3-9 runs, opponent 1-8 runs
- Close game threshold: score difference ≤ 2

### Correlation injection (with noise)
- **Clutch → close-game BA:** High clutch players (>750) get +0.035 to +0.045 BA boost in close games relative to their blowout BA. Low clutch (<650) get -0.030 to -0.050 penalty. Middle tier: negligible effect. All with ±0.020 noise per game.
- **Fit → wins:** Games are more likely to be wins when average starter fit > 70 (65% win rate vs 48%). Not deterministic — upsets happen.
- **Comm style → errors:** Reserved players get +15% error probability in away close games. Direct players are baseline. Expressive players slightly elevated in all away games.
- **Development:** Players flagged with prescribed exercises show gradual BA improvement (+0.005/game over 10 games post-intervention). Control group shows random walk.
- **Recruiting → retention:** Fit > 75 → 85% retained. Fit 50-75 → 60% retained. Fit < 50 → 35% retained. Clutch > 700 → 70% earn starter/rotation yr1.

### Noise and exceptions
- 15% of high-clutch players underperform in close games (false negative)
- 10% of low-fit players have great retention (false positive)
- 2-3 players have anomalous patterns that the agent should flag as interesting outliers
- Streaks and slumps exist — not every game follows the trend

## Testing Strategy

### Unit Tests for Statistical Functions
- Each statistical method (regression, chi-squared, bootstrap, etc.) tested with known input → known output
- Example: feed 20 data points with a known correlation of 0.7 → verify computed r is within tolerance

### Integration Tests for Analysis Pipeline
- Seed database with predetermined mock data
- Run each analysis type
- Assert: findings have expected direction (positive/negative), confidence level is in expected range, sample sizes match
- Assert: findings are stored correctly in stat_findings with all metadata

### Accuracy Tests
- For each analysis type: manually compute the expected result from the mock data, compare to agent output
- Verify SQL queries return correct aggregations against known data

### Edge Case Tests
- Zero games logged → all findings say "No data available"
- 1 game logged → all findings say "Insufficient data (1 game)"
- All players same clutch score → clutch validation says "No variance to analyze"
- Player with 0 at-bats → excluded from batting calculations, not division-by-zero

### Narrative Tests
- Verify Claude's plain English summary accurately reflects the computed numbers
- The summary should not overstate confidence or understate uncertainty
- Test with a finding that has Low confidence → verify narrative includes appropriate caveats

## File Structure

```
lib/
  stats/
    engine.js           — Orchestrates analysis runs, manages triggers
    queries.js          — All predefined SQL queries (parameterized)
    regression.js       — Multiple + logistic regression
    chi-squared.js      — Chi-squared test + Cramér's V
    bootstrap.js        — Bootstrap resampling for small samples
    bayesian.js         — Prior management + Bayesian updating
    confidence.js       — Confidence scoring (0-100) + labeling
    effect-size.js      — Cohen's d, odds ratios, standardized betas
    findings.js         — Finding comparison, trend detection, versioning
    narrate.js          — Claude narration of computed results
  mock/
    game-data.js        — Deterministic game log generation
    recruiting-data.js  — Deterministic recruiting outcome generation

api/
  game-logs.js          — CRUD + post-game trigger
  recruiting-outcomes.js — CRUD for recruit lifecycle data
  run-analysis.js       — Manual analysis trigger
  findings.js           — GET current findings
  weekly-report.js      — GET latest digest
  stats-chat.js         — Chat scoped to statistical questions
  seed.js               — Updated with new table creation
```

## Constraints and Boundaries

- The agent never fabricates statistics. Every number comes from a SQL query.
- The agent never claims causation. "Clutch factor is associated with close-game performance" — not "clutch factor causes better performance."
- The agent always shows sample size and confidence. No finding is presented without context on how much data supports it.
- Findings below 40 confidence are not surfaced proactively. Available on request.
- The agent flags when its own findings contradict NTangible's thesis. If the data shows clutch factor has no relationship with close-game performance, it reports that honestly.
- Coach feedback (useful/not_useful) adjusts future surfacing priority, not the underlying statistics.
- All computation happens in Node.js/JavaScript within Vercel serverless. No external statistical services.
