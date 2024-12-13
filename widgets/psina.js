/** @decorator */

const [
  {
    Widget,
    widgetStyles,
    widgetDefaultHeaderTemplate,
    widgetStackSelectorTemplate
  },
  { WidgetColumns },
  { css, html, ref, when, observable, repeat },
  {
    formatDate,
    formatNumber,
    formatAmount,
    formatPercentage,
    formatAbsoluteChange
  },
  { WIDGET_TYPES, TRADER_DATUM, COLUMN_SOURCE },
  { later },
  { uuidv4 },
  { normalize, typography, getTraderSelectOptionColor }
] = await Promise.all([
  import(`${ppp.rootUrl}/elements/widget.js`),
  import(`${ppp.rootUrl}/elements/widget-columns.js`),
  import(`${ppp.rootUrl}/vendor/fast-element.min.js`),
  import(`${ppp.rootUrl}/lib/intl.js`),
  import(`${ppp.rootUrl}/lib/const.js`),
  import(`${ppp.rootUrl}/lib/ppp-decorators.js`),
  import(`${ppp.rootUrl}/lib/ppp-crypto.js`),
  import(`${ppp.rootUrl}/design/styles.js`),
  import(`${ppp.rootUrl}/elements/banner.js`),
  import(`${ppp.rootUrl}/elements/button.js`),
  import(`${ppp.rootUrl}/elements/snippet.js`),
  import(`${ppp.rootUrl}/elements/tabs.js`),
  import(`${ppp.rootUrl}/elements/text-field.js`),
  import(`${ppp.rootUrl}/elements/query-select.js`),
  import(`${ppp.rootUrl}/elements/widget-controls.js`)
]);

export function getSprintStatusColorStyle(status, dot = false) {
  switch (status) {
    case 'active':
      return dot ? 'dot-2' : 'positive';
    case 'paused':
      return dot ? 'dot-4' : 'earth';
    case 'stopped':
      return dot ? 'dot-5' : 'negative';
    case 'closed':
      return dot ? 'dot-3' : 'alien';
    case 'finished':
      return dot ? 'dot-1' : 'ocean';
    default:
      return '';
  }
}

export function sprintStatusToText(status) {
  switch (status) {
    case 'active':
      return 'Активен';
    case 'paused':
      return 'Пауза';
    case 'stopped':
      return 'Остановлен';
    case 'closed':
      return 'Закрыт';
    case 'finished':
      return 'Завершён';
    default:
      return 'Неизвестно';
  }
}

