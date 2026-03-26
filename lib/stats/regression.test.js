const { multipleRegression, logisticRegression } = require('./regression');

function testMultipleRegression() {
  const data2 = [
    { y: 10, x: [1, 2] }, { y: 14, x: [2, 3] }, { y: 18, x: [3, 4] },
    { y: 22, x: [4, 5] }, { y: 26, x: [5, 6] },
  ];
  const result = multipleRegression(data2);
  console.assert(result.coefficients.length === 2, `Expected 2 coefficients, got ${result.coefficients.length}`);
  console.assert(typeof result.intercept === 'number', 'intercept should be a number');
  console.assert(result.rSquared > 0.99, `R² expected >0.99, got ${result.rSquared}`);
  console.assert(typeof result.pValues === 'object', 'pValues should exist');
  const predicted = result.intercept + result.coefficients[0] * 3 + result.coefficients[1] * 4;
  console.assert(Math.abs(predicted - 18) < 0.5, `Prediction expected ~18, got ${predicted}`);
  console.log('PASS: multipleRegression');
}

function testLogisticRegression() {
  const data = [
    { y: 0, x: [1] }, { y: 0, x: [2] }, { y: 0, x: [3] },
    { y: 0, x: [4] }, { y: 0, x: [5] },
    { y: 1, x: [6] }, { y: 1, x: [7] }, { y: 1, x: [8] },
    { y: 1, x: [9] }, { y: 1, x: [10] },
  ];
  const result = logisticRegression(data);
  console.assert(result.coefficients[0] > 0, `coefficient should be positive, got ${result.coefficients[0]}`);
  console.assert(result.predict([2]) < 0.5, `predict(2) should be <0.5, got ${result.predict([2])}`);
  console.assert(result.predict([9]) > 0.5, `predict(9) should be >0.5, got ${result.predict([9])}`);
  console.assert(typeof result.oddsRatios === 'object', 'oddsRatios should exist');
  console.log('PASS: logisticRegression');
}

testMultipleRegression();
testLogisticRegression();
console.log('All regression tests passed');
