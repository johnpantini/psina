const [
  { WidgetWithInstrument, widget, widgetEmptyStateTemplate },
  { css, html, ref, when },
  { validate },
  { WIDGET_TYPES },
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
    paletteGreenDark2,
    paletteGreenLight2,
    palettePurpleDark2,
    palettePurpleLight2,
    positive,
    negative
  }
] = await Promise.all([
  import(`${ppp.rootUrl}/elements/widget.js`),
  import(`${ppp.rootUrl}/vendor/fast-element.min.js`),
  import(`${ppp.rootUrl}/lib/ppp-errors.js`),
  import(`${ppp.rootUrl}/lib/const.js`),
  import(`${ppp.rootUrl}/design/styles.js`),
  import(`${ppp.rootUrl}/design/design-tokens.js`)
]);

await import(`${ppp.rootUrl}/elements/button.js`);
await import(`${ppp.rootUrl}/elements/query-select.js`);
await import(`${ppp.rootUrl}/elements/text-field.js`);

export const noiiWidgetTemplate = html`
  <template>
    <div class="widget-root">
      <div class="widget-header">
        <div class="widget-header-inner">
          <ppp-widget-group-control></ppp-widget-group-control>
          <ppp-widget-search-control></ppp-widget-search-control>
          <span class="widget-title">
            <span class="title">${(x) => x.document?.name ?? ''}</span>
          </span>
          <ppp-widget-header-buttons></ppp-widget-header-buttons>
        </div>
      </div>
      <div class="widget-body">
        ${when(
          (x) => !x.instrument,
          html`${html.partial(
            widgetEmptyStateTemplate('Выберите инструмент.')
          )}`
        )}
        ${when(
          (x) =>
            x.instrumentTrader &&
            x.instrument &&
            !x.instrumentTrader.supportsInstrument(x.instrument),
          html`${html.partial(
            widgetEmptyStateTemplate('Инструмент не поддерживается.')
          )}`
        )}
        ${when(
          (x) =>
            x.instrumentTrader &&
            x.instrument &&
            x.instrumentTrader.supportsInstrument(x.instrument),
          html`
            <div class="controls">
              <div class="tabs">
                <ppp-widget-box-radio-group
                  class="cross-selector"
                  @change="${(x) => x.handleCrossSelectorChange()}"
                  value="${(x) => x.document.activeTab ?? 'open'}"
                  ${ref('crossSelector')}
                >
                  <ppp-widget-box-radio value="open"
                    >Открытие
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
                <span>Дисбаланс на продажу</span>
              </div>
              <div class="imbalance-indicator"></div>
              <div class="imbalance-values">
                <div><span>288 258</span> в паре</div>
                <div><span>57 318</span> небаланс</div>
              </div>
            </div>
            <div class="widget-margin-spacer"></div>
            <div class="widget-section">
              <div class="widget-summary">
                <div class="widget-summary-line">
                  <span class="dot dot-1">Текущая цена</span>
                  <span class="widget-summary-line-price"> 162,40&nbsp;$ </span>
                </div>
                <div class="widget-summary-line">
                  <span class="dot dot-2">Ближняя цена</span>
                  <span class="widget-summary-line-price"> 162,40&nbsp;$ </span>
                </div>
                <div class="widget-summary-line">
                  <span class="dot dot-3">Дальняя цена</span>
                  <span class="widget-summary-line-price"> 162,40&nbsp;$ </span>
                </div>
              </div>
            </div>
          `
        )}
        <ppp-widget-notifications-area></ppp-widget-notifications-area>
      </div>
      <ppp-widget-resize-controls></ppp-widget-resize-controls>
    </div>
  </template>
`;

export const noiiWidgetStyles = css`
  ${normalize()}
  ${widget()}
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
    margin-bottom: 8px;
  }

  .imbalance-type-holder > span {
    word-wrap: break-word;
    font-size: ${fontSizeBody1};
    line-height: ${lineHeightBody1};
    font-weight: ${fontWeightBody1};
    letter-spacing: 0;
    color: ${themeConditional(paletteGrayDark1, paletteGrayLight1)};
    color: ${negative};
    margin-right: 8px;
    ${ellipsis()}
  }

  .imbalance-indicator {
    background: linear-gradient(
      to right,
      ${themeConditional(paletteBlueLight2, paletteBlueDark2)} 90%,
      ${negative} 90%
    );
    height: 2px;
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
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
`;

export class NOIIWidget extends WidgetWithInstrument {
  async connectedCallback() {
    super.connectedCallback();

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
    } catch (e) {
      return this.catchException(e);
    }
  }

  handleCrossSelectorChange() {
    void this.updateDocumentFragment({
      $set: {
        'widgets.$.activeTab': this.crossSelector.value
      }
    });
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
          <h5>Трейдер инструментов</h5>
          <p class="description">
            Трейдер, который будет использоваться для поиска инструментов.
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
                        type: `[%#(await import(ppp.rootUrl + '/lib/const.js')).TRADERS.ALPACA_V2_PLUS%]`
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
