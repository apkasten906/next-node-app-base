import { describe, expect, it } from 'vitest';

import { computeBddGovernanceSnapshot } from './bdd-governance';

describe('unit: computeBddGovernanceSnapshot', () => {
  it('returns a stable snapshot shape', () => {
    const snapshot = computeBddGovernanceSnapshot();

    expect(snapshot).toHaveProperty('generatedAt');
    expect(snapshot).toHaveProperty('overall');
    expect(snapshot.overall).toHaveProperty('total');

    expect(snapshot).toHaveProperty('apps');
    expect(Array.isArray(snapshot.apps)).toBe(true);

    expect(snapshot).toHaveProperty('features');
    expect(Array.isArray(snapshot.features)).toBe(true);

    expect(snapshot).toHaveProperty('issues');
    expect(snapshot.issues).toHaveProperty('missingStatus');
    expect(snapshot.issues).toHaveProperty('conflictingStatus');

    expect(snapshot).toHaveProperty('implAudit');
    expect(snapshot.implAudit).toHaveProperty('implTags');
    expect(snapshot.implAudit).toHaveProperty('missingReadyImpl');
  });
});
