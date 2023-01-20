/** @decorator */

const [
  { WidgetWithInstrument },
  { Observable, observable },
  { ref },
  { when },
  { repeat },
  { Tmpl },
  { html, requireComponent },
  { validate },
  { WIDGET_TYPES }
] = await Promise.all([
  import(`${ppp.rootUrl}/shared/widget-with-instrument.js`),
  import(`${ppp.rootUrl}/shared/element/observation/observable.js`),
  import(`${ppp.rootUrl}/shared/element/templating/ref.js`),
  import(`${ppp.rootUrl}/shared/element/templating/when.js`),
  import(`${ppp.rootUrl}/shared/element/templating/repeat.js`),
  import(`${ppp.rootUrl}/shared/tmpl.js`),
  import(`${ppp.rootUrl}/shared/template.js`),
  import(`${ppp.rootUrl}/shared/validate.js`),
  import(`${ppp.rootUrl}/shared/const.js`)
]);

export const psinaPusherSubscriptionWidgetTemplate = (
  context,
  definition
) => html`
  <template>
    <div class="widget-root">
      <div class="widget-header">
        <div class="widget-instrument-area">
          <${'ppp-widget-group-control'}
            :widget="${(x) => x}"
            selection="${(x) => x.document?.group}"
            ${ref('groupControl')}
          ></ppp-widget-group-control>
          <div class="instrument-search-holder">
            <${'ppp-widget-search-control'}
              :widget="${(x) => x}"
              ${ref('searchControl')}
            ></ppp-widget-search-control>
          </div>
          <div class="widget-header-name"
               title="${(x) => x.document?.name ?? ''}">
            <span>${(x) => x.document?.name ?? ''}</span>
          </div>
          <div class="widget-header-controls">
            <div
              style="background-image:url('static/widgets/settings.svg')"
              class="widget-close-button"
              @click="${(x) => x.goToSettings()}">
            </div>
            <div
              style="background-image:url('static/widgets/close.svg')"
              class="widget-close-button"
              @click="${(x) => x.close()}">
            </div>
          </div>
        </div>
      </div>
      <div class="widget-body">
        <div class="widget-card-list">
          <div class="widget-card-list-inner">
            ${when(
              (x) => !x.messages?.length,
              html`
                <div class="widget-empty-state-holder">
                  <img draggable="false" src="static/empty-widget-state.svg" />
                  <span>Нет данных.</span>
                </div>
              `
            )}
            ${repeat(
              (x) => x.messages ?? [],
              html`
                <${'ppp-widget-card'}
                  ?clickable="${(x) => typeof x['@click'] !== 'undefined'}"
                  @click="${(x, c) =>
                    typeof x['@click'] === 'function'
                      ? x['@click'](x, c)
                      : void 0}"
                  class="${(x) => (x.pppFromHistory ? '' : 'new')}">
                  ${(x) => (x.indicator ? html`${x.indicator}` : '')}
                  ${(x) => (x.iconLayout ? html`${x.iconLayout}` : '')}
                  ${(x) => (x.iconFallback ? html`${x.iconFallback}` : '')}
                  ${(x) => (x.leftTitle ? html`${x.leftTitle}` : '')}
                  ${(x) => (x.leftSubtitle ? html`${x.leftSubtitle}` : '')}
                  ${(x) => (x.rightTitle ? html`${x.rightTitle}` : '')}
                  ${(x) => (x.rightSubtitle ? html`${x.rightSubtitle}` : '')}
                </ppp-widget-card>
              `
            )}
          </div>
        </div>
        <${'ppp-widget-notifications-area'}
          ${ref('notificationsArea')}
        ></ppp-widget-notifications-area>
      </div>
    </div>
  </template>
`;

export class PsinaPusherSubscriptionWidget extends WidgetWithInstrument {
  @observable
  instrumentTrader;

  @observable
  messages;

  #messageFormatter;