export const psinaWidgetTemplate = html`
  <template>
    <div class="widget-root">
      ${widgetDefaultHeaderTemplate()}
      <div class="widget-body">
        ${widgetStackSelectorTemplate()}
        <ppp-widget-empty-state-control
          loading
          ?hidden="${(x) => !(x?.loading || !x?.initialized)}"
        >
          ${() => ppp.t('$widget.emptyState.loading')}
        </ppp-widget-empty-state-control>
        <ppp-widget-empty-state-control
          ?hidden="${(x) => {
            if (x?.loading || !x?.initialized) {
              return true;
            } else {
              return x?.sprintTrader;
            }
          }}"
        >
          ${() => 'Трейдер спринта не задан в настройках.'}
        </ppp-widget-empty-state-control>
        <ppp-widget-empty-state-control
          ?hidden="${(x) => {
            if (x?.loading || !x?.initialized || !x?.sprintTrader) {
              return true;
            }

            return x?.sprint;
          }}"
        >
          ${() =>
            'Здесь появится информация о спринте, когда он станет доступен.'}
        </ppp-widget-empty-state-control>
        ${when(
          (x) => !x?.loading && x?.initialized && x?.sprintTrader && x?.sprint,
          html`
            <ppp-widget-tabs>
              <ppp-widget-tab id="srpint">Спринт</ppp-widget-tab>
              <ppp-widget-tab id="settings">Настройки</ppp-widget-tab>
              <ppp-widget-tab id="history" disabled>История</ppp-widget-tab>
              <ppp-tab-panel id="sprint-panel">
                <div class="widget-flex-column-content">
                  <div class="widget-body-inner">
                    <div class="widget-margin-spacer"></div>
                    <div class="widget-section">
                      <div class="widget-section-h1">
                        <span
                          class="dot ${(x) =>
                            getSprintStatusColorStyle(x.sprint.s, true)}"
                        ></span>
                        <span>${(x) => `Спринт #${x.sprint.c}`}</span>
                      </div>
                    </div>
                    <div class="widget-section">
                      <div class="widget-section-h1">
                        <span>Стартовые балансы</span>
                      </div>
                    </div>
                    <div class="widget-section">
                      <div class="widget-summary">
                        ${repeat(
                          (x) => x.initialBalances,
                          html`
                            <div class="widget-summary-line">
                              <div class="control-line balance-line">
                                <span
                                  :trader="${(x, c) => c.parent.sprintTrader}"
                                  :payload="${(x) => {
                                    return {
                                      symbol: x[0]
                                    };
                                  }}"
                                  :column="${(x, c) =>
                                    c.parent.columnsBySource.get(
                                      COLUMN_SOURCE.INSTRUMENT
                                    )}"
                                >
                                  ${(x, c) =>
                                    c.parent.columns.columnElement(
                                      c.parent.columnsBySource.get(
                                        COLUMN_SOURCE.INSTRUMENT
                                      ),
                                      x[0]
                                    )}
                                </span>
                              </div>
                              <span>
                                <span class="positive">
                                  ${(x) =>
                                    formatAmount(
                                      x[1],
                                      {
                                        currency: x[0]
                                      },
                                      {
                                        minimumFractionDigits: 1,
                                        maximumFractionDigits: 1
                                      }
                                    )}
                                </span>
                              </span>
                            </div>
                          `
                        )}
                      </div>
                    </div>
                    <div class="widget-margin-spacer"></div>
                    <div class="widget-section">
                      <div class="widget-summary">
                        <div class="widget-summary-line">
                          <div class="control-line">
                            <span>Трейдер</span>
                          </div>
                          <span>${(x) => x.sprintTrader.document.name}</span>
                        </div>
                        <div class="widget-summary-line">
                          <div class="control-line">
                            <span>Статус</span>
                          </div>
                          <span
                            class="${(x) =>
                              getSprintStatusColorStyle(x.sprint.s)}"
                          >
                            ${(x) => sprintStatusToText(x.sprint.s)}
                          </span>
                        </div>
                        <div class="widget-summary-line">
                          <div class="control-line">
                            <span>Дата старта</span>
                          </div>
                          <span>${(x) => formatDate(x.sprint.cat)}</span>
                        </div>
                        <div class="widget-summary-line">
                          <div class="control-line">
                            <span>Виртуальный счёт</span>
                          </div>
                          <span>
                            <span>${(x) => (x.sprint.ip ? 'Да' : 'Нет')}</span>
                          </span>
                        </div>
                        <div class="widget-summary-line">
                          <div class="control-line">
                            <span>Заявок выставлено</span>
                          </div>
                          <span>
                            <span>${(x) => formatNumber(x.sprint.plo)}</span>
                          </span>
                        </div>
                        <div class="widget-summary-line">
                          <div class="control-line">
                            <span>Заявок отменено</span>
                          </div>
                          <span>
                            <span>${(x) => formatNumber(x.sprint.cro)}</span>
                          </span>
                        </div>
                        <div class="widget-summary-line">
                          <div class="control-line">
                            <span>Бонусный баланс</span>
                          </div>
                          <span>
                            <span>
                              ${(x) =>
                                formatAmount(x.sprint.bb, {
                                  currency: 'USD'
                                })}
                            </span>
                          </span>
                        </div>
                        <div class="widget-summary-line">
                          <div class="control-line">
                            <span>Моя доля</span>
                          </div>
                          <span>
                            <span>
                              ${(x) => formatPercentage(x.sprint.fr / 100)}
                            </span>
                          </span>
                        </div>
                        <div class="widget-summary-line">
                          <div class="control-line">
                            <span>Расходы на энергию</span>
                          </div>
                          <span>
                            <span>
                              ${(x) =>
                                typeof x.sprint.fee === 'number'
                                  ? formatPercentage(x.sprint.fee / 100)
                                  : 'TBD'}
                            </span>
                          </span>
                        </div>
                        <div class="widget-summary-line">
                          <div class="control-line">
                            <span>Доступно к выводу</span>
                          </div>
                          <span>
                            <span>
                              ${(x) =>
                                x.sprint.s !== 'closed'
                                  ? 'TBD'
                                  : formatAmount(x.sprint.wav, {
                                      currency: 'USD'
                                    })}
                            </span>
                          </span>
                        </div>
                        <div class="widget-summary-line">
                          <div class="control-line">
                            <span>На вывод</span>
                          </div>
                          <span>
                            <span>
                              ${(x) =>
                                typeof x.sprint.wam !== 'number'
                                  ? 'Авто'
                                  : formatAmount(x.sprint.wam, {
                                      currency: 'USD'
                                    })}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div class="widget-margin-spacer"></div>
                    <div class="widget-section">
                      <div class="widget-section-h1">
                        <span>Мой PnL</span>
                      </div>
                    </div>
                    <div class="widget-section">
                      <div class="widget-summary">
                        ${repeat(
                          (x) => x.pnl,
                          html`
                            <div class="widget-summary-line">
                              <div class="control-line balance-line">
                                <span
                                  :trader="${(x, c) => c.parent.sprintTrader}"
                                  :payload="${(x) => {
                                    return {
                                      symbol: x[0]
                                    };
                                  }}"
                                  :column="${(x, c) =>
                                    c.parent.columnsBySource.get(
                                      COLUMN_SOURCE.INSTRUMENT
                                    )}"
                                >
                                  ${(x, c) =>
                                    c.parent.columns.columnElement(
                                      c.parent.columnsBySource.get(
                                        COLUMN_SOURCE.INSTRUMENT
                                      ),
                                      x[0]
                                    )}
                                </span>
                              </div>
                              <span>
                                <span
                                  class="${(x) =>
                                    x[1] > 0
                                      ? 'positive'
                                      : x[1] < 0
                                      ? 'negative'
                                      : ''}"
                                >
                                  ${(x) =>
                                    formatAbsoluteChange(
                                      x[1],
                                      {
                                        symbol: x[0],
                                        currency: x[0]
                                      },
                                      {
                                        maximumFractionDigits: 2
                                      }
                                    )}
                                </span>
                              </span>
                            </div>
                          `
                        )}
                      </div>
                    </div>
                  </div>
                  <div class="widget-footer">
                    <div class="widget-section">
                      <div class="widget-subsection">
                        <ppp-widget-trifecta-field
                          ?disabled="${(x) => x.sprint.s !== 'closed'}"
                          :instrument="${(x) => {
                            return {
                              type: 'currency',
                              lot: 1,
                              minPriceIncrement: 1,
                              currency: 'USD'
                            };
                          }}"
                          kind="price"
                          placeholder="Авто"
                        ></ppp-widget-trifecta-field>
                      </div>
                    </div>
                    <div class="widget-margin-spacer"></div>
                    <div class="widget-section">
                      <div class="widget-subsection">
                        <div class="widget-button-line">
                          <ppp-widget-button
                            appearance="primary"
                            ?disabled="${(x) => x.sprint.s !== 'closed'}"
                          >
                            Обновить заявку на вывод
                          </ppp-widget-button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </ppp-tab-panel>
              <ppp-tab-panel id="settings-panel">
                <div class="widget-body-inner">
                  <div class="widget-margin-spacer"></div>
                  <div class="widget-section">
                    <div class="widget-section-h1">
                      <span>Параметры выплат</span>
                    </div>
                  </div>
                  <div class="widget-section">
                    <div class="widget-text-label">
                      Автовыводимая прибыль, %
                    </div>
                    <ppp-widget-text-field
                      autocomplete="off"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      lotsize="1"
                      placeholder="0"
                      value=${(x) => x.sprint?.pa || ''}
                      ${ref('payout')}
                    >
                    </ppp-widget-text-field>
                  </div>
                  <div class="widget-margin-spacer"></div>
                  <div class="widget-section">
                    <div class="widget-subsection">
                      <div class="widget-button-line">
                        <ppp-widget-button
                          appearance="primary"
                          @click="${(x) => x.setPayout(x.payout.value)}"
                          ${ref('payoutButton')}
                        >
                          Сохранить параметры выплат
                        </ppp-widget-button>
                      </div>
                    </div>
                  </div>
                  <div class="widget-margin-spacer"></div>
                  <div class="widget-margin-spacer"></div>
                  <div class="widget-section">
                    <div class="widget-section-h1">
                      <span>Счета криптобирж</span>
                    </div>
                  </div>
                  <div class="widget-section">
                    <div class="widget-text-label">Binance</div>
                    <ppp-widget-text-field
                      type="number"
                      autocomplete="off"
                      placeholder="Нет"
                      value=${(x) => x.sprint?.cr?.bn || ''}
                      ${ref('binance')}
                    >
                    </ppp-widget-text-field>
                  </div>
                  <div class="widget-margin-spacer"></div>
                  <div class="widget-section">
                    <div class="widget-text-label">Bybit</div>
                    <ppp-widget-text-field
                      type="number"
                      autocomplete="off"
                      placeholder="Нет"
                      value=${(x) => x.sprint?.cr?.by || ''}
                      ${ref('bybit')}
                    >
                    </ppp-widget-text-field>
                  </div>
                  <div class="widget-margin-spacer"></div>
                  <div class="widget-section">
                    <div class="widget-text-label">OKX</div>
                    <ppp-widget-text-field
                      type="number"
                      autocomplete="off"
                      placeholder="Нет"
                      value=${(x) => x.sprint?.cr?.okx || ''}
                      ${ref('okx')}
                    >
                    </ppp-widget-text-field>
                  </div>
                  <div class="widget-margin-spacer"></div>
                  <div class="widget-section">
                    <div class="widget-text-label">KuCoin</div>
                    <ppp-widget-text-field
                      type="number"
                      autocomplete="off"
                      placeholder="Нет"
                      value=${(x) => x.sprint?.cr?.ku || ''}
                      ${ref('kucoin')}
                    >
                    </ppp-widget-text-field>
                  </div>
                  <div class="widget-margin-spacer"></div>
                  <div class="widget-section">
                    <div class="widget-text-label">MEXC</div>
                    <ppp-widget-text-field
                      type="number"
                      autocomplete="off"
                      placeholder="Нет"
                      value=${(x) => x.sprint?.cr?.mxc || ''}
                      ${ref('mexc')}
                    >
                    </ppp-widget-text-field>
                  </div>
                  <div class="widget-margin-spacer"></div>
                  <div class="widget-section">
                    <div class="widget-subsection">
                      <div class="widget-button-line">
                        <ppp-widget-button
                          appearance="primary"
                          @click="${(x) =>
                            x.setCEXForWithdrawal({
                              binance: x.binance.value,
                              bybit: x.bybit.value,
                              okx: x.okx.value,
                              kucoin: x.kucoin.value,
                              mexc: x.mexc.value
                            })}"
                          ${ref('cexButton')}
                        >
                          Сохранить счета
                        </ppp-widget-button>
                      </div>
                    </div>
                  </div>
                  <div class="widget-margin-spacer"></div>
                </div>
              </ppp-tab-panel>
              <ppp-tab-panel id="history-panel"> </ppp-tab-panel>
            </ppp-widget-tabs>
          `
        )}
      </div>
      <ppp-widget-notifications-area></ppp-widget-notifications-area>
      <ppp-widget-resize-controls></ppp-widget-resize-controls>
    </div>
  </template>
`;

