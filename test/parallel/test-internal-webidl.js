// Flags: --expose-internals
'use strict';

require('../common');
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { createInterfaceConverter } = require('internal/webidl');

describe('internal/webidl', () => {
  class Test { t() {} }
  class SubTest extends Test {}
  const testConverter = createInterfaceConverter('Test', Test.prototype);

  it('converts objects that implement the required interface', () => {
    const subTest = new SubTest();
    const test = new Test();
    assert.strictEqual(subTest, testConverter(subTest));
    assert.strictEqual(test, testConverter(test));
  });

  it('throws TypeError when converting objects that do not implement the required interface', () => {
    const expectedError = { code: 'ERR_INVALID_ARG_TYPE' };
    [
      { t: () => {} },
      null,
      undefined,
      {},
      [],
      1,
      '123',
    ].forEach((c) => {
      assert.throws(() => { testConverter(c); }, expectedError);
    });
  });
});
