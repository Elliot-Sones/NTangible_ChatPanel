function createPrior(mean, variance) { return { mean, variance }; }

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

function priorWeight(prior, observedVariance) {
  const priorPrecision = 1 / prior.variance;
  const dataPrecision = 1 / observedVariance;
  return priorPrecision / (priorPrecision + dataPrecision);
}

module.exports = { createPrior, bayesianUpdate, priorWeight };
