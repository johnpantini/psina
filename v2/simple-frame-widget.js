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

export const simpleFrameWidgetTemplate = html`
  <template>
    <div class="widget-root">
      <div class="widget-header">
        <div class="widget-header-inner">
          <ppp-widget-group-control></ppp-widget-group-control>
          <ppp-widget-search-control></ppp-widget-search-control>
          <span class="widget-title">
            <span class="title">${(x) => x.document?.name ?? ''}</span>
          </span>
          <ppp-widget-header-buttons></ppp-widget-header-buttons>
        </div>
      </div>
      <div class="widget-body">
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
        <ppp-widget-notifications-area></ppp-widget-notifications-area>
      </div>
      <ppp-widget-resize-controls></ppp-widget-resize-controls>
    </div>
  </template>
`;

export const simpleFrameWidgetStyles = css`
  ${normalize()}
  ${widget()}
`;

export class SimpleFrameWidget extends WidgetWithInstrument {}

// noinspection JSUnusedGlobalSymbols
export async function widgetDefinition() {
  // noinspection JSVoidFunctionReturnValueUsed
  return {
    type: WIDGET_TYPES.FRAME,
    collection: 'Psina',
    title: html`Фрейм`,
    description: html`Виджет <span class="positive">Фрейм</span> отображает
      произвольное содержимое, встраиваемое по ссылке.`,
    customElement: SimpleFrameWidget.compose({
      template: simpleFrameWidgetTemplate,
      styles: simpleFrameWidgetStyles
    }).define(),
    minHeight: 120,
    defaultWidth: 600,
    defaultHeight: 512
  };
}
