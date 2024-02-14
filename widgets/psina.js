/** @decorator */

const [
  { Widget, widgetStyles, widgetEmptyStateTemplate },
  { css, html, ref, when, observable },
  { validate, invalidate },
  { formatDate },
  { WIDGET_TYPES },
  { normalize, typography, ellipsis },
  {
    themeConditional,
    fontWeightBody1,
    lineHeightBody1,
    fontSizeBody1,
    fontSizeWidget,
    fontWeightWidget,
    lineHeightWidget,
    paletteGreenDark2,
    paletteGreenLight2,
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
  import(`${ppp.rootUrl}/lib/ppp-errors.js`),
  import(`${ppp.rootUrl}/lib/intl.js`),
  import(`${ppp.rootUrl}/lib/const.js`),
  import(`${ppp.rootUrl}/design/styles.js`),
  import(`${ppp.rootUrl}/design/design-tokens.js`),
  import(`${ppp.rootUrl}/elements/banner.js`),
  import(`${ppp.rootUrl}/elements/button.js`),
  import(`${ppp.rootUrl}/elements/snippet.js`),
  import(`${ppp.rootUrl}/elements/text-field.js`),
  import(`${ppp.rootUrl}/elements/query-select.js`),
  import(`${ppp.rootUrl}/elements/widget-controls.js`)
]);

export const psinaWidgetTemplate = html`
  <template>
    <div class="widget-root">
      <div class="widget-header">
        <div class="widget-header-inner">
          <span class="widget-title">
            <span class="title">${(x) => x.document?.name ?? ''}</span>
          </span>
          <ppp-widget-header-buttons></ppp-widget-header-buttons>
        </div>
      </div>
      <div class="widget-body">
        <ppp-widget-notifications-area></ppp-widget-notifications-area>
      </div>
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

  .imbalance-type-holder {
    display: flex;
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
    margin: 4px 0;
    background-color: ${themeConditional(paletteBlueBase, paletteBlueLight1)};
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

export class PsinaWidget extends Widget {
  @observable
  me;

  @observable
  sprint;

  async connectedCallback() {
    super.connectedCallback();

    if (this.document.pusherApi) {
      this.pusherTelegramHandler = this.psinaPusherHandler.bind(this);

      const connection = await ppp.getOrCreatePusherConnection(
        this.document.pusherApi
      );

      if (connection) {
        connection.channel('psina')?.bind('bark', this.psinaPusherHandler);
      }
    }
  }

  async disconnectedCallback() {
    if (this.document.pusherApi) {
      const connection = await ppp.getOrCreatePusherConnection(
        this.document.pusherApi
      );

      if (connection) {
        connection.channel('psina')?.unbind('bark', this.psinaPusherHandler);
      }
    }

    return super.disconnectedCallback();
  }

  async cancelWithdrawalRequest() {}

  psinaPusherHandler(data) {}

  async validate() {
    await validate(this.container.psinaBrokerId);
    await validate(this.container.psinaPusherServiceId);
    await validate(this.container.pusherApiId);
  }

  async submit() {
    return {
      $set: {
        psinaBrokerId: this.container.psinaBrokerId.value,
        psinaPusherServiceId: this.container.psinaPusherServiceId.value,
        pusherApiId: this.container.pusherApiId.value
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
    description: html`Виджет служит для работы с проектом Psina.`,
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
          <h5>Брокерский профиль Psina</h5>
        </div>
        <div class="widget-settings-input-group">
          <div class="control-line flex-start">
            <ppp-query-select
              ${ref('psinaBrokerId')}
              standalone
              value="${(x) => x.document.psinaBrokerId}"
              :context="${(x) => x}"
              :preloaded="${(x) => x.document.psinaBroker ?? ''}"
              :query="${() => {
                return (context) => {
                  return context.services
                    .get('mongodb-atlas')
                    .db('ppp')
                    .collection('brokers')
                    .find({
                      $and: [
                        {
                          type: `[%#(await import(ppp.rootUrl + '/lib/const.js')).BROKERS.PSINA%]`
                        },
                        {
                          $or: [
                            { removed: { $ne: true } },
                            { _id: `[%#this.document.psinaBrokerId ?? ''%]` }
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
                window.open('?page=broker-psina', '_blank').focus()}"
            >
              +
            </ppp-button>
          </div>
        </div>
      </div>
      <div class="widget-settings-section">
        <div class="widget-settings-label-group">
          <h5>Шлюз Pusher</h5>
          <p class="description">
            Создайте Cloudflare Worker по шаблону «Интеграция Pusher и Psina».
          </p>
        </div>
        <div class="widget-settings-input-group">
          <div class="control-line flex-start">
            <ppp-query-select
              ${ref('psinaPusherServiceId')}
              standalone
              value="${(x) => x.document.psinaPusherServiceId}"
              :context="${(x) => x}"
              :preloaded="${(x) => x.document.psinaPusherService ?? ''}"
              :query="${() => {
                return (context) => {
                  return context.services
                    .get('mongodb-atlas')
                    .db('ppp')
                    .collection('services')
                    .find({
                      $and: [
                        { removed: { $ne: true } },
                        { workerPredefinedTemplate: 'psinaPusher' },
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
              appearance="default"
              @click="${() =>
                window
                  .open('?page=service-cloudflare-worker', '_blank')
                  .focus()}"
            >
              +
            </ppp-button>
          </div>
        </div>
      </div>
      <div class="widget-settings-section">
        <div class="widget-settings-label-group">
          <h5>Профиль API Pusher</h5>
          <p class="description">
            Треубется для приёма уведомлений в режиме реального времени.
          </p>
        </div>
        <div class="widget-settings-input-group">
          <div class="control-line flex-start">
            <ppp-query-select
              ${ref('pusherApiId')}
              standalone
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
              :transform="${() => ppp.decryptDocumentsTransformation(['key'])}"
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
    `
  };
}
