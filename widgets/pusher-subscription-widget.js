/** @decorator */

const [
  { WidgetWithInstrument, widget },
  { Observable, observable, css, html, ref, when, repeat },
  { Tmpl },
  { validate },
  { WIDGET_TYPES },
  { normalize }
] = await Promise.all([
  import(`${ppp.rootUrl}/elements/widget.js`),
  import(`${ppp.rootUrl}/vendor/fast-element.min.js`),
  import(`${ppp.rootUrl}/lib/tmpl.js`),
  import(`${ppp.rootUrl}/lib/ppp-errors.js`),
  import(`${ppp.rootUrl}/lib/const.js`),
  import(`${ppp.rootUrl}/design/styles.js`)
]);

export const pusherSubscriptionWidgetTemplate = html`
  <template>
    <div class="widget-root">
      <div class="widget-header">
        <div class="widget-header-inner">
          <ppp-widget-group-control
            selection="${(x) => x.document?.group}"
          ></ppp-widget-group-control>
          <ppp-widget-search-control></ppp-widget-search-control>
          <span class="widget-title">${(x) => x.document?.name ?? ''}</span>
        </div>
      </div>
      <div class="widget-body">
        <ppp-widget-notifications-area></ppp-widget-notifications-area>
      </div>
    </div>
  </template>
`;

export const pusherSubscriptionWidgetStyles = css`
  ${normalize()}
  ${widget()}
`;

export class PusherSubscriptionWidget extends WidgetWithInstrument {}

// noinspection JSUnusedGlobalSymbols
export async function widgetDefinition() {
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
          <ppp-button
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
        <ppp-button
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
          <ppp-button
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
          <ppp-button
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
        <ppp-checkbox
          ?checked="${(x) => x.document.autoSelectInstrument}"
          ${ref('autoSelectInstrument')}
        >
          Переключать инструмент при новых сообщениях
        </${'ppp-checkbox'}>
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
