const [
  { Widget, widget },
  { css, html, ref, when },
  { validate, invalidate },
  { Tmpl },
  { WIDGET_TYPES },
  { normalize, typography },
  {
    paletteWhite,
    paletteBlack,
    paletteGrayBase,
    paletteGrayLight1,
    paletteGrayLight2,
    paletteGrayLight3,
    paletteGrayDark1,
    paletteGrayDark2,
    paletteGrayDark3,
    paletteGrayDark4,
    paletteBlueBase,
    paletteBlueLight2,
    scrollBarSize,
    positive,
    negative,
    bodyFont,
    fontSizeWidget
  }
] = await Promise.all([
  import(`${ppp.rootUrl}/elements/widget.js`),
  import(`${ppp.rootUrl}/vendor/fast-element.min.js`),
  import(`${ppp.rootUrl}/lib/ppp-errors.js`),
  import(`${ppp.rootUrl}/lib/tmpl.js`),
  import(`${ppp.rootUrl}/lib/const.js`),
  import(`${ppp.rootUrl}/design/styles.js`),
  import(`${ppp.rootUrl}/design/design-tokens.js`),
  import(`${ppp.rootUrl}/elements/button.js`),
  import(`${ppp.rootUrl}/elements/snippet.js`),
  import(`${ppp.rootUrl}/elements/text-field.js`),
  import(`${ppp.rootUrl}/elements/query-select.js`)
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
  ${widget()}
  ${typography()}
`;

export class PsinaWidget extends Widget {
  getActiveWidgetTab() {
    if (/overview|projects|services|operations/i.test(this.document.activeTab))
      return this.document.activeTab;
    else return 'overview';
  }

  handleWidgetTabChange({ event }) {
    void this.updateDocumentFragment({
      $set: {
        'widgets.$.activeTab': event.detail.id
      }
    });
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
    settings: html``
  };
}
