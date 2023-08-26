/** @decorator */

const [
  {
    WidgetWithInstrument,
    widgetStyles,
    widgetEmptyStateTemplate,
    widgetDefaultHeaderTemplate,
    widgetWithInstrumentBodyTemplate
  },
  { css, html, ref, when, observable },
  { WIDGET_TYPES, TRADER_DATUM },
  { validate },
  { formatQuantity, formatPrice },
  { normalize, ellipsis },
  {
    themeConditional,
    fontWeightBody1,
    lineHeightBody1,
    fontSizeBody1,
    fontSizeWidget,
    fontWeightWidget,
    lineHeightWidget,
    paletteBlueDark2,
    paletteBlueLight2,
    paletteGrayLight1,
    paletteGrayDark1,
    paletteBlueBase,
    paletteBlueLight1,
    positive,
    negative
  }
] = await Promise.all([
  import(`${ppp.rootUrl}/elements/widget.js`),
  import(`${ppp.rootUrl}/vendor/fast-element.min.js`),
  import(`${ppp.rootUrl}/lib/const.js`),
  import(`${ppp.rootUrl}/lib/ppp-errors.js`),
  import(`${ppp.rootUrl}/lib/intl.js`),
  import(`${ppp.rootUrl}/design/styles.js`),
  import(`${ppp.rootUrl}/design/design-tokens.js`),
  import(`${ppp.rootUrl}/elements/widget-controls.js`)
]);

export const noiiWidgetTemplate = html`
  <template>
    <div class="widget-root">
      ${widgetDefaultHeaderTemplate()}
      <div class="widget-body">
        ${widgetWithInstrumentBodyTemplate(html`
          <div class="controls">
            <div class="tabs">
              <ppp-widget-box-radio-group
                class="cross-selector"
                @change="${(x) => x.handleCrossSelectorChange()}"
                value="${(x) =>
                  x.document.activeTab === 'close' ? 'close' : 'open'}"
                ${ref('crossSelector')}
              >
                <ppp-widget-box-radio value="open">
                  Открытие
                </ppp-widget-box-radio>
                <ppp-widget-box-radio value="close">
                  Закрытие
                </ppp-widget-box-radio>
              </ppp-widget-box-radio-group>
            </div>
          </div>
          <div class="widget-margin-spacer"></div>
          <div class="widget-section">
            <div class="imbalance-type-holder">
              <span class="${(x) => x.getImbalanceTypeClasses()}">
                ${(x) => x.getImbalanceTypeText()}
              </span>
            </div>
            <div
              class="imbalance-indicator"
              style="background: linear-gradient${(x) => x.getGradientCSS()}"
            ></div>
            <div class="imbalance-values">
              <div>
                <span>${(x) => formatQuantity(x.noii.pairedShares)}</span> в
                паре
              </div>
              <div>
                <span>${(x) => formatQuantity(x.noii.imbShares)}</span>
                дисбаланс
              </div>
            </div>
          </div>
          <div class="widget-margin-spacer"></div>
          <div class="widget-section">
            <div class="widget-summary">
              <div class="widget-summary-line">
                <span class="dot dot-1">Текущая цена</span>
                <span class="widget-summary-line-price">
                  ${(x) => formatPrice(x.noii.imbRefPrice, x.instrument)}
                </span>
              </div>
              <div class="widget-summary-line">
                <span class="dot dot-2">Ближняя цена</span>
                <span class="widget-summary-line-price">
                  ${(x) => formatPrice(x.noii.imbNearPrice, x.instrument)}
                </span>
              </div>
              <div class="widget-summary-line">
                <span class="dot dot-3">Дальняя цена</span>
                <span class="widget-summary-line-price">
                  ${(x) => formatPrice(x.noii.imbFarPrice, x.instrument)}
                </span>
              </div>
            </div>
          </div>
        `)}
        <ppp-widget-notifications-area></ppp-widget-notifications-area>
      </div>
      <ppp-widget-resize-controls></ppp-widget-resize-controls>
    </div>
  </template>
`;

export const noiiWidgetStyles = css`
  ${normalize()}
  ${widgetStyles()}
  .controls {
    z-index: 1;
    display: flex;
    align-items: center;
    padding-right: 12px;
  }

  .tabs {
    padding: 10px 8px 4px 8px;
  }

  .imbalance-type-holder {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  .imbalance-type-holder > span {
    word-wrap: break-word;
    font-size: ${fontSizeBody1};
    line-height: ${lineHeightBody1};
    font-weight: ${fontWeightBody1};
    letter-spacing: 0;
    color: ${themeConditional(paletteGrayDark1, paletteGrayLight1)};
    margin-right: 8px;
    ${ellipsis()};
  }

  .imbalance-type-holder > span.balanced {
    color: ${themeConditional(paletteBlueBase, paletteBlueLight1)};
  }

  .imbalance-type-holder > span.positive {
    color: ${positive};
  }

  .imbalance-type-holder > span.negative {
    color: ${negative};
  }

  .imbalance-indicator {
    height: 3px;
    margin-bottom: 4px;
  }

  .imbalance-values {
    display: flex;
    justify-content: space-between;
  }

  .imbalance-values > div {
    word-wrap: break-word;
    font-size: ${fontSizeWidget};
    line-height: ${lineHeightWidget};
    font-weight: ${fontWeightWidget};
    letter-spacing: 0.4px;
    color: ${themeConditional(paletteGrayLight1)};
    ${ellipsis()};
  }
`;

