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
 * @typedef {Object} StatusCounts
 * @property {number} total
 * @property {number} ready
 * @property {number} wip
 * @property {number} manual
 * @property {number} skip
 * @property {number} other
 */

/** @returns {StatusCounts} */
function createEmptyCounts() {
  return { total: 0, ready: 0, wip: 0, manual: 0, skip: 0, other: 0 };
}

/**
 * @param {string[]} tags
 */
function classify(tags) {
  if (tags.includes(STATUS_TAGS.skip)) return 'skip';
  if (tags.includes(STATUS_TAGS.manual)) return 'manual';
  if (tags.includes(STATUS_TAGS.ready)) return 'ready';
  if (tags.includes(STATUS_TAGS.wip)) return 'wip';
  return 'other';
}

/**
 * @param {string[]} featureTags
 * @param {string[]} pendingTags
 */
function buildScenarioTags(featureTags, pendingTags) {
  const featurePrimaryStatusTags = PRIMARY_STATUS_TAGS.filter((t) => featureTags.includes(t));
  const scenarioPrimaryStatusTags = PRIMARY_STATUS_TAGS.filter((t) => pendingTags.includes(t));

  // Scenario-level status tags override feature-level status tags.
  // This allows gradual promotion within a feature that still defaults to @wip.
  const effectivePrimaryStatusTags =
    scenarioPrimaryStatusTags.length > 0 ? scenarioPrimaryStatusTags : featurePrimaryStatusTags;

  const scenarioTags = Array.from(
    new Set([
      // Keep all non-status tags from both scopes.
      ...featureTags.filter((t) => !PRIMARY_STATUS_TAGS.includes(t)),
      ...pendingTags.filter((t) => !PRIMARY_STATUS_TAGS.includes(t)),
      // Apply the effective status tags.
      ...effectivePrimaryStatusTags,
    ])
  );

  return {
    scenarioTags,
    featurePrimaryStatusTags,
    scenarioPrimaryStatusTags,
    effectivePrimaryStatusTags,
  };
}

/**
 * @param {string} filePath
 * @param {string} scenarioName
 * @param {string[]} scenarioTags
 * @param {string[]} featurePrimaryStatusTags
 * @param {string[]} scenarioPrimaryStatusTags
 * @param {string[]} effectivePrimaryStatusTags
 * @param {Array<{filePath: string, scenarioName: string, tags: string[]}>} missingStatus
 * @param {Array<{filePath: string, scenarioName: string, tags: string[], primaryStatusTags: string[]}>} conflictingStatus
 */
function evaluateScenarioIssues({
  filePath,
  scenarioName,
  scenarioTags,
  featurePrimaryStatusTags,
  scenarioPrimaryStatusTags,
  effectivePrimaryStatusTags,
  missingStatus,
  conflictingStatus,
}) {
  // Conflicts are only within the same scope (scenario overrides feature).
  if (scenarioPrimaryStatusTags.length > 1) {
    conflictingStatus.push({
      filePath,
      scenarioName,
      tags: scenarioTags,
      primaryStatusTags: scenarioPrimaryStatusTags,
    });
    return;
  }

  if (scenarioPrimaryStatusTags.length === 0 && featurePrimaryStatusTags.length > 1) {
    conflictingStatus.push({
      filePath,
      scenarioName,
      tags: scenarioTags,
      primaryStatusTags: featurePrimaryStatusTags,
    });
    return;
  }

  // Require at least one primary status tag OR @skip.
  // (We allow "skip-only" so a scenario can be temporarily disabled without changing its intent tags.)
  if (effectivePrimaryStatusTags.length === 0 && !scenarioTags.includes(STATUS_TAGS.skip)) {
    missingStatus.push({ filePath, scenarioName, tags: scenarioTags });
  }
}

/**
 * Parse a single .feature file and return scenario status counts.
 *
 * Rules:
 * - Tags can appear above Feature or Scenario lines.
 * - Feature-level tags apply to all scenarios unless overridden/augmented.
 * - We count "Scenario" and "Scenario Outline".
 *
 * @param {string} filePath
 * @param {string} fileContent
 * @param {Array<{filePath: string, scenarioName: string, tags: string[]}>} missingStatus
 * @param {Array<{filePath: string, scenarioName: string, tags: string[], primaryStatusTags: string[]}>} conflictingStatus
 * @returns {StatusCounts}
 */
function parseFeatureFile(filePath, fileContent, missingStatus, conflictingStatus) {
  const counts = createEmptyCounts();

  /** @type {string[]} */
  let pendingTags = [];
  /** @type {string[]} */
  let featureTags = [];

  const lines = fileContent.split(/\r?\n/);
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
      const {
        scenarioTags,
        featurePrimaryStatusTags,
        scenarioPrimaryStatusTags,
        effectivePrimaryStatusTags,
      } = buildScenarioTags(featureTags, pendingTags);
      pendingTags = [];

      evaluateScenarioIssues({
        filePath,
        scenarioName,
        scenarioTags,
        featurePrimaryStatusTags,
        scenarioPrimaryStatusTags,
        effectivePrimaryStatusTags,
        missingStatus,
        conflictingStatus,
      });

      counts.total += 1;
      const status = classify(scenarioTags);
      counts[status] += 1;
      continue;
    }

    pendingTags = [];
  }

  return counts;
}

/**
 * @param {string} p
 */
function shouldSkipDirDefault(p) {
  const base = path.basename(p);
  return (
    base === 'node_modules' ||
    base === 'dist' ||
    base === 'build' ||
    base === '.turbo' ||
    base === '.next' ||
    base === 'coverage'
  );
}

/**
 * @param {string[]} featureFiles
 * @param {Array<{filePath: string, scenarioName: string, tags: string[]}>} missingStatus
 * @param {Array<{filePath: string, scenarioName: string, tags: string[], primaryStatusTags: string[]}>} conflictingStatus
 */
