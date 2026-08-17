import type { Request } from 'express';

type RequestValue = Request['query'][string] | string | string[] | undefined;

export function getFirstString(value: RequestValue, fallback = ''): string {
  if (Array.isArray(value)) {
    const firstValue = value[0];
    return typeof firstValue === 'string' ? firstValue : fallback;
  }

  return typeof value === 'string' ? value : fallback;
}

export function getOptionalString(value: RequestValue): string | undefined {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : undefined;
  }

  return typeof value === 'string' ? value : undefined;
}
