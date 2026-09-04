const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

async function run() {
  global.window = { localStorage: new MemoryStorage() };

  const moduleUrl = pathToFileURL(path.join(__dirname, 'rememberedLoginEmail.js')).href;
  const rememberedEmail = await import(moduleUrl);

  assert.equal(rememberedEmail.getRememberedLoginEmail(), '');
  assert.equal(
    rememberedEmail.saveRememberedLoginEmail('  youth@example.com  '),
    'youth@example.com',
  );
  assert.equal(rememberedEmail.getRememberedLoginEmail(), 'youth@example.com');

  rememberedEmail.clearRememberedLoginEmail();
  assert.equal(rememberedEmail.getRememberedLoginEmail(), '');

  rememberedEmail.saveRememberedLoginEmail('again@example.com');
  rememberedEmail.saveRememberedLoginEmail('');
  assert.equal(rememberedEmail.getRememberedLoginEmail(), '');

  console.log('Remembered login email tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
