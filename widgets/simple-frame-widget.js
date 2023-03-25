export async function widgetDefinition({ ppp, baseWidgetUrl }) {
  if (location.origin.endsWith('.dev')) {
    return (await import('../v2/simple-frame-widget.js')).widgetDefinition();
  } else {
    return (
      await import('../v1/widgets/simple-frame-widget.js')
    ).widgetDefinition({ ppp, baseWidgetUrl });
  }
}
