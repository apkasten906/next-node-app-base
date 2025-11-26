import { After, AfterAll, Before, BeforeAll, Status } from '@cucumber/cucumber';
import { World } from './world';

BeforeAll(async function () {
  console.log('🥒 Cucumber test suite starting...');
});

AfterAll(async function () {
  console.log('🥒 Cucumber test suite completed');
});

Before(async function (this: World) {
  // Initialize test app for each scenario
  await this.initializeApp();
});

After(async function (this: World, { result, pickle }) {
  // Log scenario result
  if (result?.status === Status.FAILED) {
    console.error(`❌ Scenario failed: ${pickle.name}`);
    if (this.error) {
      console.error('Error:', this.error.message);
    }
  } else {
    console.log(`✅ Scenario passed: ${pickle.name}`);
  }

  // Cleanup after each scenario
  await this.cleanup();
});
