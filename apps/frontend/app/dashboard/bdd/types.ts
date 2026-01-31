export type StatusKey = 'ready' | 'wip' | 'manual' | 'skip' | 'other';

export type StatusCounts = {
  total: number;
  ready: number;
  wip: number;
  manual: number;
  skip: number;
  other: number;
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

export type Snapshot = {
  generatedAt: string;
  apps: Array<{ appName: string; counts: StatusCounts }>;
  features: BddFeatureOverview[];
  overall: StatusCounts;
  issues: {
    missingStatus: Array<{ filePath: string; scenarioName: string; tags: string[] }>;
    conflictingStatus: Array<{
      filePath: string;
      scenarioName: string;
      tags: string[];
      primaryStatusTags: string[];
    }>;
  };
  implAudit: {
    implTagsTotal: number;
    missingReadyImplCount: number;
  };
};
