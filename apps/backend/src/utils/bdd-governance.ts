import fs from 'node:fs';
import path from 'node:path';

type StatusKey = 'ready' | 'wip' | 'manual' | 'skip' | 'other';

export type StatusCounts = {
  total: number;
  ready: number;
  wip: number;
  manual: number;
  skip: number;
  other: number;
};

export type MissingStatusIssue = {
  filePath: string;
  scenarioName: string;
  tags: string[];
};

export type ConflictingStatusIssue = {
  filePath: string;
  scenarioName: string;
  tags: string[];
  primaryStatusTags: string[];
};

export type ImplScenarioRef = {
  filePath: string;
  scenarioName: string;
  status: StatusKey;
};

export type ImplSummary = {
  ready: number;
  wip: number;
  manual: number;
  skip: number;
  other: number;
  scenarios: ImplScenarioRef[];
};

export type BddScenarioOverview = {
  appName: string;
  filePath: string;
  featureName: string;
  scenarioName: string;
  status: StatusKey;
  tags: string[];
  implTags: string[];
};

export type BddFeatureOverview = {
  appName: string;
  filePath: string;
  featureName: string;
  tags: string[];
  counts: StatusCounts;
  scenarios: BddScenarioOverview[];
};

export type BddGovernanceSnapshot = {
  generatedAt: string;
  apps: Array<{ appName: string; counts: StatusCounts }>;
  features: BddFeatureOverview[];
  overall: StatusCounts;
  issues: {
    missingStatus: MissingStatusIssue[];
    conflictingStatus: ConflictingStatusIssue[];
  };
  implAudit: {
    implTagsTotal: number;
    implTags: Array<{ implTag: string; summary: ImplSummary }>;
    missingReadyImplCount: number;
    missingReadyImpl: Array<{ filePath: string; scenarioName: string }>;
  };
};

const STATUS_TAGS = {
  ready: '@ready',
  wip: '@wip',
  manual: '@manual',
  skip: '@skip',
} as const;

const PRIMARY_STATUS_TAGS: readonly string[] = [
  STATUS_TAGS.ready,
  STATUS_TAGS.wip,
  STATUS_TAGS.manual,
];

type ScenarioRow = {
  filePath: string;
  featureName: string;
  scenarioName: string;
  tags: string[];
  status: StatusKey;
  implTags: string[];
  featurePrimaryStatusTags: string[];
  scenarioPrimaryStatusTags: string[];
};

type FeatureRow = {
  appName: string;
  filePath: string;
  featureName: string;
  featureTags: string[];
  scenarios: ScenarioRow[];
};

function createEmptyCounts(): StatusCounts {
  return { total: 0, ready: 0, wip: 0, manual: 0, skip: 0, other: 0 };
}

function parseTagsLine(line: string): string[] {
  return line
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.startsWith('@'));
}

function parseScenarioName(line: string): string {
  return line.split(':').slice(1).join(':').trim() || '(unnamed)';
}

function parseFeatureName(line: string): string {
  return line.split(':').slice(1).join(':').trim() || '(unnamed feature)';
}

function extractImplTags(tags: string[]): string[] {
  return tags.filter((t) => t.startsWith('@impl_'));
}

function classify(tags: string[]): StatusKey {
  if (tags.includes(STATUS_TAGS.skip)) return 'skip';
  if (tags.includes(STATUS_TAGS.manual)) return 'manual';
  if (tags.includes(STATUS_TAGS.ready)) return 'ready';
  if (tags.includes(STATUS_TAGS.wip)) return 'wip';
  return 'other';
}

