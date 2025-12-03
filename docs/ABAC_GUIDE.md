# ABAC (Attribute-Based Access Control) Policy Engine

## Overview

The ABAC Policy Engine provides flexible, context-aware authorization beyond traditional RBAC. It allows defining complex access control policies based on attributes of users, resources, environment, and actions.

## Architecture

### Core Components

1. **PolicyEngine** - Evaluates policies against a given context
2. **PolicyStore** - Manages policy CRUD operations
3. **AuthorizationService** - Integrates ABAC with existing RBAC

### Key Interfaces

```typescript
// Policy structure
interface Policy {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  rules: PolicyRule[];
}

// Policy rule
interface PolicyRule {
  id: string;
  conditions: LogicalCondition;
  effect: PolicyEffect; // ALLOW or DENY
  priority?: number;
}

// Logical conditions
interface LogicalCondition {
  operator: LogicalOperator; // AND, OR, NOT
  conditions: (Condition | LogicalCondition)[];
}

// Simple condition
interface Condition {
  attribute: Attribute;
  operator: ComparisonOperator;
  value: any;
}

// Attribute reference
interface Attribute {
  source: AttributeSource; // USER, RESOURCE, ENVIRONMENT, ACTION
  key: string; // Supports dot notation (e.g., "user.department")
}
```

## Policy Evaluation

### Deny-Overrides Strategy

The PolicyEngine uses a deny-overrides strategy:

1. Evaluate all applicable policies
2. If any policy denies, access is **denied**
3. If at least one policy allows and none deny, access is **granted**
4. If no policies match, access is **denied** (default deny)

### Priority Handling

- Rules with higher priority are evaluated first
- Within a policy, deny rules take precedence over allow rules
- Across policies, any deny overrides all allows

## Usage Examples

### Example 1: Time-Based Access

Allow access only during business hours (9 AM - 5 PM):

```typescript
const policy: Policy = {
  name: 'Business Hours Access',
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
        ],
      },
      effect: PolicyEffect.ALLOW,
      priority: 10,
    },
  ],
};
```

### Example 2: Department-Based Access

Allow HR department to access employee records:

```typescript
const policy: Policy = {
  name: 'Department Access Control',
  enabled: true,
  rules: [
    {
      id: 'hr-department-rule',
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
};
```

### Example 3: Ownership-Based Access

Only document owners can edit draft documents:

```typescript
const policy: Policy = {
  name: 'Draft Document Access',
  enabled: true,
  rules: [
    {
      id: 'draft-owner-edit-rule',
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
            value: '${user.id}',
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
  ],
};
```

### Example 4: Location-Based Access

Deny sensitive actions from non-corporate networks:

```typescript
const policy: Policy = {
  name: 'Geographic Access Control',
  enabled: true,
  rules: [
    {
      id: 'sensitive-action-location-rule',
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
};
```

## Integration with AuthorizationService

### Backward-Compatible RBAC + ABAC

```typescript
// Legacy RBAC (still supported)
const allowed = await authService.canAccess(userId, 'posts', 'update');

// Full ABAC with context
const context: AuthorizationContext = {
  userId: 'user123',
  resource: 'posts',
  action: 'update',
  userAttributes: {
    id: 'user123',
    department: 'Engineering',
    role: 'senior-engineer',
  },
  resourceAttributes: {
    type: 'post',
    ownerId: 'user123',
    status: 'draft',
  },
  environmentAttributes: {
    hour: new Date().getHours(),
    ipAddress: request.ip,
    country: 'US',
  },
};

const allowed = await authService.canAccessWithContext(context);
```

### Evaluation Flow

1. **RBAC Check**: First evaluates using traditional RBAC permissions
2. **ABAC Fallback**: If RBAC denies, checks ABAC policies
3. **Audit Logging**: Logs both RBAC and ABAC evaluation results

## Operators

### Comparison Operators

