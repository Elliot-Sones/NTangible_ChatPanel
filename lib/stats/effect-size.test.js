const { cohensD, oddsRatio, cramersV } = require('./effect-size');

function testCohensD() {
  const d = cohensD([2, 4, 6], [1, 2, 3]);
  // pooled_sd = sqrt(((3-1)*4 + (3-1)*1) / (3+3-2)) = sqrt(2.5) ≈ 1.5811
  // d = (4-2) / 1.5811 ≈ 1.2649
  console.assert(Math.abs(d - 1.2649) < 0.01, `cohensD expected ~1.2649, got ${d}`);
  console.log('PASS: cohensD');
}

function testOddsRatio() {
  const or = oddsRatio([[10, 5], [3, 12]]);
  console.assert(Math.abs(or - 8.0) < 0.01, `oddsRatio expected 8.0, got ${or}`);
  console.log('PASS: oddsRatio');
}

function testCramersV() {
  const v = cramersV(5.0, 30, 2, 2);
  console.assert(Math.abs(v - 0.4082) < 0.01, `cramersV expected ~0.4082, got ${v}`);
  console.log('PASS: cramersV');
}

testCohensD();
testOddsRatio();
testCramersV();
console.log('All effect-size tests passed');
