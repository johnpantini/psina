const [
  { WidgetWithInstrument, widget },
  { css, html },
  { invalidate },
  { WIDGET_TYPES, BROKERS },
  { normalize }
] = await Promise.all([
  import(`${ppp.rootUrl}/elements/widget.js`),
  import(`${ppp.rootUrl}/vendor/fast-element.min.js`),
  import(`${ppp.rootUrl}/lib/ppp-errors.js`),
  import(`${ppp.rootUrl}/lib/const.js`),
  import(`${ppp.rootUrl}/design/styles.js`),
  import(`${ppp.rootUrl}/elements/button.js`)
]);

export const migrationWidgetTemplate = html`
  <template>
    <div class="widget-root">
      <div class="widget-header">
        <div class="widget-header-inner">
          <span class="widget-title">
            <span class="title">Миграция (v1 -> v2)</span>
          </span>
          <ppp-widget-header-buttons></ppp-widget-header-buttons>
        </div>
      </div>
      <div class="widget-body">
        <ppp-button
          appearance="primary"
          class="large"
          @click="${(x) => x.migrate()}"
        >
          Миграция
        </ppp-button>
      </div>
      <ppp-widget-resize-controls></ppp-widget-resize-controls>
    </div>
  </template>
`;

export const migrationWidgetStyles = css`
  ${normalize()}
  ${widget()}
  .widget-body {
    align-items: center;
    justify-content: center;
  }
`;

export class MigrationWidget extends WidgetWithInstrument {
  async migrate() {
    this.container.beginOperation();

    try {
      await ppp.user.functions.updateMany(
        { collection: 'brokers' },
        { type: 'tinkoff-invest-api' },
        { $set: { type: BROKERS.TINKOFF } }
      );
      await ppp.user.functions.updateMany(
        { collection: 'brokers' },
        { type: 'utex-aurora' },
        { $set: { type: BROKERS.UTEX } }
      );
      await ppp.user.functions.updateMany(
        { collection: 'brokers' },
        { type: 'alor-openapi-v2' },
        { $set: { type: BROKERS.ALOR } }
      );
      await ppp.user.functions.deleteMany({ collection: 'instruments' }, {});

      window.indexedDB.deleteDatabase('ppp');

      this.container.showSuccessNotification('Миграция успешно завершена.');
    } catch (e) {
      this.container.failOperation(e);
    } finally {
      this.container.endOperation();
    }
  }

  async submit() {
    invalidate(ppp.app.toast, {
      errorMessage: 'Воспользуйтесь кнопкой «Миграция»',
      raiseException: true
    });

    return false;
  }
}

// noinspection JSUnusedGlobalSymbols
export async function widgetDefinition() {
  // noinspection JSVoidFunctionReturnValueUsed
  return {
    type: WIDGET_TYPES.MIGRATION,
    collection: 'Psina',
    title: html`Миграция`,
    description: html`Виджет <span class="positive">Миграция</span> служит для
      настройки приложения при переходе с версии 1 на версию 2.
      <span class="negative"
        >Обратите внимание, что в процессе миграции будут удалены все торговые
        инструменты.</span
      >`,
    customElement: MigrationWidget.compose({
      template: migrationWidgetTemplate,
      styles: migrationWidgetStyles
    }).define(),
    minWidth: 275,
    minHeight: 120,
    defaultWidth: 275,
    defaultHeight: 165
  };
}
