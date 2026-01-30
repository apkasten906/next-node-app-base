#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require('node:fs');
const path = require('node:path');

const STATUS_TAGS = /** @type {const} */ ({
  ready: '@ready',
  wip: '@wip',
  manual: '@manual',
  skip: '@skip',
});

const PRIMARY_STATUS_TAGS = /** @type {const} */ ([
  STATUS_TAGS.ready,
  STATUS_TAGS.wip,
  STATUS_TAGS.manual,
]);

/**
 * @param {string} line
 * @returns {string[]}
 */
function parseTagsLine(line) {
  return line
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.startsWith('@'));
}

/**
 * @param {string} line
 * @returns {string}
 */
function parseScenarioName(line) {
  return line.split(':').slice(1).join(':').trim() || '(unnamed)';
}

/**
 * @param {string[]} tags
 * @returns {string[]}
 */
function extractImplTags(tags) {
  return tags.filter((t) => t.startsWith('@impl_'));
}

/**
 * @param {string[]} tags
 * @returns {'ready'|'wip'|'manual'|'skip'|'other'}
 */
function classify(tags) {
  if (tags.includes(STATUS_TAGS.skip)) return 'skip';
  if (tags.includes(STATUS_TAGS.manual)) return 'manual';
  if (tags.includes(STATUS_TAGS.ready)) return 'ready';
  if (tags.includes(STATUS_TAGS.wip)) return 'wip';
  return 'other';
}

/**
 * @param {string} dir
 * @returns {string[]}
 */
function findFeatureFiles(dir) {
  /** @type {string[]} */
  const results = [];
  if (!fs.existsSync(dir)) return results;

  /** @type {string[]} */
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    if (!current) break;

    let entries = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        const base = path.basename(fullPath);
        if (base === 'node_modules' || base === 'dist' || base === 'build') continue;
        stack.push(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith('.feature')) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

/**
 * Parse a feature file and return all scenarios that have @impl_* tags.
 *
 * @param {string} filePath
 * @param {string} content
 * @returns {Array<{filePath: string, scenarioName: string, implTags: string[], status: string, tags: string[]}>}
 */
function parseScenarios(filePath, content) {
  /** @type {Array<{filePath: string, scenarioName: string, implTags: string[], status: string, tags: string[]}>} */
  const rows = [];

  /** @type {string[]} */
  let pendingTags = [];
  /** @type {string[]} */
  let featureTags = [];

  const lines = content.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('#')) continue;

    if (line.startsWith('@')) {
      pendingTags = pendingTags.concat(parseTagsLine(line));
      continue;
    }

    if (/^Feature:/i.test(line)) {
      featureTags = pendingTags;
      pendingTags = [];
      continue;
    }

    if (/^Scenario( Outline)?:/i.test(line)) {
      const scenarioName = parseScenarioName(line);

      const featurePrimaryStatusTags = PRIMARY_STATUS_TAGS.filter((t) => featureTags.includes(t));
      const scenarioPrimaryStatusTags = PRIMARY_STATUS_TAGS.filter((t) => pendingTags.includes(t));

      const effectivePrimaryStatusTags =
        scenarioPrimaryStatusTags.length > 0 ? scenarioPrimaryStatusTags : featurePrimaryStatusTags;

      const tags = Array.from(
        new Set([
          ...featureTags.filter((t) => !PRIMARY_STATUS_TAGS.includes(t)),
          ...pendingTags.filter((t) => !PRIMARY_STATUS_TAGS.includes(t)),
          ...effectivePrimaryStatusTags,
        ])
      );

      rows.push({
        filePath,
        scenarioName,
        implTags: extractImplTags(tags),
        status: classify(tags),
        tags,
      });

      pendingTags = [];
      continue;
    }

    pendingTags = [];
  }

  return rows;
}

/**
 * @param {string[]} argv
 * @returns {{format: 'text'|'json', checkReadyImpl: boolean, failOnMissingReadyImpl: boolean, outPath?: string}}
 */
function parseArgs(argv) {
  const wantsJson = argv.includes('--format') && argv.includes('json');
  const outIndex = argv.indexOf('--out');
  const outPath = outIndex >= 0 ? argv[outIndex + 1] : undefined;

  return {
    format: wantsJson ? 'json' : 'text',
    checkReadyImpl: argv.includes('--check-ready-impl'),
    failOnMissingReadyImpl: argv.includes('--fail-on-missing-ready-impl'),
    outPath: outPath && !outPath.startsWith('-') ? outPath : undefined,
  };
}

