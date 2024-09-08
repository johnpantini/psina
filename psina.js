const http = require('http');
const https = require('https');

async function fetch4(url, options = {}) {
  const u = new URL(url);

  return new Promise(async (resolve, reject) => {
    const requestOptions = {
      hostname: u.hostname,
      port: 443,
      path: u.pathname + u.search,
      method: options.method,
      family: 4,
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
          error,
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

async function $fetch(request, response) {
  if (!/post/i.test(request.method)) {
    return response.writeHead(405).end();
  }

  const buffers = [];

  for await (const chunk of request) {
    buffers.push(chunk);
  }

  try {
    const body = JSON.parse(Buffer.concat(buffers).toString());
    const headers = body.headers ?? {};
    const requestOptions = {
      method: body.method?.toUpperCase() ?? request.method.toUpperCase(),
      headers
    };

    if (typeof body.body === 'string') {
      requestOptions.body = body.body;
    } else if (body.body && typeof body.body === 'object') {
      requestOptions.body = JSON.stringify(body.body);
    }

    if (
      requestOptions.body &&
      typeof requestOptions.headers['Content-Length'] === 'undefined'
    )
      requestOptions.headers['Content-Length'] = Buffer.byteLength(
        requestOptions.body
      );

    const fetchResponse = await fetch4(body.url, requestOptions);
    const ct = fetchResponse.headers['content-type'];

    if (ct) response.setHeader('Content-Type', ct);

    const headersToInclude = [];

    if (Array.isArray(body.headersToInclude)) {
      for (const header of body.headersToInclude) {
        headersToInclude.push({
          header,
          value: fetchResponse.headers[header]
        });
      }
    }

    response.writeHead(fetchResponse.status);

    if (headersToInclude.length) {
      response.write(
        JSON.stringify({
          headers: headersToInclude,
          response: fetchResponse.responseText
        })
      );
    } else {
      response.write(fetchResponse.responseText);
    }

    response.end();
  } catch (e) {
    console.error(e);

    response.setHeader('Content-Type', 'application/json; charset=UTF-8');
    response.writeHead(400);
    response.write(
      JSON.stringify({
        error: {
          message: e.message
        }
      })
    );
    response.end();
  }
}

const server = http
  .createServer(async (request, response) => {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, OPTIONS, PUT, PATCH, DELETE'
    );
    response.setHeader('Access-Control-Allow-Headers', '*');

    if (/options/i.test(request.method)) {
      return response.writeHead(200).end();
    }

    switch (request.url) {
      case '/':
        response.setHeader('Content-Type', 'application/json;charset=UTF-8');
        response.write(
          JSON.stringify({
            ok: true,
            result: {
              env: {
                PPP_WORKER_ID: 'PSINA_PUBLIC_TOOLKIT'
              }
            }
          })
        );
        response.end();

        break;
      case '/fetch':
        return $fetch(request, response);
      default:
        response.writeHead(404).end();
    }
  })
  .listen(process.env.PORT ?? 9998);
