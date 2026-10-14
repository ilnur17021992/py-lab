import test from 'node:test';
import assert from 'node:assert/strict';
import { E2BRunner, E2B_CONFIG } from '../js/runner/e2bRunner.js';
import { state } from '../js/state.js';

// Setup minimal localStorage mock for Node environment
const mockStorage = new Map();
globalThis.localStorage = {
  getItem: (k) => (mockStorage.has(k) ? mockStorage.get(k) : null),
  setItem: (k, v) => mockStorage.set(k, String(v)),
  removeItem: (k) => mockStorage.delete(k)
};

test('E2B_CONFIG has required workerKeyUrl and defaultTimeoutMs', () => {
  assert.equal(E2B_CONFIG.workerKeyUrl, 'https://crimson-glade-8f31.rahmatullin-ilnur-17021992.workers.dev/api/e2b/key');
  assert.equal(E2B_CONFIG.defaultTimeoutMs, 300000);
});

test('E2BRunner: resolveApiKey prefers passed explicit key', async () => {
  const runner = new E2BRunner();
  const key = await runner.resolveApiKey('explicit_key_123');
  assert.equal(key, 'explicit_key_123');
});

test('E2BRunner: resolveApiKey fetches from worker and caches it', async () => {
  const runner = new E2BRunner();

  let fetchCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    fetchCalls++;
    assert.equal(url, E2B_CONFIG.workerKeyUrl);
    return {
      ok: true,
      json: async () => ({ apiKey: 'worker_e2b_key_777' })
    };
  };

  try {
    const key1 = await runner.resolveApiKey();
    assert.equal(key1, 'worker_e2b_key_777');
    assert.equal(fetchCalls, 1);

    // Second call should use cached key without another fetch
    const key2 = await runner.resolveApiKey();
    assert.equal(key2, 'worker_e2b_key_777');
    assert.equal(fetchCalls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('E2BRunner: resolveApiKey throws clear error when worker fetch fails', async () => {
  const runner = new E2BRunner();

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    status: 500,
    json: async () => ({ error: 'E2B_API_KEY is not configured in Cloudflare environment' })
  });

  try {
    await assert.rejects(
      async () => runner.resolveApiKey(),
      /E2B_API_KEY is not configured/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('state: getE2BTimeout always returns E2B_CONFIG.defaultTimeoutMs (300000) regardless of localStorage', () => {
  mockStorage.set('e2b_timeout', '0');
  mockStorage.set('learn_py_e2b_timeout', '0');
  assert.equal(state.getE2BTimeout(), 300000);
  assert.equal(state.getE2BTimeout(), E2B_CONFIG.defaultTimeoutMs);
  mockStorage.delete('e2b_timeout');
  mockStorage.delete('learn_py_e2b_timeout');
});


