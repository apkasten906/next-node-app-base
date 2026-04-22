// Shared BDD contract types live in lib/contracts/bdd-types.ts so they can be
// referenced by both server-only modules and client-facing re-export shims.
// This file is kept as a backward-compatible re-export to avoid touching every
// server-side import site within src/server/.
export type {
  BddFeatureOverview,
  BddScenarioOverview,
  Snapshot,
  StatusCounts,
  StatusKey,
} from '@/lib/contracts/bdd-types';
