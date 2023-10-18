const [
  {
    WidgetWithInstrument,
    widgetStyles,
    widgetDefaultHeaderTemplate,
    widgetStackSelectorTemplate
  },
  { css, html, ref, when },
  { validate, invalidate },
  { Tmpl },
  { WIDGET_TYPES },
  { normalize },
  {
    paletteWhite,
    paletteBlack,
    paletteGrayBase,
    paletteGrayLight1,
    paletteGrayLight2,
    paletteGrayLight3,
    paletteGrayDark1,
    paletteGrayDark2,
    paletteGrayDark3,
    paletteGrayDark4,
    paletteBlueBase,
    paletteBlueLight2,
    scrollBarSize,
    positive,
    negative,
    bodyFont,
    fontSizeWidget
  }
] = await Promise.all([
  import(`${ppp.rootUrl}/elements/widget.js`),
  import(`${ppp.rootUrl}/vendor/fast-element.min.js`),
  import(`${ppp.rootUrl}/lib/ppp-errors.js`),
  import(`${ppp.rootUrl}/lib/tmpl.js`),
  import(`${ppp.rootUrl}/lib/const.js`),
  import(`${ppp.rootUrl}/design/styles.js`),
  import(`${ppp.rootUrl}/design/design-tokens.js`),
  import(`${ppp.rootUrl}/elements/button.js`),
  import(`${ppp.rootUrl}/elements/checkbox.js`),
  import(`${ppp.rootUrl}/elements/snippet.js`),
  import(`${ppp.rootUrl}/elements/text-field.js`),
  import(`${ppp.rootUrl}/elements/query-select.js`),
  import(`${ppp.rootUrl}/elements/widget-controls.js`)
]);

export const simpleFrameWidgetTemplate = html`
  <template>
    <div class="widget-root">
      ${widgetDefaultHeaderTemplate()}
      <div class="widget-body">
        ${widgetStackSelectorTemplate()}
        ${when(
          (x) => x.document.frameUrl,
          html`
            <iframe
              src="${(x) => x.getUrl()}"
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
  ${widgetStyles()}
`;

export class SimpleFrameWidget extends WidgetWithInstrument {
  #url;

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

  getUrl() {
    if (!this.document.saveLocation) {
      return this.document.frameUrl;
    } else if (typeof this.document.savedLocation === 'string') {
      const url = new URL(this.document.frameUrl);

      return `${url.origin}${this.document.savedLocation}`;
    } else {
      return this.document.frameUrl;
    }
  }

  async onWindowMessage(e) {
    if (typeof e.data === 'object' && e.data?.origin === 'ppp-simple-frame') {
      const { detail, event, urlPath } = e.data;

      if (typeof this.#url === 'undefined') {
        this.#url = new URL(this.getUrl());
      }

      if (urlPath !== this.#url.pathname + this.#url.search) {
        return;
      }

      if (event === 'ready') {
        this.shadowRoot.querySelector('iframe').contentWindow.postMessage(
          JSON.stringify({
            extraOptions: new Function(
              `return ${await new Tmpl().render(
                this,
                this.document.extraOptions,
                {}
              )}`
            )(),
            darkMode: ppp.darkMode,
            paletteWhite: paletteWhite.$value,
            paletteBlack: paletteBlack.$value,
            paletteGrayBase: paletteGrayBase.$value,
            paletteGrayLight1: paletteGrayLight1.$value,
            paletteGrayLight2: paletteGrayLight2.$value,
            paletteGrayLight3: paletteGrayLight3.$value,
            paletteGrayDark1: paletteGrayDark1.$value,
            paletteGrayDark2: paletteGrayDark2.$value,
            paletteGrayDark3: paletteGrayDark3.$value,
            paletteGrayDark4: paletteGrayDark4.$value,
            paletteBlueBase: paletteBlueBase.$value,
            paletteBlueLight2: paletteBlueLight2.$value,
            scrollBarSize: scrollBarSize.$value,
            positive: positive.$value,
            negative: negative.$value,
            bodyFont: bodyFont.$value,
            fontSizeWidget: fontSizeWidget.$value,
            saveLocation: this.preview ? false : this.document.saveLocation
          }),
          '*'
        );
      } else if (event === 'symbolselect') {
        if (
          this.groupControl?.selection &&
          !this.preview &&
          this.instrumentTrader
        ) {
          this.selectInstrument(detail.replace('.', ' '));
        }
      } else if (event === 'urlchange') {
        await this.updateDocumentFragment({
          $set: {
            'widgets.$.savedLocation': detail
          }
        });
      }
    }
  }

  async validate() {
    await validate(this.container.frameUrl);
    await validate(this.container.extraOptions);

    try {
      new Function(
        `return ${await new Tmpl().render(
          this,
          this.container.extraOptions.value,
          {}
        )}`
      )();
    } catch (e) {
      invalidate(this.container.extraOptions, {
        errorMessage: 'Код содержит ошибки',
        raiseException: true
      });
    }
  }

  async submit() {
    return {
      $set: {
        frameUrl: this.container.frameUrl.value,
        ordersTraderId: this.container.ordersTraderId.value,
        extraOptions: this.container.extraOptions.value,
        saveLocation: this.container.saveLocation.checked
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
    settings: html`
      <div class="widget-settings-section">
        <div class="widget-settings-label-group">
          <h5>Трейдер инструментов и заявок</h5>
          <p class="description">
            Трейдер для поиска инструментов и выставления заявок, если требуется
            такая функциональность.
          </p>
        </div>
        <div class="control-line flex-start">
          <ppp-query-select
            ${ref('ordersTraderId')}
            deselectable
            standalone
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
                            `[%#(await import(ppp.rootUrl + '/lib/const.js')).TRADER_CAPS.CAPS_LIMIT_ORDERS%]`,
                            `[%#(await import(ppp.rootUrl + '/lib/const.js')).TRADER_CAPS.CAPS_MARKET_ORDERS%]`
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
          <div class="spacing2"></div>
          <div class="control-stack">
            <ppp-query-select
              ${ref('cloudflareWorkerSelector')}
              standalone
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
                          type: `[%#(await import(ppp.rootUrl + '/lib/const.js')).SERVICES.CLOUDFLARE_WORKER%]`
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
            <p class="description">
              Если включить опцию, фрейм будет отслеживать URL внутри себя и
              сохранять его в базу.
            </p>
            <ppp-checkbox
              ?checked="${(x) => x.document.saveLocation ?? true}"
              ${ref('saveLocation')}
            >
              Запоминать изменения URL внутри фрейма
            </ppp-checkbox>
          </div>
        </div>
      </div>
      <div class="widget-settings-section">
        <div class="widget-settings-label-group">
          <h5>Дополнительные настройки</h5>
          <p class="description">
            Будут переданы во фрейм, если такой механизм предусмотрен.
          </p>
        </div>
        <div class="widget-settings-input-group">
          <ppp-snippet
            :code="${(x) => x.document.extraOptions ?? '{}'}"
            ${ref('extraOptions')}
          ></ppp-snippet>
        </div>
      </div>
    `
  };
}
