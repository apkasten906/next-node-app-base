import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from '../support/assertions';
import { World } from '../support/world';

Given('the backend application is running', async function (this: World) {
  // App is initialized in hooks
  expect(this.app).toBeDefined();
  expect(this.request).toBeDefined();
});

Given('environment variables are configured', function (this: World) {
  // Verify key env vars exist
  expect(process.env['NODE_ENV']).toBeDefined();
});

When('I request GET {string}', async function (this: World, endpoint: string) {
  if (!this.request) throw new Error('Request not initialized');
  this.response = await this.request.get(endpoint);
});

When('I POST to {string} with invalid data', async function (this: World, endpoint: string) {
  if (!this.request) throw new Error('Request not initialized');
  this.response = await this.request.post(endpoint).send({ invalid: 'data' });
});

Then('the response status should be {int}', function (this: World, status: number) {
  expect(this.response?.status).toBe(status);
});

Then('the response should contain:', function (this: World, dataTable: any) {
  const fields = dataTable.raw().map((row: string[]) => row[0]);
  const body = this.response?.body;

  fields.forEach((field: string) => {
    expect(body).toHaveProperty(field);
  });
});

Then('the response should include {string} object', function (this: World, key: string) {
  expect(this.response?.body).toHaveProperty(key);
});