export class NOIIWidget extends WidgetWithInstrument {
  @observable
  noii;

  @observable
  noiiClose;

  constructor() {
    super();

    this.noii = {};
    this.noiiClose = false;
  }

  async connectedCallback() {
    super.connectedCallback();

    this.noiiClose = this.document.activeTab === 'close';

    if (!this.document.instrumentTrader) {
      return this.notificationsArea.error({
        text: 'Отсутствует трейдер для поиска инструментов.',
        keep: true
      });
    }

    try {
      this.instrumentTrader = await ppp.getOrCreateTrader(
        this.document.instrumentTrader
      );

      this.selectInstrument(this.document.symbol, { isolate: true });

      await this.instrumentTrader.subscribeFields?.({
        source: this,
        fieldDatumPairs: {
          noii: TRADER_DATUM.NOII
        }
      });
    } catch (e) {
      return this.catchException(e);
    }
  }

  async disconnectedCallback() {
    await this.instrumentTrader?.unsubscribeFields?.({
      source: this,
      fieldDatumPairs: {
        noii: TRADER_DATUM.NOII
      }
    });
  }

  getGradientCSS() {
    if (this.noii.side === 1) {
      return `(to right, ${
        themeConditional(paletteBlueLight2, paletteBlueDark2).$value
      }, ${themeConditional(paletteBlueLight2, paletteBlueDark2).$value})`;
    } else if (this.noii.side === 2 || this.noii.side === 3) {
      const total = this.noii.pairedShares + this.noii.imbShares;
      const percentage = Math.trunc((this.noii.pairedShares * 100) / total);

      return `(to right, ${
        themeConditional(paletteBlueLight2, paletteBlueDark2).$value
      } ${percentage}%, ${negative.$value} ${percentage}%)`;
    } else {
      return `(to right, ${
        themeConditional(paletteGrayDark1, paletteGrayLight1).$value
      }, ${themeConditional(paletteGrayDark1, paletteGrayLight1).$value})`;
    }
  }

  getImbalanceTypeClasses() {
    switch (this.noii.side) {
      case 1:
        return 'balanced';
      case 2:
        return 'positive';
      case 3:
        return 'negative';
      case 4:
        return 'not-eligible';
      default:
        return 'no-data';
    }
  }

  getImbalanceTypeText() {
    switch (this.noii.side) {
      case 1:
        return 'Заявки сбалансированы';
      case 2:
        return 'Дисбаланс на покупку';
      case 3:
        return 'Дисбаланс на продажу';
      case 4:
        return 'Нет данных о дисбалансе';
      default:
        return 'Нет данных о дисбалансе';
    }
  }

  async handleCrossSelectorChange() {
    this.noiiClose = this.crossSelector.value === 'close';
    this.noii = {};

    await this.updateDocumentFragment({
      $set: {
        'widgets.$.activeTab': this.crossSelector.value
      }
    });

    return this.instrumentTrader.resubscribe();
  }

  async validate() {
    await validate(this.container.instrumentTraderId);
  }

  async submit() {
    return {
      $set: {
        instrumentTraderId: this.container.instrumentTraderId.value
      }
    };
  }
}

// noinspection JSUnusedGlobalSymbols
export async function widgetDefinition() {
  // noinspection JSVoidFunctionReturnValueUsed
  return {
    type: WIDGET_TYPES.NOII,
    collection: 'Psina',
    title: html`NOII`,
    description: html`Виджет <span class="positive">NOII</span> отображает
      информацию о дисбалансе заявок в перекрёстную сессию для инструментов,
      листингованных на NASDAQ.`,
    customElement: NOIIWidget.compose({
      template: noiiWidgetTemplate,
      styles: noiiWidgetStyles
    }).define(),
    minWidth: 275,
    minHeight: 120,
    defaultWidth: 275,
    settings: html`
      <div class="widget-settings-section">
        <div class="widget-settings-label-group">
          <h5>Трейдер NOII</h5>
          <p class="description">
            Поставщик данных индикатора NOII. Также используется для поиска
            инструментов.
          </p>
        </div>
        <div class="control-line">
          <ppp-query-select
            ${ref('instrumentTraderId')}
            value="${(x) => x.document.instrumentTraderId}"
            :context="${(x) => x}"
            :preloaded="${(x) => x.document.instrumentTrader ?? ''}"
            :query="${() => {
              return (context) => {
                return context.services
                  .get('mongodb-atlas')
                  .db('ppp')
                  .collection('traders')
                  .find({
                    $and: [
                      {
                        caps: `[%#(await import(ppp.rootUrl + '/lib/const.js')).TRADER_CAPS.CAPS_NOII%]`
                      },
                      {
                        $or: [
                          { removed: { $ne: true } },
                          { _id: `[%#this.document.instrumentTraderId ?? ''%]` }
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
