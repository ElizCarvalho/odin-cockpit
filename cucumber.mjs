// Cenários de comportamento (Gherkin, em português) rodando no navegador com Playwright.
// Uso: npm run bdd
export default {
  paths: ['features/**/*.feature'],
  import: ['features/support/**/*.mjs', 'features/steps/**/*.mjs'],
  language: 'pt',
  format: ['progress', 'summary', 'html:relatorios/cenarios.html'],
  // no GitHub, 1 nova tentativa só pra lentidão da máquina (o relatório mostra quando isso acontece)
  retry: process.env.CI ? 1 : 0,
  formatOptions: { snippetInterface: 'async-await' }
};
