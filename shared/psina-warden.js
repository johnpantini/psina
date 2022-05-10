exports = function ({ query, headers, body }, response) {
  return {
    alpharaId: '[%#payload.alpharaId%]',
    betaraId: '[%#payload.betaraId%]',
    gammaraId: '[%#payload.gammaraId%]'
  };
};