export const psinaWidgetStyles = css`
  ${normalize()}
  ${widgetStyles()}
  ${typography()}
  .balance-line {
    align-items: center;
  }
`;

export class IndividualSymbolSource {
  /**
   * @type {PsinaWidget}
   */
  parent;

  sourceID = uuidv4();

  currency;

  symbol;

  instrument;

  constructor(parent, currency, symbol, instrument) {
    this.parent = parent;
    this.instrument = instrument;
    this.currency = currency;
    this.symbol = symbol;
  }

  @observable
  lastPrice;

  lastPriceChanged(oldValue, newValue) {
    this.parent.referencePrices.get(this.currency).get(this.symbol).price =
      newValue;

    return this.parent.recalcPersonalPnL();
  }

  @observable
  extendedLastPrice;

  extendedLastPriceChanged(oldValue, newValue) {
    this.parent.referencePrices.get(this.currency).get(this.symbol).price =
      newValue;

    return this.parent.recalcPersonalPnL();
  }
}

export class PsinaWidget extends Widget {
  @observable
  initialized;

  @observable
  sprintTrader;

  @observable
  level1Trader;

  @observable
  initialBalances;

  @observable
  finalBalances;

  @observable
  pnl;

  /**
   * @type {WidgetColumns}
   */
  @observable
  columns;

