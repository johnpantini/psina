const [
  { css, html, ref },
  { TRADERS, TRADER_CAPS },
  { validate },
  { checkConnection }
] = await Promise.all([
  import(`${ppp.rootUrl}/vendor/fast-element.min.js`),
  import(`${ppp.rootUrl}/lib/const.js`),
  import(`${ppp.rootUrl}/lib/ppp-errors.js`),
  import(`${ppp.rootUrl}/elements/pages/trader-alpaca-v2-plus.js`)
]);

import PsinaTrader from './psina-trader.js';

export default PsinaTrader;

export async function traderPageDefinition() {
  return {
    styles: css``,
    template: html`
      <section>
        <div class="label-group">
          <h5>Профиль брокера</h5>
          <p class="description">Брокерский профиль Psina.</p>
        </div>
        <div class="input-group">
          <ppp-query-select
            ${ref('brokerId')}
            value="${(x) => x.document.brokerId}"
            :context="${(x) => x}"
            :preloaded="${(x) => x.document.broker ?? ''}"
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
                          { _id: `[%#this.document.brokerId ?? ''%]` }
                        ]
                      }
                    ]
                  })
                  .sort({ updatedAt: -1 });
              };
            }}"
            :transform="${() => ppp.decryptDocumentsTransformation()}"
          ></ppp-query-select>
          <div class="spacing2"></div>
          <div class="control-line">
            <ppp-button
              @click="${() =>
                ppp.app.mountPage('broker-psina', {
                  size: 'xlarge',
                  adoptHeader: true
                })}"
              appearance="primary"
            >
              Добавить профиль Psina
            </ppp-button>
          </div>
        </div>
      </section>
      <section>
        <div class="label-group">
          <h5>Шлюз Psina Sprint</h5>
          <p class="description">
            Укажите ссылку для подключения к потоку данных.
          </p>
        </div>
        <div class="input-group">
          <ppp-text-field
            placeholder="wss://example.com"
            value="${(x) => x.document.wsUrl}"
            ${ref('wsUrl')}
          ></ppp-text-field>
        </div>
      </section>
    `,
    pageClass: class {
      async loadedCallback() {
        const observer = new MutationObserver(() => {
          if (this.urlRadio) {
            this.urlRadio.disabled = true;

            if (this.runtime.value === 'url') {
              this.runtime.value = 'main-thread';
            }

            observer.disconnect();
          }
        });

        observer.observe(this.shadowRoot, {
          childList: true,
          subtree: true
        });
      }

      async read() {
        return (context) => {
          return context.services
            .get('mongodb-atlas')
            .db('ppp')
            .collection('[%#this.collection%]')
            .aggregate([
              {
                $match: {
                  _id: new BSON.ObjectId('[%#payload.documentId%]'),
                  type: `[%#(await import(ppp.rootUrl + '/lib/const.js')).TRADERS.CUSTOM%]`
                }
              },
              {
                $lookup: {
                  from: 'brokers',
                  localField: 'brokerId',
                  foreignField: '_id',
                  as: 'broker'
                }
              },
              {
                $unwind: '$broker'
              }
            ]);
        };
      }

      getCaps() {
        return [
          TRADER_CAPS.CAPS_ACTIVE_ORDERS,
          TRADER_CAPS.CAPS_POSITIONS,
          TRADER_CAPS.CAPS_TIMELINE,
          'caps-psina'
        ];
      }

      async find() {
        return {
          type: TRADERS.CUSTOM,
          name: this.name.value.trim(),
          removed: { $ne: true }
        };
      }

      async validate() {
        await validate(this.url);
        await validate(this.brokerId);
        await validate(this.wsUrl);

        const login = this.brokerId.datum().login;
        const password = this.brokerId.datum().password;

        await checkConnection(this.wsUrl, login, password);
      }

      async submit(sup) {
        sup.$set = {
          ...sup.$set,
          url: new URL(this.url.value).toString(),
          brokerId: this.brokerId.value,
          wsUrl: new URL(this.wsUrl.value).toString(),
          version: 1,
          type: TRADERS.CUSTOM
        };

        return sup;
      }
    }
  };
}
