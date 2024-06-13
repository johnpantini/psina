const { default: $g } = await import(
  `${ppp.rootUrl}/i18n/${ppp.locale}/lib/general.i18n.js`
);

export default function (i18n) {
  $g(i18n);
}
