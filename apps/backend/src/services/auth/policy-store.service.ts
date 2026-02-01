import { randomUUID } from 'crypto';

import {
  AttributeSource,
  ComparisonOperator,
  IPolicyStore,
  LogicalOperator,
  Policy,
  PolicyContext,
  PolicyEffect,
} from '@repo/types';
import { injectable } from 'tsyringe';

/**
 * In-memory policy store for development
 * Database-ready interface for future implementation
 */
@injectable()
export class InMemoryPolicyStore implements IPolicyStore {
  private policies: Map<string, Policy> = new Map();

  /**
   * Create a new policy
   */
  async createPolicy(policy: Omit<Policy, 'id' | 'createdAt' | 'updatedAt'>): Promise<Policy> {
    const now = new Date();
    const newPolicy: Policy = {
      ...policy,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    this.policies.set(newPolicy.id, newPolicy);
    return newPolicy;
  }

  /**
   * Get policy by ID
   */
  async getPolicy(id: string): Promise<Policy | null> {
    return this.policies.get(id) ?? null;
  }

  /**
   * List all policies
   */
  async listPolicies(filter?: { enabled?: boolean; tags?: string[] }): Promise<Policy[]> {
    let policies = Array.from(this.policies.values());

    if (filter?.enabled !== undefined) {
      policies = policies.filter((p) => p.enabled === filter.enabled);
    }

    if (filter?.tags && filter.tags.length > 0) {
      policies = policies.filter((p) => {
        if (!p.tags || p.tags.length === 0) {
          return false;
        }
        return filter.tags!.some((tag) => p.tags!.includes(tag));
      });
    }

    return policies;
  }

  /**
   * Update existing policy
   */
  async updatePolicy(
    id: string,
    updates: Partial<Omit<Policy, 'id' | 'createdAt'>>
  ): Promise<Policy> {
    const existing = this.policies.get(id);
    if (!existing) {
      throw new Error(`Policy not found: ${id}`);
    }

    const updated: Policy = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    this.policies.set(id, updated);
    return updated;
  }

  /**
   * Delete policy
   */
  async deletePolicy(id: string): Promise<boolean> {
    return this.policies.delete(id);
  }

  /**
   * Find policies applicable to a given context
   * For now, returns all enabled policies
   * In a real implementation, this could filter by action, resource type, etc.
   */
  async findApplicablePolicies(_context: PolicyContext): Promise<Policy[]> {
    return this.listPolicies({ enabled: true });
  }

  /**
   * Reset all policies (for testing)
   */
  async reset(): Promise<void> {
    this.policies.clear();
  }

  /**
   * Initialize with example policies
   */
  async initializeExamplePolicies(): Promise<void> {
    // Example 1: Time-based access (business hours only)
    await this.createPolicy({
      name: 'Business Hours Access',
      description: 'Allow access only during business hours (9 AM - 5 PM)',
      version: '1.0.0',
      enabled: true,
      tags: ['time-based', 'example'],
      rules: [
        {
          id: 'business-hours-rule',
          description: 'Check if current time is within business hours',
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
            ],
          },
          effect: PolicyEffect.ALLOW,
          priority: 10,
        },
      ],
    });

    // Example 2: Department-based access
    await this.createPolicy({
      name: 'Department Access Control',
      description: 'Allow access based on user department',
      version: '1.0.0',
      enabled: true,
      tags: ['department', 'example'],
      rules: [
        {
          id: 'hr-department-rule',
          description: 'HR department can access employee records',
          conditions: {
            operator: LogicalOperator.AND,
            conditions: [
              {
                attribute: { source: AttributeSource.USER, key: 'department' },
                operator: ComparisonOperator.EQUALS,
                value: 'HR',
              },
              {
                attribute: { source: AttributeSource.ACTION, key: 'value' },
                operator: ComparisonOperator.IN,
                value: ['read', 'update', 'create'],
              },
              {
                attribute: { source: AttributeSource.RESOURCE, key: 'type' },
                operator: ComparisonOperator.EQUALS,
                value: 'employee',
              },
            ],
          },
          effect: PolicyEffect.ALLOW,
          priority: 20,
        },
      ],
    });

    // Example 3: Resource state-based access
    await this.createPolicy({
      name: 'Draft Document Access',
      description: 'Only document owners can edit draft documents',
      version: '1.0.0',
      enabled: true,
      tags: ['ownership', 'state-based', 'example'],
      rules: [
        {
          id: 'draft-owner-edit-rule',
          description: 'Owners can edit draft documents',
          conditions: {
            operator: LogicalOperator.AND,
            conditions: [
              {
                attribute: { source: AttributeSource.RESOURCE, key: 'status' },
                operator: ComparisonOperator.EQUALS,
                value: 'draft',
              },
              {
                attribute: { source: AttributeSource.RESOURCE, key: 'ownerId' },
                operator: ComparisonOperator.EQUALS,
                value: '${user.id}', // Special syntax for comparing with user context
              },
              {
                attribute: { source: AttributeSource.ACTION, key: 'value' },
                operator: ComparisonOperator.EQUALS,
                value: 'update',
              },
            ],
          },
          effect: PolicyEffect.ALLOW,
          priority: 30,
        },
        {
          id: 'published-no-edit-rule',
          description: 'Published documents cannot be edited',
          conditions: {
            operator: LogicalOperator.AND,
            conditions: [
              {
                attribute: { source: AttributeSource.RESOURCE, key: 'status' },
                operator: ComparisonOperator.EQUALS,
                value: 'published',
              },
              {
                attribute: { source: AttributeSource.ACTION, key: 'value' },
                operator: ComparisonOperator.IN,
                value: ['update', 'delete'],
              },
            ],
          },
          effect: PolicyEffect.DENY,
          priority: 50, // Higher priority than allow rules
        },
      ],
    });

    // Example 4: Location-based access
    await this.createPolicy({
      name: 'Geographic Access Control',
      description: 'Restrict access based on user location',
      version: '1.0.0',
      enabled: true,
      tags: ['location', 'example'],
      rules: [
        {
          id: 'us-only-access-rule',
          description: 'Allow access only from US locations',
          conditions: {
            operator: LogicalOperator.AND,
            conditions: [
              {
                attribute: { source: AttributeSource.ENVIRONMENT, key: 'country' },
                operator: ComparisonOperator.IN,
                value: ['US', 'USA', 'United States'],
              },
            ],
          },
          effect: PolicyEffect.ALLOW,
          priority: 15,
        },
        {
          id: 'sensitive-action-location-rule',
          description: 'Deny sensitive actions from unknown locations',
          conditions: {
            operator: LogicalOperator.AND,
            conditions: [
              {
                attribute: { source: AttributeSource.ACTION, key: 'value' },
                operator: ComparisonOperator.IN,
                value: ['delete', 'export'],
              },
              {
                operator: LogicalOperator.NOT,
                conditions: [
                  {
                    attribute: { source: AttributeSource.ENVIRONMENT, key: 'ipAddress' },
                    operator: ComparisonOperator.MATCHES,
                    value: '^(10\\.|192\\.168\\.|172\\.(1[6-9]|2[0-9]|3[0-1])\\.)',
                  },
                ],
              },
            ],
          },
          effect: PolicyEffect.DENY,
          priority: 40,
        },
      ],
    });
  }
}
