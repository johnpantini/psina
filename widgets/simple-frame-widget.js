export async function widgetDefinition({ ppp, baseWidgetUrl }) {
  if (
    location.origin.endsWith('johnpantini.pages.dev') ||
    location.origin.endsWith('johnpantini.github.io.dev')
  ) {
    return (await import('../v2/simple-frame-widget.js')).widgetDefinition();
  } else {
    return (
      await import('../v1/widgets/simple-frame-widget.js')
    ).widgetDefinition({ ppp, baseWidgetUrl });
  }
}
