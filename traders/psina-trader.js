const [
  { pppTraderInstanceForWorkerIs, Trader, GlobalTraderDatum, TraderEventDatum },
  { TRADER_DATUM, BROKERS, EXCHANGE, INSTRUMENT_DICTIONARY },
  { uuidv4 },
  { later },
  { AuthorizationError, ConnectionLimitExceededError }
] = await Promise.all([
  import(`${ppp.rootUrl}/lib/traders/trader-worker.js`),
  import(`${ppp.rootUrl}/lib/const.js`),
  import(`${ppp.rootUrl}/lib/ppp-crypto.js`),
  import(`${ppp.rootUrl}/lib/ppp-decorators.js`),
  import(`${ppp.rootUrl}/lib/ppp-exceptions.js`)
]);

export class PsinaTraderGlobalDatum extends GlobalTraderDatum {
  async subscribe(source, field, datum) {
    await this.trader.establishWebSocketConnection();

    return super.subscribe(source, field, datum);
  }
}

export class PositionsDatum extends PsinaTraderGlobalDatum {
  firstReferenceAdded() {
    if (this.trader.connection?.readyState === WebSocket.OPEN) {
      this.trader.connection.send(
        JSON.stringify({ action: 'subscribe', positions: true, balances: true })
      );
    }
  }

  async lastReferenceRemoved(source, symbol) {
    if (this.trader.connection?.readyState === WebSocket.OPEN) {
      this.trader.connection.send(
        JSON.stringify({
          action: 'unsubscribe',
          positions: true,
          balances: true
        })
      );
    }
  }

  valueKeyForData(data) {
    // oid can be @CLEAR.
    return data.S ?? data.oid;
  }

  filter(data, source, key, datum) {
    if (datum !== TRADER_DATUM.POSITION) {
      if (data.isBalance) {
        return data.S === source.getAttribute('balance');
      }

      return data.S === this.trader.getSymbol(source.instrument);
    } else {
      return true;
    }
  }

  [TRADER_DATUM.POSITION](data) {
    if (data.isBalance) {
      return {
        instrument: null,
        symbol: data.S,
        lot: 1,
        isCurrency: true,
        isBalance: true,
        size: data.p,
        accountId: null
      };
    } else {
      if (data.oid === '@CLEAR') {
        return {
          operationId: data.oid,
          instrument: null
        };
      }

      const instrument = this.trader.instruments.get(data.S);

      if (instrument) {
        return {
          instrument,
          symbol: data.S,
          lot: instrument.lot,
          exchange: instrument.exchange,
          averagePrice: data.a,
          isCurrency: false,
          isBalance: false,
          size: data.p,
          accountId: null
        };
      }
    }
  }

  [TRADER_DATUM.POSITION_SIZE](data) {
    return data.p;
  }

  [TRADER_DATUM.POSITION_AVERAGE](data) {
    if (!data.isBalance) {
      return data.a;
    }
  }
}

export class TimelineDatum extends PsinaTraderGlobalDatum {
  firstReferenceAdded() {
    if (this.trader.connection?.readyState === WebSocket.OPEN) {
      this.trader.connection.send(
        JSON.stringify({ action: 'subscribe', timeline: true })
      );
    }
  }

  async lastReferenceRemoved(source, symbol) {
    if (this.trader.connection?.readyState === WebSocket.OPEN) {
      this.trader.connection.send(
        JSON.stringify({ action: 'unsubscribe', timeline: true })
      );
    }
  }

  valueKeyForData(data) {
    if (data.oid === '@CLEAR') {
      return data.oid;
    }

    return `${data.oid}|${data.pid}`;
  }

  [TRADER_DATUM.TIMELINE_ITEM](data) {
    return {
      instrument: this.trader.instruments.get(data.S),
      symbol: data.S,
      accruedInterest: 0,
      operationId: data.oid,
      parentId: data.pid,
      type: data.t,
      quantity: data.q,
      commission: data.c,
      price: data.p,
      exchange: this.trader.getExchange(),
      createdAt: data.cat
    };
  }
}

export class ActiveOrderDatum extends PsinaTraderGlobalDatum {
  firstReferenceAdded() {
    if (this.trader.connection?.readyState === WebSocket.OPEN) {
      this.trader.connection.send(
        JSON.stringify({ action: 'subscribe', orders: true })
      );
    }
  }

  async lastReferenceRemoved(source, symbol) {
    if (this.trader.connection?.readyState === WebSocket.OPEN) {
      this.trader.connection.send(
        JSON.stringify({ action: 'unsubscribe', orders: true })
      );
    }
  }

  valueKeyForData(data) {
    // Can be @CLEAR as well.
    return data.oid;
  }

  [TRADER_DATUM.ACTIVE_ORDER](data) {
    return {
      instrument: this.trader.instruments.get(data.S),
      symbol: data.S,
      orderId: data.oid,
      orderType: data.k,
      side: data.s,
      status: data.st,
      placedAt: data.pat,
      quantity: data.q,
      filled: data.f,
      price: data.p
    };
  }
}

export class SprintDatum extends PsinaTraderGlobalDatum {
  firstReferenceAdded() {
    if (this.trader.connection?.readyState === WebSocket.OPEN) {
      this.trader.connection.send(
        JSON.stringify({ action: 'subscribe', sprint: true })
      );
    }
  }

