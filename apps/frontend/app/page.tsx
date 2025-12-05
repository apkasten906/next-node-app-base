import { auth } from '@/auth';
import { HomeClient } from '@/components/home-client';

export default async function HomePage() {
  const session = await auth();

  return <HomeClient isAuthenticated={!!session?.user} />;
}
