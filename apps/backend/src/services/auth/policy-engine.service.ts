import {
  ComparisonOperator,
  Condition,
  IPolicyEngine,
  LogicalCondition,
  LogicalOperator,
  Policy,
  PolicyContext,
  PolicyEffect,
  PolicyEvaluationResult,
  PolicyRule,
} from '@repo/types';
import { injectable } from 'tsyringe';

/**
 * Policy evaluation engine for ABAC
 * Evaluates policies and conditions against a given context
 */
@injectable()
export class PolicyEngine implements IPolicyEngine {
  /**
   * Evaluate all applicable policies for a given context
   * Uses deny-overrides strategy: if any policy denies, access is denied
   * @deprecated Use evaluatePolicies instead - this method requires policies to be passed in
   */
  async evaluate(_context: PolicyContext): Promise<PolicyEvaluationResult> {
    throw new Error('evaluate method requires policies to be passed in - use evaluatePolicies instead');
  }

  /**
   * Evaluate multiple policies with deny-overrides strategy
   */
  async evaluatePolicies(
    policies: Policy[],
    context: PolicyContext,
  ): Promise<PolicyEvaluationResult> {
    const deniedRules: string[] = [];
    const allowedRules: string[] = [];

    // Sort policies by priority if available
    const sortedPolicies = [...policies].filter((p) => p.enabled);

    for (const policy of sortedPolicies) {
      const result = await this.evaluatePolicy(policy, context);

      if (result.effect === PolicyEffect.DENY) {
        deniedRules.push(...result.matchedRules);
      } else if (result.effect === PolicyEffect.ALLOW) {
        allowedRules.push(...result.matchedRules);
      }
    }

    // Deny-overrides: if any rule denies, access is denied
    if (deniedRules.length > 0) {
      return {
        effect: PolicyEffect.DENY,
        matchedRules: deniedRules,
        reason: `Access denied by rules: ${deniedRules.join(', ')}`,
      };
    }

    // If at least one rule allows, access is granted
    if (allowedRules.length > 0) {
      return {
        effect: PolicyEffect.ALLOW,
        matchedRules: allowedRules,
        reason: `Access granted by rules: ${allowedRules.join(', ')}`,
      };
    }

    // No rules matched - default deny
    return {
      effect: PolicyEffect.DENY,
      matchedRules: [],
      reason: 'No matching policy rules found (default deny)',
    };
  }

  /**
   * Evaluate a single policy
   */
  async evaluatePolicy(policy: Policy, context: PolicyContext): Promise<PolicyEvaluationResult> {
    if (!policy.enabled) {
      return {
        effect: PolicyEffect.DENY,
        matchedRules: [],
        reason: 'Policy is disabled',
      };
    }

    const matchedRules: string[] = [];
    const deniedRules: string[] = [];
    const allowedRules: string[] = [];

    // Sort rules by priority (higher priority first)
    const sortedRules = [...policy.rules].sort((a, b) => {
      const priorityA = a.priority ?? 0;
      const priorityB = b.priority ?? 0;
      return priorityB - priorityA;
    });

    for (const rule of sortedRules) {
      const matches = await this.evaluateRule(rule, context);

      if (matches) {
        matchedRules.push(rule.id);

        if (rule.effect === PolicyEffect.DENY) {
          deniedRules.push(rule.id);
        } else {
          allowedRules.push(rule.id);
        }
      }
    }

    // Deny-overrides within policy
    if (deniedRules.length > 0) {
      return {
        effect: PolicyEffect.DENY,
        matchedRules: deniedRules,
        reason: `Denied by rules: ${deniedRules.join(', ')}`,
      };
    }

    if (allowedRules.length > 0) {
      return {
        effect: PolicyEffect.ALLOW,
        matchedRules: allowedRules,
        reason: `Allowed by rules: ${allowedRules.join(', ')}`,
      };
    }

    // No rules matched in this policy
    return {
      effect: PolicyEffect.DENY,
      matchedRules: [],
      reason: 'No matching rules in policy',
    };
  }

  /**
   * Evaluate a single rule
   */
  async evaluateRule(rule: PolicyRule, context: PolicyContext): Promise<boolean> {
    return this.evaluateConditions(rule.conditions, context);
  }

