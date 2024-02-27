/** @decorator */

const [
  {
    WidgetWithInstrument,
    widgetStyles,
    widgetEmptyStateTemplate,
    widgetDefaultHeaderTemplate,
    widgetStackSelectorTemplate
  },
  { Observable, observable, css, html, ref, when, repeat },
  { Tmpl },
  { validate },
  { WIDGET_TYPES },
  { normalize, typography, scrollbars }
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
  import(`${ppp.rootUrl}/elements/tabs.js`),
  import(`${ppp.rootUrl}/elements/text-field.js`),
  import(`${ppp.rootUrl}/elements/query-select.js`),
  import(`${ppp.rootUrl}/elements/widget-controls.js`)
]);

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

await import(`${ppp.rootUrl}/elements/pages/iframe-modal.js`);

export const pusherSubscriptionWidgetTemplate = html`
  <template>
    <div class="widget-root">
      ${widgetDefaultHeaderTemplate()}
      <div class="widget-body">
        ${widgetStackSelectorTemplate()}
        <div class="widget-card-list">
          ${when(
            (x) => !x?.messages?.length,
            html`${html.partial(
              widgetEmptyStateTemplate('Нет данных для отображения.')
            )}`
          )}
          <div class="widget-card-list-inner" ${ref('cardList')}>
            ${repeat(
              (x) => x?.messages.slice(0, x.document.depth ?? 50),
              html` <div cursor="${(x) => x.cursor}">${(x) => x.layout}</div>`
            )}
          </div>
        </div>        
      </div>
      <ppp-widget-notifications-area></ppp-widget-notifications-area>
      <ppp-widget-resize-controls></ppp-widget-resize-controls>
    </div>
  </template>
`;

export const pusherSubscriptionWidgetStyles = css`
  ${normalize()}
  ${widgetStyles()}
  ${typography()}
  .widget-card-list {
    margin-top: 8px;
  }

  .clickable {
    cursor: pointer;
  }

  a {
    text-decoration: none;
  }

  .x-scroll {
    overflow-y: hidden;
    overflow-x: auto;
    padding-bottom: 2px;
  }

  .dot-divider {
    margin: 0 4px;
  }

  ${scrollbars('.x-scroll')}
`;

export class PusherSubscriptionWidget extends WidgetWithInstrument {
  @observable
  messages;

  #messageFormatter;

  #cardDimmerInterval;

  // Use this as a generic source storage.
  alternativeSources = new Set();

  constructor() {
    super();

    this.messages = [];
  }

