const { detectTrend, buildFinding } = require('./findings');

function testDetectTrendNew() {
  console.assert(detectTrend(null, { confidence: 60, effect_size: 0.5 }) === 'new', 'Expected new');
  console.log('PASS: detectTrend new');
}
function testDetectTrendStrengthening() {
  console.assert(detectTrend({ confidence: 50, effect_size: 0.3 }, { confidence: 70, effect_size: 0.6 }) === 'strengthening', 'Expected strengthening');
  console.log('PASS: detectTrend strengthening');
}
function testDetectTrendWeakening() {
  console.assert(detectTrend({ confidence: 70, effect_size: 0.6 }, { confidence: 45, effect_size: 0.2 }) === 'weakening', 'Expected weakening');
  console.log('PASS: detectTrend weakening');
}
function testDetectTrendStable() {
  console.assert(detectTrend({ confidence: 60, effect_size: 0.5 }, { confidence: 62, effect_size: 0.48 }) === 'stable', 'Expected stable');
  console.log('PASS: detectTrend stable');
}
function testBuildFinding() {
  const f = buildFinding({ findingType: 'clutch_validation', title: 'Test', summary: 'A test', methodology: 'Multiple regression', sqlQuery: 'SELECT 1', resultData: { test: true }, dataPoints: 50, confidence: 72, confidenceLabel: 'High', effectSize: 0.6, pValue: 0.01, confidenceInterval: { lower: 0.3, upper: 0.9 }, isSignificant: true, trend: 'new', analysisRunId: 1 });
  console.assert(f.finding_type === 'clutch_validation', 'type mismatch');
  console.assert(f.data_points === 50, 'data_points mismatch');
  console.assert(f.superseded_by === null, 'should not be superseded');
  console.log('PASS: buildFinding');
}
testDetectTrendNew();
testDetectTrendStrengthening();
testDetectTrendWeakening();
testDetectTrendStable();
testBuildFinding();
console.log('All findings tests passed');
