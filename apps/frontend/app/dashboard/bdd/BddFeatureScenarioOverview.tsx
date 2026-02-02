'use client';

import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, type JSX } from 'react';

import type { BddFeatureOverview, StatusKey } from './types';

const STATUS_ORDER: readonly StatusKey[] = ['ready', 'wip', 'manual', 'skip', 'other'];
const STATUS_SET_ALL = new Set<StatusKey>(STATUS_ORDER);

function isStatusKey(v: string): v is StatusKey {
  return (STATUS_ORDER as readonly string[]).includes(v);
}

function parseStatesParam(param: string | undefined): Set<StatusKey> {
  if (param === undefined) return new Set(STATUS_ORDER);
  const trimmed = param.trim();
  if (trimmed === '' || trimmed.toLowerCase() === 'none') return new Set();

  const parts = trimmed
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  const out = new Set<StatusKey>();
  for (const p of parts) {
    if (isStatusKey(p)) out.add(p);
  }
  return out;
}

function setsEqual(a: Set<StatusKey>, b: Set<StatusKey>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) {
    if (!b.has(v)) return false;
  }
  return true;
}

function isAllSelected(s: Set<StatusKey>): boolean {
  return setsEqual(s, STATUS_SET_ALL);
}

function serializeStatesParam(selected: Set<StatusKey>): string | undefined {
  if (selected.size === 0) return 'none';
  if (isAllSelected(selected)) return undefined;
  return STATUS_ORDER.filter((s) => selected.has(s)).join(',');
}