  /**
   * Evaluate conditions (logical combination)
   */
  async evaluateConditions(
    conditions: LogicalCondition,
    context: PolicyContext,
  ): Promise<boolean> {
    switch (conditions.operator) {
      case LogicalOperator.AND:
        return this.evaluateAnd(conditions.conditions, context);

      case LogicalOperator.OR:
        return this.evaluateOr(conditions.conditions, context);

      case LogicalOperator.NOT:
        return this.evaluateNot(conditions.conditions, context);

      default:
        throw new Error(`Unsupported logical operator: ${conditions.operator}`);
    }
  }

  /**
   * Evaluate AND conditions (all must be true)
   */
  private async evaluateAnd(
    conditions: (Condition | LogicalCondition)[],
    context: PolicyContext,
  ): Promise<boolean> {
    for (const condition of conditions) {
      const result = await this.evaluateCondition(condition, context);
      if (!result) {
        return false;
      }
    }
    return conditions.length > 0;
  }

  /**
   * Evaluate OR conditions (at least one must be true)
   */
  private async evaluateOr(
    conditions: (Condition | LogicalCondition)[],
    context: PolicyContext,
  ): Promise<boolean> {
    for (const condition of conditions) {
      const result = await this.evaluateCondition(condition, context);
      if (result) {
        return true;
      }
    }
    return false;
  }

  /**
   * Evaluate NOT conditions (negation)
   */
  private async evaluateNot(
    conditions: (Condition | LogicalCondition)[],
    context: PolicyContext,
  ): Promise<boolean> {
    if (conditions.length === 0) {
      return false;
    }

    const firstCondition = conditions[0];
    if (!firstCondition) {
      return false;
    }

    const result = await this.evaluateCondition(firstCondition, context);
    return !result;
  }

  /**
   * Evaluate a single condition or logical condition
   */
  private async evaluateCondition(
    condition: Condition | LogicalCondition,
    context: PolicyContext,
  ): Promise<boolean> {
    // Check if it's a logical condition
    if ('operator' in condition && 'conditions' in condition) {
      return this.evaluateConditions(condition as LogicalCondition, context);
    }

    // Otherwise, it's a simple condition
    return this.evaluateSimpleCondition(condition as Condition, context);
  }

  /**
   * Evaluate a simple condition
   */
  private async evaluateSimpleCondition(
    condition: Condition,
    context: PolicyContext,
  ): Promise<boolean> {
    const actualValue = this.extractAttributeValue(condition.attribute, context);
    const expectedValue = condition.value;

    return this.compareValues(actualValue, condition.operator, expectedValue);
  }

  /**
   * Extract attribute value from context
   */
  private extractAttributeValue(attribute: { source: string; key: string }, context: PolicyContext): any {
    const sourceMap: Record<string, Record<string, any>> = {
      user: context.user,
      resource: context.resource,
      environment: context.environment,
      action: { value: context.action },
    };

    const source = sourceMap[attribute.source];
    if (!source) {
      return undefined;
    }

    // Support nested keys with dot notation (e.g., "user.department")
    const keys = attribute.key.split('.');
    let value: any = source;

    for (const key of keys) {
      if (value && typeof value === 'object') {
        value = value[key];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Compare values using the specified operator
   */
  private compareValues(actual: any, operator: ComparisonOperator, expected: any): boolean {
    switch (operator) {
      case ComparisonOperator.EQUALS:
        return actual === expected;

      case ComparisonOperator.NOT_EQUALS:
        return actual !== expected;

      case ComparisonOperator.GREATER_THAN:
        return actual > expected;

      case ComparisonOperator.GREATER_THAN_OR_EQUAL:
        return actual >= expected;

      case ComparisonOperator.LESS_THAN:
        return actual < expected;

      case ComparisonOperator.LESS_THAN_OR_EQUAL:
        return actual <= expected;

      case ComparisonOperator.IN:
        return Array.isArray(expected) && expected.includes(actual);

      case ComparisonOperator.NOT_IN:
        return Array.isArray(expected) && !expected.includes(actual);

      case ComparisonOperator.CONTAINS:
        if (typeof actual === 'string' && typeof expected === 'string') {
          return actual.includes(expected);
        }
        if (Array.isArray(actual)) {
          return actual.includes(expected);
        }
        return false;

      case ComparisonOperator.MATCHES:
        if (typeof actual === 'string' && typeof expected === 'string') {
          try {
            const regex = new RegExp(expected);
            return regex.test(actual);
          } catch {
            return false;
          }
        }
        return false;

      default:
        throw new Error(`Unsupported comparison operator: ${operator}`);
    }
  }
}
