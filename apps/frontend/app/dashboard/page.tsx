import type { JSX } from 'react';

import { DashboardClient } from '@/components/dashboard-client';
import { requireCurrentUser } from '@/src/server/auth/require-current-user';

export default async function DashboardPage(): Promise<JSX.Element> {
  const currentUser = await requireCurrentUser();

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
        <DashboardClient userName={currentUser.name} userImage={currentUser.image} />
      </main>
    </div>
  );
}
