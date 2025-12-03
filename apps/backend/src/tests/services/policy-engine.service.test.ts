import {
  AttributeSource,
  ComparisonOperator,
  LogicalOperator,
  Policy,
  PolicyContext,
  PolicyEffect,
} from '@repo/types';
import { beforeEach, describe, expect, it } from 'vitest';

import { PolicyEngine } from '../../services/auth/policy-engine.service';

describe('PolicyEngine', () => {
  let policyEngine: PolicyEngine;

  beforeEach(() => {
    policyEngine = new PolicyEngine();
  });

  describe('Comparison Operators', () => {
    it('should evaluate EQUALS operator correctly', async () => {
      const context: PolicyContext = {
        user: { id: '123', role: 'admin' },
        resource: {},
        environment: {},
        action: 'read',
      };

      const policy: Policy = {
        id: 'policy-eq',
        name: 'EQ Test',
        version: '1.0',
        enabled: true,
        rules: [
          {
            id: 'rule-eq',
            conditions: {
              operator: LogicalOperator.AND,
              conditions: [
                {
                  attribute: { source: AttributeSource.USER, key: 'role' },
                  operator: ComparisonOperator.EQUALS,
                  value: 'admin',
                },
              ],
            },
            effect: PolicyEffect.ALLOW,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await policyEngine.evaluatePolicies([policy], context);
      expect(result.effect).toBe(PolicyEffect.ALLOW);
      expect(result.matchedRules).toContain('rule-eq');
    });

    it('should evaluate NOT_EQUALS operator correctly', async () => {
      const context: PolicyContext = {
        user: { id: '123', role: 'user' },
        resource: {},
        environment: {},
        action: 'read',
      };

      const policy: Policy = {
        id: 'policy-ne',
        name: 'NE Test',
        version: '1.0',
        enabled: true,
        rules: [
          {
            id: 'rule-ne',
            conditions: {
              operator: LogicalOperator.AND,
              conditions: [
                {
                  attribute: { source: AttributeSource.USER, key: 'role' },
                  operator: ComparisonOperator.NOT_EQUALS,
                  value: 'admin',
                },
              ],
            },
            effect: PolicyEffect.ALLOW,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await policyEngine.evaluatePolicies([policy], context);
      expect(result.effect).toBe(PolicyEffect.ALLOW);
    });

    it('should evaluate GREATER_THAN operator with numbers', async () => {
      const context: PolicyContext = {
        user: { id: '123', level: 5 },
        resource: {},
        environment: {},
        action: 'read',
      };

      const policy: Policy = {
        id: 'policy-gt',
        name: 'GT Test',
        version: '1.0',
        enabled: true,
        rules: [
          {
            id: 'rule-gt',
            conditions: {
              operator: LogicalOperator.AND,
              conditions: [
                {
                  attribute: { source: AttributeSource.USER, key: 'level' },
                  operator: ComparisonOperator.GREATER_THAN,
                  value: 3,
                },
              ],
            },
            effect: PolicyEffect.ALLOW,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await policyEngine.evaluatePolicies([policy], context);
      expect(result.effect).toBe(PolicyEffect.ALLOW);
    });

    it('should evaluate IN operator with arrays', async () => {
      const context: PolicyContext = {
        user: { id: '123', department: 'engineering' },
        resource: {},
        environment: {},
        action: 'read',
      };

      const policy: Policy = {
        id: 'policy-in',
        name: 'IN Test',
        version: '1.0',
        enabled: true,
        rules: [
          {
            id: 'rule-in',
            conditions: {
              operator: LogicalOperator.AND,
              conditions: [
                {
                  attribute: { source: AttributeSource.USER, key: 'department' },
                  operator: ComparisonOperator.IN,
                  value: ['engineering', 'product', 'design'],
                },
              ],
            },
            effect: PolicyEffect.ALLOW,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await policyEngine.evaluatePolicies([policy], context);
      expect(result.effect).toBe(PolicyEffect.ALLOW);
    });

    it('should evaluate CONTAINS operator', async () => {
      const context: PolicyContext = {
        user: { id: '123', tags: ['premium', 'verified'] },
        resource: {},
        environment: {},
        action: 'read',
      };

      const policy: Policy = {
        id: 'policy-contains',
        name: 'CONTAINS Test',
        version: '1.0',
        enabled: true,
        rules: [
          {
            id: 'rule-contains',
            conditions: {
              operator: LogicalOperator.AND,
              conditions: [
                {
                  attribute: { source: AttributeSource.USER, key: 'tags' },
                  operator: ComparisonOperator.CONTAINS,
                  value: 'premium',
                },
              ],
            },
            effect: PolicyEffect.ALLOW,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await policyEngine.evaluatePolicies([policy], context);
      expect(result.effect).toBe(PolicyEffect.ALLOW);
    });

    it('should evaluate MATCHES operator with regex', async () => {
      const context: PolicyContext = {
        user: { id: '123', email: 'admin@company.com' },
        resource: {},
        environment: {},
        action: 'read',
      };

      const policy: Policy = {
        id: 'policy-matches',
        name: 'MATCHES Test',
        version: '1.0',
        enabled: true,
        rules: [
          {
            id: 'rule-matches',
            conditions: {
              operator: LogicalOperator.AND,
              conditions: [
                {
                  attribute: { source: AttributeSource.USER, key: 'email' },
                  operator: ComparisonOperator.MATCHES,
                  value: '^admin@.*',
                },
              ],
            },
            effect: PolicyEffect.ALLOW,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await policyEngine.evaluatePolicies([policy], context);
      expect(result.effect).toBe(PolicyEffect.ALLOW);
    });
  });

  describe('Logical Operators', () => {
    it('should evaluate AND conditions (all must be true)', async () => {
      const context: PolicyContext = {
        user: { id: '123', role: 'admin', level: 5 },
        resource: {},
        environment: {},
        action: 'read',
      };

      const policy: Policy = {
        id: 'policy-and',
        name: 'AND Test',
        version: '1.0',
        enabled: true,
        rules: [
          {
            id: 'rule-and',
            conditions: {
              operator: LogicalOperator.AND,
              conditions: [
                {
                  attribute: { source: AttributeSource.USER, key: 'role' },
                  operator: ComparisonOperator.EQUALS,
                  value: 'admin',
                },
                {
                  attribute: { source: AttributeSource.USER, key: 'level' },
                  operator: ComparisonOperator.GREATER_THAN,
                  value: 3,
                },
              ],
            },
            effect: PolicyEffect.ALLOW,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await policyEngine.evaluatePolicies([policy], context);
      expect(result.effect).toBe(PolicyEffect.ALLOW);
    });

    it('should fail AND conditions when one is false', async () => {
      const context: PolicyContext = {
        user: { id: '123', role: 'user', level: 5 },
        resource: {},
        environment: {},
        action: 'read',
      };

      const policy: Policy = {
        id: 'policy-and-fail',
        name: 'AND Fail Test',
        version: '1.0',
        enabled: true,
        rules: [
          {
            id: 'rule-and-fail',
            conditions: {
              operator: LogicalOperator.AND,
              conditions: [
                {
                  attribute: { source: AttributeSource.USER, key: 'role' },
                  operator: ComparisonOperator.EQUALS,
                  value: 'admin',
                },
                {
                  attribute: { source: AttributeSource.USER, key: 'level' },
                  operator: ComparisonOperator.GREATER_THAN,
                  value: 3,
                },
              ],
            },
            effect: PolicyEffect.ALLOW,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await policyEngine.evaluatePolicies([policy], context);
      expect(result.effect).toBe(PolicyEffect.DENY);
    });

    it('should evaluate OR conditions (at least one must be true)', async () => {
      const context: PolicyContext = {
        user: { id: '123', role: 'user', isAdmin: true },
        resource: {},
        environment: {},
        action: 'read',
      };

      const policy: Policy = {
        id: 'policy-or',
        name: 'OR Test',
        version: '1.0',
        enabled: true,
        rules: [
          {
            id: 'rule-or',
            conditions: {
              operator: LogicalOperator.OR,
              conditions: [
                {
                  attribute: { source: AttributeSource.USER, key: 'role' },
                  operator: ComparisonOperator.EQUALS,
                  value: 'admin',
                },
                {
                  attribute: { source: AttributeSource.USER, key: 'isAdmin' },
                  operator: ComparisonOperator.EQUALS,
                  value: true,
                },
              ],
            },
            effect: PolicyEffect.ALLOW,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await policyEngine.evaluatePolicies([policy], context);
      expect(result.effect).toBe(PolicyEffect.ALLOW);
    });

    it('should evaluate NOT conditions (negation)', async () => {
      const context: PolicyContext = {
        user: { id: '123', role: 'user' },
        resource: {},
        environment: {},
        action: 'read',
      };

      const policy: Policy = {
        id: 'policy-not',
        name: 'NOT Test',
        version: '1.0',
        enabled: true,
        rules: [
          {
            id: 'rule-not',
            conditions: {
              operator: LogicalOperator.NOT,
              conditions: [
                {
                  attribute: { source: AttributeSource.USER, key: 'role' },
                  operator: ComparisonOperator.EQUALS,
                  value: 'admin',
                },
              ],
            },
            effect: PolicyEffect.ALLOW,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await policyEngine.evaluatePolicies([policy], context);
      expect(result.effect).toBe(PolicyEffect.ALLOW);
    });

    it('should handle nested logical conditions', async () => {
      const context: PolicyContext = {
        user: { id: '123', role: 'manager', department: 'engineering', level: 5 },
        resource: {},
        environment: {},
        action: 'read',
      };

      const policy: Policy = {
        id: 'policy-nested',
        name: 'Nested Test',
        version: '1.0',
        enabled: true,
        rules: [
          {
            id: 'rule-nested',
            conditions: {
              operator: LogicalOperator.AND,
              conditions: [
                {
                  // Nested OR within AND
                  operator: LogicalOperator.OR,
                  conditions: [
                    {
                      attribute: { source: AttributeSource.USER, key: 'role' },
                      operator: ComparisonOperator.EQUALS,
                      value: 'admin',
                    },
                    {
                      attribute: { source: AttributeSource.USER, key: 'role' },
                      operator: ComparisonOperator.EQUALS,
                      value: 'manager',
                    },
                  ],
                },
                {
                  attribute: { source: AttributeSource.USER, key: 'department' },
                  operator: ComparisonOperator.EQUALS,
                  value: 'engineering',
                },
              ],
            },
            effect: PolicyEffect.ALLOW,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await policyEngine.evaluatePolicies([policy], context);
      expect(result.effect).toBe(PolicyEffect.ALLOW);
    });
  });

  describe('Policy Evaluation', () => {
    it('should deny access when DENY policy matches (deny-overrides)', async () => {
      const context: PolicyContext = {
        user: { id: '123', role: 'admin' },
        resource: {},
        environment: {},
        action: 'delete',
      };

      const allowPolicy: Policy = {
        id: 'policy-allow',
        name: 'Allow Policy',
        version: '1.0',
        enabled: true,
        rules: [
          {
            id: 'rule-allow',
            conditions: {
              operator: LogicalOperator.AND,
              conditions: [
                {
                  attribute: { source: AttributeSource.USER, key: 'role' },
                  operator: ComparisonOperator.EQUALS,
                  value: 'admin',
                },
              ],
            },
            effect: PolicyEffect.ALLOW,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const denyPolicy: Policy = {
        id: 'policy-deny',
        name: 'Deny Policy',
        version: '1.0',
        enabled: true,
        rules: [
          {
            id: 'rule-deny',
            conditions: {
              operator: LogicalOperator.AND,
              conditions: [
                {
                  attribute: { source: AttributeSource.ACTION, key: 'value' },
                  operator: ComparisonOperator.EQUALS,
                  value: 'delete',
                },
              ],
            },
            effect: PolicyEffect.DENY,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await policyEngine.evaluatePolicies([allowPolicy, denyPolicy], context);
      expect(result.effect).toBe(PolicyEffect.DENY);
      expect(result.reason).toContain('denied');
    });

    it('should deny access when no policies match (default deny)', async () => {
      const context: PolicyContext = {
        user: { id: '123', role: 'guest' },
        resource: {},
        environment: {},
        action: 'read',
      };

      const policy: Policy = {
        id: 'policy-no-match',
        name: 'No Match Policy',
        version: '1.0',
        enabled: true,
        rules: [
          {
            id: 'rule-no-match',
            conditions: {
              operator: LogicalOperator.AND,
              conditions: [
                {
                  attribute: { source: AttributeSource.USER, key: 'role' },
                  operator: ComparisonOperator.EQUALS,
                  value: 'admin',
                },
              ],
            },
            effect: PolicyEffect.ALLOW,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await policyEngine.evaluatePolicies([policy], context);
      expect(result.effect).toBe(PolicyEffect.DENY);
    });

    it('should respect rule priority ordering', async () => {
      const context: PolicyContext = {
        user: { id: '123', role: 'admin' },
        resource: {},
        environment: {},
        action: 'read',
      };

      const policy: Policy = {
        id: 'policy-priority',
        name: 'Priority Policy',
        version: '1.0',
        enabled: true,
        rules: [
          {
            id: 'rule-low-priority',
            priority: 1,
            conditions: {
              operator: LogicalOperator.AND,
              conditions: [
                {
                  attribute: { source: AttributeSource.USER, key: 'role' },
                  operator: ComparisonOperator.EQUALS,
                  value: 'admin',
                },
              ],
            },
            effect: PolicyEffect.ALLOW,
          },
          {
            id: 'rule-high-priority',
            priority: 100,
            conditions: {
              operator: LogicalOperator.AND,
              conditions: [
                {
                  attribute: { source: AttributeSource.USER, key: 'role' },
                  operator: ComparisonOperator.EQUALS,
                  value: 'admin',
                },
              ],
            },
            effect: PolicyEffect.DENY,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await policyEngine.evaluatePolicies([policy], context);
      expect(result.effect).toBe(PolicyEffect.DENY);
      expect(result.matchedRules[0]).toBe('rule-high-priority');
    });

    it('should not evaluate disabled policies', async () => {
      const context: PolicyContext = {
        user: { id: '123', role: 'admin' },
        resource: {},
        environment: {},
        action: 'read',
      };

      const policy: Policy = {
        id: 'policy-disabled',
        name: 'Disabled Policy',
        version: '1.0',
        enabled: false,
        rules: [
          {
            id: 'rule-disabled',
            conditions: {
              operator: LogicalOperator.AND,
              conditions: [
                {
                  attribute: { source: AttributeSource.USER, key: 'role' },
                  operator: ComparisonOperator.EQUALS,
                  value: 'admin',
                },
              ],
            },
            effect: PolicyEffect.ALLOW,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await policyEngine.evaluatePolicies([policy], context);
      expect(result.effect).toBe(PolicyEffect.DENY);
      expect(result.matchedRules).toHaveLength(0);
    });
  });

  describe('Time-Based Access', () => {
    it('should allow access during business hours', async () => {
      // Wednesday at 2 PM
      const businessHour = new Date('2024-01-10T14:00:00Z');
      const context: PolicyContext = {
        user: { id: '123', role: 'user' },
        resource: {},
        environment: { currentTime: businessHour.toISOString(), dayOfWeek: 3, hour: 14 },
        action: 'read',
      };

      const policy: Policy = {
        id: 'policy-business-hours',
        name: 'Business Hours Policy',
        version: '1.0',
        enabled: true,
        rules: [
          {
            id: 'rule-business-hours',
            conditions: {
              operator: LogicalOperator.AND,
              conditions: [
                {
                  attribute: { source: AttributeSource.ENVIRONMENT, key: 'hour' },
                  operator: ComparisonOperator.GREATER_THAN_OR_EQUAL,
                  value: 9,
                },
                {
                  attribute: { source: AttributeSource.ENVIRONMENT, key: 'hour' },
                  operator: ComparisonOperator.LESS_THAN,
                  value: 17,
                },
                {
                  attribute: { source: AttributeSource.ENVIRONMENT, key: 'dayOfWeek' },
                  operator: ComparisonOperator.IN,
                  value: [1, 2, 3, 4, 5],
                },
              ],
            },
            effect: PolicyEffect.ALLOW,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await policyEngine.evaluatePolicies([policy], context);
      expect(result.effect).toBe(PolicyEffect.ALLOW);
    });

    it('should deny access outside business hours', async () => {
      // Saturday at 10 PM
      const afterHours = new Date('2024-01-13T22:00:00Z');
      const context: PolicyContext = {
        user: { id: '123', role: 'user' },
        resource: {},
        environment: { currentTime: afterHours.toISOString(), dayOfWeek: 6, hour: 22 },
        action: 'read',
      };

      const policy: Policy = {
        id: 'policy-business-hours-deny',
        name: 'Business Hours Policy',
        version: '1.0',
        enabled: true,
        rules: [
          {
            id: 'rule-business-hours-deny',
            conditions: {
              operator: LogicalOperator.AND,
              conditions: [
                {
                  attribute: { source: AttributeSource.ENVIRONMENT, key: 'hour' },
                  operator: ComparisonOperator.GREATER_THAN_OR_EQUAL,
                  value: 9,
                },
                {
                  attribute: { source: AttributeSource.ENVIRONMENT, key: 'hour' },
                  operator: ComparisonOperator.LESS_THAN,
                  value: 17,
                },
                {
                  attribute: { source: AttributeSource.ENVIRONMENT, key: 'dayOfWeek' },
                  operator: ComparisonOperator.IN,
                  value: [1, 2, 3, 4, 5],
                },
              ],
            },
            effect: PolicyEffect.ALLOW,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await policyEngine.evaluatePolicies([policy], context);
      expect(result.effect).toBe(PolicyEffect.DENY);
    });
  });
});
