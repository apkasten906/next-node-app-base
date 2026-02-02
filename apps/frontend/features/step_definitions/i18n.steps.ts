import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { DataTable, Given, Then } from '@cucumber/cucumber';

import { World } from '../support/world';

Given('the i18n configuration is loaded', async function (this: World) {
  const i18nPath = path.join(process.cwd(), 'i18n.ts');
  const content = fs.readFileSync(i18nPath, 'utf8');
  this.setData('i18nSource', content);
});

Then('default locale should be {string}', async function (this: World, expected: string) {
  const content = this.getData<string>('i18nSource');
  assert.ok(content, 'i18n config not loaded');

  const re = /export\s+const\s+defaultLocale\s*=\s*['"]([^'"]+)['"]/;
  const match = re.exec(content);
  assert.ok(match, 'defaultLocale export not found');
  assert.ok(match[1], 'defaultLocale export value is empty');
  assert.ok(match[1].length <= 32, 'defaultLocale export value is unexpectedly long');
  assert.ok(
    /^[A-Za-z0-9-]+$/.test(match[1]),
    `defaultLocale export value contains unexpected characters: '${match[1]}'`
  );
  assert.equal(match[1], expected);
});

Then('supported locales should include:', async function (this: World, dataTable: DataTable) {
  const content = this.getData<string>('i18nSource');
  assert.ok(content, 'i18n config not loaded');

  const expected = dataTable
    .raw()
    .flat()
    .map((s: string) => s.trim())
    .filter(Boolean);

  const localesRe = /export\s+const\s+locales\s*=\s*\[([^\]]*)\]/;
  const localesMatch = localesRe.exec(content);
  assert.ok(localesMatch, 'locales export not found');

  const locales: string[] = [];
  const localesBody = localesMatch[1] ?? '';
  const re = /['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(localesBody)) !== null) {
    const locale = m[1];
    if (locale) locales.push(locale);
  }

  for (const locale of expected) {
    assert.ok(
      locales.includes(locale),
      `Expected locales to include '${locale}', got: ${locales.join(', ')}`
    );
  }
});
