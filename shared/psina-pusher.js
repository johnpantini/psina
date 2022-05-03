exports = function ({ query, headers, body }, response) {
  try {
    const payload = EJSON.parse(body.text());

    if (payload.event && payload.data) {
      const pusherCredentials = {
        appid: '[%#payload.appid%]',
        key: '[%#payload.key%]',
        secret: '[%#payload.secret%]',
        cluster: '[%#payload.cluster%]'
      };
      const timestamp = Math.floor(Date.now() / 1000);
      const pusherBody = JSON.stringify({
        name: payload.event,
        channel: 'psina',
        data: JSON.stringify(payload.data)
      });
      const crypto = require('crypto');
      const bodyMd5 = crypto.createHash('md5').update(pusherBody).digest('hex');

      let params = `auth_key=${pusherCredentials.key}&auth_timestamp=${timestamp}&auth_version=1.0&body_md5=${bodyMd5}`;
      const authSignature = utils.crypto.hmac(
        ['POST', `/apps/${pusherCredentials.appid}/events`, params].join('\n'),
        pusherCredentials.secret,
        'sha256',
        'hex'
      );

      params += `&auth_signature=${authSignature}`;

      context.http.post({
        url: `https://api-${pusherCredentials.cluster}.pusher.com/apps/${pusherCredentials.appid}/events?${params}`,
        body: pusherBody,
        headers: {
          'Content-Type': ['application/json']
        }
      });

      return '200 OK';
    } else {
      response.setStatusCode(422);

      return '422 Unprocessable Entity';
    }
  } catch (e) {
    response.setStatusCode(500);

    return '500 Internal Server Error';
  }
};