  async connectedCallback() {
    await super.connectedCallback();

    if (!this.document.depth) {
      this.document.depth = 50;
    }

    if (!this.document.newTimeout) {
      this.document.newTimeout = 5;
    }

    this.messages = [];

    try {
      this.instrumentTrader = await ppp.getOrCreateTrader(
        this.document.instrumentTrader
      );

      this.selectInstrument(this.document.symbol, { isolate: true });

      const bodyCode = await new Tmpl().render(
        this,
        this.document?.formatterCode ?? '',
        {}
      );

      this.#messageFormatter = new AsyncFunction(
        'event',
        'message',
        'html',
        bodyCode
      );

      this.#cardDimmerInterval = setInterval(() => this.dimCards(), 750);
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
    } catch (e) {
      return this.catchException(e);
    }
  }

  async disconnectedCallback() {
    clearInterval(this.#cardDimmerInterval);

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

  generateCardClass(message) {
    const classes = [];

    if (!message.pppFromHistory) {
      if (
        Date.now() - (message.pppInsertionTimestamp ?? Date.now()) <
        this.document.newTimeout * 1000
      ) {
        classes.push('new');
      }
    }

    if (this.document.multiline) {
      classes.push('multiline');
    }

    return classes.join(' ');
  }

  dimCards() {
    if (document.visibilityState === 'visible') {
      const newCards = this.cardList.querySelectorAll('.new');

      Array.from(newCards).forEach((card) => {
        const cursor = card.closest('[cursor]')?.getAttribute('cursor');
        const message = this.messages.find(
          (m) => m.cursor?.toString() === cursor
        );

        if (message) {
          if (
            Date.now() - (message.pppInsertionTimestamp ?? Date.now()) >=
            this.document.newTimeout * 1000
          ) {
            card.classList.remove('new');
          }
        }
      });
    }
  }

  async #historyRequest() {
    const messages = [];
    const historyCode = await new Tmpl().render(
      this,
      this.document?.historyCode ?? '',
      {}
    );

    for (const m of (await new AsyncFunction(historyCode).call(this)) ?? []) {
      const formatted = await this.formatMessage(null, m);

      if (typeof formatted?.cursor !== 'undefined') {
        if (
          this.document.disableInstrumentFiltering ||
          !this.instrument ||
          formatted?.symbols?.indexOf?.(
            this.instrumentTrader?.getSymbol?.(this.instrument)
          ) > -1
        ) {
          formatted.pppFromHistory = true;
          formatted.pppInsertionTimestamp = Date.now();

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

  async generatePrivateEvent(event, message) {
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
          this.instrumentTrader?.getSymbol?.(this.instrument)
        ) > -1
      ) {
        formatted.pppInsertionTimestamp = Date.now();

        this.messages.unshift(formatted);
        Observable.notify(this, 'messages');
      }
    }
  }

  async pusherHandler(event, message) {
    if (event && !/^pusher:/i.test(event)) {
      return this.generatePrivateEvent(event, message);
    }
  }

  async validate() {
    await validate(this.container.depth);
    await validate(this.container.depth, {
      hook: async (value) => +value > 0 && +value <= 100,
      errorMessage: 'Введите значение в диапазоне от 1 до 100'
    });
    await validate(this.container.newTimeout);
    await validate(this.container.newTimeout, {
      hook: async (value) => +value > 0 && +value <= 100,
      errorMessage: 'Введите значение в диапазоне от 1 до 100'
    });

    await validate(this.container.formatterCode);
    await validate(this.container.historyCode);
  }

  async submit() {
    return {
      $set: {
        pusherApiId: this.container.pusherApiId.value,
        depth: Math.abs(this.container.depth.value),
        newTimeout: Math.abs(this.container.newTimeout.value),
        instrumentTraderId: this.container.instrumentTraderId.value,
        formatterCode: this.container.formatterCode.value,
        autoSelectInstrument: this.container.autoSelectInstrument.checked,
        disableInstrumentFiltering:
          this.container.disableInstrumentFiltering.checked,
        multiline: this.container.multiline.checked,
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
    defaultWidth: 345,
    defaultHeight: 350,
    settings: html`
      <ppp-tabs activeid="integrations">
        <ppp-tab id="integrations">Подключения</ppp-tab>
        <ppp-tab id="formatters">Форматирование</ppp-tab>
        <ppp-tab id="ui">UI</ppp-tab>
        <ppp-tab id="filters" disabled>Фильтры</ppp-tab>
        <ppp-tab-panel id="integrations-panel">
          <div class="widget-settings-section">
            <div class="widget-settings-label-group">
              <h5>Интеграция с Pusher</h5>
              <p class="description">
                Если не заполнять поле, подключения не будет.
              </p>
            </div>
            <div class="widget-settings-input-group">
              <div class="control-line flex-start">
                <ppp-query-select
                  ${ref('pusherApiId')}
                  deselectable
                  standalone
                  placeholder="Опционально, нажмите для выбора"
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
              <h5>Трейдер инструментов</h5>
              <p class="description">
                Трейдер для поиска и переключения инструмента.
              </p>
            </div>
            <div class="control-line flex-start">
              <ppp-query-select
                ${ref('instrumentTraderId')}
                standalone
                deselectable
                placeholder="Опционально, нажмите для выбора"
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
        </ppp-tab-panel>
        <ppp-tab-panel id="formatters-panel">
          <div class="widget-settings-section">
            <div class="widget-settings-label-group">
              <h5>Форматирование сообщений</h5>
              <p class="description">
                Тело функции для форматирования сообщений, поступающих от
                Pusher.
              </p>
            </div>
            <div class="widget-settings-input-group">
              <ppp-snippet
                wizard
                revertable
                @wizard="${(x, c) => {
                  x.templateLibraryModal.removeAttribute('hidden');

                  x.templateLibraryModalPage.template =
                    x.templateLibraryModalPage.template ?? 'thefly';
                  x.templateLibraryModalPage.hint = 'formatter';
                  x.templateLibraryModalPage.baseUrl = baseWidgetUrl.replace(
                    '/widgets',
                    ''
                  );
                  x.templateLibraryModalPage.destination =
                    c.event.detail.snippet;
                }}"
                @revert="${(x) => {
                  x.formatterCode.updateCode(defaultFormatterCode);
                }}"
                :code="${(x) =>
                  x.document.formatterCode ?? defaultFormatterCode}"
                ${ref('formatterCode')}
              ></ppp-snippet>
            </div>
          </div>
          <div class="widget-settings-section">
            <div class="widget-settings-label-group">
              <h5>Загрузка исторических данных</h5>
              <p class="description">
                Тело функции, предоставляющей исторические данные, загружаемые
                при начальном отображении и смене инструмента виджета.
              </p>
            </div>
            <div class="widget-settings-input-group">
              <ppp-snippet
                wizard
                revertable
                @wizard="${(x, c) => {
                  x.templateLibraryModal.removeAttribute('hidden');

                  x.templateLibraryModalPage.template =
                    x.templateLibraryModalPage.template ?? 'thefly';
                  x.templateLibraryModalPage.hint = 'history';
                  x.templateLibraryModalPage.baseUrl = baseWidgetUrl.replace(
                    '/widgets',
                    ''
                  );
                  x.templateLibraryModalPage.destination =
                    c.event.detail.snippet;
                }}"
                @revert="${(x) => {
                  x.historyCode.updateCode(defaultHistoryCode);
                }}"
                :code="${(x) => x.document.historyCode ?? defaultHistoryCode}"
                ${ref('historyCode')}
              ></ppp-snippet>
            </div>
          </div>
        </ppp-tab-panel>
        <ppp-tab-panel id="ui-panel">
          <div class="widget-settings-section">
            <div class="widget-settings-label-group">
              <h5>Количество сообщений для отображения</h5>
              <p class="description">
                Максимальное количество сообщений для единовременного
                отображения.
              </p>
            </div>
            <div class="widget-settings-input-group">
              <ppp-text-field
                type="number"
                placeholder="50"
                value="${(x) => x.document.depth ?? 50}"
                ${ref('depth')}
              ></ppp-text-field>
            </div>
          </div>
          <div class="widget-settings-section">
            <div class="widget-settings-label-group">
              <h5>Время подсветки новых сообщений</h5>
              <p class="description">
                Время, в течение которое новое входящее сообщение будет выделено
                цветом. Задаётся в секундах.
              </p>
            </div>
            <div class="widget-settings-input-group">
              <ppp-text-field
                type="number"
                placeholder="5"
                value="${(x) => x.document.newTimeout ?? 5}"
                ${ref('newTimeout')}
              ></ppp-text-field>
            </div>
          </div>
          <div class="widget-settings-section">
            <div class="widget-settings-label-group">
              <h5>Другие параметры интерфейса</h5>
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
            <ppp-checkbox
              ?checked="${(x) => x.document.multiline}"
              ${ref('multiline')}
            >
              Переносить текст заголовков на несколько строк
            </ppp-checkbox>
          </div>
        </ppp-tab-panel>
        <ppp-tab-panel id="filters-panel"></ppp-tab-panel>
      </ppp-tabs>
    `
  };
}
