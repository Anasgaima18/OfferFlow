const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const configPath = path.join(__dirname, '..', 'newrelic.js');

const loadConfig = (enabled) => {
  const previousEnabled = process.env.NEW_RELIC_ENABLED;
  const previousLicenseKey = process.env.NEW_RELIC_LICENSE_KEY;

  process.env.NEW_RELIC_ENABLED = enabled;
  process.env.NEW_RELIC_LICENSE_KEY = 'test-license-key';

  delete require.cache[configPath];
  const { config } = require(configPath);

  if (previousEnabled === undefined) {
    delete process.env.NEW_RELIC_ENABLED;
  } else {
    process.env.NEW_RELIC_ENABLED = previousEnabled;
  }

  if (previousLicenseKey === undefined) {
    delete process.env.NEW_RELIC_LICENSE_KEY;
  } else {
    process.env.NEW_RELIC_LICENSE_KEY = previousLicenseKey;
  }

  delete require.cache[configPath];

  return config;
};

test('disables the New Relic agent when NEW_RELIC_ENABLED is false', () => {
  const config = loadConfig('false');

  assert.equal(config.agent_enabled, false);
});

test('enables the New Relic agent when NEW_RELIC_ENABLED is true', () => {
  const config = loadConfig('true');

  assert.equal(config.agent_enabled, true);
});
