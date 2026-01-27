# ADR 006: TypeScript Strict Mode

## Status

**Accepted** - November 20, 2025

Date: 2025-11-20

## Context

TypeScript provides various compiler options that affect type checking strictness. The project needs to balance:

- Type safety and correctness
- Developer productivity
- Code maintainability
- Refactoring confidence
- Runtime error prevention

### Requirements

- Maximum type safety
- Catch errors at compile time
- Self-documenting code
- Easier refactoring
- Better IDE support

## Decision

We will use **TypeScript strict mode** with all strict checks enabled.

### Configuration

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "allowUnusedLabels": false,
    "allowUnreachableCode": false
  }
}
```

## Strict Mode Flags

### Core Strict Flags (enabled by `strict: true`)

#### 1. noImplicitAny

```typescript
// ❌ Error: Parameter 'x' implicitly has 'any' type
function add(x, y) {
  return x + y;
}

// ✅ Fixed: Explicit types
function add(x: number, y: number): number {
  return x + y;
}
```

#### 2. strictNullChecks

```typescript
// ❌ Error: Object is possibly 'undefined'
function getUserName(user: User | undefined) {
  return user.name; // Error
}

// ✅ Fixed: Null check
function getUserName(user: User | undefined) {
  return user?.name ?? 'Guest';
}
```

#### 3. strictFunctionTypes

```typescript
// Ensures contravariance of function parameters
type EventHandler = (event: Event) => void;
type MouseEventHandler = (event: MouseEvent) => void;

// ❌ Error: MouseEventHandler not assignable to EventHandler
const handler: EventHandler = (event: MouseEvent) => {}; // Error

// ✅ Fixed: Correct variance
const handler: EventHandler = (event: Event) => {};
```

#### 4. strictPropertyInitialization

```typescript
class User {
  // ❌ Error: Property 'name' has no initializer
  name: string;

  // ✅ Fixed: Initialize or make optional
  email: string = '';
  age?: number;
  id: string;

  constructor(id: string) {
    this.id = id;
  }
}
```

#### 5. strictBindCallApply

```typescript
function greet(name: string, age: number) {
  console.log(`${name} is ${age}`);
}

// ❌ Error: Expected 2 arguments, got 1
greet.call(undefined, 'Alice'); // Error

// ✅ Fixed: Correct arguments
greet.call(undefined, 'Alice', 30);
```

#### 6. alwaysStrict

- Emits `"use strict"` in all files
- Enables strict mode semantics

### Additional Strict Flags (beyond `strict: true`)

#### 7. noUncheckedIndexedAccess

```typescript
const users = ['Alice', 'Bob'];

// ❌ Without flag: Type is string
const user = users[10]; // Type: string

// ✅ With flag: Type is string | undefined
const user = users[10]; // Type: string | undefined
if (user) {
  console.log(user.toUpperCase());
}
```

#### 8. noImplicitReturns

```typescript
// ❌ Error: Not all code paths return a value
function getValue(condition: boolean): number {
  if (condition) {
    return 42;
  }
  // Error: Missing return
}

// ✅ Fixed: All paths return
function getValue(condition: boolean): number {
  if (condition) {
    return 42;
  }
  return 0;
}
```

#### 9. noFallthroughCasesInSwitch

```typescript
// ❌ Error: Fallthrough case in switch
switch (value) {
  case 'a':
    doA();
  // Error: Fallthrough
  case 'b':
    doB();
    break;
}

// ✅ Fixed: Explicit break or comment
switch (value) {
  case 'a':
    doA();
    break;
  case 'b':
    doB();
    break;
}
```

#### 10. noUnusedLocals & noUnusedParameters

```typescript
// ❌ Error: Unused variable
function calculate(x: number, y: number) {
  const result = x + y; // Unused
  return x;
}

// ✅ Fixed: Remove or use
function calculate(x: number, y: number) {
  return x + y;
}

