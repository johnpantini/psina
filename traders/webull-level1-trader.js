const [
  { pppTraderInstanceForWorkerIs, Trader, TraderDatum },
  { TRADER_DATUM, BROKERS, EXCHANGE, INSTRUMENT_DICTIONARY },
  { comboStatusToTradingStatus },
  { getAspirantWorkerBaseUrl }
] = await Promise.all([
  import(`${ppp.rootUrl}/lib/traders/trader-worker.js`),
  import(`${ppp.rootUrl}/lib/const.js`),
  import(`${ppp.rootUrl}/lib/traders/alpaca-v2-plus.js`),
  import(`${ppp.rootUrl}/elements/pages/service-ppp-aspirant-worker.js`)
]);

window.addEventListener('message', (e) => {
  console.log(e);
});

let isCORSEnabled = false;

try {
  await fetch(
    'https://quotes-gw.webullfintech.com/api/stock/tickerRealTime/getQuote?tickerId=1',
    {
      mode: 'cors'
    }
  );
} catch (e) {
  isCORSEnabled = true;
}

const isValidNumberValue = (n) => {
  return !!n && !isNaN(parseFloat(n));
};

export class Level1Datum extends TraderDatum {
  #timer;

  #shouldLoop = false;

  #loopOnceFlag = false;

