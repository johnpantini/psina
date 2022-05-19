import { PsinaPage } from '[%#payload.baseExtensionUrl%]/shared/pages/psina.js';
import {
  html,
  requireComponent
} from '[%#ctx.ppp.rootUrl%]/shared/template.js';
import { css } from '[%#ctx.ppp.rootUrl%]/shared/element/styles/css.js';
import { ref } from '[%#ctx.ppp.rootUrl%]/shared/element/templating/ref.js';
import { repeat } from '[%#ctx.ppp.rootUrl%]/shared/element/templating/repeat.js';
import { when } from '[%#ctx.ppp.rootUrl%]/shared/element/templating/when.js';
import {
  pageStyles,
  loadingIndicator
} from '[%#ctx.ppp.rootUrl%]/desktop/leafygreen/page.js';
import { formatDate } from '[%#ctx.ppp.rootUrl%]/shared/intl.js';
import { settings } from '[%#ctx.ppp.rootUrl%]/desktop/leafygreen/icons/settings.js';
import { caretDown } from '[%#ctx.ppp.rootUrl%]/desktop/leafygreen/icons/caret-down.js';
import ppp from '[%#ctx.ppp.rootUrl%]/ppp.js';

(
  await import(`[%#payload.baseExtensionUrl%]/i18n/${ppp.locale}/psina.i18n.js`)
).default(ppp.dict);

export const keysTabContent = html`
  ${when(
    (x) => !x.psinaKeys?.wardenKey,
    html`
      <${'ppp-banner'} class="inline margin-top" appearance="info">
        Инструкция по получению ключей доступна по <a target="_blank"
                                                      href="https://pantini.gitbook.io/pantini-co/psina/how-to">ссылке</a>.
      </ppp-banner>
    `
  )}
  ${when(
    (x) => x.psinaKeys?.wardenKey,
    html`
      <${'ppp-banner'} class="inline margin-top" appearance="info">Ключи в
        порядке. Используйте компактное представление (данные конфиденциальны)
        ниже для подачи заявки:
      </ppp-banner>
      <${'ppp-copyable'}>
        ${(x) => x.psinaKeys?.wardenKey}
      </ppp-copyable>
    `
  )}
  <section>
    <div class="label-group">
      <h5>Сервисный аккаунт Yandex Cloud</h5>
      <p>Идентификатор сервисного аккаунта.</p>
    </div>
    <div class="input-group">
      <ppp-text-field
        placeholder="Введите значение"
        value="${(x) => x.psinaKeys?.ycServiceAccountID}"
        ${ref('ycServiceAccountId')}
      ></ppp-text-field>
    </div>
  </section>
  <section>
    <div class="label-group">
      <h5>Идентификатор открытого ключа Yandex Cloud</h5>
      <p>Идентификатор открытого авторизованного ключа сервисного аккаунта.</p>
    </div>
    <div class="input-group">
      <ppp-text-field
        placeholder="Введите значение"
        value="${(x) => x.psinaKeys?.ycPublicKeyID}"
        ${ref('ycPublicKeyId')}
      ></ppp-text-field>
    </div>
  </section>
  <section>
    <div class="label-group">
      <h5>Закрытый ключ Yandex Cloud</h5>
      <p>Закрытый авторизованный ключ сервисного аккаунта.</p>
    </div>
    <div class="input-group">
      <${'ppp-text-area'}
        monospace
        placeholder="Введите ключ"
        value="${(x) => x.psinaKeys?.ycPrivateKey}"
        ${ref('ycPrivateKey')}
      ></ppp-text-area>
    </div>
  </section>
  <section>
    <div class="label-group">
      <h5>Профиль брокера Alor OpenAPI V2</h5>
    </div>
    <div class="input-group">
      <${'ppp-select'}
        ?disabled="${(x) => !x.alorBrokerProfiles}"
        value="${(x) => x.psinaKeys?.alorBrokerId}"
        placeholder="Нет доступных профилей"
        ${ref('alorBroker')}
      >
        ${repeat(
          (x) => x?.alorBrokerProfiles,
          html`
            <ppp-option ?removed="${(x) => x.removed}" value="${(x) => x._id}">
              ${(x) => x.name}
            </ppp-option>
          `
        )}
        ${when(
          (x) => x.alorBrokerProfiles !== null,
          caretDown({
            slot: 'indicator'
          })
        )}
        ${when(
          (x) => x.alorBrokerProfiles === null,
          settings({
            slot: 'indicator',
            cls: 'spinner-icon'
          })
        )}
      </ppp-select>
      <${'ppp-button'}
        class="margin-top"
        @click="${(x) =>
          x.app.navigate({
            page: 'broker-alor-openapi-v2'
          })}"
        appearance="primary"
      >
        Создать новый профиль брокера
      </ppp-button>
    </div>
  </section>
  <section>
    <div class="label-group">
      <h5>Портфель SPBX Alor</h5>
      <p>Долларовый портфель Алор (СПБ Биржа).</p>
    </div>
    <div class="input-group">
      <ppp-text-field
        placeholder="D70000"
        value="${(x) => x.psinaKeys?.alorPortfolio}"
        ${ref('alorPortfolio')}
      ></ppp-text-field>
    </div>
  </section>
  <section>
    <div class="label-group">
      <h5>Профиль API Pusher</h5>
    </div>
    <div class="input-group">
      <${'ppp-select'}
        ?disabled="${(x) => !x.pusherApis}"
        value="${(x) => x.psinaKeys?.pusherApiId}"
        placeholder="Нет доступных профилей"
        ${ref('pusherApi')}
      >
        ${repeat(
          (x) => x?.pusherApis,
          html`
            <ppp-option ?removed="${(x) => x.removed}" value="${(x) => x._id}">
              ${(x) => x.name}
            </ppp-option>
          `
        )}
        ${when(
          (x) => x.pusherApis !== null,
          caretDown({
            slot: 'indicator'
          })
        )}
        ${when(
          (x) => x.pusherApis === null,
          settings({
            slot: 'indicator',
            cls: 'spinner-icon'
          })
        )}
      </ppp-select>
      <${'ppp-button'}
        class="margin-top"
        @click="${(x) =>
          x.app.navigate({
            page: 'api-pusher'
          })}"
        appearance="primary"
      >
        Создать новый профиль API Pusher
      </ppp-button>
    </div>
  </section>
  <section class="last">
    <div class="footer-actions">
      <${'ppp-button'}
        ?disabled="${(x) => x.busy || x.service?.removed}"
        type="submit"
        @click="${(x) => x.savePsinaKeys()}"
        appearance="primary"
      >Сохранить ключи
      </ppp-button>
    </div>
  </section>
`;