/**
 * @param {{keys: string[], byImpl: any, missingReadyImpl: Array<{filePath: string, scenarioName: string}>, includeReadyImplSummary: boolean}} input
 * @returns {string}
 */
function buildTextReport({ keys, byImpl, missingReadyImpl, includeReadyImplSummary }) {
  const lines = [];
  lines.push(`impl-tags total=${keys.length}`);

  for (const impl of keys) {
    const v = byImpl[impl];
    lines.push(
      `${impl} ready=${v.ready} wip=${v.wip} manual=${v.manual} skip=${v.skip} other=${v.other}`
    );
  }

  if (includeReadyImplSummary) {
    if (missingReadyImpl.length === 0) {
      lines.push('ready-without-impl total=0');
    } else {
      lines.push(`ready-without-impl total=${missingReadyImpl.length}`);
      for (const row of missingReadyImpl) {
        lines.push(`- ${row.filePath}: ${row.scenarioName}`);
      }
    }
  }

  return lines.join('\n');
}

function main() {
  const args = parseArgs(process.argv);
  const repoRoot = path.resolve(__dirname, '..');
  const appsDir = path.join(repoRoot, 'apps');

  const featureFiles = findFeatureFiles(appsDir);

  /** @type {Array<{filePath: string, scenarioName: string, implTags: string[], status: string, tags: string[]}>} */
  const scenarios = [];
  for (const featurePath of featureFiles) {
    const content = fs.readFileSync(featurePath, 'utf8');
    scenarios.push(...parseScenarios(featurePath, content));
  }

  const missingReadyImpl = scenarios
    .filter((s) => s.status === 'ready' && s.implTags.length === 0)
    .map((s) => ({
      filePath: path.relative(repoRoot, s.filePath).replace(/\\/g, '/'),
      scenarioName: s.scenarioName,
    }));

  /** @type {Record<string, {ready: number, wip: number, manual: number, skip: number, other: number, scenarios: Array<{filePath: string, scenarioName: string, status: string}>}>} */
  const byImpl = {};

  for (const row of scenarios) {
    for (const impl of row.implTags) {
      if (!byImpl[impl]) {
        byImpl[impl] = {
          ready: 0,
          wip: 0,
          manual: 0,
          skip: 0,
          other: 0,
          scenarios: [],
        };
      }

      byImpl[impl][row.status] += 1;
      byImpl[impl].scenarios.push({
        filePath: path.relative(repoRoot, row.filePath).replace(/\\/g, '/'),
        scenarioName: row.scenarioName,
        status: row.status,
      });
    }
  }

  const keys = Object.keys(byImpl).sort();
  const includeReadyImplSummary = args.checkReadyImpl || args.failOnMissingReadyImpl;
  const shouldFail = args.failOnMissingReadyImpl && missingReadyImpl.length > 0;

  if (args.format === 'json') {
    const jsonString = JSON.stringify(
      {
        totalImplTags: keys.length,
        missingReadyImplCount: missingReadyImpl.length,
        missingReadyImpl,
        byImpl,
      },
      null,
      2
    );

    if (args.outPath) {
      const outFile = path.resolve(process.cwd(), args.outPath);
      fs.writeFileSync(outFile, jsonString + '\n', 'utf8');
      console.log(`wrote ${path.relative(process.cwd(), outFile).replace(/\\/g, '/')}`);
    } else {
      console.log(jsonString);
    }

    process.exitCode = shouldFail ? 1 : 0;
    return;
  }

  const textReport = buildTextReport({
    keys,
    byImpl,
    missingReadyImpl,
    includeReadyImplSummary,
  });

  if (args.outPath) {
    const outFile = path.resolve(process.cwd(), args.outPath);
    fs.writeFileSync(outFile, textReport + '\n', 'utf8');
    console.log(`wrote ${path.relative(process.cwd(), outFile).replace(/\\/g, '/')}`);
  } else {
    console.log(textReport);
  }

  process.exitCode = shouldFail ? 1 : 0;
}

main();
