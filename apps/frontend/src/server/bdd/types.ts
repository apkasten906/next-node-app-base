import 'server-only';

// Canonical BDD contract types live in lib/contracts/bdd-types.ts.
// This file is a server-only re-export shim kept for backward compatibility so
// existing imports within src/server/ do not need to be updated.
// Client code must import directly from @/lib/contracts/bdd-types instead.
export type {
  BddFeatureOverview,
  BddScenarioOverview,
  Snapshot,
  StatusCounts,
  StatusKey,
} from '@/lib/contracts/bdd-types';
