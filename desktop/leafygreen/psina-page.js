export async function extension({ ppp, baseExtensionUrl, metaUrl, extension }) {
  const [{ PsinaPage }, { html }, { css }, { pageStyles }] = await Promise.all([
    import(`${baseExtensionUrl}/shared/psina-page.js`),
    import(`${ppp.rootUrl}/shared/template.js`),
    import(`${ppp.rootUrl}/shared/element/styles/css.js`),
    import(`${ppp.rootUrl}/desktop/${ppp.theme}/page.js`)
  ]);

  (
    await import(`${baseExtensionUrl}/i18n/${ppp.locale}/psina-page.i18n.js`)
  ).default(ppp.dict);

  const psinaPageTemplate = (context, definition) => html`
    <template>
      <${'ppp-page'}>
        <span slot="header">
          Центр управления Psina
        </span>
        <span slot="actions"></span>
        <div class="empty-state">
          <img
            class="overview-logo"
            src="static/success.svg"
            draggable="false"
            alt="Psina"
          />
          <h1>🔨 Проект Psina недоступен</h1>
          <h2>Psina находится на стадии развития, проект будет доступен
            позднее.</h2>
        </div>
      </ppp-page>
    </template>
  `;

  const psinaPageStyles = (context, definition) => css`
    ${pageStyles}
    .overview-logo {
      margin: 30px 0;
      width: 600px;
    }
  `;

  // noinspection JSUnusedGlobalSymbols
  return PsinaPage.compose({
    baseName: `psina-${extension._id}-page`,
    template: psinaPageTemplate,
    styles: psinaPageStyles
  });
}
