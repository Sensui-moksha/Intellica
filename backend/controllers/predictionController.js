exports.calculateCredits = (impact, weight) => {
  // y = mx + c (simple regression)
  const m = weight;
  const c = 2;
  return m * impact + c;
};
