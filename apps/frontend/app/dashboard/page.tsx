import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { JSX } from 'react';

import { DashboardClient } from '@/components/dashboard-client';

export default async function DashboardPage(): Promise<JSX.Element> {
  const baseUrl = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3001';
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  const meRes = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { cookie: cookieHeader },
    // Prevent caching auth checks during SSR
    cache: 'no-store',
  });

  if (meRes.status === 401) {
    redirect('/auth/signin');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">User</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardClient userName={null} userImage={null} />
      </main>
    </div>
  );
}
