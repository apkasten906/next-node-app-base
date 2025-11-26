// Set TS_NODE_PROJECT before requiring modules
process.env.TS_NODE_PROJECT = require('path').resolve(__dirname, 'tsconfig.json');

module.exports = {
  default: {
    require: ['features/support/**/*.ts', 'features/step_definitions/**/*.ts'],
    requireModule: ['ts-node/register', 'tsconfig-paths/register'],
    format: [
      'progress-bar',
      'html:reports/cucumber-report.html',
      'json:reports/cucumber-report.json',
      '@cucumber/pretty-formatter',
    ],
    formatOptions: {
      snippetInterface: 'async-await',
    },
    parallel: 1,
    publishQuiet: true,
  },
};
