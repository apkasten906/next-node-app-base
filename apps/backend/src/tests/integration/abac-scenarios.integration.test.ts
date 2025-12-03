import { AttributeSource, ComparisonOperator, LogicalOperator, PolicyEffect } from '@repo/types';
import { beforeEach, describe, expect, it } from 'vitest';

import { container } from '../../container';
import { AuthorizationService } from '../../services/auth/authorization.service';
import { InMemoryPolicyStore } from '../../services/auth/policy-store.service';

describe('ABAC Scenarios - Integration', () => {
  let authService: AuthorizationService;
  let policyStore: InMemoryPolicyStore;

  beforeEach(async () => {
    authService = container.resolve(AuthorizationService);
    policyStore = container.resolve(InMemoryPolicyStore);
    await authService.resetForTests();
    await policyStore.reset();
  });

  describe('Scenario 1: Department-Based Access', () => {
    it('should allow HR department to access employee records', async () => {
      // Create policy allowing HR to read employee records
      await policyStore.createPolicy({
        name: 'HR Employee Access',
        description: 'HR can access employee records',
        version: '1.0',
        enabled: true,
        rules: [
          {
            id: 'hr-rule',
            conditions: {
              operator: LogicalOperator.AND,
              conditions: [
                {
                  attribute: { source: AttributeSource.USER, key: 'department' },
                  operator: ComparisonOperator.EQUALS,
                  value: 'HR',
                },
              ],
            },
            effect: PolicyEffect.ALLOW,
          },
        ],
      });

      const allowed = await authService.canAccessWithContext({
        userId: 'user-123',
        resource: 'employee',
        action: 'read',
        userAttributes: { id: 'user-123', department: 'HR' },
        resourceAttributes: { id: 'emp-456', type: 'employee' },
      });

      expect(allowed).toBe(true);
    });

    it('should deny non-HR department access to employee records', async () => {
      // Create policy allowing HR to read employee records
      await policyStore.createPolicy({
        name: 'HR Employee Access',
        description: 'HR can access employee records',
        version: '1.0',
        enabled: true,
        rules: [
          {
            id: 'hr-rule-2',
            conditions: {
              operator: LogicalOperator.AND,
              conditions: [
                {
                  attribute: { source: AttributeSource.USER, key: 'department' },
                  operator: ComparisonOperator.EQUALS,
                  value: 'HR',
                },
              ],
            },
            effect: PolicyEffect.ALLOW,
          },
        ],
      });

      const allowed = await authService.canAccessWithContext({
        userId: 'user-456',
        resource: 'employee',
        action: 'read',
        userAttributes: { id: 'user-456', department: 'Engineering' },
        resourceAttributes: { id: 'emp-789', type: 'employee' },
      });

      expect(allowed).toBe(false);
    });
  });

  describe('Scenario 2: Resource State-Based Access', () => {
    it('should allow editing draft documents', async () => {
      // Policy allowing editing of draft documents
      await policyStore.createPolicy({
        name: 'Draft Document Editing',
        description: 'Allow editing of draft documents',
        version: '1.0',
        enabled: true,
        rules: [
          {
            id: 'draft-edit-rule',
            conditions: {
              operator: LogicalOperator.AND,
              conditions: [
                {
                  attribute: { source: AttributeSource.RESOURCE, key: 'status' },
                  operator: ComparisonOperator.EQUALS,
                  value: 'draft',
                },
              ],
            },
            effect: PolicyEffect.ALLOW,
          },
        ],
      });

      const allowed = await authService.canAccessWithContext({
        userId: 'user-123',
        resource: 'document',
        action: 'edit',
        userAttributes: { id: 'user-123', role: 'editor' },
        resourceAttributes: { id: 'doc-123', type: 'document', status: 'draft' },
      });

      expect(allowed).toBe(true);
    });

    it('should deny editing published documents', async () => {
      // Policy denying editing of published documents
      await policyStore.createPolicy({
        name: 'Published Document Protection',
        description: 'Deny editing of published documents',
        version: '1.0',
        enabled: true,
        rules: [
          {
            id: 'published-deny-rule',
            conditions: {
              operator: LogicalOperator.AND,
              conditions: [
                {
                  attribute: { source: AttributeSource.RESOURCE, key: 'status' },
                  operator: ComparisonOperator.EQUALS,
                  value: 'published',
                },
              ],
            },
            effect: PolicyEffect.DENY,
          },
        ],
      });

      const allowed = await authService.canAccessWithContext({
        userId: 'user-123',
        resource: 'document',
        action: 'edit',
        userAttributes: { id: 'user-123', role: 'editor' },
        resourceAttributes: { id: 'doc-456', type: 'document', status: 'published' },
      });

      expect(allowed).toBe(false);
    });
  });

  describe('Scenario 3: Location-Based Access Control', () => {
    it('should allow access from corporate network', async () => {
      // Policy allowing access from corporate IP range
      await policyStore.createPolicy({
        name: 'Corporate Network Access',
        description: 'Allow access from corporate network',
        version: '1.0',
        enabled: true,
        rules: [
          {
            id: 'corporate-network-rule',
            conditions: {
              operator: LogicalOperator.AND,
              conditions: [
                {
                  attribute: { source: AttributeSource.ENVIRONMENT, key: 'ipAddress' },
                  operator: ComparisonOperator.MATCHES,
                  value: '^10\\.0\\..*',
                },
              ],
            },
            effect: PolicyEffect.ALLOW,
          },
        ],
      });

      const allowed = await authService.canAccessWithContext({
        userId: 'user-123',
        resource: 'sensitive-data',
        action: 'read',
        userAttributes: { id: 'user-123', role: 'employee' },
        resourceAttributes: { id: 'data-123', type: 'sensitive-data' },
        environmentAttributes: { ipAddress: '10.0.1.50' },
      });

      expect(allowed).toBe(true);
    });

    it('should deny access from external network', async () => {
      // Policy allowing access from corporate IP range
      await policyStore.createPolicy({
        name: 'Corporate Network Access',
        description: 'Allow access from corporate network only',
        version: '1.0',
        enabled: true,
        rules: [
          {
            id: 'corporate-network-rule-2',
            conditions: {
              operator: LogicalOperator.AND,
              conditions: [
                {
                  attribute: { source: AttributeSource.ENVIRONMENT, key: 'ipAddress' },
                  operator: ComparisonOperator.MATCHES,
                  value: '^10\\.0\\..*',
                },
              ],
            },
            effect: PolicyEffect.ALLOW,
          },
        ],
      });

      const allowed = await authService.canAccessWithContext({
        userId: 'user-123',
        resource: 'sensitive-data',
        action: 'read',
        userAttributes: { id: 'user-123', role: 'employee' },
        resourceAttributes: { id: 'data-123', type: 'sensitive-data' },
        environmentAttributes: { ipAddress: '203.0.113.5' },
      });

      expect(allowed).toBe(false);
    });
  });

  describe('Scenario 4: Multi-Factor Access Control', () => {
    it('should allow access with sufficient clearance and MFA', async () => {
      // Policy requiring both clearance level and MFA
      await policyStore.createPolicy({
        name: 'High Security Access',
        description: 'Require clearance and MFA',
        version: '1.0',
        enabled: true,
        rules: [
          {
            id: 'high-security-rule',
            conditions: {
              operator: LogicalOperator.AND,
              conditions: [
                {
                  attribute: { source: AttributeSource.USER, key: 'clearanceLevel' },
                  operator: ComparisonOperator.GREATER_THAN_OR_EQUAL,
                  value: 3,
                },
                {
                  attribute: { source: AttributeSource.ENVIRONMENT, key: 'mfaVerified' },
                  operator: ComparisonOperator.EQUALS,
                  value: true,
                },
              ],
            },
            effect: PolicyEffect.ALLOW,
          },
        ],
      });

      const allowed = await authService.canAccessWithContext({
        userId: 'user-123',
        resource: 'classified-document',
        action: 'read',
        userAttributes: { id: 'user-123', clearanceLevel: 3 },
        resourceAttributes: { id: 'doc-secret', type: 'classified-document' },
        environmentAttributes: { mfaVerified: true },
      });

      expect(allowed).toBe(true);
    });

    it('should deny access without MFA verification', async () => {
      // Policy requiring both clearance level and MFA
      await policyStore.createPolicy({
        name: 'High Security Access',
        description: 'Require clearance and MFA',
        version: '1.0',
        enabled: true,
        rules: [
          {
            id: 'high-security-rule-2',
            conditions: {
              operator: LogicalOperator.AND,
              conditions: [
                {
                  attribute: { source: AttributeSource.USER, key: 'clearanceLevel' },
                  operator: ComparisonOperator.GREATER_THAN_OR_EQUAL,
                  value: 3,
                },
                {
                  attribute: { source: AttributeSource.ENVIRONMENT, key: 'mfaVerified' },
                  operator: ComparisonOperator.EQUALS,
                  value: true,
                },
              ],
            },
            effect: PolicyEffect.ALLOW,
          },
        ],
      });

      const allowed = await authService.canAccessWithContext({
        userId: 'user-123',
        resource: 'classified-document',
        action: 'read',
        userAttributes: { id: 'user-123', clearanceLevel: 4 },
        resourceAttributes: { id: 'doc-secret', type: 'classified-document' },
        environmentAttributes: { mfaVerified: false },
      });

      expect(allowed).toBe(false);
    });
  });

  describe('Scenario 5: Time-Window Access', () => {
    it('should allow access during permitted hours', async () => {
      // Policy allowing access during business hours (9-17, weekdays)
      await policyStore.createPolicy({
        name: 'Business Hours Access',
        description: 'Allow access during business hours',
        version: '1.0',
        enabled: true,
        rules: [
          {
            id: 'business-hours-rule',
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
      });

      const allowed = await authService.canAccessWithContext({
        userId: 'user-123',
        resource: 'resource',
        action: 'read',
        userAttributes: { id: 'user-123' },
        resourceAttributes: { id: 'res-123' },
        environmentAttributes: { hour: 14, dayOfWeek: 3 },
      });

      expect(allowed).toBe(true);
    });

    it('should deny access outside business hours', async () => {
      // Policy allowing access during business hours (9-17, weekdays)
      await policyStore.createPolicy({
        name: 'Business Hours Access',
        description: 'Allow access during business hours',
        version: '1.0',
        enabled: true,
        rules: [
          {
            id: 'business-hours-rule-2',
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
      });

      const allowed = await authService.canAccessWithContext({
        userId: 'user-123',
        resource: 'resource',
        action: 'read',
        userAttributes: { id: 'user-123' },
        resourceAttributes: { id: 'res-123' },
        environmentAttributes: { hour: 22, dayOfWeek: 6 },
      });

      expect(allowed).toBe(false);
    });
  });

  describe('Scenario 6: Combined RBAC and ABAC', () => {
    it('should allow when both RBAC and ABAC conditions are met', async () => {
      // Policy combining role check (RBAC) and attribute check (ABAC)
      await policyStore.createPolicy({
        name: 'Manager Department Access',
        description: 'Managers can access their department data',
        version: '1.0',
        enabled: true,
        rules: [
          {
            id: 'manager-dept-rule',
            conditions: {
              operator: LogicalOperator.AND,
              conditions: [
                {
                  attribute: { source: AttributeSource.USER, key: 'role' },
                  operator: ComparisonOperator.EQUALS,
                  value: 'manager',
                },
                {
                  attribute: { source: AttributeSource.USER, key: 'department' },
                  operator: ComparisonOperator.EQUALS,
                  value: 'Sales',
                },
              ],
            },
            effect: PolicyEffect.ALLOW,
          },
        ],
      });

      const allowed = await authService.canAccessWithContext({
        userId: 'user-123',
        resource: 'department-data',
        action: 'read',
        userAttributes: { id: 'user-123', role: 'manager', department: 'Sales' },
        resourceAttributes: { id: 'data-123', type: 'department-data' },
      });

      expect(allowed).toBe(true);
    });

    it('should deny when RBAC permits but ABAC denies', async () => {
      // Policy combining role check (RBAC) and attribute check (ABAC)
      await policyStore.createPolicy({
        name: 'Manager Department Access',
        description: 'Managers can access their department data',
        version: '1.0',
        enabled: true,
        rules: [
          {
            id: 'manager-dept-rule-2',
            conditions: {
              operator: LogicalOperator.AND,
              conditions: [
                {
                  attribute: { source: AttributeSource.USER, key: 'role' },
                  operator: ComparisonOperator.EQUALS,
                  value: 'manager',
                },
                {
                  attribute: { source: AttributeSource.USER, key: 'department' },
                  operator: ComparisonOperator.EQUALS,
                  value: 'Sales',
                },
              ],
            },
            effect: PolicyEffect.ALLOW,
          },
        ],
      });

      const allowed = await authService.canAccessWithContext({
        userId: 'user-456',
        resource: 'department-data',
        action: 'read',
        userAttributes: { id: 'user-456', role: 'manager', department: 'Engineering' },
        resourceAttributes: { id: 'data-456', type: 'department-data' },
      });

      expect(allowed).toBe(false);
    });
  });

  describe('Scenario 7: Deny Overrides', () => {
    it('should enforce deny-overrides strategy', async () => {
      // Create ALLOW policy
      await policyStore.createPolicy({
        name: 'General Access',
        description: 'Allow general access',
        version: '1.0',
        enabled: true,
        rules: [
          {
            id: 'allow-rule',
            conditions: {
              operator: LogicalOperator.AND,
              conditions: [
                {
                  attribute: { source: AttributeSource.USER, key: 'role' },
                  operator: ComparisonOperator.EQUALS,
                  value: 'employee',
                },
              ],
            },
            effect: PolicyEffect.ALLOW,
          },
        ],
      });

      // Create DENY policy
      await policyStore.createPolicy({
        name: 'Restricted Access',
        description: 'Deny access to restricted resources',
        version: '1.0',
        enabled: true,
        rules: [
          {
            id: 'deny-rule',
            conditions: {
              operator: LogicalOperator.AND,
              conditions: [
                {
                  attribute: { source: AttributeSource.RESOURCE, key: 'restricted' },
                  operator: ComparisonOperator.EQUALS,
                  value: true,
                },
              ],
            },
            effect: PolicyEffect.DENY,
          },
        ],
      });

      const allowed = await authService.canAccessWithContext({
        userId: 'user-123',
        resource: 'restricted-resource',
        action: 'read',
        userAttributes: { id: 'user-123', role: 'employee' },
        resourceAttributes: { id: 'res-999', type: 'restricted-resource', restricted: true },
      });

      // Should deny because deny-overrides strategy
      expect(allowed).toBe(false);
    });
  });
});
