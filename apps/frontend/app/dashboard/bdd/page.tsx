import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { JSX } from 'react';

import { BddFeatureScenarioOverview } from './BddFeatureScenarioOverview';
import type { Snapshot } from './types';

function StatCard({
  title,
  value,
  sub,
}: Readonly<{ title: string; value: string; sub?: string }>): JSX.Element {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="text-sm text-gray-600">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub ? <div className="mt-1 text-xs text-gray-500">{sub}</div> : null}
    </div>
  );
}

export default async function BddDashboardPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}>): Promise<JSX.Element> {
  const baseUrl =
    process.env['API_URL_INTERNAL'] ||
    process.env['NEXT_PUBLIC_API_URL'] ||
    'http://localhost:3001';

  const headerStore = await headers();
  const incomingCorrelationId = headerStore.get('x-correlation-id');

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  const meRes = await fetch(`${baseUrl}/api/auth/me`, {
    headers: {
      cookie: cookieHeader,
      ...(incomingCorrelationId ? { 'X-Correlation-ID': incomingCorrelationId } : {}),
    },
    cache: 'no-store',
  });

  if (meRes.status === 401) {
    redirect('/auth/signin');
  }

  const res = await fetch(`${baseUrl}/api/admin/bdd/status`, {
    headers: {
      cookie: cookieHeader,
      ...(incomingCorrelationId ? { 'X-Correlation-ID': incomingCorrelationId } : {}),
    },
    cache: 'no-store',
  });

  if (res.status === 403) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold">BDD Governance</h1>
          <p className="mt-2 text-sm text-gray-700">You do not have access to this page.</p>
        </main>
      </div>
    );
  }

  if (!res.ok) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold">BDD Governance</h1>
          <p className="mt-2 text-sm text-gray-700">Failed to load BDD governance snapshot.</p>
        </main>
      </div>
    );
  }

  const snapshot = (await res.json()) as Snapshot;
  const appRows = snapshot.apps.slice().sort((a, b) => a.appName.localeCompare(b.appName));

  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  let statesParam: string | undefined;
  const rawStates = resolvedSearchParams?.['states'];
  if (typeof rawStates === 'string') {
    statesParam = rawStates;
  } else if (Array.isArray(rawStates)) {
    statesParam = rawStates[0];
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">BDD Governance</h1>
            <div className="mt-1 text-xs text-gray-500">
              Generated {new Date(snapshot.generatedAt).toLocaleString()}
            </div>
          </div>
          <a className="text-sm text-blue-700 hover:underline" href="/dashboard">
            Back to Dashboard
          </a>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total scenarios" value={`${snapshot.overall.total}`} />
          <StatCard title="Ready" value={`${snapshot.overall.ready}`} sub="Default CI gate" />
          <StatCard title="WIP" value={`${snapshot.overall.wip}`} />
          <StatCard title="Manual" value={`${snapshot.overall.manual}`} />
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Skip" value={`${snapshot.overall.skip}`} />
          <StatCard title="Other" value={`${snapshot.overall.other}`} />
          <StatCard title="Impl tags" value={`${snapshot.implAudit.implTagsTotal}`} />
          <StatCard
            title="Ready missing impl"
            value={`${snapshot.implAudit.missingReadyImplCount}`}
            sub="Should stay at 0"
          />
        </div>

        <div className="mt-10">
          <h2 className="text-lg font-semibold">Per-app status</h2>
          <div className="mt-3 overflow-x-auto rounded-lg border bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left font-medium px-4 py-3">App</th>
                  <th className="text-right font-medium px-4 py-3">Total</th>
                  <th className="text-right font-medium px-4 py-3">Ready</th>
                  <th className="text-right font-medium px-4 py-3">WIP</th>
                  <th className="text-right font-medium px-4 py-3">Manual</th>
                  <th className="text-right font-medium px-4 py-3">Skip</th>
                  <th className="text-right font-medium px-4 py-3">Other</th>
                </tr>
              </thead>
              <tbody>
                {appRows.map(({ appName, counts: c }) => {
                  return (
                    <tr key={appName} className="border-t">
                      <td className="px-4 py-3 font-medium">{appName}</td>
                      <td className="px-4 py-3 text-right">{c.total}</td>
                      <td className="px-4 py-3 text-right">{c.ready}</td>
                      <td className="px-4 py-3 text-right">{c.wip}</td>
                      <td className="px-4 py-3 text-right">{c.manual}</td>
                      <td className="px-4 py-3 text-right">{c.skip}</td>
                      <td className="px-4 py-3 text-right">{c.other}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-lg font-semibold">Governance issues</h2>
          <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-lg border bg-white p-4">
              <div className="font-medium">Missing status tags</div>
              <div className="mt-1 text-xs text-gray-500">
                Count: {snapshot.issues.missingStatus.length} (expected 0)
              </div>
            </div>
            <div className="rounded-lg border bg-white p-4">
              <div className="font-medium">Conflicting status tags</div>
              <div className="mt-1 text-xs text-gray-500">
                Count: {snapshot.issues.conflictingStatus.length} (expected 0)
              </div>
            </div>
          </div>
        </div>

        <BddFeatureScenarioOverview features={snapshot.features} initialStatesParam={statesParam} />
      </main>
    </div>
  );
}