  firstReferenceAdded() {
    this.#shouldLoop = true;

    if (!this.#loopOnceFlag) {
      clearTimeout(this.#timer);

      this.#loopOnceFlag = true;

      return this.#fetchLoop();
    }
  }

  lastReferenceRemoved() {
    if (!this.symbols.length) {
      clearTimeout(this.#timer);

      this.#loopOnceFlag = false;
      this.#shouldLoop = false;
    }
  }

  get symbols() {
    const symbols = new Set();

    for (const datum in this.sources) {
      for (const [source] of this.sources[datum]) {
        if (source.instrument) {
          symbols.add(source.instrument.symbol);
        }
      }
    }

    return Array.from(symbols);
  }

  async #fetchLoop() {
    if (this.#shouldLoop) {
      try {
        const symbols = this.symbols;

        if (symbols.length) {
          for (const symbol of symbols) {
            const value = this.trader.internalDictionary?.[symbol];

            if (!value) {
              let webullSearchResponse;

              if (this.trader.document.connectorServiceId) {
                const connectorUrl = await getAspirantWorkerBaseUrl(
                  this.trader.document.connectorService
                );

                webullSearchResponse = await fetch(`${connectorUrl}fetch`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    method: 'GET',
                    url: `https://quotes-gw.webullfintech.com/api/search/pc/tickers?keyword=${symbol}&pageIndex=1&pageSize=20`,
                    headers: this.trader.webullHeaders()
                  })
                });
              } else {
                if (isCORSEnabled) {
                  webullSearchResponse = await ppp.fetch(
                    `https://quotes-gw.webullfintech.com/api/search/pc/tickers?keyword=${symbol}&pageIndex=1&pageSize=20`,
                    {
                      headers: this.trader.webullHeaders()
                    }
                  );
                } else {
                  webullSearchResponse = await fetch(
                    `https://quotes-gw.webullfintech.com/api/search/pc/tickers?keyword=${symbol}&pageIndex=1&pageSize=20`,
                    {
                      headers: this.trader.webullHeaders()
                    }
                  );
                }
              }

              if (!webullSearchResponse.ok) {
                continue;
              } else {
                const data = await webullSearchResponse.json();

                if (data?.data) {
                  const [webullStock] = data.data.filter(
                    (s) =>
                      s.disSymbol === symbol &&
                      s.currencyCode === 'USD' &&
                      s.regionCode === 'US'
                  );

                  if (webullStock) {
                    this.trader.addNewStockToDictionary(
                      symbol,
                      webullStock.tickerId
                    );
                  }
                }
              }
            }
          }

          let quotesResponse;

          if (this.trader.document.connectorServiceId) {
            const connectorUrl = await getAspirantWorkerBaseUrl(
              this.trader.document.connectorService
            );

            quotesResponse = await fetch(`${connectorUrl}fetch`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                method: 'GET',
                url: `https://quotes-gw.webullfintech.com/api/bgw/quote/realtime?ids=${symbols
                  .map((s) => this.trader.internalDictionary[s])
                  .join(',')}&includeSecu=1&delay=0&more=1`,
                headers: this.trader.webullHeaders()
              })
            });
          } else {
            if (isCORSEnabled) {
              quotesResponse = await ppp.fetch(
                `https://quotes-gw.webullfintech.com/api/bgw/quote/realtime?ids=${symbols
                  .map((s) => this.trader.internalDictionary[s])
                  .join(',')}&includeSecu=1&delay=0&more=1`,
                {
                  headers: this.trader.webullHeaders()
                }
              );
            } else {
              quotesResponse = await fetch(
                `https://quotes-gw.webullfintech.com/api/bgw/quote/realtime?ids=${symbols
                  .map((s) => this.trader.internalDictionary[s])
                  .join(',')}&includeSecu=1&delay=0&more=1`,
                {
                  headers: this.trader.webullHeaders()
                }
              );
            }
          }

          if (quotesResponse.ok) {
            const data = await quotesResponse.json();

            if (Array.isArray(data)) {
              for (const d of data) {
                this.dataArrived(d, this.trader.instruments.get(d.symbol));
              }
            }
          }
        }

        this.#timer = setTimeout(
          () => {
            this.#fetchLoop();
          },
          this.trader.document.connectorServiceId || !isCORSEnabled
            ? 1000
            : 5000
        );
      } catch (e) {
        console.error(e);

        this.#timer = setTimeout(
          () => {
            this.#fetchLoop();
          },
          this.trader.document.connectorServiceId || !isCORSEnabled
            ? 1000
            : 5000
        );
      }
    }
  }

  filter(data, instrument, source, datum) {
    if (
      [
        TRADER_DATUM.LAST_PRICE,
        TRADER_DATUM.LAST_PRICE_RELATIVE_CHANGE,
        TRADER_DATUM.LAST_PRICE_ABSOLUTE_CHANGE,
        TRADER_DATUM.EXTENDED_LAST_PRICE,
        TRADER_DATUM.EXTENDED_LAST_PRICE_ABSOLUTE_CHANGE,
        TRADER_DATUM.EXTENDED_LAST_PRICE_RELATIVE_CHANGE,
        TRADER_DATUM.DAY_VOLUME,
        TRADER_DATUM.TRADING_STATUS,
        TRADER_DATUM.STATUS
      ].includes(datum)
    ) {
      let predicate = false;

      switch (datum) {
        case TRADER_DATUM.LAST_PRICE:
          predicate = isValidNumberValue(data.close);

          break;
        case TRADER_DATUM.LAST_PRICE_ABSOLUTE_CHANGE:
          predicate = isValidNumberValue(data.change);

          break;
        case TRADER_DATUM.LAST_PRICE_RELATIVE_CHANGE:
          predicate = isValidNumberValue(data.changeRatio);

          break;
        case TRADER_DATUM.EXTENDED_LAST_PRICE:
          predicate = isValidNumberValue(data.pPrice);

          break;
        case TRADER_DATUM.EXTENDED_LAST_PRICE_ABSOLUTE_CHANGE:
          predicate = isValidNumberValue(data.pChange);

          break;
        case TRADER_DATUM.EXTENDED_LAST_PRICE_RELATIVE_CHANGE:
          predicate = isValidNumberValue(data.pChRatio);

          break;
        case TRADER_DATUM.DAY_VOLUME:
          predicate = isValidNumberValue(data.volume);

          break;

        case TRADER_DATUM.TRADING_STATUS:
        case TRADER_DATUM.STATUS:
          predicate = true;
      }

      return (
        predicate &&
        [EXCHANGE.US, EXCHANGE.UTEX_MARGIN_STOCKS].includes(
          source?.instrument?.exchange
        )
      );
    } else {
      return [EXCHANGE.SPBX, EXCHANGE.US, EXCHANGE.UTEX_MARGIN_STOCKS].includes(
        source?.instrument?.exchange
      );
    }
  }

  [TRADER_DATUM.LAST_PRICE](data) {
    return parseFloat(data.close);
  }

  [TRADER_DATUM.LAST_PRICE_ABSOLUTE_CHANGE](data) {
    return parseFloat(data.change);
  }

  [TRADER_DATUM.LAST_PRICE_RELATIVE_CHANGE](data) {
    return parseFloat(data.changeRatio) * 100;
  }

  [TRADER_DATUM.EXTENDED_LAST_PRICE](data) {
    return parseFloat(data.pPrice);
  }

  [TRADER_DATUM.EXTENDED_LAST_PRICE_ABSOLUTE_CHANGE](data) {
    return parseFloat(data.pChange);
  }

  [TRADER_DATUM.EXTENDED_LAST_PRICE_RELATIVE_CHANGE](data) {
    return parseFloat(data.pChRatio) * 100;
  }

  [TRADER_DATUM.DAY_VOLUME](data) {
    return parseFloat(data.volume);
  }

  [TRADER_DATUM.TRADING_STATUS](data) {
    return comboStatusToTradingStatus(data.tradeStatus);
  }

  [TRADER_DATUM.STATUS](data) {
    return comboStatusToTradingStatus(data.status);
  }
}