export const overviewTabContent = html`
  ${when(
    (x) => !x.busy && x?.psinaStats?.status !== 'ok',
    html`
      <div class="empty-state">
        <img
          class="overview-logo"
          src="static/cloud-functions.svg"
          draggable="false"
          alt="Psina"
        />
        <h1>
          ${(x) =>
            x?.psinaStats?.status !== 'pending'
              ? 'Вы не подключены к Psina'
              : 'Ваша заявка сейчас на рассмотрении'}
        </h1>
        <h2>
          ${(x) =>
            x?.psinaStats?.status !== 'pending'
              ? 'Настройте ключи облачных сервисов, а затем подайте заявку на подключение!'
              : 'Ваши облачные сервисы в порядке, осталось дождаться одобрения заявки!'}
        </h2>
        ${when(
          (x) => x?.psinaStats?.status !== 'pending',
          html`
            <button
              @click="${(x) => (x.activeTab = 'keys')}"
              type="button"
              class="cta"
              aria-disabled="false"
              role="link"
            >
              <div class="text">Перейти к настройкам ключей</div>
            </button>
          `
        )}
      </div>
    `
  )}
  ${when(
    (x) => x?.psinaStats?.status === 'ok',
    html`
      <div class="section-content horizontal-overflow">
        <div class="service-details">
          <div class="service-details-controls">
            <div class="service-details-control service-details-label">
              Psina
            </div>
            <div
              class="service-details-control"
              style="justify-content: left"
            >
              <${'ppp-button'}
                disabled
              >
                Зарезервировано
              </ppp-button>
            </div>
            <div class="service-details-control">
              <${'ppp-badge'} appearance="green">
                Портфель под управлением
              </ppp-badge>
            </div>
          </div>
          <div class="service-details-info">
            <div class="service-details-info-container">
                    <span style="grid-column-start: 1;grid-row-start: 1;">
                      Портфель
                    </span>
              <div style="grid-column-start: 1;grid-row-start: 2;">
                ${(x) => x?.psinaKeys?.alorPortfolio}
              </div>
              <span style="grid-column-start: 2;grid-row-start: 1;">
                    Баланс Psina
                    </span>
              <div class="balance-holder"
                   appearance="${(x) => x.getBalanceAppearance()}"
                   style="grid-column-start: 2;grid-row-start: 2;">
                ${(x) => x.formatRUB(x.getBalance())}
              </div>
              <span style="grid-column-start: 3;grid-row-start: 1;">
                    Прибыль за день
                    </span>
              <div class="balance-holder"
                   appearance="${(x) => x.getBalanceAppearance(0)}"
                   style="grid-column-start: 3;grid-row-start: 2;">
                ${(x) => x.formatUSD(0)}
              </div>
              <span style="grid-column-start: 4;grid-row-start: 1;">
                    Сделок за день
                    </span>
              <div style="grid-column-start: 4;grid-row-start: 2;">
                ${(x) => 0}
              </div>
              <span style="grid-column-start: 5;grid-row-start: 1;">
                    Из них до 100 лотов
                    </span>
              <div appearance="good"
                   style="grid-column-start: 5;grid-row-start: 2;">
                ${(x) => '0/150'}
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  )}
`;

export function paymentTypeAppearance(type) {
  switch (type) {
    case 'receipt':
      return 'green';
  }

  return 'lightgray';
}

export const psinaPageTemplate = (context, definition) => html`
  <template>
    <${'ppp-page-header'} ${ref('header')}>Центр управления Psina
    </ppp-page-header>
    <div class="loading-wrapper" ?busy="${(x) => x.busy}">
      <ppp-tabs activeid="overview" ${ref('tabs')}
                @change="${(x, c) => x.handlePsinaTabChange(c)}">
        <ppp-tab id="overview">Обзор</ppp-tab>
        <ppp-tab id="keys">Ключи</ppp-tab>
        <ppp-tab id="payments">Платежи</ppp-tab>
        <ppp-tab id="achievements">Достижения</ppp-tab>
        <ppp-tab-panel id="overview-panel"></ppp-tab-panel>
        <ppp-tab-panel id="keys-panel"></ppp-tab-panel>
        <ppp-tab-panel id="payments-panel"></ppp-tab-panel>
        <ppp-tab-panel id="achievements-panel">
        </ppp-tab-panel>
      </ppp-tabs>
      ${when((x) => x.activeTab === 'overview', overviewTabContent)}
      ${when((x) => x.activeTab === 'keys', keysTabContent)}
      ${when(
        (x) => x.activeTab === 'achievements',
        html`
          <${'ppp-table'}
            ${ref('achievementsTable')}
            :columns="${(x) => x.achievementsTableColumns}"
            :rows="${(x) =>
              x.achievementsTableRows?.map((datum) => {
                return {
                  datum,
                  cells: [
                    datum.title,
                    datum.description,
                    formatDate(datum.achievedAt)
                  ]
                };
              })}"
          >
          </ppp-table>
        `
      )}
      ${when(
        (x) => x.activeTab === 'payments',
        html`
          <${'ppp-table'}
            ${ref('paymentsTable')}
            :columns="${(x) => x.paymentsTableColumns}"
            :rows="${(x) =>
              x.paymentsTableRows?.map((datum) => {
                return {
                  datum,
                  cells: [
                    html`
                      <${'ppp-badge'}
                        appearance="${() => paymentTypeAppearance(datum.type)}">
                        ${() => x.t(`$psina.paymentType.${datum.type}`)}
                      </ppp-badge>
                    `,
                    x.formatRUB(datum.amount / 100),
                    formatDate(new Date(datum.createdAt)),
                    x.formatRUB(datum.psinaBalance / 100)
                  ]
                };
              })}"
          >
          </ppp-table>
        `
      )}
      ${when((x) => x.busy, html`${loadingIndicator()}`)}
    </div>
  </template>
