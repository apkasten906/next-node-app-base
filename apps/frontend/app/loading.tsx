import { LoadingSpinner } from '@/components/loading-state';

export default function Loading(): JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <LoadingSpinner label="Loading page" />
    </main>
  );
}
