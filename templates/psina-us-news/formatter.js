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
            title: ppp.t('$g.details')
          });

          page.src = page.generateHtml(m.message.b);
        } else {
          const summaryRequest = await ppp.fetch(
            'https://300.ya.ru/api/sharing-url',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': navigator.userAgent,
                Authorization: `OAuth ${yandexToken}`
              },
              body: JSON.stringify({
                article_url: new URL(cursor, extractionEndpoint).toString()
              })
            }
          );

          if (summaryRequest.ok) {
            const { sharing_url } = await summaryRequest.json();

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

  const date = new Date(message.t);
  const today = new Date();
  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  if (isToday) {
    lines.push(
      `<div class="control-line centered"><span class="dot dot-2"></span><span style="color: var(--palette-green-dark-2-with-palette-green-light-2);">${ppp.t(
        '$g.today'
      )}</span></div>`
    );
  } else if (
    date.getDate() === today.getDate() - 1 &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  ) {
    lines.push(
      `<div class="control-line centered"><span class="dot dot-4"></span><span style="color: var(--palette-yellow-dark-2-with-palette-yellow-light-2);">${ppp.t(
        '$g.yesterday'
      )}</span></div>`
    );
  }

  if (message.u) {
    lines.push(
      `<a class="link" target="_blank" rel="noopener" href="${
        message.u
      }">${ppp.t('$g.openInNewTab')}</a>`
    );
  }

  if (message.b) {
    lines.push(`<span class="link clickable" onclick="event.composedPath().find(n =>
                      n?.tagName?.toLowerCase?.() === 'ppp-pusher-subscription-widget')
                      ?.showIframeModal('${
                        message.i
                      }'); event.stopPropagation()">${ppp.t(
      '$g.showDetails'
    )}</span>`);
  }

  if (!lines.length) {
    return '';
  }

  return staticallyCompose(`
    <div class="subtitle-rows">
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
                      ?.showIframeModal('${
                        message.i
                      }', true); event.stopPropagation()">${ppp.t(
        '$g.summary'
      )}</span>`);
    } else {
      lines.push(`<span>&nbsp;</span>`);
    }
  }

  return staticallyCompose(`
    <div class="subtitle-rows">
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