  columnsBySource = new Map();

  referencePrices = new Map();

  sprintApplication;

  @observable
  sprint;

  sprintChanged() {
    if (this.sprint) {
      this.initialBalances = this.sprint.ib;
      this.finalBalances = this.sprint.fb;

      this.recalcPersonalPnL();
    }
  }

  positions = new Map();

  balances = new Map();

  @observable
  position;

  positionChanged(oldValue, newValue) {
    if (newValue?.oid === '@CLEAR') {
      this.positions.clear();

      return this.recalcPersonalPnL();
    }

    if (!newValue.isBalance) {
      const currency = newValue.instrument?.currency;

      if (!currency) {
        return;
      }

      if (!this.positions.has(currency)) {
        this.positions.set(currency, new Map());
      }

      const innerMap = this.positions.get(currency);

      if (newValue.size === 0) {
        innerMap.delete(newValue.symbol);
      } else {
        innerMap.set(newValue.symbol, newValue.size);
      }
    } else {
      this.balances.set(newValue.symbol, newValue.size);
    }

    return this.recalcPersonalPnL();
  }

  constructor() {
    super();

    this.initialBalances = [];
    this.finalBalances = [];
    this.pnl = [];
  }

  async connectedCallback() {
    super.connectedCallback();

    if (!this.document.sprintTrader) {
      this.initialized = true;

      return this.notificationsArea.error({
        text: 'Отсутствует трейдер спринта.',
        keep: true
      });
    }

    const port = new URL(this.document.sprintTrader.wsUrl).port;

    if (port.endsWith('006')) {
      this.sprintApplication = 'SPRINT_PAPER_TRADE';

      this.initialBalances.push(['USD', 0]);
      this.pnl.push(['USD', 0]);
    } else if (port.endsWith('007')) {
      this.sprintApplication = 'SPRINT_STOCKS_API';

      this.initialBalances.push(['USD', 0]);
      this.pnl.push(['USD', 0]);
    }

    try {
      this.sprintTrader = await ppp.getOrCreateTrader(
        this.document.sprintTrader
      );

      await this.sprintTrader.subscribeFields?.({
        source: this,
        fieldDatumPairs: {
          sprint: TRADER_DATUM.SPRINT,
          position: TRADER_DATUM.POSITION
        }
      });

      this.columns = new WidgetColumns({
        columns: [
          {
            source: COLUMN_SOURCE.INSTRUMENT
          }
        ]
      });

      await this.columns.registerColumns();

      this.columns.array.forEach((column) => {
        this.columnsBySource.set(column.source, column);
      });

      if (this.document.level1Trader) {
        this.level1Trader = await ppp.getOrCreateTrader(
          this.document.level1Trader
        );
      }

      this.recalcPersonalPnL();

      this.initialized = true;
    } catch (e) {
      this.initialized = true;

      return this.catchException(e);
    }
  }

