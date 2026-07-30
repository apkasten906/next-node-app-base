function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

export function enforceCleanupErrors(
  errors: unknown[],
  scenarioFailed: boolean,
  reportSecondaryError: (error: Error) => void
): void {
  if (errors.length === 0) return;

  const normalized = errors.map(asError);
  if (scenarioFailed) {
    normalized.forEach((error) => reportSecondaryError(error));
    return;
  }

  if (normalized.length === 1) {
    throw normalized[0];
  }

  throw new AggregateError(normalized, 'Multiple scenario teardown failures');
}
