if (event && event !== '@@SERVICE_ID:insert') return;

if (message.T !== 'n') {
  return;
}

const yandexToken = '@@YANDEX_TOKEN';
const extractionEndpoint = '@@EXTRACTION_ENDPOINT';

if (!this.hasAttribute('listening')) {
  this.setAttribute('listening', '');

  this.showIframeModal = async (cursor, gpt) => {
    const m = this.messages.find((m) => m.cursor === cursor);

    if (gpt && (!yandexToken || !extractionEndpoint)) {
      return;
    }

    if (m?.message?.b) {
      this.topLoader.start();

      try {
        if (!gpt) {
          const page = await ppp.app.mountPage('iframe-modal', {
            size: 'xxlarge',
            title: 'Подробности'
          });

          page.src = page.generateHtml(m.message.b);
        } else {
          const summaryRequest = await fetch(
            new URL(
              'fetch',
              ppp.keyVault.getKey('service-machine-url')
            ).toString(),
            {
              cache: 'no-cache',
              method: 'POST',
              body: JSON.stringify({
                method: 'POST',
                url: 'https://300.ya.ru/api/sharing-url',
                headers: {
                  'Content-Type': 'application/json',
                  'User-Agent': navigator.userAgent,
                  Authorization: `OAuth ${yandexToken}`
                },
                body: JSON.stringify({
                  article_url: new URL(cursor, extractionEndpoint).toString()
                })
              })
            }
          );

          if (summaryRequest.ok) {
            const { status, sharing_url } = await summaryRequest.json();

            window.open(
              sharing_url,
              '_blank',
              'location=yes,height=570,width=520,scrollbars=yes,status=yes'
            );
          }
        }
      } finally {
        this.topLoader.stop();
      }
    }
  };
}

const symbols = message.S ?? [];
let instrument;

if (!this.document.disableInstrumentFiltering) instrument = this.instrument;

if (!instrument && symbols.length) {
  instrument = await this.instrumentTrader?.instruments.get(symbols[0]);
}

const { formatDateWithOptions } = await import(`${ppp.rootUrl}/lib/intl.js`);
const { staticallyCompose } = await import(
  `${ppp.rootUrl}/vendor/fast-utilities.js`
);

let rightTitle = '';
const channels = message.c ?? [];

if (channels.indexOf('Earnings') > -1) {
  rightTitle = '💰';
} else if (channels.indexOf('WIIM') > -1 || channels.indexOf('Movers') > -1) {
  rightTitle = '💹';
} else if (channels.indexOf('Analyst Ratings') > -1) {
  rightTitle = '👍👎';
} else if (channels.indexOf('Economics') > -1) {
  rightTitle = '🌎';
} else if (channels.indexOf('Biotech') > -1) {
  rightTitle = '🧬';
} else if (channels.indexOf('Buybacks') > -1) {
  rightTitle = '💵';
} else if (channels.indexOf('Press Releases') > -1) {
  rightTitle = '📰';
}

function composeLeftExtraSubtitle(message) {
  const lines = [];

  if (message.u) {
    lines.push(
      `<a class="link" target="_blank" rel="noopener" href="${message.u}">Перейти по ссылке</a>`
    );
  }

  if (message.b) {
    lines.push(`<span class="link clickable" onclick="event.composedPath().find(n =>
                      n?.tagName?.toLowerCase?.() === 'ppp-pusher-subscription-widget')
                      ?.showIframeModal('${message.i}'); event.stopPropagation()">Открыть подробности</span>`);
  }

  if (!lines.length) {
    return '';
  }

  return staticallyCompose(`
    <div style="display:flex; flex-direction: column; gap: 1px">
      ${lines.join('\n')}
    </div>
  `);
}

function composeRightExtraSubtitle(message) {
  const lines = [];

  if (message.u) {
    lines.push(`<span>&nbsp;</span>`);
  }

  if (message.b) {
    if (extractionEndpoint && yandexToken) {
      lines.push(`<span class="link clickable" onclick="event.composedPath().find(n =>
                      n?.tagName?.toLowerCase?.() === 'ppp-pusher-subscription-widget')
                      ?.showIframeModal('${message.i}', true); event.stopPropagation()">Пересказ</span>`);
    } else {
      lines.push(`<span>&nbsp;</span>`);
    }
  }

  return staticallyCompose(`
    <div style="display:flex; flex-direction: column; gap: 1px">
      ${lines.join('\n')}
    </div>
  `);
}

return {
  cursor: message.i,
  message,
  symbols,
  layout: html`
    <div class="widget-card-holder">
      <div class="widget-card-holder-inner">
        <ppp-widget-card
          ?clickable="${() => instrument && symbols?.length === 1}"
          class="${(x, c) => c.parent.generateCardClass(x)}"
          @click="${(x, c) => {
            const cp = c.event.composedPath();

            if (cp.find((n) => n?.tagName === 'A')) {
              return true;
            }

            instrument &&
              symbols?.length == 1 &&
              c.parent.selectInstrument(instrument.symbol);
          }}"
        >
          <div
            slot="icon"
            style="${(x, c) =>
              c.parent.instrumentTrader
                ? `background-image:url(${c.parent.instrumentTrader.getInstrumentIconUrl?.(
                    instrument
                  )})`
                : ''}"
          ></div>
          <span slot="icon-fallback">
            ${() => instrument?.symbol?.[0] ?? message.h1?.[0]}
          </span>
          <span slot="title-left" title="${() => message.h1}">
            ${() => message.h1}
          </span>
          <span slot="title-right"> ${() => rightTitle}</span>
          <span
            slot="subtitle-left"
            class="x-scroll"
            title="${() => symbols.join(' ') || 'Без тикера'}"
          >
            ${!symbols.length
              ? 'Без тикера'
              : staticallyCompose(
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
            ${formatDateWithOptions(new Date(message.t), {
              month: 'numeric',
              day: 'numeric',
              hour: 'numeric',
              minute: 'numeric',
              second: 'numeric'
            })}
          </div>
          <span slot="subtitle-left-extra">
            ${composeLeftExtraSubtitle(message)}
          </span>
          <span slot="subtitle-right-extra">
            ${composeRightExtraSubtitle(message)}
          </span>
        </ppp-widget-card>
      </div>
    </div>
  `
};