  async disconnectedCallback() {
    if (this.sprintTrader) {
      await this.sprintTrader.unsubscribeFields?.({
        source: this,
        fieldDatumPairs: {
          sprint: TRADER_DATUM.SPRINT,
          position: TRADER_DATUM.POSITION
        }
      });
    }

    for (const [, innerMap] of this.referencePrices) {
      for (const [, refData] of innerMap) {
        if (this.level1Trader) {
          await this.level1Trader.unsubscribeFields({
            source: refData.source,
            fieldDatumPairs: {
              lastPrice: TRADER_DATUM.LAST_PRICE,
              extendedLastPrice: TRADER_DATUM.EXTENDED_LAST_PRICE
            }
          });
        }
      }
    }

    return super.disconnectedCallback();
  }

  async setPayout(value) {
    this.payoutButton.setAttribute('disabled', '');

    try {
      const payout = Math.abs(Math.trunc(value));

      if (payout >= 0 && payout <= 100) {
        this.payout.value = payout || '';

        await later(500);
        await this.sprintTrader.call({
          method: 'setPayout',
          payout
        });

        return this.notificationsArea.success({
          title: 'Запрос отправлен'
        });
      } else {
        this.payout.value = '';

        this.payout.focus();
        this.notificationsArea.error({
          text: 'Значение должно быть в диапазоне от 0 до 100.'
        });
      }
    } catch (e) {
      return this.catchException(e);
    } finally {
      this.payoutButton.removeAttribute('disabled');
    }
  }

