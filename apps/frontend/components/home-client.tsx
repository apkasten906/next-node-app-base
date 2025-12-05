'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';

interface HomeClientProps {
  isAuthenticated: boolean;
}

export function HomeClient({ isAuthenticated }: HomeClientProps) {
  const { t } = useTranslation(['home', 'common']);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">{t('home:title')}</h1>
          <p className="text-xl mb-8">{t('home:subtitle')}</p>
          <div className="flex gap-4 justify-center">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t('home:cta.dashboard')}
              </Link>
            ) : (
              <Link
                href="/auth/signin"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t('home:cta.signIn')}
              </Link>
            )}
          </div>
        </div>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <div className="p-6 border rounded-lg">
            <h2 className="text-2xl font-semibold mb-2">
              {t('home:features.turborepo.title')}
            </h2>
            <p className="text-gray-600">{t('home:features.turborepo.description')}</p>
          </div>
          <div className="p-6 border rounded-lg">
            <h2 className="text-2xl font-semibold mb-2">
              {t('home:features.nextjs.title')}
            </h2>
            <p className="text-gray-600">{t('home:features.nextjs.description')}</p>
          </div>
          <div className="p-6 border rounded-lg">
            <h2 className="text-2xl font-semibold mb-2">
              {t('home:features.nodejs.title')}
            </h2>
            <p className="text-gray-600">{t('home:features.nodejs.description')}</p>
          </div>
          <div className="p-6 border rounded-lg">
            <h2 className="text-2xl font-semibold mb-2">
              {t('home:features.prisma.title')}
            </h2>
            <p className="text-gray-600">{t('home:features.prisma.description')}</p>
          </div>
          <div className="p-6 border rounded-lg">
            <h2 className="text-2xl font-semibold mb-2">
              {t('home:features.typescript.title')}
            </h2>
            <p className="text-gray-600">{t('home:features.typescript.description')}</p>
          </div>
          <div className="p-6 border rounded-lg">
            <h2 className="text-2xl font-semibold mb-2">
              {t('home:features.testing.title')}
            </h2>
            <p className="text-gray-600">{t('home:features.testing.description')}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
