/** @decorator */

const [
  { WidgetWithInstrument, widget, widgetEmptyStateTemplate },
  { Observable, observable, css, html, ref, when, repeat },
  { Tmpl },
  { validate },
  { WIDGET_TYPES },
  { normalize, typography }
] = await Promise.all([
  import(`${ppp.rootUrl}/elements/widget.js`),
  import(`${ppp.rootUrl}/vendor/fast-element.min.js`),
  import(`${ppp.rootUrl}/lib/tmpl.js`),
  import(`${ppp.rootUrl}/lib/ppp-errors.js`),
  import(`${ppp.rootUrl}/lib/const.js`),
  import(`${ppp.rootUrl}/design/styles.js`),
  import(`${ppp.rootUrl}/elements/button.js`),
  import(`${ppp.rootUrl}/elements/checkbox.js`),
  import(`${ppp.rootUrl}/elements/snippet.js`),
  import(`${ppp.rootUrl}/elements/text-field.js`),
  import(`${ppp.rootUrl}/elements/query-select.js`)
]);

export const pusherSubscriptionWidgetTemplate = html`
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
        <div class="widget-card-list">
          ${when(
            (x) => !x.messages.length,
            html`${html.partial(
              widgetEmptyStateTemplate('Нет данных для отображения.')
            )}`
          )}
          <div class="widget-card-list-inner">
            ${repeat((x) => x.messages, html`${(x) => x.layout}`)}
          </div>
        </div>
        <ppp-widget-notifications-area></ppp-widget-notifications-area>
      </div>
      <ppp-widget-resize-controls></ppp-widget-resize-controls>
    </div>
  </template>
`;

export const pusherSubscriptionWidgetStyles = css`
  ${normalize()}
  ${widget()}
  ${typography()}
  .widget-card-list {
    margin-top: 8px;
  }

  .dot-divider {
    margin: 0 4px;
  }

  .clickable {
    text-decoration: none;
    cursor: pointer;
  }

  .clickable:hover {
    text-decoration: underline;
  }
`;

export class PusherSubscriptionWidget extends WidgetWithInstrument {
  @observable
  messages;

  #messageFormatter;

  constructor() {
    super();

    this.messages = [];
  }

  async connectedCallback() {
    super.connectedCallback();

    this.visibilityChange = this.visibilityChange.bind(this);

    document.addEventListener('visibilitychange', this.visibilityChange);

    this.messages = [];
    this.instrumentTrader = await ppp.getOrCreateTrader(
      this.document.instrumentTrader
    );

    this.selectInstrument(this.document.symbol, { isolate: true });

    const AsyncFunction = Object.getPrototypeOf(
      async function () {}
    ).constructor;

    const bodyCode = await new Tmpl().render(
      this,
      this.document.formatterCode,
      {}
    );

    this.#messageFormatter = new AsyncFunction(
      'event',
      'message',
      'html',
      bodyCode
    );

    this.messages = await this.#historyRequest();

    this.pusherHandler = this.pusherHandler.bind(this);

    if (this.document.pusherApi) {
      const connection = await ppp.getOrCreatePusherConnection(
        this.document.pusherApi
      );

      if (connection) {
        connection.channel('ppp')?.bind_global(this.pusherHandler);
      }
    }
  }

  async disconnectedCallback() {
    document.removeEventListener('visibilitychange', this.visibilityChange);

    if (this.document.pusherApi) {
      const connection = await ppp.getOrCreatePusherConnection(
        this.document.pusherApi
      );

      if (connection) {
        connection.channel('ppp')?.unbind_global(this.pusherHandler);
      }
    }

    super.disconnectedCallback();
  }

  visibilityChange() {
    if (document.visibilityState === 'visible') {
      setTimeout(() => {
        Array.from(this.querySelectorAll('.new')).forEach((n) =>
          n.classList.remove('new')
        );
      }, 5000);
    }
  }

  async #historyRequest() {
    const messages = [];

    const AsyncFunction = Object.getPrototypeOf(
      async function () {}
    ).constructor;

    const historyCode = await new Tmpl().render(
      this,
      this.document.historyCode,
      {}
    );

    for (const m of await new AsyncFunction(historyCode).call(this)) {
      const formatted = await this.formatMessage(null, m);

      if (typeof formatted?.cursor !== 'undefined') {
        if (
          this.document.disableInstrumentFiltering ||
          !this.instrument ||
          formatted?.symbols?.indexOf?.(
            this.instrumentTrader.getSymbol?.(this.instrument)
          ) > -1
        ) {
          formatted.pppFromHistory = true;

          messages.push(formatted);
        }
      }
    }

    return messages;
  }

  async instrumentChanged(oldValue, newValue) {
    await super.instrumentChanged(oldValue, newValue);

    if (!this.document.disableInstrumentFiltering) {
      this.messages = await this.#historyRequest();
    }
  }

  async formatMessage(event, message) {
    return this.#messageFormatter.call(this, event, message, html);
  }

  async pusherHandler(event, message) {
    if (event && !/^pusher:/i.test(event)) {
      let formatted = await this.formatMessage(event, message);

      if (typeof formatted?.cursor !== 'undefined') {
        if (
          this.document.autoSelectInstrument &&
          formatted?.symbols?.length === 1
        ) {
          this.selectInstrument(formatted.symbols[0]);
        }

        // Possible icon change
        formatted = await this.formatMessage(event, message);

        if (
          this.document.disableInstrumentFiltering ||
          !this.instrument ||
          formatted?.symbols?.indexOf?.(
            this.instrumentTrader.getSymbol?.(this.instrument)
          ) > -1
        ) {
          formatted.pppFromHistory = false;

          this.messages.unshift(formatted);
          Observable.notify(this, 'messages');
        }
      } else {
        console.error('Bad message formatter:', formatted);
      }
    }
  }

  async validate() {
    await validate(this.container.pusherApiId);
    await validate(this.container.instrumentTraderId);
    await validate(this.container.formatterCode);
    await validate(this.container.historyCode);
  }

  async submit() {
    return {
      $set: {
        pusherApiId: this.container.pusherApiId.value,
        instrumentTraderId: this.container.instrumentTraderId.value,
        formatterCode: this.container.formatterCode.value,
        autoSelectInstrument: this.container.autoSelectInstrument.checked,
        disableInstrumentFiltering:
          this.container.disableInstrumentFiltering.checked,
        historyCode: this.container.historyCode.value
      }
    };
  }
}

