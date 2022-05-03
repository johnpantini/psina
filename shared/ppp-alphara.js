const https = require('https');

function fetch(url, options = {}) {
  const u = new URL(url);

  return new Promise(async (resolve, reject) => {
    const requestOptions = {
      hostname: u.hostname,
      port: 443,
      path: u.pathname + u.search,
      method: options.method,
      headers: options.headers
    };

    const req = https.request(requestOptions, async (res) => {
      try {
        let responseText = '';

        for await (const chunk of res) {
          responseText += chunk;
        }

        resolve({
          responseText,
          headers: res.headers,
          status: res.statusCode,
          url
        });
      } catch (error) {
        reject({
          responseText: error.toString(),
          headers: res.headers,
          status: res.statusCode,
          url
        });
      }
    });

    req.on('error', (error) => reject(error));

    if (options.body) req.write(options.body);

    req.end();
  });
}

let jwt;

function isTokenExpired(jwtToken) {
  if (jwtToken) {
    try {
      const [, payload] = jwtToken.split('.');
      const { exp: expires } = JSON.parse(
        Buffer.from(payload, 'base64').toString()
      );

      if (typeof expires === 'number') {
        return Date.now() + 1000 >= expires * 1000;
      }
    } catch {
      return true;
    }
  }

  return true;
}

async function syncAlorAccessToken() {
  if (jwt && !isTokenExpired(jwt)) return true;

  const jwtRequest = await fetch(
    `https://oauth.alor.ru/refresh?token=${process.env.ALOR_TOKEN}`,
    {
      method: 'POST'
    }
  );
  const json = JSON.parse(jwtRequest.responseText);

  jwt = json.AccessToken;

  return false;
}

module.exports.teeth = async function (event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405
    };
  }

  const body = JSON.parse(event.body);

  if (!body?.code) {
    return {
      statusCode: 422
    };
  }

  await syncAlorAccessToken();

  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

  return {
    statusCode: 200,
    body: JSON.stringify(
      await new AsyncFunction('event', 'context', 'fetch', 'jwt', body.code)(
        event,
        context,
        fetch,
        jwt
      )
    ),
    headers: {
      'Content-Type': 'application/json'
    }
  };
};