  async connectedCallback() {
    super.connectedCallback();

    this.visibilityChange = this.visibilityChange.bind(this);

    document.addEventListener('visibilitychange', this.visibilityChange);

    this.messages = [];
    this.instrumentTrader = await ppp.getOrCreateTrader(
      this.document.instrumentTrader
    );
    this.searchControl.trader = this.instrumentTrader;

    if (this.instrumentTrader) {
      const AsyncFunction = Object.getPrototypeOf(
        async function () {}
      ).constructor;

      const bodyCode = await new Tmpl().render(
        this,
        this.document.formatterCode,
        {}
      );

      this.#messageFormatter = new AsyncFunction('event', 'message', bodyCode);

      await this.#historyRequest();

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
  }

  async disconnectedCallback() {
    document.removeEventListener('visibilitychange', this.visibilityChange);

    if (this.instrumentTrader) {
      if (this.document.pusherApi) {
        const connection = await ppp.getOrCreatePusherConnection(
          this.document.pusherApi
        );

        if (connection) {
          connection.channel('ppp')?.unbind_global(this.pusherHandler);
        }
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
      }, 3000);
    }
  }

  async #historyRequest() {
    this.messages = [];

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

      if (typeof formatted?.id !== 'undefined') {
        if (
          this.document.disableInstrumentFiltering ||
          !this.instrument ||
          formatted?.symbols?.indexOf?.(
            this.instrumentTrader.getSymbol?.(this.instrument)
          ) > -1
        ) {
          formatted.pppFromHistory = true;

          this.messages.push(formatted);
          Observable.notify(this, 'messages');
        }
      }
    }
  }

  async instrumentChanged(oldValue, newValue) {
    super.instrumentChanged(oldValue, newValue);

    if (this.instrumentTrader && !this.document.disableInstrumentFiltering) {
      await this.#historyRequest();
    }
  }

  async formatMessage(event, message) {
    return this.#messageFormatter.call(this, event, message);
  }

  async trySelectSymbol(symbol, instrumentType) {
    if (!symbol) return;

    if (this.instrumentTrader) {
      if (
        this.instrument &&
        symbol === this.instrumentTrader.getSymbol(this.instrument)
      )
        return;

      this.topLoader.start();

      try {
        await this.findAndSelectSymbol(
          {
            type: instrumentType,
            symbol,
            exchange: this.instrumentTrader.getExchange()
          },
          true
        );
      } catch (e) {
        console.log(e);
      } finally {
        this.topLoader.stop();
      }
    }
  }

  async pusherHandler(event, message) {
    if (event && !/^pusher:/i.test(event)) {
      let formatted = await this.formatMessage(event, message);

      if (typeof formatted?.id !== 'undefined') {
        if (
          this.document.autoSelectInstrument &&
          formatted?.symbols?.length === 1
        ) {
          await this.trySelectSymbol(
            formatted.symbols[0],
            this.document.instrumentType ?? 'stock'
          );
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

  async update() {
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

export async function widgetDefinition(definition = {}) {
  await Promise.all([
    requireComponent('ppp-collection-select'),
    requireComponent('ppp-codeflask')
  ]);

  const defaultFormatterCode = `/**
 * Функция форматирования сообщения.
 *
 * @param {string} event - Название события в канале Pusher.
 * - null: если форматируются сообщения из истории.
 * @param {json} message - Сообщение от Pusher.
 * @returns {object} formatted - Данные отформатированного сообщения.
 * @returns {string} formatted.id - Уникальный идентификатор.
 * @returns {array} [formatted.symbols] - Тикеры, относящиеся к сообщению.
 * @returns {string} [formatted.iconLayout] - Вёрстка для иконки.
 * @returns {string} [formatted.iconFallback] - Текст для отображения, если иконки нет.
 * @returns {string} [formatted.indicator] - Индикатор (вертикальная полоса слева).
 * @returns {string} [formatted.leftTitle] - Заголовок (слева).
 * @returns {string} [formatted.leftSubtitle] - Подзаголовок (слева).
 * @returns {string} [formatted.rightTitle] - Заголовок (справа).
 * @returns {string} [formatted.rightSubtitle] - Подзаголовок (справа).
 */

const { formatDateWithOptions } = await import(
  \`\${ppp.rootUrl}/shared/intl.js\`
);

return {
  id: message.ppp_counter,
  leftTitle: \`<span slot="title-left" title="\${message.title}">\${message.title}</span>\`,
  iconFallback: \`<span slot="icon-fallback">📰</span>\`,
  rightTitle: \`<span slot="title-right">\${formatDateWithOptions(
    new Date(
      Date.parse(
        message.date.replace('GMT-8', 'GMT-5').replace('GMT-7', 'GMT-4')
      )
    ),
    {
      month:  'numeric',
      day:    'numeric',
      hour:   'numeric',
      minute: 'numeric'
    }
  )}</span>\`
};`;

  const defaultHistoryCode = `/**
 * Функция исторических данных.
 *
 */

return [];`;

  return {
    type: WIDGET_TYPES.OTHER,
    collection: 'Psina',
    title: html`Сообщения Pusher`,
    description: html`Виджет позволяет подписаться на сообщения платформы Pusher
    с возможностью форматирования содержимого.`,
    customElement: PsinaPusherSubscriptionWidget.compose(definition),
    maxHeight: 1200,
    maxWidth: 1920,
    minHeight: 120,
    defaultWidth: 300,
    defaultHeight: 512,
    minWidth: 150,
    settings: html`
      <div class="widget-settings-section">
        <div class="widget-settings-label-group">
          <h5>Интеграция с Pusher</h5>
        </div>
        <div class="widget-settings-input-group">
          <ppp-collection-select
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
                        type: `[%#(await import(ppp.rootUrl + '/shared/const.js')).APIS.PUSHER%]`
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
            :transform="${() => ppp.decryptDocumentsTransformation(['key'])}"
          ></ppp-collection-select>
          <${'ppp-button'}
            class="margin-top"
            @click="${() => window.open('?page=api-pusher', '_blank').focus()}"
            appearance="primary"
          >
            Добавить API Pusher
          </ppp-button>
        </div>
      </div>
      <div class="widget-settings-section">
        <div class="widget-settings-label-group">
          <h5>Трейдер</h5>
          <p>Трейдер для поиска и переключения инструмента.</p>
        </div>
        <ppp-collection-select
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
        ></ppp-collection-select>
        <${'ppp-button'}
          class="margin-top"
          @click="${() => window.open('?page=trader', '_blank').focus()}"
          appearance="primary"
        >
          Создать нового трейдера
        </ppp-button>
      </div>
      <div class="widget-settings-section">
        <div class="widget-settings-label-group">
          <h5>Форматирование входящих сообщений</h5>
          <p>
            Тело функции для форматирования сообщений от Pusher.
          </p>
        </div>
        <div class="widget-settings-input-group">
          <ppp-codeflask
            :code="${(x) => x.document.formatterCode ?? defaultFormatterCode}"
            ${ref('formatterCode')}
          ></ppp-codeflask>
          <${'ppp-button'}
            class="margin-top"
            @click="${(x) => {
              x.formatterCode.updateCode(defaultFormatterCode);
              x.formatterCode.$emit('input');
            }}"
            appearance="primary"
          >
            Восстановить значение по умолчанию
          </ppp-button>
        </div>
      </div>
      <div class="widget-settings-section">
        <div class="widget-settings-label-group">
          <h5>Загрузка исторических данных</h5>
          <p>
            Тело функции, предоставляющей исторические данные, загружаемые при
            начальном отображении и смене инструмента виджета.
          </p>
        </div>
        <div class="widget-settings-input-group">
          <ppp-codeflask
            :code="${(x) => x.document.historyCode ?? defaultHistoryCode}"
            ${ref('historyCode')}
          ></ppp-codeflask>
          <${'ppp-button'}
            class="margin-top"
            @click="${(x) => {
              x.historyCode.updateCode(defaultHistoryCode);

              x.historyCode.$emit('input');
            }}"
            appearance="primary"
          >
            Восстановить значение по умолчанию
          </ppp-button>
        </div>
      </div>
      <div class="widget-settings-section">
        <div class="widget-settings-label-group">
          <h5>Параметры отображения и работы</h5>
        </div>
        <${'ppp-checkbox'}
          ?checked="${(x) => x.document.autoSelectInstrument}"
          ${ref('autoSelectInstrument')}
        >
          Переключать инструмент при новых сообщениях
        </${'ppp-checkbox'}>
        <${'ppp-checkbox'}
          ?checked="${(x) => x.document.disableInstrumentFiltering}"
          ${ref('disableInstrumentFiltering')}
        >
          Не фильтровать содержимое по выбранному инструменту
        </${'ppp-checkbox'}>
      </div>
    `
  };
}