  async lastReferenceRemoved(source, symbol) {
    if (this.trader.connection?.readyState === WebSocket.OPEN) {
      this.trader.connection.send(
        JSON.stringify({ action: 'unsubscribe', sprint: true })
      );
    }
  }

  valueKeyForData(data) {
    return data.cat;
  }

  [TRADER_DATUM.SPRINT](data) {
    return data;
  }
}

class PsinaTrader extends Trader {
  #pendingConnection;

  authenticated = false;

  connection;

  constructor(document) {
    super(document, [
      {
        type: PositionsDatum,
        datums: [
          TRADER_DATUM.POSITION,
          TRADER_DATUM.POSITION_SIZE,
          TRADER_DATUM.POSITION_AVERAGE
        ]
      },
      {
        type: TimelineDatum,
        datums: [TRADER_DATUM.TIMELINE_ITEM]
      },
      {
        type: ActiveOrderDatum,
        datums: [TRADER_DATUM.ACTIVE_ORDER]
      },
      {
        type: SprintDatum,
        datums: [TRADER_DATUM.SPRINT]
      },
      {
        type: TraderEventDatum,
        datums: [TRADER_DATUM.TRADER]
      }
    ]);
  }

  async establishWebSocketConnection(reconnect) {
    if (this.connection?.readyState === WebSocket.OPEN && this.authenticated) {
      this.#pendingConnection = void 0;

      return this.connection;
    } else if (this.#pendingConnection) {
      return this.#pendingConnection;
    } else {
      this.#pendingConnection = new Promise((resolve, reject) => {
        this.authenticated = false;
        this.connection = new WebSocket(this.document.wsUrl);

        this.connection.onclose = async () => {
          this.authenticated = false;
          this.connection.onclose = null;
          this.connection.onerror = null;
          this.connection.onmessage = null;

          await later(1000);

          this.#pendingConnection = void 0;

          await this.establishWebSocketConnection(true);
        };

        this.connection.onerror = () => this.connection.close();

        this.connection.onmessage = async ({ data }) => {
          const parsed = JSON.parse(data) ?? [];

          // Clear active orders on every pack.
          if (parsed.length && parsed[0].T === 'o') {
            this.datums[TRADER_DATUM.ACTIVE_ORDER].value.clear();
            this.datums[TRADER_DATUM.ACTIVE_ORDER].dataArrived({
              T: 'o',
              oid: '@CLEAR'
            });
          }

          for (const payload of parsed) {
            if (payload.msg === 'connected') {
              this.connection.send(
                JSON.stringify({
                  action: 'auth',
                  key: this.document.broker.login,
                  secret: this.document.broker.password
                })
              );

              break;
            } else if (payload.msg === 'authenticated') {
              this.authenticated = true;
              this.#pendingConnection = void 0;

              if (reconnect) {
                await this.resubscribe();
              }

              resolve(this.connection);

              break;
            } else if (payload.T === 's') {
              this.datums[TRADER_DATUM.SPRINT].dataArrived(payload);
            } else if (payload.T === 'b') {
              for (const currency in payload.b) {
                this.datums[TRADER_DATUM.POSITION].dataArrived({
                  T: 'b',
                  S: currency,
                  p: payload.b[currency],
                  isBalance: true
                });
              }
            } else if (payload.T === 'p') {
              payload.isBalance = false;

              this.datums[TRADER_DATUM.POSITION].dataArrived(payload, {
                doNotSaveValue: payload.oid === '@CLEAR'
              });
            } else if (payload.T === 'o') {
              this.datums[TRADER_DATUM.ACTIVE_ORDER].dataArrived(payload, {
                doNotSaveValue: payload.oid === '@CLEAR'
              });
            } else if (payload.T === 't') {
              this.datums[TRADER_DATUM.TIMELINE_ITEM].dataArrived(payload, {
                doNotSaveValue: payload.oid === '@CLEAR'
              });
            } else if (payload.T === 'error') {
              if (payload.code === 407) {
                continue;
              } else if (
                payload.code === 403 &&
                payload.msg === 'not ready yet'
              ) {
                // Restart silently.
                this.connection.close();
              } else if (payload.code === 406) {
                this.authenticated = false;
                this.connection.onclose = null;

                reject(new ConnectionLimitExceededError({ details: payload }));

                break;
              } else {
                this.authenticated = false;
                this.connection.onclose = null;

                reject(new AuthorizationError({ details: payload }));

                break;
              }
            }
          }
        };
      });

      this.#pendingConnection.then(() => {
        this.$$connection(
          'connection was established and this.#pendingConnection is now void 0'
        );

        this.#pendingConnection = void 0;
      });

      return this.#pendingConnection;
    }
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

  async setPayout(payout) {
    await this.establishWebSocketConnection();

    return this.connection.send(
      JSON.stringify({
        action: 'fetch',
        rid: uuidv4(),
        method: 'setPayout',
        payout
      })
    );
  }

  async setCEXForWithdrawal(values) {
    await this.establishWebSocketConnection();

    return this.connection.send(
      JSON.stringify({
        action: 'fetch',
        rid: uuidv4(),
        method: 'setCEXForWithdrawal',
        values
      })
    );
  }

  async call(data) {
    if (data.method === 'setPayout') {
      return this.setPayout(data.payout);
    } else if (data.method === 'setCEXForWithdrawal') {
      return this.setCEXForWithdrawal(data.values);
    }
  }
}

pppTraderInstanceForWorkerIs(PsinaTrader);

export default PsinaTrader;