function statusPillClass(status: StatusKey): string {
  switch (status) {
    case 'ready':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'wip':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'manual':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'skip':
      return 'bg-gray-100 text-gray-700 border-gray-200';
    case 'other':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

function formatStatusLabel(status: StatusKey): string {
  switch (status) {
    case 'ready':
      return 'Ready';
    case 'wip':
      return 'WIP';
    case 'manual':
      return 'Manual';
    case 'skip':
      return 'Skip';
    case 'other':
      return 'Other';
    default:
      return status;
  }
}

function getStatusCount(
  counts: { ready: number; wip: number; manual: number; skip: number; other: number },
  status: StatusKey
): number {
  switch (status) {
    case 'ready':
      return counts.ready;
    case 'wip':
      return counts.wip;
    case 'manual':
      return counts.manual;
    case 'skip':
      return counts.skip;
    case 'other':
      return counts.other;
    default:
      return 0;
  }
}

export function BddFeatureScenarioOverview({
  features,
  initialStatesParam,
}: Readonly<{ features: BddFeatureOverview[]; initialStatesParam?: string }>): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlStatesParam = searchParams.get('states') ?? undefined;

  const [selectedStatuses, setSelectedStatuses] = useState<Set<StatusKey>>(() =>
    parseStatesParam(initialStatesParam)
  );

  useEffect(() => {
    const desired = parseStatesParam(urlStatesParam);
    setSelectedStatuses((prev) => (setsEqual(prev, desired) ? prev : desired));
  }, [urlStatesParam]);

  useEffect(() => {
    const desiredParam = serializeStatesParam(selectedStatuses);
    const currentParam = urlStatesParam;

    if (desiredParam === undefined && currentParam === undefined) return;
    if (desiredParam !== currentParam) {
      const nextSearch = new URLSearchParams(searchParams.toString());
      if (desiredParam === undefined) nextSearch.delete('states');
      else nextSearch.set('states', desiredParam);

      const qs = nextSearch.toString();
      const href = (qs ? `${pathname}?${qs}` : pathname) as Route;
      router.replace(href, { scroll: false });
    }
  }, [pathname, router, searchParams, selectedStatuses, urlStatesParam]);

  const filtered = useMemo(() => {
    const out = features
      .map((f) => {
        const scenarios = f.scenarios.filter((s) => selectedStatuses.has(s.status));
        const counts = {
          total: scenarios.length,
          ready: scenarios.filter((s) => s.status === 'ready').length,
          wip: scenarios.filter((s) => s.status === 'wip').length,
          manual: scenarios.filter((s) => s.status === 'manual').length,
          skip: scenarios.filter((s) => s.status === 'skip').length,
          other: scenarios.filter((s) => s.status === 'other').length,
        };

        return {
          ...f,
          counts,
          scenarios,
        };
      })
      .filter((f) => f.scenarios.length > 0);

    const scenarioCount = out.reduce((acc, f) => acc + f.scenarios.length, 0);
    return { features: out, scenarioCount };
  }, [features, selectedStatuses]);

  function setAll(next: boolean): void {
    setSelectedStatuses(new Set(next ? STATUS_ORDER : []));
  }

  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Features & scenarios</h2>
          <div className="mt-1 text-xs text-gray-500">
            Showing {filtered.features.length} feature(s), {filtered.scenarioCount} scenario(s)
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAll(true)}
            className="text-xs rounded-md border bg-white px-3 py-1.5 hover:bg-gray-50"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={() => setAll(false)}
            className="text-xs rounded-md border bg-white px-3 py-1.5 hover:bg-gray-50"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="mt-3 rounded-lg border bg-white p-4">
        <div className="text-sm font-medium">Filter by status</div>
        <div className="mt-2 flex flex-wrap gap-4">
          {STATUS_ORDER.map((status) => {
            return (
              <label key={status} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  aria-label={formatStatusLabel(status)}
                  checked={selectedStatuses.has(status)}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    setSelectedStatuses((prev) => {
                      const next = new Set(prev);
                      if (isChecked) next.add(status);
                      else next.delete(status);
                      return next;
                    });
                  }}
                />
                <span className="inline-flex items-center gap-2">
                  <span className="sr-only">{formatStatusLabel(status)}</span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${statusPillClass(
                      status
                    )}`}
                  >
                    {formatStatusLabel(status)}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {filtered.features.map((f) => {
          return (
            <details key={`${f.appName}:${f.filePath}`} className="rounded-lg border bg-white">
              <summary className="cursor-pointer px-4 py-3">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <div className="min-w-60">
                    <div className="text-sm text-gray-500">{f.appName}</div>
                    <div className="font-medium">{f.featureName}</div>
                    <div className="mt-0.5 text-xs text-gray-500">{f.filePath}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_ORDER.filter((s) => getStatusCount(f.counts, s) > 0).map((status) => {
                      return (
                        <span
                          key={status}
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${statusPillClass(
                            status
                          )}`}
                        >
                          {formatStatusLabel(status)}: {getStatusCount(f.counts, status)}
                        </span>
                      );
                    })}
                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs bg-gray-50 text-gray-700 border-gray-200">
                      Total: {f.counts.total}
                    </span>
                  </div>
                </div>
              </summary>

              <div className="border-t px-4 py-3">
                {f.tags.length > 0 ? (
                  <div className="text-xs text-gray-600">
                    Feature tags:{' '}
                    <span className="font-mono">
                      {f.tags
                        .slice()
                        .sort((a, b) => a.localeCompare(b))
                        .join(' ')}
                    </span>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">No feature-level tags</div>
                )}

                <div className="mt-3 overflow-x-auto rounded-md border">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="text-left font-medium px-3 py-2">Scenario</th>
                        <th className="text-left font-medium px-3 py-2">Status</th>
                        <th className="text-left font-medium px-3 py-2">Impl</th>
                        <th className="text-left font-medium px-3 py-2">Tags</th>
                      </tr>
                    </thead>
                    <tbody>
                      {f.scenarios.map((s) => {
                        return (
                          <tr key={`${s.filePath}:${s.scenarioName}`} className="border-t">
                            <td className="px-3 py-2 whitespace-nowrap">{s.scenarioName}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${statusPillClass(
                                  s.status
                                )}`}
                              >
                                {formatStatusLabel(s.status)}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              {s.implTags.length ? (
                                <span className="font-mono text-xs">{s.implTags.join(' ')}</span>
                              ) : (
                                <span className="text-xs text-gray-500">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {s.tags.length ? (
                                <span className="font-mono text-xs">{s.tags.join(' ')}</span>
                              ) : (
                                <span className="text-xs text-gray-500">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </details>
          );
        })}

        {filtered.features.length === 0 ? (
          <div className="rounded-lg border bg-white p-4 text-sm text-gray-700">
            No scenarios match the selected status filters.
          </div>
        ) : null}
      </div>
    </section>
  );
}
