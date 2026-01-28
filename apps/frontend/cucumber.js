const common = {
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
};

module.exports = {
  default: {
    ...common,
    tags: '@ready and not @skip',
  },
  all: {
    ...common,
    tags: 'not @skip',
  },
  wip: {
    ...common,
    tags: '@wip and not @skip',
  },
  manual: {
    ...common,
    tags: '@manual and not @skip',
  },
};
