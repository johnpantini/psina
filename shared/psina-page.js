const [{ Page }] = await Promise.all([
  import(`${globalThis.ppp.rootUrl}/shared/page.js`)
]);

export class PsinaPage extends Page {}
