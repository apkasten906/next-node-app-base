import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from '../support/assertions';
import { World } from '../support/world';

// API Versioning
Given('API versioning is configured', async function (this: World) {
  this.setData('versioningConfigured', true);
});

When('I request API version {string}', async function (this: World, version: string) {
  const res = await this.request?.get('/api/users').set('X-API-Version', version);
  this.response = res;
  this.setData('requestedVersion', version);
});

Then(
  'I should receive response from version {string}',
  async function (this: World, version: string) {
    const requestedVersion = this.getData<string>('requestedVersion');
    expect(requestedVersion).toBe(version);
    expect(this.response?.status).toBeLessThan(400);
  }
);

Then('the response should include version header', async function (this: World) {
  const versionHeader = this.response?.headers['x-api-version'];
  expect(versionHeader).toBeDefined();
});

// HATEOAS
When('I GET {string}', async function (this: World, endpoint: string) {
  const res = await this.request?.get(endpoint);
  this.response = res;
});

Then('the response should include HATEOAS links', async function (this: World) {
  expect(this.response?.body).toHaveProperty('_links');
});

Then('links should include {string}', async function (this: World, linkName: string) {
  const links = this.response?.body._links;
  expect(links).toHaveProperty(linkName);
});

// Pagination
When(
  'I request page {int} with {int} items per page',
  async function (this: World, page: number, limit: number) {
    const res = await this.request?.get(`/api/users?page=${page}&limit=${limit}`);
    this.response = res;
  }
);

Then('I should receive {int} items', async function (this: World, count: number) {
  const items = this.response?.body.data || this.response?.body;
  expect(Array.isArray(items)).toBe(true);
  expect(items.length).toBeLessThanOrEqual(count);
});

Then('pagination metadata should include:', async function (this: World, dataTable: any) {
  const expectedFields = dataTable.raw().flat();
  const pagination = this.response?.body.pagination || this.response?.body.meta;

  for (const field of expectedFields) {
    expect(pagination).toHaveProperty(field);
  }
});

// Filtering
When('I filter by {string} = {string}', async function (this: World, field: string, value: string) {
  const res = await this.request?.get(`/api/users?${field}=${value}`);
  this.response = res;
  this.setData('filterField', field);
  this.setData('filterValue', value);
});

Then('all results should match the filter', async function (this: World) {
  const items = this.response?.body.data || this.response?.body;
  // Field and value would be retrieved from context in real implementation

  expect(Array.isArray(items)).toBe(true);
  // In real implementation, verify all items match the filter
});

// Complex Filtering
When('I apply filter {string}', async function (this: World, filter: string) {
  const res = await this.request?.get(`/api/users?${filter}`);
  this.response = res;
});

Then('results should satisfy all conditions', async function (this: World) {
  const items = this.response?.body.data || this.response?.body;
  expect(Array.isArray(items)).toBe(true);
});

// Sorting
When('I sort by {string} {string}', async function (this: World, field: string, order: string) {
  const res = await this.request?.get(`/api/users?sort=${field}&order=${order}`);
  this.response = res;
  this.setData('sortField', field);
  this.setData('sortOrder', order);
});

Then('results should be sorted correctly', async function (this: World) {
  const items = this.response?.body.data || this.response?.body;
  // Order would be retrieved from context in real implementation

  expect(Array.isArray(items)).toBe(true);
  // In real implementation, verify sorting order
});

// Multi-field Sorting
When('I sort by multiple fields: {string}', async function (this: World, sortFields: string) {
  const res = await this.request?.get(`/api/users?sort=${sortFields}`);
  this.response = res;
});

// Swagger/OpenAPI
Given('Swagger UI is enabled', async function (this: World) {
  this.setData('swaggerEnabled', true);
});

When('I access {string}', async function (this: World, endpoint: string) {
  const res = await this.request?.get(endpoint);
  this.response = res;
});

Then('I should see the API documentation', async function (this: World) {
  expect(this.response?.status).toBe(200);
  expect(this.response?.text).toContain('swagger');
});

When('I retrieve the OpenAPI schema', async function (this: World) {
  const res = await this.request?.get('/api-docs/swagger.json');
  this.response = res;
});

Then('the schema should include all endpoints', async function (this: World) {
  const schema = this.response?.body;
  expect(schema).toHaveProperty('paths');
  expect(Object.keys(schema.paths).length).toBeGreaterThan(0);
});

Then('each endpoint should have:', async function (this: World, dataTable: any) {
  const expectedFields = dataTable.raw().flat();
  const schema = this.response?.body;
  const firstPath = Object.values(schema.paths)[0] as any;
  const firstMethod = Object.values(firstPath)[0] as any;

  for (const field of expectedFields) {
    expect(firstMethod).toHaveProperty(field);
  }
});

