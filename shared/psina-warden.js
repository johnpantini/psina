exports = async function ({ query, headers, body }, response) {
  return {
    mongoLocationUrl: '[%#payload.mongoLocationUrl%]',
    mongoAppId: '[%#payload.mongoAppId%]',
    endpointSuffix: '[%#payload.endpointSuffix%]',
    alpharaId: '[%#payload.alpharaId%]',
    betaraId: '[%#payload.betaraId%]',
    gammaraId: '[%#payload.gammaraId%]'
  };
};