  async setCEXForWithdrawal(values) {
    this.cexButton.setAttribute('disabled', '');

    try {
      for (const cex in values) {
        values[cex] = (values[cex] ?? '').replaceAll(/\D/g, '');

        if (+values[cex] === 0) {
          values[cex] = '';
        }
      }

      await later(500);
      await this.sprintTrader.call({
        method: 'setCEXForWithdrawal',
        values
      });

      return this.notificationsArea.success({
        title: 'Запрос отправлен'
      });
    } catch (e) {
      return this.catchException(e);
    } finally {
      this.cexButton.removeAttribute('disabled');
    }
  }

  recalcPersonalPnL() {
    if (!this.level1Trader || !this.sprint) {
      return;
    }

    this.pnl = [];

    const initialBalances = new Map(this.sprint.ib ?? []);

    for (const [currency, initialBalanceValue] of initialBalances) {
      let balanceCorrection = 0;

      if (this.balances.has(currency)) {
        const positions = this.positions.get(currency);

        if (positions) {
          for (const [symbol, size] of positions) {
            const instrument = this.level1Trader.instruments.get(symbol);

            if (instrument) {
              const referencePrice = this.referencePrices
                .get(currency)
                ?.get(symbol)?.price;

              if (!referencePrice) {
                // Do it the async way.
                void this.#referencePriceNeeded(currency, symbol, instrument);

                continue;
              }

              const positionAmount = size * referencePrice;

              balanceCorrection += positionAmount;

              // Fees.
              if (
                this.sprintApplication == 'SPRINT_PAPER_TRADE' ||
                this.sprintApplication == 'SPRINT_STOCKS_API'
              ) {
                let fee = Math.abs(size * 0.00324);

                if (size > 0) {
                  fee = size * 0.00324 + Math.min(size * 0.000145, 7.27);
                }

                balanceCorrection -= fee;
              }
            }
          }
        }
      }

      const diff =
        this.balances.get(currency) - initialBalanceValue + balanceCorrection;

      this.pnl.push([currency, (diff * this.sprint.fr) / 100]);
    }

    if (!this.pnl.length) {
      if (
        this.sprintApplication === 'SPRINT_PAPER_TRADE' ||
        this.sprintApplication === 'SPRINT_STOCKS_API'
      ) {
        this.pnl.push(['USD', 0]);
      }
    }
  }

  async #referencePriceNeeded(currency, symbol, instrument) {
    if (typeof this.referencePrices.get(currency) === 'undefined') {
      this.referencePrices.set(currency, new Map());
    }

    const innerMap = this.referencePrices.get(currency);

