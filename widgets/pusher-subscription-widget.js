export async function widgetDefinition({ ppp, baseWidgetUrl }) {
  if (location.origin.endsWith('.dev')) {
    return (await import('../v2/pusher-subscription-widget.js'))
      .widgetDefinition();
  } else {
    return (await import('../v1/widgets/pusher-subscription-widget.js'))
    .widgetDefinition({ ppp, baseWidgetUrl });
  }
}
