/**
 * ABAC (Attribute-Based Access Control) interfaces
 * Supports complex policy-based authorization with context attributes
 */

/**
 * Policy effect - determines whether access is granted or denied
 */
export enum PolicyEffect {
  ALLOW = 'allow',
  DENY = 'deny',
}

/**
 * Comparison operators for condition evaluation
 */
export enum ComparisonOperator {
  EQUALS = 'eq',
  NOT_EQUALS = 'ne',
  GREATER_THAN = 'gt',
  GREATER_THAN_OR_EQUAL = 'gte',
  LESS_THAN = 'lt',
  LESS_THAN_OR_EQUAL = 'lte',
  IN = 'in',
  NOT_IN = 'nin',
  CONTAINS = 'contains',
  MATCHES = 'matches', // regex match
}

/**
 * Logical operators for combining conditions
 */
export enum LogicalOperator {
  AND = 'and',
  OR = 'or',
  NOT = 'not',
}

/**
 * Attribute sources for policy evaluation
 */
export enum AttributeSource {
  USER = 'user',
  RESOURCE = 'resource',
  ENVIRONMENT = 'environment',
  ACTION = 'action',
}

/**
 * Attribute definition for policy conditions
 */
export interface Attribute {
  source: AttributeSource;
  key: string;
}

/**
 * Condition for policy evaluation
 * Evaluates an attribute against a value using a comparison operator
 */
export interface Condition {
  attribute: Attribute;
  operator: ComparisonOperator;
  value: any;
}

/**
 * Logical condition combining multiple conditions
 */
export interface LogicalCondition {
  operator: LogicalOperator;
  conditions: (Condition | LogicalCondition)[];
}

/**
 * Policy rule combining conditions with an effect
 */
export interface PolicyRule {
  id: string;
  description?: string;
  conditions: LogicalCondition;
  effect: PolicyEffect;
  priority?: number; // Higher priority rules are evaluated first
}

/**
 * Complete policy with metadata
 */
export interface Policy {
  id: string;
  name: string;
  description?: string;
  version: string;
  enabled: boolean;
  rules: PolicyRule[];
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  tags?: string[];
}

/**
 * Context for policy evaluation
 * Contains attributes from user, resource, environment, and action
 */
export interface PolicyContext {
  user: Record<string, any>;
  resource: Record<string, any>;
  environment: Record<string, any>;
  action: string;
}

/**
 * Result of policy evaluation
 */
export interface PolicyEvaluationResult {
  effect: PolicyEffect;
  matchedRules: string[]; // IDs of rules that matched
  reason?: string;
}

/**
 * Policy store interface for CRUD operations
 */
export interface IPolicyStore {
  /**
   * Create a new policy
   */
  createPolicy(policy: Omit<Policy, 'id' | 'createdAt' | 'updatedAt'>): Promise<Policy>;

  /**
   * Get policy by ID
   */
  getPolicy(id: string): Promise<Policy | null>;

  /**
   * List all policies
   */
  listPolicies(filter?: {
    enabled?: boolean;
    tags?: string[];
  }): Promise<Policy[]>;

  /**
   * Update existing policy
   */
  updatePolicy(id: string, updates: Partial<Omit<Policy, 'id' | 'createdAt'>>): Promise<Policy>;

  /**
   * Delete policy
   */
  deletePolicy(id: string): Promise<boolean>;

  /**
   * Find policies applicable to a given context
   */
  findApplicablePolicies(context: PolicyContext): Promise<Policy[]>;
}

/**
 * Policy engine interface for evaluating policies
 */
export interface IPolicyEngine {
  /**
   * Evaluate all applicable policies for a given context
   */
  evaluate(context: PolicyContext): Promise<PolicyEvaluationResult>;

  /**
   * Evaluate a single policy
   */
  evaluatePolicy(policy: Policy, context: PolicyContext): Promise<PolicyEvaluationResult>;

  /**
   * Evaluate a single rule
   */
  evaluateRule(rule: PolicyRule, context: PolicyContext): Promise<boolean>;

  /**
   * Evaluate conditions
   */
  evaluateConditions(conditions: LogicalCondition, context: PolicyContext): Promise<boolean>;
}
