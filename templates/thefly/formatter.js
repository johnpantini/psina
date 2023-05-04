if (event && event !== '@@SERVICE_ID:insert') return;

let rightTitle = '🐝';

switch (message.topic) {
  case 'events':
    rightTitle = '📅';

    break;
  case 'recomm':
    rightTitle = '👍👎';

    break;
  case 'recDowngrade':
    rightTitle = '⬇️';

    break;
  case 'recUpgrade':
    rightTitle = '⬆️';

    break;
  case 'periodicals':
    rightTitle = '📰';

    break;
  case 'options':
    rightTitle = '🅾️';

    break;
  case 'general_news':
    rightTitle = '🌎';

    break;
  case 'hot_stocks':
    rightTitle = '🔥';

    break;
  case 'earnings':
    rightTitle = '💰';

    break;
  case 'syndic':
    break;
  case 'technical_analysis':
    rightTitle = '💹';

    break;
}

const symbols = message.tickers?.split?.(',') ?? [];
let instrument;

if (!this.document.disableInstrumentFiltering) instrument = this.instrument;

if (!instrument) {
  instrument = await this.instrumentTrader?.instruments.get(symbols[0]);
}

if (instrument && instrument.symbol.startsWith('$')) instrument = void 0;

const { formatDateWithOptions } = await import(`${ppp.rootUrl}/lib/intl.js`);
const { he } = await import(`${ppp.rootUrl}/vendor/he.min.js`);
const { staticallyCompose } = await import(
  `${ppp.rootUrl}/vendor/fast-utilities.js`
);

return {
  cursor: message.ppp_counter,
  symbols,
  layout: html`
    <div class="widget-card-holder">
      <div class="widget-card-holder-inner">
        <ppp-widget-card
          ?clickable="${() => instrument && symbols?.length === 1}"
          class="${(x) => (x.pppFromHistory ? '' : 'new')}"
          @click="${(x, c) =>
            instrument &&
            symbols?.length == 1 &&
            c.parent.selectInstrument(instrument.symbol)}"
        >
          <div
            slot="icon"
            style="${(x, c) =>
              `background-image:url(${c.parent.instrumentTrader?.getInstrumentIconUrl?.(
                instrument
              )})`}"
          ></div>
          <span slot="icon-fallback">
            ${() => instrument?.symbol?.[0] ?? '🐝'}
          </span>
          <span slot="title-left" title="${() => he.decode(message.title)}">
            ${() => he.decode(message.title)}
          </span>
          <span slot="title-right"> ${() => rightTitle} </span>
          <span slot="subtitle-left" title="${() => symbols.join(' ')}">
            ${staticallyCompose(
              symbols
                .map((s) => {
                  if (symbols.length === 1) return s;
                  else {
                    return `<span class="link clickable" onclick="event.composedPath().find(n =>
                      n?.tagName?.toLowerCase?.() === 'ppp-pusher-subscription-widget')
                      ?.selectInstrument('${s}'); event.stopPropagation()">${s}</span>`;
                  }
                })
                .join('<span class="dot-divider">•</span>')
            )}
          </span>
          <div slot="subtitle-right">
            ${() =>
              formatDateWithOptions(
                new Date(
                  Date.parse(
                    message.date
                      .replace('GMT-8', 'GMT-5')
                      .replace('GMT-7', 'GMT-4')
                  )
                ),
                {
                  month: 'numeric',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: 'numeric'
                }
              )}
          </div>
        </ppp-widget-card>
      </div>
    </div>
  `
};