function resolveRepoRoot(startDir: string): string {
  let current = path.resolve(startDir);
  // Hard cap on traversal to avoid odd infinite loops on unusual fs setups.
  for (let i = 0; i < 20; i += 1) {
    const candidate = current;
    const workspaceMarker = path.join(candidate, 'pnpm-workspace.yaml');
    const appsDir = path.join(candidate, 'apps');

    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const hasWorkspaceMarker = fs.existsSync(workspaceMarker);
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const hasAppsDir = fs.existsSync(appsDir);

    if (hasWorkspaceMarker && hasAppsDir) {
      return candidate;
    }

    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  // Fallback: best-effort use CWD.
  return path.resolve(startDir);
}

function readDirEntriesSafe(dir: string): fs.Dirent[] {
  try {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function shouldSkipDir(fullPath: string): boolean {
  const base = path.basename(fullPath);
  return (
    base === 'node_modules' ||
    base === 'dist' ||
    base === 'build' ||
    base === '.turbo' ||
    base === '.next' ||
    base === 'coverage'
  );
}

function handleDirEntry(
  entry: fs.Dirent,
  parentDir: string,
  stack: string[],
  results: string[]
): void {
  const fullPath = path.join(parentDir, entry.name);
  if (entry.isDirectory()) {
    if (!shouldSkipDir(fullPath)) stack.push(fullPath);
    return;
  }
  if (entry.isFile() && entry.name.endsWith('.feature')) {
    results.push(fullPath);
  }
}

function findFeatureFiles(featuresDir: string): string[] {
  const results: string[] = [];
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  if (!fs.existsSync(featuresDir)) return results;

  const stack: string[] = [featuresDir];
  while (stack.length) {
    const current = stack.pop();
    if (!current) break;

    const entries = readDirEntriesSafe(current);
    for (const entry of entries) {
      handleDirEntry(entry, current, stack, results);
    }
  }

  return results;
}

function resolveReadFilePath(baseDir: string, filePath: string): string {
  const base = path.resolve(baseDir);
  const resolved = path.resolve(filePath);
  const rel = path.relative(base, resolved);

  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`Invalid feature file path (must be within ${base}): ${filePath}`);
  }
  if (!resolved.endsWith('.feature')) {
    throw new Error(`Invalid feature file extension (expected .feature): ${filePath}`);
  }

  return resolved;
}

function readUtf8File(filePath: string): string {
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  return fs.readFileSync(filePath, 'utf8');
}

function parseFeatureFile(appName: string, filePath: string, content: string): FeatureRow {
  const scenarios: ScenarioRow[] = [];

  let pendingTags: string[] = [];
  let featureTags: string[] = [];
  let featureName = '(unnamed feature)';

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
      featureName = parseFeatureName(line);
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

      scenarios.push({
        filePath,
        featureName,
        scenarioName,
        tags,
        status: classify(tags),
        implTags: extractImplTags(tags),
        featurePrimaryStatusTags,
        scenarioPrimaryStatusTags,
      });

      pendingTags = [];
      continue;
    }

    pendingTags = [];
  }

  return {
    appName,
    filePath,
    featureName,
    featureTags,
    scenarios,
  };
}

function evaluateStatusIssues(
  row: ScenarioRow,
  outMissingStatus: MissingStatusIssue[],
  outConflictingStatus: ConflictingStatusIssue[]
): void {
  if (row.scenarioPrimaryStatusTags.length > 1) {
    outConflictingStatus.push({
      filePath: row.filePath,
      scenarioName: row.scenarioName,
      tags: row.tags,
      primaryStatusTags: row.scenarioPrimaryStatusTags,
    });
  } else if (
    row.scenarioPrimaryStatusTags.length === 0 &&
    row.featurePrimaryStatusTags.length > 1
  ) {
    outConflictingStatus.push({
      filePath: row.filePath,
      scenarioName: row.scenarioName,
      tags: row.tags,
      primaryStatusTags: row.featurePrimaryStatusTags,
    });
  }

  const hasPrimaryStatus =
    row.tags.includes(STATUS_TAGS.ready) ||
    row.tags.includes(STATUS_TAGS.wip) ||
    row.tags.includes(STATUS_TAGS.manual);

  if (!hasPrimaryStatus && !row.tags.includes(STATUS_TAGS.skip)) {
    outMissingStatus.push({
      filePath: row.filePath,
      scenarioName: row.scenarioName,
      tags: row.tags,
    });
  }
}

function listAppNames(appsDir: string): string[] {
  return readDirEntriesSafe(appsDir)
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b));
}

function relify(repoRoot: string, p: string): string {
  return path.relative(repoRoot, p).replaceAll('\\', '/');
}

function incrementCounts(counts: StatusCounts, status: StatusKey): void {
  counts.total += 1;
  switch (status) {
    case 'ready':
      counts.ready += 1;
      return;
    case 'wip':
      counts.wip += 1;
      return;
    case 'manual':
      counts.manual += 1;
      return;
    case 'skip':
      counts.skip += 1;
      return;
    case 'other':
      counts.other += 1;
      return;
    default:
      return;
  }
}

function addImplRow(implMap: Map<string, ImplSummary>, implTag: string, row: ScenarioRow): void {
  if (!implMap.has(implTag)) {
    implMap.set(implTag, { ready: 0, wip: 0, manual: 0, skip: 0, other: 0, scenarios: [] });
  }
  const v = implMap.get(implTag);
  if (!v) return;
  v[row.status] += 1;
  v.scenarios.push({ filePath: row.filePath, scenarioName: row.scenarioName, status: row.status });
}

