import { PsinaPage } from '[%#payload.baseUrl%]/shared/pages/psina.js';
import { html } from '[%#globalThis.location.origin%]/shared/template.js';
import { css } from '[%#globalThis.location.origin%]/shared/element/styles/css.js';

export const psinaPageTemplate = (context, definition) => html`
  <template>
    <${'ppp-page-header'}>Psina (work in progress, not ready yet!)</ppp-page-header>
  </template>
`;

export const psinaPageStyles = (context, definition) => css``;

// noinspection JSUnusedGlobalSymbols
export const psinaPage = PsinaPage.compose({
  baseName: 'psina-page',
  template: psinaPageTemplate,
  styles: psinaPageStyles
});
