// noinspection JSUnusedGlobalSymbols
export async function widgetDefinition({ ppp, baseWidgetUrl }) {
  return (
    await import(
      `${baseWidgetUrl.replace('widgets', '')}${ppp.appType}/${
        ppp.theme
      }/simple-frame-widget.js`
    )
  ).widgetDefinition({ ppp, widgetDefinition });
}
