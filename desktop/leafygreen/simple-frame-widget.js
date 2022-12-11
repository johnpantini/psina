import {
  psinaSimpleFrameWidgetTemplate,
  widgetDefinition as baseWidgetDefinition
} from '../../shared/simple-frame-widget.js';

// noinspection JSUnusedGlobalSymbols
export async function widgetDefinition({ ppp, baseWidgetUrl }) {
  const [{ css }, { widgetStyles }] = await Promise.all([
    import(`${ppp.rootUrl}/shared/element/styles/css.js`),
    import(`${ppp.rootUrl}/${ppp.appType}/${ppp.theme}/widget.js`)
  ]);

  const orderWidgetStyles = (context, definition) => css`
    ${widgetStyles}
  `;

  return baseWidgetDefinition({
    template: psinaSimpleFrameWidgetTemplate,
    styles: orderWidgetStyles,
    shadowOptions: null
  });
}
