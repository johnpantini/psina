const serviceCredentials = [%#JSON.stringify(
  await (async () => {
    const [service] = await ppp.user.functions.aggregate(
      { collection: 'services' },
      [
        {
          $match: {
            _id: '@@SERVICE_ID'
          }
        },
        {
          $lookup: {
            from: 'apis',
            localField: 'supabaseApiId',
            foreignField: '_id',
            as: 'supabaseApi'
          }
        },
        {
          $unwind: '$supabaseApi'
        }
      ]
    );

    return {
      api: await ppp.decrypt(service.supabaseApi),
      tableName: `parsed_records_${service._id}`
    };
  })()
)%];

let symbolToFilter;

if (
  !this.document.disableInstrumentFiltering &&
  this.instrument &&
  this.instrumentTrader
) {
  symbolToFilter = this.instrumentTrader.getSymbol(this.instrument);
}

const query = `select ppp_counter, title, tickers, topic, date, priority from ${
  serviceCredentials.tableName
} ${
  symbolToFilter ? `where tickers ~* '\\y${symbolToFilter}\\y'` : ''
} order by date desc limit 50;`;

const { hostname } = new URL(serviceCredentials.api.url);

const [results] =
  (
    await (
      await fetch(
        new URL('pg', ppp.keyVault.getKey('service-machine-url')).toString(),
        {
          method: 'POST',
          body: JSON.stringify({
            query,
            connectionString: `postgres://${
              serviceCredentials.api.user
            }:${encodeURIComponent(
              serviceCredentials.api.password
            )}@db.${hostname}:${serviceCredentials.api.port}/${
              serviceCredentials.api.db
            }`
          })
        }
      )
    ).json()
  ).results ?? [];

const fieldIndices = {};

results.fields.forEach((f, index) => {
  fieldIndices[f.fieldName] = index;
});

return results.rows.map((r) => {
  return {
    ppp_counter: r[fieldIndices['ppp_counter']],
    title: r[fieldIndices['title']],
    tickers: r[fieldIndices['tickers']],
    topic: r[fieldIndices['topic']],
    date: r[fieldIndices['date']],
    priority: r[fieldIndices['priority']]
  };
});