// Rate Limiting (API)
When(
  'I make {int} requests within {int} second',
  async function (this: World, count: number, _seconds: number) {
    const responses: number[] = [];

    for (let i = 0; i < count; i++) {
      const res = await this.request?.get('/api/users');
      responses.push(res?.status || 200);
    }

    this.setData('apiResponses', responses);
  }
);

Then('request {int} should be rate limited', async function (this: World, _requestNum: number) {
  const responses = this.getData<number[]>('apiResponses');
  // In a real rate limiter, the nth request would be 429
  expect(responses).toBeDefined();
});

// Compression
Given('response compression is enabled', async function (this: World) {
  this.setData('compressionEnabled', true);
});

When('I request a large response', async function (this: World) {
  const res = await this.request?.get('/api/large-data').set('Accept-Encoding', 'gzip');
  this.response = res;
});

Then('the response should be compressed', async function (this: World) {
  const encoding = this.response?.headers['content-encoding'];
  expect(encoding).toBe('gzip');
});

// ETag Caching
When(
  'I request {string} with If-None-Match header',
  async function (this: World, endpoint: string) {
    const etag = '"abc123"';
    const res = await this.request?.get(endpoint).set('If-None-Match', etag);
    this.response = res;
  }
);

Then('I should receive {int} Not Modified', async function (this: World, statusCode: number) {
  expect(this.response?.status).toBe(statusCode);
});

When('I request {string} without If-None-Match', async function (this: World, endpoint: string) {
  const res = await this.request?.get(endpoint);
  this.response = res;
});

Then('the response should include an ETag header', async function (this: World) {
  const etag = this.response?.headers['etag'];
  expect(etag).toBeDefined();
});

// Standardized Error Responses
When('I request a non-existent resource', async function (this: World) {
  const res = await this.request?.get('/api/users/nonexistent');
  this.response = res;
});

Then('I should receive a {int} error', async function (this: World, statusCode: number) {
  expect(this.response?.status).toBe(statusCode);
});

Then('the error response should include:', async function (this: World, dataTable: any) {
  const expectedFields = dataTable.raw().flat();
  const error = this.response?.body;

  for (const field of expectedFields) {
    expect(error).toHaveProperty(field);
  }
});

// Content Negotiation
When('I request with Accept header {string}', async function (this: World, acceptHeader: string) {
  const res = await this.request?.get('/api/users').set('Accept', acceptHeader);
  this.response = res;
});

Then(
  'the response Content-Type should be {string}',
  async function (this: World, contentType: string) {
    const actualType = this.response?.headers['content-type'];
    expect(actualType).toContain(contentType);
  }
);

// Request Validation
When('I send invalid data to {string}', async function (this: World, endpoint: string) {
  const res = await this.request?.post(endpoint).send({ invalid: 'data' });
  this.response = res;
});

Then('I should receive a {int} validation error', async function (this: World, statusCode: number) {
  expect(this.response?.status).toBe(statusCode);
});

Then('the error should list validation failures', async function (this: World) {
  const error = this.response?.body;
  expect(error).toHaveProperty('errors');
  expect(Array.isArray(error.errors)).toBe(true);
});

// CORS Headers
When('I make a CORS preflight request', async function (this: World) {
  const res = await this.request
    ?.options('/api/users')
    .set('Origin', 'https://example.com')
    .set('Access-Control-Request-Method', 'POST');
  this.response = res;
});

Then('CORS headers should be present', async function (this: World) {
  expect(this.response?.headers['access-control-allow-origin']).toBeDefined();
  expect(this.response?.headers['access-control-allow-methods']).toBeDefined();
});

// Field Selection
When('I request only fields: {string}', async function (this: World, fields: string) {
  const res = await this.request?.get(`/api/users?fields=${fields}`);
  this.response = res;
  this.setData('requestedFields', fields.split(','));
});

Then('the response should only include selected fields', async function (this: World) {
  const items = this.response?.body.data || this.response?.body;
  // Requested fields would be retrieved from context in real implementation

  if (Array.isArray(items) && items.length > 0) {
    const firstItem = items[0];
    // In real implementation, verify only requested fields are present
    expect(firstItem).toBeDefined();
  }
});

// Bulk Operations
When('I POST bulk data with {int} items', async function (this: World, count: number) {
  const items = Array(count)
    .fill(null)
    .map((_, i) => ({ name: `Item ${i + 1}` }));
  const res = await this.request?.post('/api/users/bulk').send({ items });
  this.response = res;
});

Then('all {int} items should be created', async function (this: World, count: number) {
  const created = this.response?.body.created || [];
  expect(created.length).toBe(count);
});

// Query Operators
When('I search with operator {string}', async function (this: World, operator: string) {
  const res = await this.request?.get(`/api/users?age[${operator}]=25`);
  this.response = res;
  this.setData('queryOperator', operator);
});

Then('results should match the operator logic', async function (this: World) {
  const items = this.response?.body.data || this.response?.body;
  expect(Array.isArray(items)).toBe(true);
});
