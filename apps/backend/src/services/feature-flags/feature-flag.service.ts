import type {
  CreateFeatureFlagInput,
  FeatureFlag,
  FeatureFlagEvaluation,
  FeatureFlagEvaluationContext,
  FeatureFlagTargetingRule,
  IFeatureFlagService,
  UpdateFeatureFlagInput,
} from '@repo/types';
import { injectable } from 'tsyringe';

type FeatureFlagAttribute = string | number | boolean;

@injectable()
export class FeatureFlagService implements IFeatureFlagService {
  private readonly flags = new Map<string, FeatureFlag>();

  async evaluate(
    key: string,
    context: FeatureFlagEvaluationContext = {},
    fallbackValue = false
  ): Promise<FeatureFlagEvaluation> {
    const flag = this.flags.get(key);

    if (!flag) {
      return { key, value: fallbackValue, reason: 'flag_not_found' };
    }

    if (!flag.enabled) {
      return { key, value: false, reason: 'disabled' };
    }

    const matchedRule = flag.rules.find((rule) => this.matches(rule, context));
    if (matchedRule) {
      return {
        key,
        value: matchedRule.value,
        reason: 'targeting_match',
        matchedRule: this.cloneRule(matchedRule),
      };
    }

    return { key, value: flag.defaultValue, reason: 'default' };
  }

  async list(): Promise<readonly FeatureFlag[]> {
    return Array.from(this.flags.values(), (flag) => this.cloneFlag(flag));
  }

  async get(key: string): Promise<FeatureFlag | null> {
    const flag = this.flags.get(key);
    return flag ? this.cloneFlag(flag) : null;
  }

  async create(input: CreateFeatureFlagInput): Promise<FeatureFlag> {
    if (this.flags.has(input.key)) {
      throw new Error(`Feature flag already exists: ${input.key}`);
    }

    const now = new Date();
    const flag: FeatureFlag = {
      key: input.key,
      description: input.description,
      enabled: input.enabled ?? true,
      defaultValue: input.defaultValue,
      rules: (input.rules ?? []).map((rule) => this.cloneRule(rule)),
      createdAt: now,
      updatedAt: now,
    };

    this.flags.set(flag.key, flag);
    return this.cloneFlag(flag);
  }

  async update(key: string, input: UpdateFeatureFlagInput): Promise<FeatureFlag> {
    const existing = this.flags.get(key);
    if (!existing) {
      throw new Error(`Feature flag not found: ${key}`);
    }

    const updated: FeatureFlag = {
      ...existing,
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      ...(input.defaultValue !== undefined ? { defaultValue: input.defaultValue } : {}),
      ...(input.rules !== undefined
        ? { rules: input.rules.map((rule) => this.cloneRule(rule)) }
        : {}),
      updatedAt: new Date(),
    };

    this.flags.set(key, updated);
    return this.cloneFlag(updated);
  }

  async delete(key: string): Promise<void> {
    if (!this.flags.delete(key)) {
      throw new Error(`Feature flag not found: ${key}`);
    }
  }

  private matches(rule: FeatureFlagTargetingRule, context: FeatureFlagEvaluationContext): boolean {
    const actual =
      rule.attribute === 'userId' ? context.userId : context.attributes?.[rule.attribute];

    if (actual === undefined) {
      return false;
    }

    switch (rule.operator) {
      case 'equals':
        return actual === rule.comparisonValue;
      case 'not_equals':
        return actual !== rule.comparisonValue;
      case 'in':
        return this.includes(rule.comparisonValue, actual);
      case 'not_in':
        return !this.includes(rule.comparisonValue, actual);
    }
  }

  private includes(
    comparisonValue: FeatureFlagTargetingRule['comparisonValue'],
    actual: FeatureFlagAttribute
  ): boolean {
    return Array.isArray(comparisonValue) && comparisonValue.some((value) => value === actual);
  }

  private cloneRule(rule: FeatureFlagTargetingRule): FeatureFlagTargetingRule {
    return {
      ...rule,
      comparisonValue: Array.isArray(rule.comparisonValue)
        ? [...rule.comparisonValue]
        : rule.comparisonValue,
    };
  }

  private cloneFlag(flag: FeatureFlag): FeatureFlag {
    return {
      ...flag,
      rules: flag.rules.map((rule) => this.cloneRule(rule)),
      createdAt: new Date(flag.createdAt),
      updatedAt: new Date(flag.updatedAt),
    };
  }
}
