const { environmentCode, environmentCodeSecret } = [%#JSON.stringify(
  await (async () => {
    const service = await ppp.user.functions.findOne(
      { collection: 'services' },
      { _id: '@@SERVICE_ID' }
    );

    return await ppp.decrypt(service);
  })()
)%];

const { ASTRA_DB_ID, ASTRA_DB_REGION, ASTRA_DB_KEYSPACE } =
  JSON.parse(environmentCode);
const { ASTRA_DB_APPLICATION_TOKEN } = JSON.parse(environmentCodeSecret);

let symbolToFilter;

if (
  !this.document.disableInstrumentFiltering &&
  this.instrument &&
  this.instrumentTrader
) {
  symbolToFilter = this.instrumentTrader.getSymbol(this.instrument);
}

const serviceMachineUrl = ppp.keyVault.getKey('service-machine-url');
const where = encodeURIComponent(
  JSON.stringify(
    symbolToFilter
      ? {
          T: {
            $eq: 's'
          },
          S: {
            $contains: symbolToFilter
          }
        }
      : {
          T: {
            $eq: 's'
          }
        }
  ).replaceAll(' ', '%20')
);

const statuses = await (
  await fetch(new URL('fetch', serviceMachineUrl).toString(), {
    method: 'POST',
    body: JSON.stringify({
      method: 'GET',
      url: `https://${ASTRA_DB_ID}-${ASTRA_DB_REGION}.apps.astra.datastax.com/api/rest/v2/keyspaces/${ASTRA_DB_KEYSPACE}/us_news?page-size=50&where=${where}`,
      headers: {
        'X-Cassandra-Token': ASTRA_DB_APPLICATION_TOKEN
      }
    })
  })
).json();

return statuses?.data ?? [];