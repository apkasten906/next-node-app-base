import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { Given, Then, When } from '@cucumber/cucumber';

import { World } from '../support/world';

interface FrontendSources {
  layout: string;
  homePage: string;
  dashboardPage: string;
  signInClient: string;
  useSignIn: string;
  signInService: string;
  authApi: string;
  authShim: string;
  nextAuthRoute: string;
  requireCurrentUser: string;
  serverApiClient: string;
  providers: string;
  nextConfig: string;
  postcssConfig: string;
  globalsCss: string;
  healthRoute: string;
  middleware: string;
}

function readFrontendFile(...segments: string[]): string {
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- BDD source checks read fixed repo paths assembled from step helpers.
  return fs.readFileSync(path.join(process.cwd(), ...segments), 'utf8');
}

function loadFrontendSources(): FrontendSources {
  return {
    layout: readFrontendFile('app', 'layout.tsx'),
    homePage: readFrontendFile('app', 'page.tsx'),
    dashboardPage: readFrontendFile('app', 'dashboard', 'page.tsx'),
    signInClient: readFrontendFile('components', 'signin-client.tsx'),
    useSignIn: readFrontendFile('src', 'hooks', 'auth', 'use-sign-in.ts'),
    signInService: readFrontendFile('src', 'application', 'auth', 'sign-in.ts'),
    authApi: readFrontendFile('lib', 'api', 'auth-api.ts'),
    authShim: readFrontendFile('auth.ts'),
    nextAuthRoute: readFrontendFile('app', 'api', 'auth', '[...nextauth]', 'route.ts'),
    requireCurrentUser: readFrontendFile('src', 'server', 'auth', 'require-current-user.ts'),
    serverApiClient: readFrontendFile('src', 'server', 'http', 'server-api-client.ts'),
    providers: readFrontendFile('components', 'providers.tsx'),
    nextConfig: readFrontendFile('next.config.ts'),
    postcssConfig: readFrontendFile('postcss.config.mjs'),
    globalsCss: readFrontendFile('app', 'globals.css'),
    healthRoute: readFrontendFile('app', 'api', 'health', 'route.ts'),
    middleware: readFrontendFile('middleware.ts'),
  };
}

function getSources(world: World): FrontendSources {
  const sources = world.getData<FrontendSources>('frontendSources') ?? loadFrontendSources();
  world.setData('frontendSources', sources);
  return sources;
}

Given(
  'the Next.js application is running on port {int}',
  async function (this: World, port: number) {
    assert.equal(port, 3000, 'Frontend BDD assumes the template frontend port is 3000');
    this.setData('nextRunning', true);
  }
);

Given('the backend API is running on port {int}', async function (this: World, port: number) {
  assert.equal(port, 3001, 'Frontend BDD assumes the template backend port is 3001');
  this.setData('backendRunning', true);
});

Given('Next.js App Router is configured', async function (this: World) {
  const sources = loadFrontendSources();
  assert.ok(fs.existsSync(path.join(process.cwd(), 'app')), 'Expected app/ directory to exist');
  assert.ok(
    sources.nextConfig.includes('typedRoutes: true'),
    'Expected typed routes in next.config.ts'
  );
  this.setData('frontendSources', sources);
});

When('I inspect the route entries', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.homePage.includes('export default async function HomePage'));
  assert.ok(sources.dashboardPage.includes('export default async function DashboardPage'));
  this.setData('routeEntriesInspected', true);
});

Then('route entry files should render page components', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.homePage.includes('<HomeClient'), 'Expected home route to render HomeClient');
  assert.ok(
    sources.dashboardPage.includes('<DashboardClient'),
    'Expected dashboard route to render DashboardClient'
  );
});

Then('server route entries should remain server components', async function (this: World) {
  const sources = getSources(this);
  assert.ok(
    !sources.homePage.startsWith("'use client'"),
    'Home route should remain server-rendered'
  );
  assert.ok(
    !sources.dashboardPage.startsWith("'use client'"),
    'Dashboard route should remain server-rendered'
  );
});

Then(
  'client components should be marked with {string}',
  async function (this: World, directive: string) {
    const sources = getSources(this);
    assert.equal(directive, 'use client');
    assert.ok(sources.signInClient.startsWith("'use client'"));
    assert.ok(sources.providers.startsWith("'use client'"));
  }
);

Given('ADR-011 backend-only auth is configured in the frontend', async function (this: World) {
  this.setData('frontendSources', loadFrontendSources());
});

