if (event && event !== '@@SERVICE_ID:insert') return;

if (message.T !== 's') {
  return;
}

const symbols = message.S ?? [];
const [symbol] = symbols;
let instrument;

if (!this.document.disableInstrumentFiltering) instrument = this.instrument;

if (!instrument) {
  instrument = await this.instrumentTrader?.instruments.get(symbol);
}

const { formatDateWithOptions } = await import(`${ppp.rootUrl}/lib/intl.js`);

// Status codes.
const scMappings = {
  //Tape C & O (UTP)
  H: 'Торговая пауза',
  Q: 'Возобновление котирования',
  T: 'Возобновление торгов',
  P: 'Пауза в связи с волатильностью',
  // Tape A & B (CTA)
  ['2']: 'Торговая пауза',
  ['3']: 'Возобновление торгов',
  E: 'Ограничение коротких продаж'
};

// Reason codes.
const rcMappings = {
  // Tape C & O (UTP)
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
  R: 'Issue Available',
  IPOQ: 'Начало котирования (IPO)',
  IPOE: 'Расширение периода подачи заявок (IPO)',
  MWCQ: 'Снятие глобальной стоп-защиты рынка',
  // Tape A & B (CTA)
  D: 'Новости опубликованы',
  I: 'Дисбаланс заявок',
  M: 'Торговая пауза в связи с волатильностью 〽️',
  P: 'Ожидаются новости⚡️',
  X: 'Операционная пауза',
  Y: 'Торговля вне шага цены',
  ['1']: 'Пауза из-за срабатывания глобальной стоп-защиты рынка (L1)',
  ['2']: 'Пауза из-за срабатывания глобальной стоп-защиты рынка (L2)',
  ['3']: 'Пауза из-за срабатывания глобальной стоп-защиты рынка (L3)'
};

return {
  cursor: message.i,
  message,
  symbols,
  layout: html`
    <div class="widget-card-holder">
      <div class="widget-card-holder-inner">
        <ppp-widget-card
          ?clickable="${() => instrument && symbol}"
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
              rcMappings[message.h2] ||
              scMappings[message.h1] ||
              'Статус неизвестен'}"
          >
            ${() =>
              rcMappings[message.h2] ||
              scMappings[message.h1] ||
              'Статус неизвестен'}
          </span>
          <span slot="title-right">
            ${() => message.h2 || [message.h1] || 'N/A'}
          </span>
          <span slot="subtitle-left" title="${() => symbol}">
            ${() => symbol}
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
        </ppp-widget-card>
      </div>
    </div>
  `
};
