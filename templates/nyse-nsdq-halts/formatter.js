if (event && event !== '@@SERVICE_ID:insert') return;

const symbol = message.symbol;
let instrument;

if (!this.document.disableInstrumentFiltering) instrument = this.instrument;

if (!instrument) {
  instrument = await this.instrumentTrader?.instruments.get(symbol);
}

const { formatDateWithOptions, isDST } = await import(
  `${ppp.rootUrl}/lib/intl.js`
);
const { staticallyCompose } = await import(
  `${ppp.rootUrl}/vendor/fast-utilities.js`
);

const mappings = {
  T1: 'Ожидаются новости⚡️',
  T2: 'Новости в процессе публикации',
  T5: 'Цена изменилась более чем на 10% за 5 мин.',
  T6: 'Необычная рыночная активность',
  T8: 'Проблемы в базовом активе ETF',
  T12: 'NASDAQ ожидает дополнительную информацию',
  H4: 'Несоответствие требованиям листинга NASDAQ',
  H9: 'Компания не опубликовала актуальный отчёт',
  H10: 'SEC приостановила торги',
  H11: 'Торги приостановлены в другом рыночном центре по требованию регулирующих органов',
  O1: 'Проблемы с маркет-мейкингом',
  IPO1: 'Проблемы на IPO',
  M1: 'Корпоративное событие',
  M2: 'Нет котировок по инструменту',
  LUDP: 'Торговая пауза в связи с волатильностью 〽️',
  LUDS: 'Пауза, связанная с выходом котировки bid или ask за установленные пределы',
  MWC1: 'Пауза из-за срабатывания глобальной стоп-защиты рынка (L1)',
  MWC2: 'Пауза из-за срабатывания глобальной стоп-защиты рынка (L2)',
  MWC3: 'Пауза из-за срабатывания глобальной стоп-защиты рынка (L3)',
  MWC0: 'Пауза из-за срабатывания глобальной стоп-защиты рынка (Перенос)',
  T3: 'Новости опубликованы',
  T7: 'См. код T5',
  R4: ' См. код H4',
  R9: 'См. код H9',
  C3: 'Публикация новостей отменена. См. коды T2 и T3',
  C4: 'См. коды H4 и R4',
  C9: 'См. коды H9 и R9',
  C11: 'См. код H11',
  R1: 'New Issue Available',
  R2: 'Issue Available',
  IPOQ: 'Начало котирования (IPO)',
  IPOE: 'Расширение периода подачи заявок (IPO)',
  MWCQ: 'Снятие глобальной стоп-защиты рынка',
  M: 'Торговая пауза в связи с волатильностью 〽️',
  D: 'Делистинг инструмента'
};

function formatDateTime(dateString) {
  return formatDateWithOptions(
    new Date(`${dateString} GMT-${isDST ? '4' : '5'}`),
    {
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric'
    }
  );
}

function composeLeftSubtitle(message, symbol) {
  const lines = [`<span>${symbol}</span>`];

  if (message.resumption_quote_time) {
    lines.push('<div class="control-line centered"><span class="dot dot-1"></span><span>Открытие книги заявок</span></div>');
  }

  if (message.resumption_trade_time) {
    lines.push('<div class="control-line centered"><span class="dot dot-2"></span><span>Возобновление торгов</span></div>');
  }

  if (lines.length > 1) {
    lines.splice(1, 0, '<span style="margin-top: 4px;"></span>');
  }

  return staticallyCompose(`
    <div class="subtitle-rows">
      ${lines.join('\n')}
    </div>
  `);
}

function composeRightSubtitle(message) {
  const lines = [
    `<span>${formatDateTime(
      `${message.halt_date} ${message.halt_time}`
    )}</span>`
  ];

  if (message.resumption_quote_time) {
    lines.push(
      `<span>${formatDateTime(
        `${message.resumption_date} ${message.resumption_quote_time}`
      )}</span>`
    );
  }

  if (message.resumption_trade_time) {
    lines.push(
      `<span>${formatDateTime(
        `${message.resumption_date} ${message.resumption_trade_time}`
      )}</span>`
    );
  }

  if (lines.length > 1) {
    lines.splice(1, 0, '<span style="margin-top: 4px;"></span>');
  }

  return staticallyCompose(`
    <div class="subtitle-rows">
      ${lines.join('\n')}
    </div>
  `);
}

return {
  cursor: message.ppp_counter,
  symbols: [symbol],
  layout: html`
    <div class="widget-card-holder">
      <div class="widget-card-holder-inner">
        <ppp-widget-card
          clickable
          class="${(x, c) => c.parent.generateCardClass(x)}"
          @click="${(x, c) =>
            instrument && c.parent.selectInstrument(instrument.symbol)}"
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
            ${() => instrument?.symbol?.[0] ?? symbol[0]}
          </span>
          <span
            slot="title-left"
            title="${() =>
              mappings[message.reason_code] ?? 'Причина неизвестна'}"
          >
            ${() => mappings[message.reason_code] ?? 'Причина неизвестна'}
          </span>
          <span slot="title-right">
            ${() => message.reason_code ?? 'N/A'}
          </span>
          <span slot="subtitle-left" title="${() => symbol}">
            ${composeLeftSubtitle(message, symbol)}
          </span>
          <div slot="subtitle-right">${composeRightSubtitle(message)}</div>
        </ppp-widget-card>
      </div>
    </div>
  `
};
