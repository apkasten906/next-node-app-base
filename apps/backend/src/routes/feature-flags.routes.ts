import type { IFeatureFlagService } from '@repo/types';
import { Router, type Request, type Response } from 'express';
import { container } from 'tsyringe';
import { z } from 'zod';

import { getFirstString } from '../utils/request-values';

const router: import('express').Router = Router();

const keySchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[a-z][a-z0-9._-]*$/, {
    message: 'key must start with a letter and contain only lowercase letters, numbers, ., _, or -',
  });
const attributeSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z][A-Za-z0-9._-]*$/, {
    message: 'attribute contains unsupported characters',
  });
const scalarSchema = z.union([z.string().max(512), z.number().finite(), z.boolean()]);

const targetingRuleSchema = z.discriminatedUnion('operator', [
  z
    .object({
      attribute: attributeSchema,
      operator: z.literal('equals'),
      comparisonValue: scalarSchema,
      value: z.boolean(),
    })
    .strict(),
  z
    .object({
      attribute: attributeSchema,
      operator: z.literal('not_equals'),
      comparisonValue: scalarSchema,
      value: z.boolean(),
    })
    .strict(),
  z
    .object({
      attribute: attributeSchema,
      operator: z.literal('in'),
      comparisonValue: z.array(scalarSchema).min(1).max(100),
      value: z.boolean(),
    })
    .strict(),
  z
    .object({
      attribute: attributeSchema,
      operator: z.literal('not_in'),
      comparisonValue: z.array(scalarSchema).min(1).max(100),
      value: z.boolean(),
    })
    .strict(),
]);

const createFeatureFlagSchema = z
  .object({
    key: keySchema,
    description: z.string().trim().max(500).optional(),
    enabled: z.boolean().optional(),
    defaultValue: z.boolean(),
    rules: z.array(targetingRuleSchema).max(100).optional(),
  })
  .strict();

const updateFeatureFlagSchema = createFeatureFlagSchema
  .omit({ key: true })
  .partial()
  .refine((input) => Object.keys(input).length > 0, {
    message: 'at least one field is required',
  });

const evaluationSchema = z
  .object({
    attributes: z.record(z.string(), scalarSchema).optional(),
    fallbackValue: z.boolean().optional(),
  })
  .strict();

function resolveService(): IFeatureFlagService {
  return container.resolve<IFeatureFlagService>('IFeatureFlagService');
}

function requireFlagManager(req: Request, res: Response): boolean {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }

  const roles = req.user.roles ?? [];
  if (!roles.some((role) => role === 'ADMIN' || role === 'MODERATOR')) {
    res.status(403).json({ error: 'Forbidden' });
    return false;
  }

  return true;
}

function sendValidationError(res: Response, issues: z.core.$ZodIssue[]): void {
  res.status(400).json({ error: 'Invalid feature flag payload', details: issues });
}

function parseKey(req: Request, res: Response): string | undefined {
  const parsed = keySchema.safeParse(getFirstString(req.params['key']));
  if (!parsed.success) {
    sendValidationError(res, parsed.error.issues);
    return undefined;
  }
  return parsed.data;
}

router.post('/:key/evaluate', async (req: Request, res: Response): Promise<void> => {
  const key = parseKey(req, res);
  if (!key) return;

  const parsed = evaluationSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    sendValidationError(res, parsed.error.issues);
    return;
  }

  const result = await resolveService().evaluate(
    key,
    { userId: req.user?.userId, attributes: parsed.data.attributes },
    parsed.data.fallbackValue
  );
  res.status(200).json(result);
});

router.get('/', async (req: Request, res: Response): Promise<void> => {
  if (!requireFlagManager(req, res)) return;
  res.status(200).json({ data: await resolveService().list() });
});

router.get('/:key', async (req: Request, res: Response): Promise<void> => {
  if (!requireFlagManager(req, res)) return;
  const key = parseKey(req, res);
  if (!key) return;

  const flag = await resolveService().get(key);
  if (!flag) {
    res.status(404).json({ error: 'Feature flag not found' });
    return;
  }
  res.status(200).json(flag);
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  if (!requireFlagManager(req, res)) return;
  const parsed = createFeatureFlagSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error.issues);
    return;
  }

  try {
    res.status(201).json(await resolveService().create(parsed.data));
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Feature flag already exists:')) {
      res.status(409).json({ error: 'Feature flag already exists' });
      return;
    }
    throw error;
  }
});

router.patch('/:key', async (req: Request, res: Response): Promise<void> => {
  if (!requireFlagManager(req, res)) return;
  const key = parseKey(req, res);
  if (!key) return;
  const parsed = updateFeatureFlagSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error.issues);
    return;
  }

  try {
    res.status(200).json(await resolveService().update(key, parsed.data));
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Feature flag not found:')) {
      res.status(404).json({ error: 'Feature flag not found' });
      return;
    }
    throw error;
  }
});

router.delete('/:key', async (req: Request, res: Response): Promise<void> => {
  if (!requireFlagManager(req, res)) return;
  const key = parseKey(req, res);
  if (!key) return;

  try {
    await resolveService().delete(key);
    res.status(204).send();
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Feature flag not found:')) {
      res.status(404).json({ error: 'Feature flag not found' });
      return;
    }
    throw error;
  }
});

export default router;
