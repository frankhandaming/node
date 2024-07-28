// Flags: --experimental-require-module
'use strict';
const common = require('../common');
const assert = require('assert');

// This test demonstrates interop between CJS and CJS represented as ESM
// under the `__cjsModule` pattern.
(async () => {
  // dep.js and index.js are CJS modules.
  // dep exports 'cjs', while index reexports dep:
  assert.strictEqual(require('../fixtures/cjsesm/dep.js'), 'cjs');
  assert.strictEqual(require('../fixtures/cjsesm/index.js'), 'cjs');

  // Now we have ESM conversions of these dependencies, using __cjsModule, 
  // that behave equivalently under require(esm) despite the custom string import:
  assert.strictEqual(require('../fixtures/cjsesm/dep.mjs'), 'cjs');
  assert.strictEqual(require('../fixtures/cjsesm/index.mjs'), 'cjs');

  // Furthermore, if `index.mjs` imports from `dep.mjs` directly, the reexport
  // still works:
  assert.strictEqual(require('../fixtures/cjsesm/index-importing-depmjs.mjs'), 'cjs');

  // Finally, the ESM representations under these conversions all match equivalently:
  const esmCjsImport = await import('../fixtures/cjsesm/index.js');

  assert.deepStrictEqual(await import('../fixtures/cjsesm/index.mjs'), esmCjsImport);
  assert.deepStrictEqual(await import('../fixtures/cjsesm/index-importing-depmjs.mjs'), esmCjsImport);
})().then(common.mustCall());