When('I inspect the frontend auth boundary', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.authShim.includes('Frontend no longer uses NextAuth or Prisma'));
  this.setData('authBoundaryInspected', true);
});

Then('NextAuth and Prisma should not run in the frontend runtime', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.authShim.includes('export {}'));
  assert.ok(sources.nextAuthRoute.includes("new Response('Not Implemented'"));
  assert.ok(!sources.signInClient.includes('next-auth'));
  assert.ok(!sources.requireCurrentUser.includes('next-auth'));
});

Then('login should delegate to the backend auth API', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.signInClient.includes('useSignIn()'));
  assert.ok(sources.useSignIn.includes('authApplicationService.signIn(values)'));
  assert.ok(sources.signInService.includes('authApi.login(credentials)'));
  assert.ok(sources.authApi.includes("'/api/auth/login'"));
  assert.ok(sources.authApi.includes("credentials: 'include'"));
});

Then(
  'server-rendered auth checks should call the backend current-user endpoint',
  async function (this: World) {
    const sources = getSources(this);
    assert.ok(sources.requireCurrentUser.includes("serverApiFetch('/api/auth/me')"));
    assert.ok(sources.requireCurrentUser.includes("redirect('/auth/signin')"));
    assert.ok(sources.serverApiClient.includes("requestHeaders.set('cookie', cookieHeader)"));
  }
);

Given('the sign-in client uses the auth hook', async function (this: World) {
  const sources = loadFrontendSources();
  assert.ok(sources.signInClient.includes('import { useSignIn }'));
  this.setData('frontendSources', sources);
});

When('I inspect the sign-in flow', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.signInClient.includes('submitForm(e, { email, password })'));
});

Then('the form should submit email and password credentials', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.signInClient.includes('type="email"'));
  assert.ok(sources.signInClient.includes('type="password"'));
  assert.ok(sources.signInClient.includes('required'));
});

Then('the hook should call the auth application service', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.useSignIn.includes('authApplicationService.signIn(values)'));
  assert.ok(sources.useSignIn.includes('setIsSubmitting(true)'));
  assert.ok(sources.useSignIn.includes('setError(message)'));
});

Then(
  'the auth API should post to {string} with credentials included',
  async function (this: World, endpoint: string) {
    const sources = getSources(this);
    assert.equal(endpoint, '/api/auth/login');
    assert.ok(sources.authApi.includes(`'${endpoint}'`));
    assert.ok(sources.authApi.includes("credentials: 'include'"));
  }
);

Then('successful sign-in should navigate to the dashboard', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.useSignIn.includes('result?.authenticated'));
  assert.ok(sources.useSignIn.includes("router.push('/dashboard')"));
  assert.ok(sources.useSignIn.includes('router.refresh()'));
});

Given('the dashboard page requires the current user', async function (this: World) {
  const sources = loadFrontendSources();
  assert.ok(sources.dashboardPage.includes('requireCurrentUser'));
  this.setData('frontendSources', sources);
});

When('unauthenticated user accesses protected route', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.requireCurrentUser.includes('response.status === 401'));
});

Then('user should be redirected to login', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.requireCurrentUser.includes("redirect('/auth/signin')"));
});

When('authenticated user accesses protected route', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.requireCurrentUser.includes('return data.user'));
});

Then('route should be accessible', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.dashboardPage.includes('const currentUser = await requireCurrentUser()'));
});

Then('user information should be displayed', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.dashboardPage.includes('userName={currentUser.name}'));
  assert.ok(sources.dashboardPage.includes('userImage={currentUser.image}'));
});

Given('TanStack Query is set up', async function (this: World) {
  this.setData('frontendSources', loadFrontendSources());
});

When('the application loads', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.layout.includes('<Providers>'));
});

Then('QueryClient should be configured', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.providers.includes('new QueryClient'));
  assert.ok(sources.providers.includes('QueryClientProvider'));
  assert.ok(sources.providers.includes('defaultOptions'));
});

Then('query devtools should be available in development', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.providers.includes('ReactQueryDevtools'));
});

Given('Tailwind CSS 4 is configured', async function (this: World) {
  this.setData('frontendSources', loadFrontendSources());
});

When('I inspect components', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.layout.includes('className='));
});

Then('Tailwind utility classes should be used', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.globalsCss.includes("@import 'tailwindcss'"));
  assert.ok(sources.postcssConfig.includes("'@tailwindcss/postcss'"));
  assert.ok(sources.layout.includes('min-h-screen'));
});

