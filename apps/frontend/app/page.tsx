import { HomeClient } from '@/components/home-client';

export default async function HomePage(): Promise<JSX.Element> {
  return <HomeClient isAuthenticated={false} />;
}
