'use client';

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

interface DashboardClientProps {
  userName: string | null;
  userImage: string | null;
}

export function DashboardClient({ userName }: DashboardClientProps): JSX.Element {
  const { t } = useTranslation(['dashboard', 'common']);

  return (
    <>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">
          {t('dashboard:welcome', { name: userName || 'User' })}
        </h2>
        <p className="mt-2 text-gray-600">{t('dashboard:overview.description')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">{t('dashboard:stats.users')}</h3>
          <p className="text-3xl font-bold text-blue-600">1,234</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">{t('dashboard:stats.projects')}</h3>
          <p className="text-3xl font-bold text-green-600">42</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">{t('dashboard:stats.tasks')}</h3>
          <p className="text-3xl font-bold text-purple-600">156</p>
        </div>
      </div>
    </>
  );
}
