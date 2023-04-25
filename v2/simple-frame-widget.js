const [
  { WidgetWithInstrument, widget },
  { css, html, ref, when },
  { validate, invalidate },
  { WIDGET_TYPES },
  { normalize },
  {
    paletteWhite,
    paletteBlack,
    paletteGrayLight1,
    paletteGrayLight2,
    paletteGrayDark1,
    paletteGrayDark2,
    paletteBlueBase,
    paletteBlueLight2,
    positive,
    negative,
    bodyFont,
    fontSizeWidget
  }
] = await Promise.all([
  import(`${ppp.rootUrl}/elements/widget.js`),
  import(`${ppp.rootUrl}/vendor/fast-element.min.js`),
  import(`${ppp.rootUrl}/lib/ppp-errors.js`),
  import(`${ppp.rootUrl}/lib/const.js`),
  import(`${ppp.rootUrl}/design/styles.js`),
  import(`${ppp.rootUrl}/design/design-tokens.js`),
  import(`${ppp.rootUrl}/elements/button.js`),
  import(`${ppp.rootUrl}/elements/text-field.js`),
  import(`${ppp.rootUrl}/elements/query-select.js`)
]);

export const simpleFrameWidgetTemplate = html`
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
          (x) => x.document.frameUrl,
          html`
            <iframe
              src="${(x) => x.document.frameUrl}"
              width="100%"
              height="100%"
              style="background: transparent; border: none;"
            ></iframe>
          `
        )}
        <ppp-widget-notifications-area></ppp-widget-notifications-area>
      </div>
      <ppp-widget-resize-controls></ppp-widget-resize-controls>
    </div>
  </template>
`;

export const simpleFrameWidgetStyles = css`
  ${normalize()}
  ${widget()}
`;

export class SimpleFrameWidget extends WidgetWithInstrument {
  constructor() {
    super();

    this.onWindowMessage = this.onWindowMessage.bind(this);
  }

  async connectedCallback() {
    super.connectedCallback();

    window.addEventListener('message', this.onWindowMessage);

    if (this.document.ordersTrader) {
      this.ordersTrader = await ppp.getOrCreateTrader(
        this.document.ordersTrader
      );
      this.instrumentTrader = this.ordersTrader;

      this.selectInstrument(this.document.symbol, { isolate: true });
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    window.removeEventListener('message', this.onWindowMessage);
  }

  onWindowMessage(e) {
    if (typeof e.data === 'object' && e.data?.origin === 'ppp-simple-frame') {
      const { detail, event } = e.data;

      if (event === 'ready') {
        this.shadowRoot.querySelector('iframe').contentWindow.postMessage(
          JSON.stringify({
            darkMode: ppp.darkMode,
            paletteWhite: paletteWhite.$value,
            paletteBlack: paletteBlack.$value,
            paletteGrayLight1: paletteGrayLight1.$value,
            paletteGrayLight2: paletteGrayLight2.$value,
            paletteGrayDark1: paletteGrayDark1.$value,
            paletteGrayDark2: paletteGrayDark2.$value,
            paletteBlueBase: paletteBlueBase.$value,
            paletteBlueLight2: paletteBlueLight2.$value,
            positive: positive.$value,
            negative: negative.$value,
            bodyFont: bodyFont.$value,
            fontSizeWidget: fontSizeWidget.$value
          }),
          '*'
        );
      } else if (event === 'symbolselect') {
        if (
          this.groupControl.selection &&
          !this.preview &&
          this.instrumentTrader
        ) {
          this.selectInstrument(detail);
        }
      }
    }
  }

  async validate() {
    await validate(this.container.frameUrl);
  }

  async submit() {
    return {
      $set: {
        frameUrl: this.container.frameUrl.value,
        ordersTraderId: this.container.ordersTraderId.value
      }
    };
  }
}

// noinspection JSUnusedGlobalSymbols
export async function widgetDefinition() {
  // noinspection JSVoidFunctionReturnValueUsed
  return {
    type: WIDGET_TYPES.FRAME,
    collection: 'Psina',
    title: html`Фрейм`,
    description: html`Виджет <span class="positive">Фрейм</span> отображает
      произвольное содержимое, встраиваемое по ссылке.`,
    customElement: SimpleFrameWidget.compose({
      template: simpleFrameWidgetTemplate,
      styles: simpleFrameWidgetStyles
    }).define(),
    minWidth: 150,
    minHeight: 120,
    defaultWidth: 600,
    defaultHeight: 512,
    settings: html`
      <div class="widget-settings-section">
        <div class="widget-settings-label-group">
          <h5>Трейдер инструментов и заявок</h5>
          <p class="description">
            Трейдер для поиска инструментов и выставления заявок, если требуется
            такая функциональность.
          </p>
        </div>
        <div class="control-line">
          <ppp-query-select
            ${ref('ordersTraderId')}
            deselectable
            placeholder="Опционально, нажмите для выбора"
            value="${(x) => x.document.ordersTraderId}"
            :context="${(x) => x}"
            :preloaded="${(x) => x.document.ordersTrader ?? ''}"
            :query="${() => {
              return (context) => {
                return context.services
                  .get('mongodb-atlas')
                  .db('ppp')
                  .collection('traders')
                  .find({
                    $and: [
                      {
                        caps: {
                          $all: [
                            `[%#(await import('../../lib/const.js')).TRADER_CAPS.CAPS_LIMIT_ORDERS%]`,
                            `[%#(await import('../../lib/const.js')).TRADER_CAPS.CAPS_MARKET_ORDERS%]`
                          ]
                        }
                      },
                      {
                        $or: [
                          { removed: { $ne: true } },
                          { _id: `[%#this.document.ordersTraderId ?? ''%]` }
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
          <h5>Ресурс для загрузки</h5>
        </div>
        <div class="widget-settings-input-group">
          <ppp-text-field
            type="url"
            placeholder="https://example.com"
            value="${(x) => x.document.frameUrl ?? ''}"
            ${ref('frameUrl')}
          ></ppp-text-field>
          <div class="control-stack">
            <ppp-query-select
              ${ref('cloudflareWorkerSelector')}
              :context="${(x) => x}"
              :placeholder="${() => 'Нажмите, чтобы выбрать сервис'}"
              :query="${() => {
                return (context) => {
                  return context.services
                    .get('mongodb-atlas')
                    .db('ppp')
                    .collection('services')
                    .find({
                      $and: [
                        { removed: { $ne: true } },
                        {
                          type: `[%#(await import('../../lib/const.js')).SERVICES.CLOUDFLARE_WORKER%]`
                        }
                      ]
                    })
                    .sort({ updatedAt: -1 });
                };
              }}"
              :transform="${() => ppp.decryptDocumentsTransformation()}"
            ></ppp-query-select>
            <ppp-button
              @click="${(x) => {
                const datum = x.cloudflareWorkerSelector.datum();

                if (!datum) {
                  invalidate(x.cloudflareWorkerSelector, {
                    errorMessage: 'Сначала выберите сервис',
                    skipScrollIntoView: true
                  });
                } else {
                  x.frameUrl.appearance = 'default';
                  x.frameUrl.value = `https://ppp-${datum._id}.${datum.subdomain}.workers.dev/`;
                }
              }}"
              appearance="primary"
            >
              Установить ссылку на Cloudflare Worker
            </ppp-button>
          </div>
        </div>
      </div>
    `
  };
}