    if (typeof innerMap.get(symbol) === 'undefined') {
      const individualSource = new IndividualSymbolSource(
        this,
        currency,
        symbol,
        instrument
      );

      innerMap.set(symbol, {
        price: 0,
        source: individualSource
      });

      if (this.level1Trader) {
        await this.level1Trader.subscribeFields({
          source: individualSource,
          fieldDatumPairs: {
            lastPrice: TRADER_DATUM.LAST_PRICE,
            extendedLastPrice: TRADER_DATUM.EXTENDED_LAST_PRICE
          }
        });
      }
    }
  }

  async validate() {
    // No-op.
  }

  async submit() {
    return {
      $set: {
        sprintTraderId: this.container.sprintTraderId.value,
        level1TraderId: this.container.level1TraderId.value
      }
    };
  }
}

export async function widgetDefinition({ baseWidgetUrl }) {
  // noinspection JSVoidFunctionReturnValueUsed
  return {
    type: WIDGET_TYPES.OTHER,
    collection: 'Psina',
    title: html`Psina`,
    description: html`Виджет служит для участия в спринтах проекта Psina.`,
    customElement: PsinaWidget.compose({
      template: psinaWidgetTemplate,
      styles: psinaWidgetStyles
    }).define(),
    minWidth: 150,
    minHeight: 120,
    defaultWidth: 345,
    settings: html`
      <div class="widget-settings-section">
        <div class="widget-settings-label-group">
          <h5>Трейдер спринта</h5>
          <p class="description">
            Трейдер для просмотра данных о спринте проекта.
          </p>
        </div>
        <div class="control-line flex-start">
          <ppp-query-select
            ${ref('sprintTraderId')}
            standalone
            deselectable
            placeholder="Опционально, нажмите для выбора"
            value="${(x) => x.document.sprintTraderId}"
            :context="${(x) => x}"
            :preloaded="${(x) => x.document.sprintTrader ?? ''}"
            :displayValueFormatter="${() => (item) =>
              html`
                <span style="color:${getTraderSelectOptionColor(item)}">
                  ${item?.name}
                </span>
              `}"
            :query="${() => {
              return (context) => {
                return context.services
                  .get('mongodb-atlas')
                  .db('ppp')
                  .collection('traders')
                  .find({
                    $and: [
                      {
                        caps: 'caps-psina'
                      },
                      {
                        $or: [
                          { removed: { $ne: true } },
                          {
                            _id: `[%#this.document.sprintTraderId ?? ''%]`
                          }
                        ]
                      }
                    ]
                  })
                  .sort({ updatedAt: -1 });
              };
            }}"
            :transform="${() => ppp.decryptDocumentsTransformation()}"
          ></ppp-query-select>
          <ppp-button
            appearance="default"
            @click="${() => window.open('?page=trader', '_blank').focus()}"
          >
            +
          </ppp-button>
        </div>
      </div>
      <div class="widget-settings-section">
        <div class="widget-settings-label-group">
          <h5>Трейдер L1</h5>
          <p class="description">
            Источник данных первого уровня для подсчёта PnL.
          </p>
        </div>
        <div class="control-line flex-start">
          <ppp-query-select
            ${ref('level1TraderId')}
            standalone
            deselectable
            placeholder="Опционально, нажмите для выбора"
            value="${(x) => x.document.level1TraderId}"
            :context="${(x) => x}"
            :preloaded="${(x) => x.document.level1Trader ?? ''}"
            :displayValueFormatter="${() => (item) =>
              html`
                <span style="color:${getTraderSelectOptionColor(item)}">
                  ${item?.name}
                </span>
              `}"
            :query="${() => {
              return (context) => {
                return context.services
                  .get('mongodb-atlas')
                  .db('ppp')
                  .collection('traders')
                  .find({
                    $and: [
                      {
                        caps: `[%#(await import(ppp.rootUrl + '/lib/const.js')).TRADER_CAPS.CAPS_LEVEL1%]`
                      },
                      {
                        $or: [
                          { removed: { $ne: true } },
                          { _id: `[%#this.document.level1TraderId ?? ''%]` }
                        ]
                      }
                    ]
                  })
                  .sort({ updatedAt: -1 });
              };
            }}"
            :transform="${() => ppp.decryptDocumentsTransformation()}"
          ></ppp-query-select>
          <ppp-button
            appearance="default"
            @click="${() => window.open('?page=trader', '_blank').focus()}"
          >
            +
          </ppp-button>
        </div>
      </div>
    `
  };
}
