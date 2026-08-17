/**
 * Provider-neutral contracts for feature flag management and evaluation.
 */

export type FeatureFlagKey = string;

export interface FeatureFlagEvaluationContext {
  userId?: string;
  attributes?: Readonly<Record<string, string | number | boolean>>;
}

export type FeatureFlagRuleOperator = 'equals' | 'not_equals' | 'in' | 'not_in';

export interface FeatureFlagTargetingRule {
  attribute: string;
  operator: FeatureFlagRuleOperator;
  comparisonValue: string | number | boolean | readonly (string | number | boolean)[];
  value: boolean;
}

export interface FeatureFlag {
  key: FeatureFlagKey;
  description?: string;
  enabled: boolean;
  defaultValue: boolean;
  rules: readonly FeatureFlagTargetingRule[];
  createdAt: Date;
  updatedAt: Date;
}

export type FeatureFlagEvaluationReason =
  | 'disabled'
  | 'default'
  | 'targeting_match'
  | 'flag_not_found';

export interface FeatureFlagEvaluation {
  key: FeatureFlagKey;
  value: boolean;
  reason: FeatureFlagEvaluationReason;
  matchedRule?: FeatureFlagTargetingRule;
}

export interface CreateFeatureFlagInput {
  key: FeatureFlagKey;
  description?: string;
  enabled?: boolean;
  defaultValue: boolean;
  rules?: readonly FeatureFlagTargetingRule[];
}

export interface UpdateFeatureFlagInput {
  description?: string;
  enabled?: boolean;
  defaultValue?: boolean;
  rules?: readonly FeatureFlagTargetingRule[];
}

export interface IFeatureFlagService {
  evaluate(
    key: FeatureFlagKey,
    context?: FeatureFlagEvaluationContext,
    fallbackValue?: boolean
  ): Promise<FeatureFlagEvaluation>;

  list(): Promise<readonly FeatureFlag[]>;
  get(key: FeatureFlagKey): Promise<FeatureFlag | null>;
  create(input: CreateFeatureFlagInput): Promise<FeatureFlag>;
  update(key: FeatureFlagKey, input: UpdateFeatureFlagInput): Promise<FeatureFlag>;
  delete(key: FeatureFlagKey): Promise<void>;
}
