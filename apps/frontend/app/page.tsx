import { auth } from '@/auth';
import Link from 'next/link';

export default async function HomePage() {
  const session = await auth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Next Node App Base</h1>
          <p className="text-xl mb-8">
            Production-ready monorepo with Next.js, Node.js, and TypeScript
          </p>
          <div className="flex gap-4 justify-center">
            {session?.user ? (
              <Link
                href="/dashboard"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Dashboard
              </Link>
            ) : (
              <Link
                href="/auth/signin"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <div className="p-6 border rounded-lg">
            <h2 className="text-2xl font-semibold mb-2">Turborepo</h2>
            <p className="text-gray-600">Monorepo build system with remote caching</p>
          </div>
          <div className="p-6 border rounded-lg">
            <h2 className="text-2xl font-semibold mb-2">Next.js 15</h2>
            <p className="text-gray-600">React framework with App Router</p>
          </div>
          <div className="p-6 border rounded-lg">
            <h2 className="text-2xl font-semibold mb-2">Node.js 25</h2>
            <p className="text-gray-600">Native TypeScript support</p>
          </div>
          <div className="p-6 border rounded-lg">
            <h2 className="text-2xl font-semibold mb-2">Prisma ORM</h2>
            <p className="text-gray-600">Type-safe database access</p>
          </div>
          <div className="p-6 border rounded-lg">
            <h2 className="text-2xl font-semibold mb-2">NextAuth.js</h2>
            <p className="text-gray-600">OAuth 2.0 authentication</p>
          </div>
          <div className="p-6 border rounded-lg">
            <h2 className="text-2xl font-semibold mb-2">OWASP Security</h2>
            <p className="text-gray-600">Security-first development</p>
          </div>
        </div>
      </div>
    </main>
  );
}
