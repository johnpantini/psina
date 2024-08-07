const [{ css, html, ref }, { TRADERS, TRADER_CAPS }, { validate }] =
  await Promise.all([
    import(`${ppp.rootUrl}/vendor/fast-element.min.js`),
    import(`${ppp.rootUrl}/lib/const.js`),
    import(`${ppp.rootUrl}/lib/ppp-errors.js`),
    import(`${ppp.rootUrl}/elements/pages/service-ppp-aspirant-worker.js`)
  ]);

import WebullLevel1Trader from './webull-level1-trader.js';

export default WebullLevel1Trader;

export function generateDeviceID() {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < 32; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return result;
}

export async function traderPageDefinition() {
  return {
    styles: css``,
    template: html`
      <section>
        <div class="label-group">
          <h5>Идентификатор устройства</h5>
          <p class="description">Требуется для совершения запросов.</p>
        </div>
        <div class="input-group">
          <ppp-text-field
            ?disabled="${(x) => x.document._id && !x.document.removed}"
            placeholder="qy6erkc0qz05qfypvofsy0v80besqdmg"
            value="${(x) => x.document.deviceID}"
            ${ref('deviceID')}
          ></ppp-text-field>
          <div class="spacing2"></div>
          <ppp-button
            ?disabled="${(x) => x.document._id && !x.document.removed}"
            @click="${(x) => (x.deviceID.value = generateDeviceID())}"
            appearance="primary"
          >
            Сгенерировать значение
          </ppp-button>
        </div>
      </section>
      <section>
        <div class="label-group">
          <h5>Соединитель</h5>
          <p class="description">
            Наличие соединителя ускоряет обновление данных.
          </p>
        </div>
        <div class="input-group">
          <div class="control-stack">
            <ppp-query-select
              ${ref('connectorServiceId')}
              standalone
              deselectable
              placeholder="Опционально, нажмите для выбора"
              :context="${(x) => x}"
              value="${(x) => x.document.connectorServiceId}"
              :preloaded="${(x) => x.document.connectorService ?? ''}"
              :query="${() => {
                return (context) => {
                  return context.services
                    .get('mongodb-atlas')
                    .db('ppp')
                    .collection('services')
                    .find({
                      $and: [
                        {
                          type: `[%#(await import(ppp.rootUrl + '/lib/const.js')).SERVICES.PPP_ASPIRANT_WORKER%]`
                        },
                        { workerPredefinedTemplate: 'connectors' },
                        {
                          $or: [
                            { removed: { $ne: true } },
                            {
                              _id: `[%#this.document.connectorServiceId ?? ''%]`
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
          </div>
        </div>
      </section>
    `,
    pageClass: class {
      async loadedCallback() {
        const observer = new MutationObserver(() => {
          if (this.urlRadio) {
            this.urlRadio.disabled = true;
            this.sharedWorkerRadio.disabled = true;

            this.runtime.value = 'main-thread';

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
                  from: 'services',
                  localField: 'connectorServiceId',
                  foreignField: '_id',
                  as: 'connectorService'
                }
              },
              {
                $unwind: {
                  path: '$connectorService',
                  preserveNullAndEmptyArrays: true
                }
              }
            ]);
        };
      }

      getCaps() {
        return [TRADER_CAPS.CAPS_LEVEL1, TRADER_CAPS.CAPS_EXTENDED_LEVEL1];
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
        await validate(this.deviceID);
      }

      async submit(sup) {
        sup.$set.runtime = 'main-thread';

        sup.$set = {
          ...sup.$set,
          url: new URL(this.url.value).toString(),
          deviceID: this.deviceID.value.trim(),
          connectorServiceId: this.connectorServiceId.value,
          version: 1,
          type: TRADERS.CUSTOM
        };

        return sup;
      }
    }
  };
}
