const { bayesianUpdate, createPrior, priorWeight } = require('./bayesian');

function testCreatePrior() {
  const prior = createPrior(0.5, 0.2);
  console.assert(prior.mean === 0.5, `mean expected 0.5, got ${prior.mean}`);
  console.assert(prior.variance === 0.2, `variance expected 0.2, got ${prior.variance}`);
  console.log('PASS: createPrior');
}

function testBayesianUpdate() {
  const prior = createPrior(0.5, 0.2);
  const posterior = bayesianUpdate(prior, 0.8, 0.05);
  console.assert(posterior.mean > 0.7, `posterior mean ${posterior.mean} should be >0.7`);
  console.assert(posterior.mean < 0.85, `posterior mean ${posterior.mean} should be <0.85`);
  console.assert(posterior.variance < prior.variance, `posterior variance should be < prior`);
  console.log('PASS: bayesianUpdate with strong data');
}

function testBayesianUpdateWeakData() {
  const prior = createPrior(0.5, 0.1);
  const posterior = bayesianUpdate(prior, 0.8, 1.0);
  console.assert(posterior.mean < 0.6, `posterior mean ${posterior.mean} should be <0.6`);
  console.log('PASS: bayesianUpdate with weak data');
}

function testPriorWeight() {
  const prior = createPrior(0.5, 0.2);
  const w1 = priorWeight(prior, 1.0);
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
