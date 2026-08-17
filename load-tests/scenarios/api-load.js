/* global __ENV */
import { check, sleep } from 'k6';
import http from 'k6/http';

const baseUrl = __ENV.BASE_URL || 'http://localhost:3001';

export const options = {
  stages: [
    { duration: '1m', target: 10 },
    { duration: '3m', target: 50 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.95'],
  },
};

export default function apiLoadScenario() {
  const health = http.get(`${baseUrl}/health`);
  check(health, {
    'health status is 200': (response) => response.status === 200,
  });

  const ready = http.get(`${baseUrl}/ready`);
  check(ready, {
    'readiness status is available': (response) => [200, 503].includes(response.status),
  });

  sleep(1);
}
