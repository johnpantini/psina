import { PsinaPage } from '[%#payload.baseExtensionUrl%]/shared/pages/psina.js';
import { html } from '[%#ctx.ppp.rootUrl%]/shared/template.js';
import { css } from '[%#ctx.ppp.rootUrl%]/shared/element/styles/css.js';

export const psinaPageTemplate = (context, definition) => html`
  <template>
    <${'ppp-page-header'}>Psina (work in progress, not ready yet!)</ppp-page-header>
  </template>
`;

export const psinaPageStyles = (context, definition) => css``;

// noinspection JSUnusedGlobalSymbols
export default PsinaPage.compose({
  baseName: 'psina-[%#payload.extension._id%]-page',
  template: psinaPageTemplate,
  styles: psinaPageStyles
});