- `EQUALS` (eq) - Strict equality
- `NOT_EQUALS` (ne) - Strict inequality
- `GREATER_THAN` (gt) - Numeric comparison
- `GREATER_THAN_OR_EQUAL` (gte) - Numeric comparison
- `LESS_THAN` (lt) - Numeric comparison
- `LESS_THAN_OR_EQUAL` (lte) - Numeric comparison
- `IN` (in) - Value in array
- `NOT_IN` (nin) - Value not in array
- `CONTAINS` (contains) - String/array contains check
- `MATCHES` (matches) - Regex pattern matching

### Logical Operators

- `AND` - All conditions must be true
- `OR` - At least one condition must be true
- `NOT` - Negates the condition result

## Attribute Sources

- `USER` - User attributes (department, role, level, etc.)
- `RESOURCE` - Resource attributes (type, status, ownerId, etc.)
- `ENVIRONMENT` - Environmental context (time, location, IP, etc.)
- `ACTION` - Action being performed (read, write, delete, etc.)

## Dot Notation Support

Attributes support nested property access using dot notation:

```typescript
{
  attribute: { source: AttributeSource.USER, key: 'profile.department.name' },
  operator: ComparisonOperator.EQUALS,
  value: 'Engineering'
}
```

## Policy Management

### Creating Policies

```typescript
const policy = await policyStore.createPolicy({
  name: 'My Policy',
  version: '1.0.0',
  enabled: true,
  rules: [
    /* rules */
  ],
});
```

### Listing Policies

```typescript
// All policies
const allPolicies = await policyStore.listPolicies();

// Enabled policies only
const enabledPolicies = await policyStore.listPolicies({ enabled: true });

// Policies with specific tags
const taggedPolicies = await policyStore.listPolicies({
  tags: ['security', 'compliance'],
});
```

### Updating Policies

```typescript
const updated = await policyStore.updatePolicy('policy-id', {
  enabled: false,
  version: '1.1.0',
});
```

### Deleting Policies

```typescript
const deleted = await policyStore.deletePolicy('policy-id');
```

## Best Practices

1. **Use Deny-Overrides**: Always use deny rules for security-critical restrictions
2. **Set Priorities**: Assign higher priorities to more restrictive rules
3. **Document Policies**: Add clear descriptions to policies and rules
4. **Version Control**: Maintain policy versions for auditability
5. **Test Thoroughly**: Create comprehensive tests for policy evaluation
6. **Monitor Performance**: ABAC evaluation can be slower than RBAC
7. **Cache Policies**: Use policy caching for frequently evaluated policies
8. **Audit Everything**: Enable audit logging for all access decisions

## Performance Considerations

- **Policy Count**: Limit number of active policies per resource
- **Condition Complexity**: Keep condition trees shallow when possible
- **Attribute Extraction**: Cache user/resource attributes when feasible
- **Priority Sorting**: Higher priority rules are evaluated first, allowing early exits
- **Regex Performance**: Use `MATCHES` operator sparingly (compile-time overhead)

## Security Considerations

1. **Default Deny**: System defaults to deny if no policies match
2. **Explicit Allows**: Require explicit allow rules for access
3. **Deny Overrides**: Deny rules always take precedence
4. **Audit Trail**: All evaluations are logged for compliance
5. **Policy Validation**: Validate policy syntax before deployment
6. **Access Control**: Restrict who can create/modify policies

## Future Enhancements

- [ ] Database-backed policy storage
- [ ] Policy versioning and rollback
- [ ] Policy conflict detection
- [ ] Policy simulation/testing UI
- [ ] Attribute caching layer
- [ ] Policy templates library
- [ ] Real-time policy updates
- [ ] Policy analytics and insights

## References

- [NIST ABAC Guide](https://csrc.nist.gov/publications/detail/sp/800-162/final)
- [XACML Standard](http://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-os-en.html)
- [AWS IAM Policy Evaluation Logic](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html)