`;

await Promise.all([
  requireComponent(
    'ppp-tabs',
    `[%#ctx.ppp.rootUrl%]/${ppp.appType}/${ppp.theme}/tabs.js`
  ),
  requireComponent(
    'ppp-tab',
    `[%#ctx.ppp.rootUrl%]/${ppp.appType}/${ppp.theme}/tabs.js`
  ),
  requireComponent(
    'ppp-tab-panel',
    `[%#ctx.ppp.rootUrl%]/${ppp.appType}/${ppp.theme}/tabs.js`
  ),
  requireComponent(
    'ppp-badge',
    `[%#ctx.ppp.rootUrl%]/${ppp.appType}/${ppp.theme}/badge.js`
  )
]);

export const psinaPageStyles = (context, definition) => css`
  ${pageStyles}
  ppp-tabs ~ ppp-table {
    position: relative;
    top: 8px;
  }

  ppp-table {
    width: 100%;
  }

  .overview-logo {
    margin: 30px 0;
    width: 372px;
    height: 174px;
  }

  div[appearance='good'] {
    color: rgb(19, 170, 82);
  }

  div[appearance='bad'] {
    color: rgb(151, 6, 6);
  }
`;

// noinspection JSUnusedGlobalSymbols
export default PsinaPage.compose({
  baseName: 'psina-[%#payload.extension._id%]-page',
  template: psinaPageTemplate,
  styles: psinaPageStyles
});