type ComputeAppCountsParams = {
  appName: string;
  featuresDir: string;
  outFeatures: FeatureRow[];
  outMissingStatus: MissingStatusIssue[];
  outConflictingStatus: ConflictingStatusIssue[];
  implMap: Map<string, ImplSummary>;
  missingReadyImpl: Array<{ filePath: string; scenarioName: string }>;
  overall: StatusCounts;
};

function computeAppCounts(params: ComputeAppCountsParams): StatusCounts | null {
  const {
    appName,
    featuresDir,
    outFeatures,
    outMissingStatus,
    outConflictingStatus,
    implMap,
    missingReadyImpl,
    overall,
  } = params;
  const appCounts = createEmptyCounts();
  const featureFiles = findFeatureFiles(featuresDir);
  if (featureFiles.length === 0) return null;

  for (const rawFilePath of featureFiles) {
    const safeFilePath = resolveReadFilePath(featuresDir, rawFilePath);
    const content = readUtf8File(safeFilePath);

    const feature = parseFeatureFile(appName, safeFilePath, content);
    outFeatures.push(feature);

    for (const row of feature.scenarios) {
      evaluateStatusIssues(row, outMissingStatus, outConflictingStatus);

      incrementCounts(appCounts, row.status);
      incrementCounts(overall, row.status);

      if (row.status === 'ready' && row.implTags.length === 0) {
        missingReadyImpl.push({ filePath: row.filePath, scenarioName: row.scenarioName });
      }

      for (const implTag of row.implTags) {
        addImplRow(implMap, implTag, row);
      }
    }
  }

  return appCounts;
}

export function computeBddGovernanceSnapshot(): BddGovernanceSnapshot {
  const repoRoot = resolveRepoRoot(process.cwd());
  const appsDir = path.join(repoRoot, 'apps');

  const apps: Array<{ appName: string; counts: StatusCounts }> = [];
  const features: FeatureRow[] = [];
  const overall = createEmptyCounts();

  const missingStatus: MissingStatusIssue[] = [];
  const conflictingStatus: ConflictingStatusIssue[] = [];

  const implMap = new Map<string, ImplSummary>();
  const missingReadyImpl: Array<{ filePath: string; scenarioName: string }> = [];

  const appDirs = listAppNames(appsDir);

  for (const appName of appDirs) {
    const featuresDir = path.join(appsDir, appName, 'features');
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const hasFeaturesDir = fs.existsSync(featuresDir);
    if (!hasFeaturesDir) continue;

    const appCounts = computeAppCounts({
      appName,
      featuresDir,
      outFeatures: features,
      outMissingStatus: missingStatus,
      outConflictingStatus: conflictingStatus,
      implMap,
      missingReadyImpl,
      overall,
    });

    if (!appCounts) continue;

    apps.push({ appName, counts: appCounts });
  }

  const implTags = Array.from(implMap.keys()).sort((a, b) => a.localeCompare(b));
  const implTagRows = implTags.map((implTag) => ({ implTag, summary: implMap.get(implTag)! }));

  return {
    generatedAt: new Date().toISOString(),
    apps,
    features: features
      .slice()
      .sort((a, b) => {
        const byApp = a.appName.localeCompare(b.appName);
        if (byApp !== 0) return byApp;
        const byName = a.featureName.localeCompare(b.featureName);
        if (byName !== 0) return byName;
        return a.filePath.localeCompare(b.filePath);
      })
      .map((f) => {
        const counts = createEmptyCounts();
        for (const s of f.scenarios) incrementCounts(counts, s.status);

        return {
          appName: f.appName,
          filePath: relify(repoRoot, f.filePath),
          featureName: f.featureName,
          tags: f.featureTags,
          counts,
          scenarios: f.scenarios.map((s) => ({
            appName: f.appName,
            filePath: relify(repoRoot, s.filePath),
            featureName: s.featureName,
            scenarioName: s.scenarioName,
            status: s.status,
            tags: s.tags,
            implTags: s.implTags,
          })),
        };
      }),
    overall,
    issues: {
      missingStatus: missingStatus.map((i) => ({ ...i, filePath: relify(repoRoot, i.filePath) })),
      conflictingStatus: conflictingStatus.map((i) => ({
        ...i,
        filePath: relify(repoRoot, i.filePath),
      })),
    },
    implAudit: {
      implTagsTotal: implTags.length,
      implTags: implTagRows.map(({ implTag, summary }) => ({
        implTag,
        summary: {
          ...summary,
          scenarios: summary.scenarios.map((s) => ({
            ...s,
            filePath: relify(repoRoot, s.filePath),
          })),
        },
      })),
      missingReadyImplCount: missingReadyImpl.length,
      missingReadyImpl: missingReadyImpl.map((r) => ({
        ...r,
        filePath: relify(repoRoot, r.filePath),
      })),
    },
  };
}
