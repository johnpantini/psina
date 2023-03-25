exports = function ({ query, headers, body }, response) {
  try {
    const payload = EJSON.parse(body.text());

    if (payload.code) {
      return new Function('context', payload.code.toString())(context);
    } else {
      response.setStatusCode(422);

      return '422 Unprocessable Entity';
    }
  } catch (e) {
    console.error(e);
    response.setStatusCode(500);

    return '500 Internal Server Error';
  }
};
