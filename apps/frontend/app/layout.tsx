import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { LanguageSwitcher } from '@/components/language-switcher';
import { Providers } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Next Node App Base',
  description: 'Production-ready monorepo with Next.js and Node.js',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="min-h-screen">
            <header className="border-b">
              <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                <div className="font-bold text-xl">Next Node App Base</div>
                <LanguageSwitcher />
              </div>
            </header>
            <main>{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