function computeCountsForFiles(featureFiles, missingStatus, conflictingStatus) {
  const counts = createEmptyCounts();
  for (const filePath of featureFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    addCounts(counts, parseFeatureFile(filePath, content, missingStatus, conflictingStatus));
  }
  return counts;
}

/**
 * @param {string} repoRoot
 * @param {Array<{filePath: string, scenarioName: string, tags: string[], primaryStatusTags: string[]}>} conflictingStatus
 */
function reportConflictingStatus(repoRoot, conflictingStatus) {
  const maxShown = 50;
  console.error('');
  console.error(
    `ERROR: ${conflictingStatus.length} scenario(s) have conflicting status tags. Choose exactly one of: ${PRIMARY_STATUS_TAGS.join(
      ', '
    )} (you may optionally add ${STATUS_TAGS.skip}).`
  );
  for (const v of conflictingStatus.slice(0, maxShown)) {
    const rel = path.relative(repoRoot, v.filePath).replaceAll('\\', '/');
    console.error(
      `- ${rel} :: ${v.scenarioName} (primary: ${v.primaryStatusTags.join(
        ', '
      )}; tags: ${v.tags.join(' ') || '(none)'})`
    );
  }
  if (conflictingStatus.length > maxShown) {
    console.error(`...and ${conflictingStatus.length - maxShown} more`);
  }
}

/**
 * @param {string} repoRoot
 * @param {Array<{filePath: string, scenarioName: string, tags: string[]}>} missingStatus
 */
function reportMissingStatus(repoRoot, missingStatus) {
  const maxShown = 50;
  console.error('');
  console.error(
    `ERROR: ${missingStatus.length} scenario(s) missing a status tag. Add one of: ${Object.values(
      STATUS_TAGS
    ).join(', ')}`
  );
  for (const v of missingStatus.slice(0, maxShown)) {
    const rel = path.relative(repoRoot, v.filePath).replaceAll('\\', '/');
    console.error(`- ${rel} :: ${v.scenarioName} (tags: ${v.tags.join(' ') || '(none)'})`);
  }
  if (missingStatus.length > maxShown) {
    console.error(`...and ${missingStatus.length - maxShown} more`);
  }
}

/**
 * @param {string} dir
 * @param {(p: string) => boolean} shouldSkipDir
 * @returns {string[]}
 */
function findFeatureFiles(dir, shouldSkipDir) {
  /** @type {string[]} */
  const results = [];
  if (!fs.existsSync(dir)) return results;

  /** @type {string[]} */
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    if (!current) break;

    const entries = readDirEntriesSafe(current);
    for (const entry of entries) {
      handleDirEntry(entry, current, stack, results, shouldSkipDir);
    }
  }

  return results;
}

/**
 * @param {string} dir
 * @returns {import('node:fs').Dirent[]}
 */
function readDirEntriesSafe(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

/**
 * @param {import('node:fs').Dirent} entry
 * @param {string} parentDir
 * @param {string[]} stack
 * @param {string[]} results
 * @param {(p: string) => boolean} shouldSkipDir
 */
function handleDirEntry(entry, parentDir, stack, results, shouldSkipDir) {
  const fullPath = path.join(parentDir, entry.name);
  if (entry.isDirectory()) {
    if (!shouldSkipDir(fullPath)) stack.push(fullPath);
    return;
  }
  if (entry.isFile() && entry.name.endsWith('.feature')) {
    results.push(fullPath);
  }
}

/**
 * @param {StatusCounts} into
 * @param {StatusCounts} add
 */
function addCounts(into, add) {
  into.total += add.total;
  into.ready += add.ready;
  into.wip += add.wip;
  into.manual += add.manual;
  into.skip += add.skip;
  into.other += add.other;
}

function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const appsDir = path.join(repoRoot, 'apps');

  if (!fs.existsSync(appsDir)) {
    console.error(`No apps/ directory found at: ${appsDir}`);
    process.exitCode = 2;
    return;
  }

  const appDirs = fs
    .readdirSync(appsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  const overall = createEmptyCounts();
  let anyFeatures = false;
  /** @type {Array<{filePath: string, scenarioName: string, tags: string[]}>} */
  const missingStatus = [];
  /** @type {Array<{filePath: string, scenarioName: string, tags: string[], primaryStatusTags: string[]}>} */
  const conflictingStatus = [];

  for (const appName of appDirs) {
    const featuresDir = path.join(appsDir, appName, 'features');
    if (!fs.existsSync(featuresDir)) continue;

    const featureFiles = findFeatureFiles(featuresDir, shouldSkipDirDefault);

    if (featureFiles.length === 0) continue;
    anyFeatures = true;

    const appCounts = computeCountsForFiles(featureFiles, missingStatus, conflictingStatus);

    addCounts(overall, appCounts);
    console.log(
      `${appName.padEnd(10)} total=${appCounts.total} ready=${appCounts.ready} wip=${appCounts.wip} manual=${appCounts.manual} skip=${appCounts.skip} other=${appCounts.other}`
    );
  }

  if (!anyFeatures) {
    console.log('No .feature files found under apps/*/features/.');
    return;
  }

  console.log('---');
  console.log(
    `overall    total=${overall.total} ready=${overall.ready} wip=${overall.wip} manual=${overall.manual} skip=${overall.skip} other=${overall.other}`
  );

  if (conflictingStatus.length > 0) {
    reportConflictingStatus(repoRoot, conflictingStatus);
    process.exitCode = 1;
  }

  if (missingStatus.length > 0) {
    reportMissingStatus(repoRoot, missingStatus);
    process.exitCode = 1;
  }
}

main();
