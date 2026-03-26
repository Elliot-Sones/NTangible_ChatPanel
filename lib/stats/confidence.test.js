const { computeConfidence } = require('./confidence');

function testHighConfidence() {
  const result = computeConfidence({ dataPoints: 100, minSample: 30, pValue: 0.001, effectSize: 0.8, priorConsistency: true });
  console.assert(result.score >= 70, `High confidence expected >=70, got ${result.score}`);
  console.assert(result.label === 'High', `Expected 'High', got '${result.label}'`);
  console.log('PASS: highConfidence');
}

function testLowConfidence() {
  const result = computeConfidence({ dataPoints: 5, minSample: 30, pValue: 0.4, effectSize: 0.1, priorConsistency: false });
  console.assert(result.score < 40, `Low confidence expected <40, got ${result.score}`);
  console.assert(result.label === 'Low', `Expected 'Low', got '${result.label}'`);
  console.log('PASS: lowConfidence');
}

function testMediumConfidence() {
  const result = computeConfidence({ dataPoints: 40, minSample: 30, pValue: 0.03, effectSize: 0.4, priorConsistency: true });
  console.assert(result.score >= 40 && result.score < 70, `Medium confidence expected 40-69, got ${result.score}`);
  console.assert(result.label === 'Medium', `Expected 'Medium', got '${result.label}'`);
  console.log('PASS: mediumConfidence');
}

function testInsufficientData() {
  const result = computeConfidence({ dataPoints: 2, minSample: 30, pValue: null, effectSize: null, priorConsistency: false });
  console.assert(result.score < 20, `Insufficient data expected <20, got ${result.score}`);
  console.assert(result.label === 'Low', `Expected 'Low', got '${result.label}'`);
  console.log('PASS: insufficientData');
}

testHighConfidence();
testLowConfidence();
testMediumConfidence();
testInsufficientData();
console.log('All confidence tests passed');
