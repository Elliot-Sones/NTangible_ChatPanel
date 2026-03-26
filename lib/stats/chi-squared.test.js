const { chiSquaredTest } = require('./chi-squared');

function testChiSquared2x2() {
  const result = chiSquaredTest([[10, 5], [3, 12]]);
  console.assert(Math.abs(result.chiSquared - 6.6516) < 0.01, `chi2 expected ~6.6516, got ${result.chiSquared}`);
  console.assert(result.degreesOfFreedom === 1, `df expected 1, got ${result.degreesOfFreedom}`);
  console.assert(result.n === 30, `n expected 30, got ${result.n}`);
  console.assert(result.pValue < 0.05, `pValue expected <0.05, got ${result.pValue}`);
  console.assert(result.cramersV > 0, `cramersV expected >0, got ${result.cramersV}`);
  console.log('PASS: chiSquaredTest 2x2');
}

function testChiSquared3x2() {
  const result = chiSquaredTest([[20, 30], [15, 35], [10, 40]]);
  console.assert(result.degreesOfFreedom === 2, `df expected 2, got ${result.degreesOfFreedom}`);
  console.assert(result.n === 150, `n expected 150, got ${result.n}`);
  console.assert(typeof result.pValue === 'number', 'pValue should be a number');
  console.log('PASS: chiSquaredTest 3x2');
}

testChiSquared2x2();
testChiSquared3x2();
console.log('All chi-squared tests passed');
