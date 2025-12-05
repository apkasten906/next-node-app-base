# Internationalization (i18n) Guide

## Overview

This application uses `i18next` and `react-i18next` for internationalization, supporting multiple languages with a type-safe, modular approach.

## Supported Languages

- 🇺🇸 **English (en)** - Default
- 🇪🇸 **Spanish (es)**
- 🇫🇷 **French (fr)**
- 🇩🇪 **German (de)**

## Project Structure

```
apps/frontend/
├── i18n.ts                          # i18n configuration
├── public/locales/                   # Translation files
│   ├── en/
│   │   ├── common.json              # Shared translations
│   │   ├── home.json                # Home page translations
│   │   ├── dashboard.json           # Dashboard translations
│   │   └── auth.json                # Auth page translations
│   ├── es/                          # Spanish translations
│   ├── fr/                          # French translations
│   └── de/                          # German translations
├── components/
│   └── language-switcher.tsx        # Language switcher component
└── next.config.ts                   # Next.js i18n configuration
```

## Configuration

### i18n.ts

The main configuration file exports:

- `defaultLocale`: Default language (English)
- `locales`: Array of supported locale codes
- `languages`: Object mapping locale codes to display names
- `i18n`: Configured i18next instance

### next.config.ts

Next.js i18n configuration:

```typescript
i18n: {
  locales: ['en', 'es', 'fr', 'de'],
  defaultLocale: 'en',
  localeDetection: true,
}
```

## Usage

### In Client Components

```tsx
'use client';

import { useTranslation } from 'react-i18next';

export function MyComponent() {
  const { t } = useTranslation('namespace');
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('description')}</p>
    </div>
  );
}
```

### With Multiple Namespaces

```tsx
const { t } = useTranslation(['home', 'common']);

<h1>{t('home:title')}</h1>
<button>{t('common:actions.continue')}</button>
```

### With Interpolation

```tsx
// Translation: "Welcome, {{name}}!"
<h1>{t('dashboard:welcome', { name: userName })}</h1>
```

### Language Switcher

Include the `<LanguageSwitcher />` component in your layout:

```tsx
import { LanguageSwitcher } from '@/components/language-switcher';

export function Header() {
  return (
    <header>
      <nav>
        <LanguageSwitcher />
      </nav>
    </header>
  );
}
```

## Translation File Structure

### Namespaces

Translations are organized into namespaces for better organization:

- **common**: Shared UI elements (navigation, actions, messages)
- **home**: Home page content
- **dashboard**: Dashboard-specific content
- **auth**: Authentication pages

### Example Structure

```json
{
  "title": "Page Title",
  "subtitle": "Page subtitle",
  "nested": {
    "key": "Nested value"
  },
  "withVariable": "Hello, {{name}}!"
}
```

## Adding a New Language

### 1. Add Locale to Configuration

Update `i18n.ts`:

```typescript
export const locales = ['en', 'es', 'fr', 'de', 'ja'] as const;

export const languages = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  ja: '日本語', // Japanese
} as const;
```

### 2. Create Translation Files

Create directory structure:

```
public/locales/ja/
├── common.json
├── home.json
├── dashboard.json
└── auth.json
```

### 3. Add to i18n Resources

Update the `resources` object in `i18n.ts`:

```typescript
import commonJa from './public/locales/ja/common.json';
// ... other imports

const resources = {
  // ... existing languages
  ja: {
    common: commonJa,
    home: homeJa,
    dashboard: dashboardJa,
    auth: authJa,
  },
};
```

### 4. Update Next.js Config

Add the new locale to `next.config.ts`:

```typescript
i18n: {
  locales: ['en', 'es', 'fr', 'de', 'ja'],
  defaultLocale: 'en',
  localeDetection: true,
}
```

## Adding New Translations

### 1. Identify the Namespace

Determine which namespace your translation belongs to:
- UI elements → `common`
- Page-specific → create or use appropriate namespace

### 2. Add to All Languages

Add the key to **all** language files to maintain consistency:

**en/common.json:**
```json
{
  "newFeature": {
    "title": "New Feature",
    "description": "This is a new feature"
  }
}
```

**es/common.json:**
```json
{
  "newFeature": {
    "title": "Nueva Característica",
    "description": "Esta es una nueva característica"
  }
}
```

### 3. Use in Components

```tsx
const { t } = useTranslation('common');

<div>
  <h2>{t('newFeature.title')}</h2>
  <p>{t('newFeature.description')}</p>
</div>
```

## Best Practices

### 1. Consistent Naming

Use descriptive, hierarchical keys:

```json
{
  "auth": {
    "signIn": {
      "title": "Sign In",
      "button": "Sign In with GitHub"
    }
  }
}
```

### 2. Avoid Hardcoded Text

Always use translation keys instead of hardcoded strings:

```tsx
// ❌ Bad
<button>Click Here</button>

// ✅ Good
<button>{t('common:actions.submit')}</button>
```

### 3. Keep Translations Complete

Ensure all languages have the same keys. Missing keys will fall back to the default language.

### 4. Use Namespaces Wisely

- Keep namespaces focused and related
- Don't create too many small namespaces
- Use common namespace for shared elements

### 5. Context for Translators

Add comments in translation files for context:

```json
{
  "_comment": "Dashboard statistics section",
  "stats": {
    "users": "Users",
    "projects": "Projects"
  }
}
```

## Locale Detection

The application automatically detects the user's preferred language from:

1. Cookie (`NEXT_LOCALE`)
2. Browser `Accept-Language` header
3. Fallback to default locale (English)

## Persistence

User language preference is persisted via cookies:

```typescript
document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`;
```

Cookie lifetime: 1 year

## Testing i18n

### Manual Testing

1. Use the language switcher in the UI
2. Verify all text updates correctly
3. Check for layout issues with longer translations
4. Test placeholder/interpolation values

### Automated Testing

```typescript
import { render } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n';

test('renders with translation', () => {
  const { getByText } = render(
    <I18nextProvider i18n={i18n}>
      <MyComponent />
    </I18nextProvider>
  );
  
  expect(getByText('Expected Translation')).toBeInTheDocument();
});
```

## Troubleshooting

### Translations Not Loading

1. Check that the JSON file is in the correct directory
2. Verify the namespace is imported in `i18n.ts`
3. Ensure the component is using the correct namespace

### Missing Translation Keys

- Check browser console for warnings
- Verify key exists in all language files
- Check for typos in key names

### Language Not Switching

1. Clear browser cookies
2. Check `NEXT_LOCALE` cookie is being set
3. Verify locale code matches configuration

## Future Enhancements

- [ ] Add RTL (Right-to-Left) language support (Arabic, Hebrew)
- [ ] Implement translation management system (Locize, Crowdin)
- [ ] Add language-specific number/date formatting
- [ ] Implement translation key extraction tool
- [ ] Add missing translation detection in CI/CD

## Resources

- [i18next Documentation](https://www.i18next.com/)
- [react-i18next Documentation](https://react.i18next.com/)
- [Next.js Internationalization](https://nextjs.org/docs/app/building-your-application/routing/internationalization)

## Contributing

When adding new features:

1. Add translation keys to all supported languages
2. Use descriptive key names
3. Update this documentation if adding new namespaces
4. Test in all supported languages before committing
