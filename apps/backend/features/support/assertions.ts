/**
 * Chai assertion helpers for Jest/Vitest syntax compatibility
 * Provides familiar assertion methods for Cucumber step definitions
 */
import { Assertion, expect as chaiExpect } from 'chai';

// Extend Chai Assertion interface with Jest/Vitest-compatible methods
declare global {
  namespace Chai {
    interface Assertion {
      toBe(value: unknown): Assertion;
      toBeDefined(): Assertion;
      toBeUndefined(): Assertion;
      toBeNull(): Assertion;
      toBeTruthy(): Assertion;
      toBeFalsy(): Assertion;
      toBeGreaterThan(value: number): Assertion;
      toBeGreaterThanOrEqual(value: number): Assertion;
      toBeLessThan(value: number): Assertion;
      toBeLessThanOrEqual(value: number): Assertion;
      toBeInstanceOf(constructor: Function): Assertion;
      toHaveProperty(property: string, value?: unknown): Assertion;
      toContain(value: unknown): Assertion;
      toHaveLength(length: number): Assertion;
      toMatch(pattern: string | RegExp): Assertion;
      toThrow(error?: string | RegExp | Function): Assertion;
    }
  }
}

// Add Jest/Vitest-style assertion methods to Chai
Assertion.addMethod('toBe', function (value: unknown) {
  this.assert(
    this._obj === value,
    `expected #{this} to be #{exp}`,
    `expected #{this} not to be #{exp}`,
    value,
    this._obj
  );
});

Assertion.addMethod('toBeDefined', function () {
  this.assert(
    this._obj !== undefined,
    `expected #{this} to be defined`,
    `expected #{this} not to be defined`
  );
});

Assertion.addMethod('toBeUndefined', function () {
  this.assert(
    this._obj === undefined,
    `expected #{this} to be undefined`,
    `expected #{this} not to be undefined`
  );
});

Assertion.addMethod('toBeNull', function () {
  this.assert(this._obj === null, `expected #{this} to be null`, `expected #{this} not to be null`);
});

Assertion.addMethod('toBeTruthy', function () {
  this.assert(!!this._obj, `expected #{this} to be truthy`, `expected #{this} not to be truthy`);
});

Assertion.addMethod('toBeFalsy', function () {
  this.assert(!this._obj, `expected #{this} to be falsy`, `expected #{this} not to be falsy`);
});

Assertion.addMethod('toBeGreaterThan', function (value: number) {
  this.assert(
    this._obj > value,
    `expected #{this} to be greater than #{exp}`,
    `expected #{this} not to be greater than #{exp}`,
    value
  );
});

Assertion.addMethod('toBeGreaterThanOrEqual', function (value: number) {
  this.assert(
    this._obj >= value,
    `expected #{this} to be greater than or equal to #{exp}`,
    `expected #{this} not to be greater than or equal to #{exp}`,
    value
  );
});

Assertion.addMethod('toBeLessThan', function (value: number) {
  this.assert(
    this._obj < value,
    `expected #{this} to be less than #{exp}`,
    `expected #{this} not to be less than #{exp}`,
    value
  );
});

Assertion.addMethod('toBeLessThanOrEqual', function (value: number) {
  this.assert(
    this._obj <= value,
    `expected #{this} to be less than or equal to #{exp}`,
    `expected #{this} not to be less than or equal to #{exp}`,
    value
  );
});

Assertion.addMethod('toBeInstanceOf', function (constructor: Function) {
  this.assert(
    this._obj instanceof constructor,
    `expected #{this} to be an instance of #{exp}`,
    `expected #{this} not to be an instance of #{exp}`,
    constructor.name
  );
});

Assertion.addMethod('toHaveProperty', function (property: string, value?: unknown) {
  const hasProperty = this._obj && typeof this._obj === 'object' && property in this._obj;

  if (arguments.length === 1) {
    this.assert(
      hasProperty,
      `expected #{this} to have property '${property}'`,
      `expected #{this} not to have property '${property}'`
    );
  } else {
    this.assert(
      hasProperty && (this._obj as Record<string, unknown>)[property] === value,
      `expected #{this} to have property '${property}' with value #{exp}`,
      `expected #{this} not to have property '${property}' with value #{exp}`,
      value,
      hasProperty ? (this._obj as Record<string, unknown>)[property] : undefined
    );
  }
});

Assertion.addMethod('toContain', function (value: unknown) {
  const obj = this._obj;

  if (typeof obj === 'string' && typeof value === 'string') {
    this.assert(
      obj.includes(value),
      `expected #{this} to contain #{exp}`,
      `expected #{this} not to contain #{exp}`,
      value
    );
  } else if (Array.isArray(obj)) {
    this.assert(
      obj.includes(value),
      `expected #{this} to contain #{exp}`,
      `expected #{this} not to contain #{exp}`,
      value
    );
  } else {
    throw new Error('toContain() requires a string or array');
  }
});

Assertion.addMethod('toHaveLength', function (length: number) {
  const obj = this._obj as { length?: number };
  this.assert(
    obj && typeof obj.length === 'number' && obj.length === length,
    `expected #{this} to have length #{exp}`,
    `expected #{this} not to have length #{exp}`,
    length,
    obj?.length
  );
});

Assertion.addMethod('toMatch', function (pattern: string | RegExp) {
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  this.assert(
    typeof this._obj === 'string' && regex.test(this._obj),
    `expected #{this} to match #{exp}`,
    `expected #{this} not to match #{exp}`,
    pattern
  );
});

Assertion.addMethod('toThrow', function (error?: string | RegExp | Function) {
  const fn = this._obj;

  if (typeof fn !== 'function') {
    throw new Error('toThrow() requires a function');
  }

  let thrown = false;
  let thrownError: Error | undefined;

  try {
    fn();
  } catch (e) {
    thrown = true;
    thrownError = e as Error;
  }

  if (!error) {
    this.assert(
      thrown,
      `expected function to throw an error`,
      `expected function not to throw an error`
    );
  } else if (typeof error === 'string') {
    this.assert(
      thrown && thrownError?.message.includes(error),
      `expected function to throw error containing '${error}'`,
      `expected function not to throw error containing '${error}'`,
      error,
      thrownError?.message
    );
  } else if (error instanceof RegExp) {
    this.assert(
      thrown && thrownError && error.test(thrownError.message),
      `expected function to throw error matching ${error}`,
      `expected function not to throw error matching ${error}`,
      error,
      thrownError?.message
    );
  } else if (typeof error === 'function') {
    this.assert(
      thrown && thrownError instanceof error,
      `expected function to throw #{exp}`,
      `expected function not to throw #{exp}`,
      error.name
    );
  }
});

// Export chai expect with extended methods
export const expect = chaiExpect;
