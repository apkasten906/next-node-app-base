module.exports = {
  default: {
    require: ['features/support/**/*.ts', 'features/step_definitions/**/*.ts'],
    requireModule: ['ts-node/register'],
    format: [
      'progress-bar',
      'html:reports/cucumber-report.html',
      'json:reports/cucumber-report.json',
      '@cucumber/pretty-formatter',
    ],
    formatOptions: {
      snippetInterface: 'async-await',
    },
    parallel: 2,
    publishQuiet: true,
  },
};
