// Cenários de comportamento (Gherkin, em português) rodando no navegador com Playwright.
// Uso: npm run bdd
export default {
  paths: ['features/**/*.feature'],
  import: ['features/support/**/*.mjs', 'features/steps/**/*.mjs'],
  language: 'pt',
  format: ['progress', 'summary', 'html:relatorios/cenarios.html'],
  formatOptions: { snippetInterface: 'async-await' }
};