// ✅ Prefix with _ if intentionally unused
function handleEvent(_event: Event, data: unknown) {
  return processData(data);
}
```

## Consequences

### Positive

- ✅ **Fewer runtime errors**: Catch issues at compile time
- ✅ **Better IntelliSense**: More accurate autocomplete
- ✅ **Self-documenting**: Types serve as documentation
- ✅ **Easier refactoring**: Compiler catches breaking changes
- ✅ **Null safety**: Prevents null/undefined errors
- ✅ **Index safety**: Array/object access is safer
- ✅ **No dead code**: Unused code is flagged
- ✅ **Exhaustive checks**: Switch cases must be complete

### Negative

- ⚠️ **Initial overhead**: More type annotations required
- ⚠️ **Steeper learning curve**: Team needs TypeScript expertise
- ⚠️ **Slower development**: More time on type definitions
- ⚠️ **Migration effort**: Existing code may need fixes
- ⚠️ **Third-party types**: Some libraries have poor types

### Neutral

- 🔄 **Type assertions**: Sometimes needed for complex types
- 🔄 **Any usage**: Escaped with explicit `any` when necessary
- 🔄 **Generated code**: May need exclusions in tsconfig

## Alternatives Considered

### Alternative 1: Loose TypeScript

**Pros:**

- Faster initial development
- Easier migration from JavaScript
- Less type annotation overhead
- Gentler learning curve
- Fewer compiler errors

**Cons:**

- More runtime errors
- Less type safety
- Harder refactoring
- Poor IntelliSense
- Defeats purpose of TypeScript

**Why rejected:** TypeScript without strict mode provides minimal value over JavaScript. We want maximum type safety.

### Alternative 2: Gradual Strictness

**Pros:**

- Incremental adoption
- Team can learn gradually
- Less initial friction
- Easier migration

**Cons:**

- Inconsistent codebase
- Technical debt accumulates
- Unclear migration path
- May never reach strict mode

**Why rejected:** Starting strict is easier than migrating later. New project with no legacy code.

### Alternative 3: ESLint Only (No TypeScript)

**Pros:**

- No compilation step
- Simpler tooling
- Faster builds
- Standard JavaScript

**Cons:**

- No type safety
- Runtime errors
- Poor refactoring support
- Weaker IDE integration
- No compile-time checks

**Why rejected:** Type safety is critical for large-scale applications. ESLint cannot replace TypeScript.

## Best Practices

### 1. Avoid `any`

```typescript
// ❌ Avoid
function process(data: any) {
  return data.value;
}

// ✅ Use unknown or specific types
function process(data: unknown) {
  if (isValidData(data)) {
    return data.value;
  }
}
```

### 2. Use Type Guards

```typescript
function isUser(value: unknown): value is User {
  return typeof value === 'object' && value !== null && 'id' in value && 'email' in value;
}

function processUser(data: unknown) {
  if (isUser(data)) {
    // data is User here
    console.log(data.email);
  }
}
```

### 3. Leverage Utility Types

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
}

// Omit sensitive fields
type PublicUser = Omit<User, 'password'>;

// Make all optional
type PartialUser = Partial<User>;

// Make all required
type RequiredUser = Required<Partial<User>>;

// Pick specific fields
type UserCredentials = Pick<User, 'email' | 'password'>;
```

### 4. Non-Null Assertions (Use Sparingly)

```typescript
// ✅ Prefer null checks
function getName(user: User | null): string {
  return user?.name ?? 'Guest';
}

// ⚠️ Use ! only when certain
function getName(user: User | null): string {
  // Only if you're absolutely certain user is not null
  return user!.name;
}
```

### 5. Discriminated Unions

```typescript
type Result<T> = { success: true; data: T } | { success: false; error: string };

function handleResult<T>(result: Result<T>) {
  if (result.success) {
    // TypeScript knows this is success case
    console.log(result.data);
  } else {
    // TypeScript knows this is error case
    console.error(result.error);
  }
}
```

## Migration Strategy

For adding strict mode to existing projects:

1. **Enable incrementally**: Start with one strict flag at a time
2. **Fix one module**: Make one file strict-compliant
3. **Expand coverage**: Gradually add more files
4. **Use @ts-expect-error**: Temporarily suppress errors
5. **Track progress**: Monitor strict files vs total files

## Developer Experience

### IDE Support

- **VSCode**: Full IntelliSense and error highlighting
- **WebStorm**: Advanced type checking and refactoring
- **Vim/Neovim**: TypeScript LSP integration

### Error Messages

TypeScript provides detailed error messages:

```typescript
const user: User = getUser();
//    ~~~~
// Type 'undefined' is not assignable to type 'User'
```

## Performance Impact

- **Compilation**: ~10-20% slower with strict checks
- **Runtime**: No impact (types are erased)
- **IDE**: Slightly slower IntelliSense (worth it)

## Monitoring & Review

This decision will be reviewed:

- **Never**: Strict mode is a permanent standard
- **Exception process**: Document any strict rule exceptions
- **New flags**: Evaluate new TypeScript strict flags as released

## Related

- [ADR-001: Node.js 25 for Native TypeScript](001-node-js-25-native-typescript.md)
- [ADR-004: TSyringe for Dependency Injection](004-tsyringe-dependency-injection.md)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

## References

- TypeScript v5.9.3
- Strict mode documentation
- TSConfig reference
- Type system best practices
