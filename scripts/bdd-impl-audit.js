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
 * @param {string} dirName
 * @returns {boolean}
 */
function isExcludedDirName(dirName) {
  return dirName === 'node_modules' || dirName === 'dist' || dirName === 'build';
}

/**
 * @param {string} dir
 * @returns {import('node:fs').Dirent[]}
 */
function readDirSafe(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

/**
 * @param {string} dir
 * @param {string[]} results
 */
function walkFeatureFiles(dir, results) {
  for (const entry of readDirSafe(dir)) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (isExcludedDirName(entry.name)) continue;
      walkFeatureFiles(fullPath, results);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.feature')) {
      results.push(fullPath);
    }
  }
}

/**
 * Merge feature/scenario tags, ensuring exactly one primary status tag is applied
 * (scenario overrides feature), and de-duplicating the final list.
 *
 * @param {string[]} featureTags
 * @param {string[]} scenarioTags
 * @returns {string[]}
 */
function buildEffectiveScenarioTags(featureTags, scenarioTags) {
  const featurePrimaryStatusTags = PRIMARY_STATUS_TAGS.filter((t) => featureTags.includes(t));
  const scenarioPrimaryStatusTags = PRIMARY_STATUS_TAGS.filter((t) => scenarioTags.includes(t));

  const effectivePrimaryStatusTags =
    scenarioPrimaryStatusTags.length > 0 ? scenarioPrimaryStatusTags : featurePrimaryStatusTags;

  return Array.from(
    new Set([
      ...featureTags.filter((t) => !PRIMARY_STATUS_TAGS.includes(t)),
      ...scenarioTags.filter((t) => !PRIMARY_STATUS_TAGS.includes(t)),
      ...effectivePrimaryStatusTags,
    ])
  );
}

/**
 * @param {string} dir
 * @returns {string[]}
 */
function findFeatureFiles(dir) {
  /** @type {string[]} */
  const results = [];
  if (!fs.existsSync(dir)) return results;

  walkFeatureFiles(dir, results);

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

      const tags = buildEffectiveScenarioTags(featureTags, pendingTags);

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
 * @param {{keys: string[], byImpl: Map<string, {ready: number, wip: number, manual: number, skip: number, other: number, scenarios: Array<{filePath: string, scenarioName: string, status: string}>}>, missingReadyImpl: Array<{filePath: string, scenarioName: string}>, includeReadyImplSummary: boolean}} input
 * @returns {string}
 */
function buildTextReport({ keys, byImpl, missingReadyImpl, includeReadyImplSummary }) {
  const lines = [];
  lines.push(`impl-tags total=${keys.length}`);

  for (const impl of keys) {
    const v = byImpl.get(impl);
    if (!v) continue;
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

function resolveOutFilePath(outPath) {
  const cwd = process.cwd();
  const resolved = path.resolve(cwd, outPath);
  const rel = path.relative(cwd, resolved);

  // Disallow writing outside the current working directory
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`Invalid --out path (must be within ${cwd}): ${outPath}`);
  }

  return resolved;
}

function resolveReadFilePath(baseDir, filePath) {
  const base = path.resolve(baseDir);
  const resolved = path.resolve(filePath);
  const rel = path.relative(base, resolved);

  // Disallow reading outside the expected directory
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`Invalid feature file path (must be within ${base}): ${filePath}`);
  }

  if (!resolved.endsWith('.feature')) {
    throw new Error(`Invalid feature file extension (expected .feature): ${filePath}`);
  }

  return resolved;
}

/**
 * Read a UTF-8 file from a validated path.
 *
 * NOTE: The path is dynamic (discovered via directory traversal), so we validate it before reading.
 *
 * @param {string} filePath
 * @returns {string}
 */