const defaultFormatterCode = `/**
 * Функция форматирования сообщения.
 *
 * @param {string} event - Название события в канале Pusher.
 * - null: если форматируются сообщения из истории.
 * @param {json} message - Сообщение от Pusher.
 */

return {};
`;

const defaultHistoryCode = `/**
 * Функция исторических данных.
 *
 */

return [];`;

export async function widgetDefinition({ baseWidgetUrl }) {
  // noinspection JSVoidFunctionReturnValueUsed
  return {
    type: WIDGET_TYPES.OTHER,
    collection: 'Psina',
    title: html`Сообщения Pusher`,
    description: html`Виджет позволяет подписаться на сообщения платформы Pusher
    с возможностью форматирования содержимого.`,
    customElement: PusherSubscriptionWidget.compose({
      template: pusherSubscriptionWidgetTemplate,
      styles: pusherSubscriptionWidgetStyles
    }).define(),
    minWidth: 150,
    minHeight: 120,
    defaultWidth: 300,
    defaultHeight: 512,
    settings: html`
      <div class="widget-settings-section">
        <div class="widget-settings-label-group">
          <h5>Интеграция с Pusher</h5>
        </div>
        <div class="widget-settings-input-group">
          <div class="control-line">
            <ppp-query-select
              ${ref('pusherApiId')}
              placeholder="Нажмите для выбора"
              value="${(x) => x.document.pusherApiId}"
              :context="${(x) => x}"
              :preloaded="${(x) => x.document.pusherApi ?? ''}"
              :query="${() => {
                return (context) => {
                  return context.services
                    .get('mongodb-atlas')
                    .db('ppp')
                    .collection('apis')
                    .find({
                      $and: [
                        {
                          type: `[%#(await import(ppp.rootUrl + '/lib/const.js')).APIS.PUSHER%]`
                        },
                        {
                          $or: [
                            { removed: { $ne: true } },
                            {
                              _id: `[%#this.document.pusherApiId ?? ''%]`
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
              @click="${() =>
                window.open('?page=api-pusher', '_blank').focus()}"
            >
              +
            </ppp-button>
          </div>
        </div>
      </div>
      <div class="widget-settings-section">
        <div class="widget-settings-label-group">
          <h5>Трейдер</h5>
          <p class="description">
            Трейдер для поиска и переключения инструмента.
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
                    $or: [
                      { removed: { $ne: true } },
                      { _id: `[%#this.document.instrumentTraderId ?? ''%]` }
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
          <h5>Форматирование входящих сообщений</h5>
          <p class="description">
            Тело функции для форматирования сообщений от Pusher.
          </p>
        </div>
        <div class="widget-settings-input-group">
          <ppp-snippet
            wizard
            revertable
            @wizard="${(x, c) => {
              x.templateLibraryModal.removeAttribute('hidden');

              x.templateLibraryModalPage.template = 'thefly/formatter';
              x.templateLibraryModalPage.baseUrl = baseWidgetUrl.replace(
                '/widgets',
                ''
              );
              x.templateLibraryModalPage.destination = c.event.detail.snippet;
            }}"
            @revert="${(x) => {
              x.formatterCode.updateCode(defaultFormatterCode);
              x.formatterCode.$emit('input');
            }}"
            :code="${(x) => x.document.formatterCode ?? defaultFormatterCode}"
            ${ref('formatterCode')}
          ></ppp-snippet>
        </div>
      </div>
      <div class="widget-settings-section">
        <div class="widget-settings-label-group">
          <h5>Загрузка исторических данных</h5>
          <p class="description">
            Тело функции, предоставляющей исторические данные, загружаемые при
            начальном отображении и смене инструмента виджета.
          </p>
        </div>
        <div class="widget-settings-input-group">
          <ppp-snippet
            wizard
            revertable
            @wizard="${(x, c) => {
              x.templateLibraryModal.removeAttribute('hidden');

              x.templateLibraryModalPage.template = 'thefly/history';
              x.templateLibraryModalPage.baseUrl = baseWidgetUrl.replace(
                '/widgets',
                ''
              );
              x.templateLibraryModalPage.destination = c.event.detail.snippet;
            }}"
            @revert="${(x) => {
              x.historyCode.updateCode(defaultHistoryCode);
              x.historyCode.$emit('input');
            }}"
            :code="${(x) => x.document.historyCode ?? defaultHistoryCode}"
            ${ref('historyCode')}
          ></ppp-snippet>
        </div>
      </div>
      <div class="widget-settings-section">
        <div class="widget-settings-label-group">
          <h5>Параметры отображения и работы</h5>
        </div>
        <ppp-checkbox
          ?checked="${(x) => x.document.autoSelectInstrument}"
          ${ref('autoSelectInstrument')}
        >
          Переключать инструмент при новых сообщениях
        </ppp-checkbox>
        <ppp-checkbox
          ?checked="${(x) => x.document.disableInstrumentFiltering}"
          ${ref('disableInstrumentFiltering')}
        >
          Не фильтровать содержимое по выбранному инструменту
        </ppp-checkbox>
      </div>
    `
  };
}
