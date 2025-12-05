# Error Handling & API Client

Comprehensive error handling system with React Error Boundaries, centralized API client with retry logic, and structured error logging.

## Table of Contents

- [Overview](#overview)
- [Error Boundaries](#error-boundaries)
- [API Client](#api-client)
- [Error Display Components](#error-display-components)
- [Error Logging](#error-logging)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)
- [Internationalization](#internationalization)

## Overview

The frontend error handling system provides:

- **React Error Boundaries** - Catch rendering errors and prevent app crashes
- **API Client** - Type-safe HTTP client with retry logic and error transformation
- **Error Display** - Reusable UI components for showing errors
- **Error Logging** - Structured logging with optional Sentry integration
- **i18n Support** - Multilingual error messages (EN, ES, FR, DE)

## Error Boundaries

### RootErrorBoundary

Global error boundary for the entire application. Wraps the root layout and catches all unhandled errors.

**Location:** `apps/frontend/components/error-boundary.tsx`

**Usage:**

```tsx
// apps/frontend/app/layout.tsx
import { RootErrorBoundary } from '@/components/error-boundary';

export default function RootLayout({ children }: { children: ReactNode }) {
  return <RootErrorBoundary>{children}</RootErrorBoundary>;
}
```

**Features:**

- Full-page error display with retry and reload options
- Automatic error logging
- User-friendly error messages
- Recovery mechanism (reset error state)

### RouteErrorBoundary

Route-level error boundary for specific routes or sections.

**Usage:**

```tsx
import { RouteErrorBoundary } from '@/components/error-boundary';

export function SomeRoute() {
  return (
    <RouteErrorBoundary>
      <YourComponent />
    </RouteErrorBoundary>
  );
}
```

### Custom Error Boundary

Create custom error boundaries with fallback UI:

```tsx
import { ErrorBoundary } from '@/components/error-boundary';

<ErrorBoundary
  fallback={(error, reset) => (
    <div>
      <h2>Custom Error UI</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Retry</button>
    </div>
  )}
  onError={(error, errorInfo) => {
    console.log('Error caught:', error, errorInfo);
  }}
>
  <YourComponent />
</ErrorBoundary>;
```

## API Client

Type-safe HTTP client with automatic error handling, retries, and logging.

### Configuration

**Location:** `apps/frontend/lib/api-client.ts`

**Environment Variables:**

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### API Client Class

```typescript
import { apiClient } from '@/lib/api-client';

// GET request
const data = await apiClient.get<User[]>('/api/users');

// POST request
const newUser = await apiClient.post<User>('/api/users', {
  name: 'John Doe',
  email: 'john@example.com',
});

// PUT request
const updated = await apiClient.put<User>(`/api/users/${id}`, userData);

// PATCH request
const patched = await apiClient.patch<User>(`/api/users/${id}`, { name: 'Jane' });

// DELETE request
await apiClient.delete(`/api/users/${id}`);
```

### Request Options

```typescript
// With query parameters
const users = await apiClient.get('/api/users', {
  params: {
    page: 1,
    limit: 10,
    sort: 'name',
  },
});

// With custom headers
const data = await apiClient.post('/api/data', body, {
  headers: {
    'X-Custom-Header': 'value',
  },
});

// With retry configuration
const data = await apiClient.get('/api/data', {
  retries: 5,
  retryDelay: 2000,
  timeout: 60000,
});
```

### Error Types

```typescript
import {
  ApiError,
  NetworkError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
} from '@/lib/api-client';

try {
  await apiClient.get('/api/resource');
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('Validation failed:', error.fields);
  } else if (error instanceof AuthenticationError) {
    // Redirect to login
  } else if (error instanceof NotFoundError) {
    // Show 404 message
  } else if (error instanceof ApiError) {
    console.log('API error:', error.status, error.message);
  } else if (error instanceof NetworkError) {
    console.log('Network error:', error.message);
  }
}
```

### Retry Logic

The API client automatically retries failed requests with exponential backoff:

- **Default retries:** 3 attempts
- **Retry delay:** 1000ms (exponential backoff)
- **Timeout:** 30 seconds
- **Retryable errors:** 5xx errors and 429 (rate limit)
- **Non-retryable:** 4xx errors (except 429)

## Error Display Components

### ErrorDisplay

General-purpose error display with retry and dismiss options.

```tsx
import { ErrorDisplay } from '@/components/error-display';

<ErrorDisplay error={error} onRetry={() => refetch()} onDismiss={() => setError(null)} />;
```

### ErrorAlert

Alert-style error message for inline notifications.

```tsx
import { ErrorAlert } from '@/components/error-display';

<ErrorAlert error={error} onDismiss={() => setError(null)} />;
```

### ErrorMessage

Inline error message for forms.

```tsx
import { ErrorMessage } from '@/components/error-display';

<ErrorMessage message="Email is required" />;
```

### ErrorFallback

Full-page error fallback component.

```tsx
import { ErrorFallback } from '@/components/error-display';

<ErrorFallback error={error} reset={resetError} />;
```

## Error Logging

Structured error logging with console output and optional backend integration.

**Location:** `apps/frontend/lib/error-logger.ts`

### Usage

```typescript
import { logError, logWarning, logInfo } from '@/lib/error-logger';

// Log error
await logError(error, {
  context: { userId, action: 'fetchData' },
  level: 'error',
  tags: { component: 'UserList' },
});

// Log warning
await logWarning('Data fetch took longer than expected', {
  duration: 5000,
});

// Log info
await logInfo('User action completed', { action: 'export' });
```

### Log Structure

```typescript
{
  message: string,
  name: string,
  stack: string,
  timestamp: string,
  level: 'error' | 'warning' | 'info',
  context: Record<string, unknown>,
  tags: Record<string, string>,
  userAgent: string,
  url: string
}
```

### Sentry Integration (Optional)

To enable Sentry integration, uncomment the Sentry code in `error-logger.ts` and install:

```bash
npm install @sentry/nextjs
```

Configure Sentry:

```typescript
// In error-logger.ts
if (typeof window !== 'undefined' && window.Sentry) {
  window.Sentry.captureException(error, {
    level,
    contexts: { custom: context },
    tags,
  });
}
```

## Usage Examples

### With TanStack Query (Existing Hooks)

The app already uses TanStack Query for data fetching. Error handling is built-in:

```typescript
import { useUsers } from '@/hooks/use-api';

function UserList() {
  const { data, error, isLoading, refetch } = useUsers();

  if (error) {
    return <ErrorDisplay error={error} onRetry={refetch} />;
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return <div>{/* Render users */}</div>;
}
```

### Custom API Call

```typescript
'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { ErrorDisplay } from '@/components/error-display';

function MyComponent() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiClient.get('/api/data');
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return <ErrorDisplay error={error} onRetry={fetchData} />;
  }

  return (
    <div>
      <button onClick={fetchData} disabled={loading}>
        Fetch Data
      </button>
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}
```

### Form with Validation Errors

```typescript
'use client';

import { useState } from 'react';
import { apiClient, ValidationError } from '@/lib/api-client';
import { ErrorMessage } from '@/components/error-display';

function UserForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      await apiClient.post('/api/users', formData);
    } catch (error) {
      if (error instanceof ValidationError && error.fields) {
        const fieldErrors: Record<string, string> = {};
        Object.entries(error.fields).forEach(([field, messages]) => {
          fieldErrors[field] = messages[0];
        });
        setErrors(fieldErrors);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <input name="email" />
        {errors.email && <ErrorMessage message={errors.email} />}
      </div>
      <button type="submit">Submit</button>
    </form>
  );
}
```

## Best Practices

### 1. Always Handle Errors

```typescript
// ❌ Bad - unhandled errors
const data = await apiClient.get('/api/data');

// ✅ Good - handle errors
try {
  const data = await apiClient.get('/api/data');
} catch (error) {
  handleError(error);
}
```

### 2. Use Error Boundaries for Component Trees

```typescript
// ✅ Wrap components that might throw
<ErrorBoundary>
  <ComplexComponent />
</ErrorBoundary>
```

### 3. Provide User Feedback

```typescript
// ✅ Show error to user with retry option
if (error) {
  return <ErrorDisplay error={error} onRetry={refetch} />;
}
```

### 4. Log Errors for Debugging

```typescript
// ✅ Log errors with context
catch (error) {
  await logError(error, {
    context: { userId, action: 'submitForm' }
  });
}
```

### 5. Use Type-Safe Error Handling

```typescript
// ✅ Check error types
if (error instanceof ValidationError) {
  showValidationErrors(error.fields);
} else if (error instanceof AuthenticationError) {
  redirectToLogin();
}
```

### 6. Set Appropriate Retry Policies

```typescript
// ✅ Critical operations - more retries
await apiClient.post('/api/payment', data, {
  retries: 5,
  retryDelay: 2000,
});

// ✅ Non-critical - fewer retries
await apiClient.get('/api/analytics', {
  retries: 1,
});
```

## Internationalization

Error messages support 4 languages: English (en), Spanish (es), French (fr), German (de).

### Translation Files

Error translations are in `public/locales/{locale}/common.json`:

```json
{
  "errors": {
    "title": "Something went wrong",
    "description": "We're sorry, but an error occurred. Please try again.",
    "generic": "An error occurred",
    "clientError": "Invalid request",
    "serverError": "Server error",
    "networkError": "Network connection failed",
    "notFound": "Resource not found",
    "unauthorized": "Authentication required",
    "forbidden": "Access denied"
  },
  "actions": {
    "retry": "Retry",
    "dismiss": "Dismiss"
  }
}
```

### Using Translations in Components

```typescript
import { useTranslation } from 'react-i18next';

function ErrorComponent({ error }) {
  const { t } = useTranslation('common');

  return (
    <div>
      <h2>{t('errors.title')}</h2>
      <p>{error.message}</p>
      <button>{t('actions.retry')}</button>
    </div>
  );
}
```

## Testing

### Testing Error Boundaries

```typescript
// __tests__/error-boundary.test.tsx
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '@/components/error-boundary';

function ThrowError() {
  throw new Error('Test error');
}

test('catches and displays error', () => {
  render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  );

  expect(screen.getByText(/test error/i)).toBeInTheDocument();
});
```

### Testing API Client

```typescript
// __tests__/api-client.test.ts
import { apiClient, ApiError } from '@/lib/api-client';

describe('API Client', () => {
  it('handles 404 errors', async () => {
    await expect(apiClient.get('/nonexistent')).rejects.toThrow(ApiError);
  });

  it('retries on network errors', async () => {
    // Test retry logic
  });
});
```

## Architecture

```
apps/frontend/
├── components/
│   ├── error-boundary.tsx      # Error boundary components
│   └── error-display.tsx       # Error UI components
├── lib/
│   ├── api-client.ts           # API client with retry logic
│   └── error-logger.ts         # Error logging service
├── hooks/
│   └── use-api.ts              # TanStack Query hooks
└── public/locales/
    └── {locale}/
        └── common.json         # Error translations
```

## Future Enhancements

- [ ] Add error analytics dashboard
- [ ] Implement circuit breaker pattern
- [ ] Add retry budget tracking
- [ ] Enhanced Sentry integration
- [ ] Error rate monitoring
- [ ] Custom error pages (404, 500)
- [ ] Offline error handling
- [ ] Error recovery strategies
