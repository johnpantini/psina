const [
  { WidgetWithInstrument, widget, widgetEmptyStateTemplate },
  { css, html, ref, when },
  { validate },
  { WIDGET_TYPES },
  { normalize, ellipsis },
  {
    themeConditional,
    fontWeightBody1,
    lineHeightBody1,
    fontSizeBody1,
    fontSizeWidget,
    fontWeightWidget,
    lineHeightWidget,
    paletteBlueDark2,
    paletteBlueLight2,
    paletteGrayLight1,
    paletteGrayDark1,
    paletteGreenDark2,
    paletteGreenLight2,
    palettePurpleDark2,
    palettePurpleLight2,
    positive,
    negative
  }
] = await Promise.all([
  import(`${ppp.rootUrl}/elements/widget.js`),
  import(`${ppp.rootUrl}/vendor/fast-element.min.js`),
  import(`${ppp.rootUrl}/lib/ppp-errors.js`),
  import(`${ppp.rootUrl}/lib/const.js`),
  import(`${ppp.rootUrl}/design/styles.js`),
  import(`${ppp.rootUrl}/design/design-tokens.js`)
]);

export const noiiWidgetTemplate = html`
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
          (x) => !x.instrument,
          html`${html.partial(
            widgetEmptyStateTemplate('Выберите инструмент.')
          )}`
        )}
        ${when(
          (x) =>
            x.instrumentTrader &&
            x.instrument &&
            !x.instrumentTrader.supportsInstrument(x.instrument),
          html`${html.partial(
            widgetEmptyStateTemplate('Инструмент не поддерживается.')
          )}`
        )}

        <ppp-widget-notifications-area></ppp-widget-notifications-area>
      </div>
      <ppp-widget-resize-controls></ppp-widget-resize-controls>
    </div>
  </template>
`;

export const noiiWidgetStyles = css`
  ${normalize()}
  ${widget()}
`;

export class NOIIWidget extends WidgetWithInstrument {}

// noinspection JSUnusedGlobalSymbols
export async function widgetDefinition() {
  // noinspection JSVoidFunctionReturnValueUsed
  return {
    type: WIDGET_TYPES.NOII,
    collection: 'Psina',
    title: html`NOII`,
    description: html`Виджет <span class="positive">NOII</span> отображает
      информацию о дисбалансе заявок в перекрёстную сессию для инструментов,
      листингованных на NASDAQ.`,
    customElement: NOIIWidget.compose({
      template: noiiWidgetTemplate,
      styles: noiiWidgetStyles
    }).define(),
    minWidth: 275,
    minHeight: 120,
    defaultWidth: 275
  };
}
