const { bootstrapCI, bootstrapMeanDiff } = require('./bootstrap');
const ss = require('simple-statistics');

function testBootstrapCI() {
  const data = [10, 12, 11, 13, 10, 12, 11, 14, 10, 12];
  const result = bootstrapCI(data, ss.mean, { iterations: 2000, seed: 42 });
  console.assert(result.lower < 11.5 && result.upper > 11.5, `CI [${result.lower}, ${result.upper}] should contain 11.5`);
  console.assert(result.lower > 9, `lower bound ${result.lower} too low`);
  console.assert(result.upper < 14, `upper bound ${result.upper} too high`);
  console.log('PASS: bootstrapCI');
}

function testBootstrapMeanDiff() {
  const group1 = [10, 12, 11, 13, 14, 12, 11, 13];
  const group2 = [5, 6, 7, 5, 6, 8, 7, 6];
  const result = bootstrapMeanDiff(group1, group2, { iterations: 2000, seed: 42 });
  console.assert(result.lower > 0, `lower bound ${result.lower} should be >0`);
  console.assert(Math.abs(result.estimate - 5.5) < 1.5, `estimate ${result.estimate} should be ~5.5`);
  console.log('PASS: bootstrapMeanDiff');
}

function testBootstrapDeterministic() {
  const data = [1, 2, 3, 4, 5];
  const r1 = bootstrapCI(data, ss.mean, { iterations: 500, seed: 99 });
  const r2 = bootstrapCI(data, ss.mean, { iterations: 500, seed: 99 });
  console.assert(r1.lower === r2.lower && r1.upper === r2.upper, 'Same seed should produce identical results');
  console.log('PASS: bootstrapDeterministic');
}

testBootstrapCI();
testBootstrapMeanDiff();
testBootstrapDeterministic();
console.log('All bootstrap tests passed');
