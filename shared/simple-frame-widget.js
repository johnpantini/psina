const [
  { Widget },
  { ref },
  { when },
  { html },
  { validate },
  { WIDGET_TYPES }
] = await Promise.all([
  import(`${ppp.rootUrl}/shared/widget.js`),
  import(`${ppp.rootUrl}/shared/element/templating/ref.js`),
  import(`${ppp.rootUrl}/shared/element/templating/when.js`),
  import(`${ppp.rootUrl}/shared/template.js`),
  import(`${ppp.rootUrl}/shared/validate.js`),
  import(`${ppp.rootUrl}/shared/const.js`)
]);

export const psinaSimpleFrameWidgetTemplate = (context, definition) => html`
  <template>
    <div class="widget-root">
      <div class="widget-header">
        <div class="widget-instrument-area">
          <div
            class="widget-header-name"
            title="${(x) => x.document?.name ?? ''}"
          >
            <span>${(x) => x.document?.name ?? ''}</span>
          </div>
          <div class="widget-header-controls">
            <div
              style="background-image:url('static/widgets/settings.svg')"
              class="widget-close-button"
              @click="${(x) => x.goToSettings()}"
            ></div>
            <div
              style="background-image:url('static/widgets/close.svg')"
              class="widget-close-button"
              @click="${(x) => x.close()}"
            ></div>
          </div>
        </div>
      </div>
      <div class="widget-body">
        ${when(
          (x) => !x.document.frameUrl,
          html`
            <div class="widget-empty-state-holder">
              <img draggable="false" src="static/empty-widget-state.svg" />
              <span>Укажите ссылку для отображения.</span>
            </div>
          `
        )}
        ${when(
          (x) => x.document.frameUrl,
          html`
            <iframe
              src="${(x) => x.document.frameUrl}"
              width="100%"
              height="100%"
              style="background: transparent; border: none;"
            ></iframe>
          `
        )}
      </div>
    </div>
  </template>
`;

export class PsinaSimpleFrameWidget extends Widget {
  async validate() {
    await validate(this.container.frameUrl);
  }

  async submit() {
    return {
      $set: {
        frameUrl: this.container.frameUrl.value
      }
    };
  }
}

export async function widgetDefinition(definition = {}) {
  return {
    type: WIDGET_TYPES.FRAME,
    collection: 'Psina',
    title: html`Фрейм`,
    description: html`Виджет <span class="positive">Фрейм</span> отображает
      произвольное содержимое, встраиваемое по ссылке.`,
    customElement: PsinaSimpleFrameWidget.compose(definition),
    maxHeight: 1200,
    maxWidth: 1900,
    minHeight: 120,
    defaultWidth: 600,
    defaultHeight: 512,
    minWidth: 150,
    settings: html`
      <div class="widget-settings-section">
        <div class="widget-settings-label-group">
          <h5>Ссылка для отображения</h5>
        </div>
        <div class="widget-settings-input-group">
          <${'ppp-text-field'}
            type="url"
            placeholder="https://example.com"
            value="${(x) => x.document.frameUrl ?? ''}"
            ${ref('frameUrl')}
          ></ppp-text-field>
        </div>
      </div>
    `
  };
}