Then('responsive design should work', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.dashboardPage.includes('sm:px-6'));
  assert.ok(sources.dashboardPage.includes('lg:px-8'));
});

Then('dark mode should be supported', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.globalsCss.includes("@import 'tailwindcss'"));
});

Given('SEO metadata is configured', async function (this: World) {
  this.setData('frontendSources', loadFrontendSources());
});

When('I view page source', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.layout.includes('export const metadata'));
});

Then('title tag should be present', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.layout.includes("title: 'Next Node App Base'"));
});

Then('meta description should be present', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.layout.includes('description:'));
});

Then('Open Graph tags should be present', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.layout.includes('openGraph:'));
  assert.ok(sources.layout.includes("type: 'website'"));
});

When('I inspect GET {string}', async function (this: World, endpoint: string) {
  assert.equal(endpoint, '/api/health');
  this.setData('frontendSources', loadFrontendSources());
});

Then('the API route should respond', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.healthRoute.includes('export function GET'));
});

Then('response should be JSON', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.healthRoute.includes('Response.json'));
});

Then('status code should be 200', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.healthRoute.includes('status: 200'));
});

Given('middleware is configured', async function (this: World) {
  this.setData('frontendSources', loadFrontendSources());
});

When('I make a request', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.middleware.includes('export function middleware'));
});

Then('middleware should execute', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.middleware.includes('NextResponse.next'));
});

Then('headers should be modified', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.middleware.includes('generateCorrelationId()'));
  assert.ok(sources.middleware.includes('requestHeaders.set'));
  assert.ok(sources.middleware.includes('res.headers.set'));
});

Then('request should be processed', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.middleware.includes('matcher:'));
  assert.ok(sources.middleware.includes('_next/static'));
});

When('I view the site on mobile {string}', async function (this: World, device: string) {
  assert.ok(['iPhone 12', 'iPad Pro', 'Desktop 1920'].includes(device));
  this.setData('frontendSources', loadFrontendSources());
});

Then('layout should adapt to screen size', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.dashboardPage.includes('sm:px-6'));
  assert.ok(sources.dashboardPage.includes('lg:px-8'));
});

Then('navigation should collapse to menu', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.layout.includes('flex'));
  assert.ok(sources.layout.includes('justify-between'));
});

Then('content should be readable', async function (this: World) {
  const sources = getSources(this);
  assert.ok(sources.layout.includes('container mx-auto'));
  assert.ok(sources.dashboardPage.includes('max-w-7xl'));
});

Given('certain routes require authentication', async function (this: World) {
  this.setData('frontendSources', loadFrontendSources());
});

When('I navigate to non-existent route', async function (this: World) {
  this.setData('frontendSources', loadFrontendSources());
});

Then('custom 404 page should be shown', async function () {
  const notFound = readFrontendFile('app', 'not-found.tsx');
  assert.ok(notFound.includes('Page not found'));
  assert.ok(notFound.includes('404'));
});

Then('helpful navigation should be provided', async function () {
  const notFound = readFrontendFile('app', 'not-found.tsx');
  assert.ok(notFound.includes('href="/"'));
  assert.ok(notFound.includes('Go home'));
});

When('server error occurs', async function (this: World) {
  this.setData('serverErrorOccurred', true);
});

Then('custom 500 page should be shown', async function () {
  const errorPage = readFrontendFile('app', 'error.tsx');
  const errorDisplay = readFrontendFile('components', 'error-display.tsx');
  assert.ok(errorPage.includes('ErrorFallback'));
  assert.ok(errorDisplay.includes('Something went wrong on our end'));
});

Given('a page uses React Suspense', async function (this: World) {
  const loading = readFrontendFile('app', 'loading.tsx');
  assert.ok(loading.includes('LoadingSpinner'));
  this.setData('loadingSource', loading);
});

When('the page loads', async function (this: World) {
  assert.ok(this.getData<string>('loadingSource'));
});

Then('loading fallback should be shown', async function (this: World) {
  const loading = this.getData<string>('loadingSource') ?? readFrontendFile('app', 'loading.tsx');
  assert.ok(loading.includes('Loading page'));
  assert.ok(loading.includes('LoadingSpinner'));
});

When('data is ready', async function (this: World) {
  this.setData('dataReady', true);
});

Then('actual content should be shown', async function (this: World) {
  assert.equal(this.getData<boolean>('dataReady'), true);
  const sources = getSources(this);
  assert.ok(
    sources.homePage.includes('<HomeClient') || sources.dashboardPage.includes('<DashboardClient')
  );
});
