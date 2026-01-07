import { HomeClient } from '@/components/home-client';

export default async function HomePage() {
  return <HomeClient isAuthenticated={false} />;
}