class WebullLevel1Trader extends Trader {
  internalDictionary;

  constructor(document) {
    super(document, [
      {
        type: Level1Datum,
        datums: [
          TRADER_DATUM.LAST_PRICE,
          TRADER_DATUM.LAST_PRICE_ABSOLUTE_CHANGE,
          TRADER_DATUM.LAST_PRICE_RELATIVE_CHANGE,
          TRADER_DATUM.EXTENDED_LAST_PRICE,
          TRADER_DATUM.EXTENDED_LAST_PRICE_ABSOLUTE_CHANGE,
          TRADER_DATUM.EXTENDED_LAST_PRICE_RELATIVE_CHANGE,
          TRADER_DATUM.DAY_VOLUME,
          TRADER_DATUM.TRADING_STATUS,
          TRADER_DATUM.STATUS
        ]
      }
    ]);
  }

  webullHeaders() {
    return {
      app: 'global',
      'app-group': 'broker',
      appid: 'wb_web_app',
      'device-type': 'Web',
      did: this.document.deviceID,
      hl: 'en',
      os: 'web',
      osv: 'i9zh',
      platform: 'web',
      reqid: [...Array(32)]
        .map(() => Math.floor(Math.random() * 16).toString(16))
        .join(''),
      t_time: Date.now(),
      tz: 'America/New_York',
      ver: '4.9.2'
    };
  }

  async oneTimeInitializationCallback() {
    this.internalDictionary = JSON.parse(
      localStorage.getItem(`internal-dictionary-${this.document._id}`)
    );
  }

  addNewStockToDictionary(symbol, tickerId) {
    this.internalDictionary ??= {};
    this.internalDictionary[symbol] = tickerId;

    localStorage.setItem(
      `internal-dictionary-${this.document._id}`,
      JSON.stringify(this.internalDictionary)
    );
  }

  getExchange() {
    return EXCHANGE.US;
  }

  getObservedAttributes() {
    return ['balance'];
  }

  getDictionary() {
    return INSTRUMENT_DICTIONARY.PSINA_US_STOCKS;
  }

  getBroker() {
    return BROKERS.PSINA;
  }
}

pppTraderInstanceForWorkerIs(WebullLevel1Trader);

export default WebullLevel1Trader;
