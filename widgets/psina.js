/** @decorator */

const [
  {
    Widget,
    widgetStyles,
    widgetEmptyStateTemplate,
    widgetDefaultHeaderTemplate,
    widgetStackSelectorTemplate
  },
  { WidgetColumns },
  { css, html, ref, when, observable, repeat },
  { formatDate, formatNumber, formatAmount, formatPercentage },
  { WIDGET_TYPES, TRADER_DATUM, COLUMN_SOURCE },
  { normalize, typography, getTraderSelectOptionColor }
] = await Promise.all([
  import(`${ppp.rootUrl}/elements/widget.js`),
  import(`${ppp.rootUrl}/elements/widget-columns.js`),
  import(`${ppp.rootUrl}/vendor/fast-element.min.js`),
  import(`${ppp.rootUrl}/lib/intl.js`),
  import(`${ppp.rootUrl}/lib/const.js`),
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
        ${when(
          (x) => x?.loading || !x?.initialized,
          html`${html.partial(
            widgetEmptyStateTemplate(ppp.t('$widget.emptyState.loading'), {
              extraClass: 'loading-animation'
            })
          )}`
        )}
        ${when(
          (x) => !x?.loading && x?.initialized && !x?.sprintTrader,
          html`${html.partial(
            widgetEmptyStateTemplate('Трейдер не задан в настройках.')
          )}`
        )}
        ${when(
          (x) => !x?.loading && x?.initialized && x?.sprintTrader && !x?.sprint,
          html`${html.partial(
            widgetEmptyStateTemplate('Ожидайте начало следующего спринта.')
          )}`
        )}
        ${when(
          (x) => !x?.loading && x?.initialized && x?.sprintTrader && x?.sprint,
          html`
            <ppp-widget-tabs>
              <ppp-widget-tab id="srpint">Спринт</ppp-widget-tab>
              <ppp-widget-tab id="settings" disabled>Настройки</ppp-widget-tab>
              <ppp-tab-panel id="sprint-panel">
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
                  <div class="widget-margin-spacer"></div>
                </div>
              </ppp-tab-panel>
              <ppp-tab-panel id="settings-panel"></ppp-tab-panel>
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

  /**
   * @type {WidgetColumns}
   */
  @observable
  columns;

  columnsBySource = new Map();

  @observable
  sprint;

  sprintChanged() {
    if (this.sprint) {
      this.initialBalances = this.sprint.ib;
      this.finalBalances = this.sprint.fb;
    }
  }

  constructor() {
    super();

    this.initialBalances = [];
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

    try {
      this.sprintTrader = await ppp.getOrCreateTrader(
        this.document.sprintTrader
      );

      await this.sprintTrader.subscribeFields?.({
        source: this,
        fieldDatumPairs: {
          sprint: TRADER_DATUM.SPRINT
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
          sprint: TRADER_DATUM.SPRINT
        }
      });
    }

    return super.disconnectedCallback();
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
