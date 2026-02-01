// Set TS_NODE_PROJECT before requiring modules
process.env.TS_NODE_PROJECT = require('node:path').resolve(__dirname, 'tsconfig.json');
process.env.TS_NODE_FILES = 'true';

// Keep BDD runs deterministic and isolated by default.
process.env.TEST_EXTERNAL_SERVICES = process.env.TEST_EXTERNAL_SERVICES ?? 'false';
process.env.REDIS_MOCK = process.env.REDIS_MOCK ?? 'true';
process.env.DISABLE_QUEUES = process.env.DISABLE_QUEUES ?? 'true';
process.env.DISABLE_WEBSOCKETS = process.env.DISABLE_WEBSOCKETS ?? 'true';

const common = {
  require: ['features/support/**/*.ts', 'features/step_definitions/**/*.ts'],
  requireModule: ['ts-node/register', 'tsconfig-paths/register'],
  format: [
    'progress-bar',
    'html:reports/cucumber-report.html',
    // JSON formatter disabled due to Cucumber 12.2.0 bug with testStepResult
    // 'json:reports/cucumber-report.json',
    '@cucumber/pretty-formatter',
  ],
  formatOptions: {
    snippetInterface: 'async-await',
  },
  parallel: 1,
  publishQuiet: true,
};

module.exports = {
  // Default: run only scenarios explicitly marked as implemented.
  default: {
    ...common,
    tags: '@ready and not @skip',
  },
  // Run everything (useful locally once step definitions are complete).
  all: {
    ...common,
    tags: 'not @skip',
  },
  // Run only unimplemented requirements.
  wip: {
    ...common,
    tags: '@wip and not @skip',
  },
  // Run only manual/ops requirements.
  manual: {
    ...common,
    tags: '@manual and not @skip',
  },
};
