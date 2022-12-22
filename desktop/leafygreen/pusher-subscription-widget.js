import {
  psinaPusherSubscriptionWidgetTemplate,
  widgetDefinition as baseWidgetDefinition
} from '../../shared/pusher-subscription-widget.js';

// noinspection JSUnusedGlobalSymbols
export async function widgetDefinition({ ppp, baseWidgetUrl }) {
  const [{ css }, { widgetStyles }] = await Promise.all([
    import(`${ppp.rootUrl}/shared/element/styles/css.js`),
    import(`${ppp.rootUrl}/${ppp.appType}/${ppp.theme}/widget.js`)
  ]);

  const psinaPusherSubscriptionWidgetStyles = (context, definition) => css`
    .positive {
      color: rgb(0, 163, 92);
    }

    .negative {
      color: rgb(219, 48, 48);
    }

    .positive-indicator {
      background: linear-gradient(90deg, rgb(11, 176, 109) 50%, transparent 0);
    }

    .negative-indicator {
      background: linear-gradient(90deg, rgb(213, 54, 69) 50%, transparent 0);
    }

    .dot-divider {
      margin: 0 4px;
    }

    .clickable {
      color: rgb(1, 107, 248);
      text-decoration: none;
      cursor: pointer;
    }

    .clickable:hover {
      color: rgb(1, 107, 248);
      text-decoration: underline;
    }

    ${widgetStyles}
  `;

  return baseWidgetDefinition({
    template: psinaPusherSubscriptionWidgetTemplate,
    styles: psinaPusherSubscriptionWidgetStyles,
    shadowOptions: null
  });
}