function readUtf8File(filePath) {
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * Write a UTF-8 file to a validated path.
 *
 * NOTE: The path is dynamic (from CLI args), so we validate it before writing.
 *
 * @param {string} filePath
 * @param {string} content
 */
function writeUtf8File(filePath, content) {
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  fs.writeFileSync(filePath, content, 'utf8');
}

function toPosixRelativePath(repoRoot, filePath) {
  return path.relative(repoRoot, filePath).replaceAll('\\', '/');
}

/**
 * @param {string[]} featureFiles
 * @param {string} featureRootDir
 * @returns {Array<{filePath: string, scenarioName: string, implTags: string[], status: string, tags: string[]}>}
 */
function collectScenarios(featureFiles, featureRootDir) {
  /** @type {Array<{filePath: string, scenarioName: string, implTags: string[], status: string, tags: string[]}>} */
  const scenarios = [];
  for (const featurePath of featureFiles) {
    const safePath = resolveReadFilePath(featureRootDir, featurePath);
    const content = readUtf8File(safePath);
    scenarios.push(...parseScenarios(safePath, content));
  }
  return scenarios;
}

/**
 * @param {Array<{filePath: string, scenarioName: string, implTags: string[], status: string, tags: string[]}>} scenarios
 * @param {string} repoRoot
 * @returns {Array<{filePath: string, scenarioName: string}>}
 */
function findMissingReadyImpl(scenarios, repoRoot) {
  return scenarios
    .filter((s) => s.status === 'ready' && s.implTags.length === 0)
    .map((s) => ({
      filePath: toPosixRelativePath(repoRoot, s.filePath),
      scenarioName: s.scenarioName,
    }));
}

function createImplBucket() {
  return {
    ready: 0,
    wip: 0,
    manual: 0,
    skip: 0,
    other: 0,
    scenarios: [],
  };
}

/**
 * @param {string} status
 * @returns {'ready'|'wip'|'manual'|'skip'|'other'}
 */
function normalizeStatus(status) {
  if (status === 'ready' || status === 'wip' || status === 'manual' || status === 'skip')
    return status;
  return 'other';
}

/**
 * @param {Array<{filePath: string, scenarioName: string, implTags: string[], status: string, tags: string[]}>} scenarios
 * @param {string} repoRoot
 * @returns {Map<string, {ready: number, wip: number, manual: number, skip: number, other: number, scenarios: Array<{filePath: string, scenarioName: string, status: string}>}>}
 */
function groupScenariosByImpl(scenarios, repoRoot) {
  /** @type {Map<string, {ready: number, wip: number, manual: number, skip: number, other: number, scenarios: Array<{filePath: string, scenarioName: string, status: string}>}>} */
  const byImpl = new Map();

  for (const row of scenarios) {
    for (const impl of row.implTags) {
      const bucket = byImpl.get(impl) ?? createImplBucket();
      if (!byImpl.has(impl)) byImpl.set(impl, bucket);

      const key = normalizeStatus(row.status);
      switch (key) {
        case 'ready':
          bucket.ready += 1;
          break;
        case 'wip':
          bucket.wip += 1;
          break;
        case 'manual':
          bucket.manual += 1;
          break;
        case 'skip':
          bucket.skip += 1;
          break;
        default:
          bucket.other += 1;
          break;
      }

      bucket.scenarios.push({
        filePath: toPosixRelativePath(repoRoot, row.filePath),
        scenarioName: row.scenarioName,
        status: row.status,
      });
    }
  }

  return byImpl;
}

function printOrWriteReport(args, content) {
  if (args.outPath) {
    const outFile = resolveOutFilePath(args.outPath);
    writeUtf8File(outFile, content + '\n');
    console.log(`wrote ${path.relative(process.cwd(), outFile).replaceAll('\\', '/')}`);
  } else {
    console.log(content);
  }
}

function outputReport({ args, keys, byImpl, missingReadyImpl, includeReadyImplSummary }) {
  if (args.format === 'json') {
    const jsonString = JSON.stringify(
      {
        totalImplTags: keys.length,
        missingReadyImplCount: missingReadyImpl.length,
        missingReadyImpl,
        byImpl: Object.fromEntries(byImpl.entries()),
      },
      null,
      2
    );

    printOrWriteReport(args, jsonString);
    return;
  }

  const textReport = buildTextReport({
    keys,
    byImpl,
    missingReadyImpl,
    includeReadyImplSummary,
  });

  printOrWriteReport(args, textReport);
}

function main() {
  const args = parseArgs(process.argv);
  const repoRoot = path.resolve(__dirname, '..');
  const appsDir = path.join(repoRoot, 'apps');

  const featureFiles = findFeatureFiles(appsDir);
  const scenarios = collectScenarios(featureFiles, appsDir);

  const missingReadyImpl = findMissingReadyImpl(scenarios, repoRoot);
  const byImpl = groupScenariosByImpl(scenarios, repoRoot);
  const keys = Array.from(byImpl.keys()).sort();

  const includeReadyImplSummary = args.checkReadyImpl || args.failOnMissingReadyImpl;
  const shouldFail = args.failOnMissingReadyImpl && missingReadyImpl.length > 0;

  outputReport({ args, keys, byImpl, missingReadyImpl, includeReadyImplSummary });

  process.exitCode = shouldFail ? 1 : 0;
}

main();
