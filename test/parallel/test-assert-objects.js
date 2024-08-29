'use strict';

require('../common');
const vm = require('node:vm');
const assert = require('node:assert');
const { describe, it } = require('node:test');
const { KeyObject } = require('node:crypto');

const { subtle } = globalThis.crypto;

function createCircularObject() {
  const obj = {};
  obj.self = obj;
  return obj;
}

function createDeepNestedObject() {
  return { level1: { level2: { level3: 'deepValue' } } };
}

async function generateCryptoKey() {
  const cryptoKey = await subtle.generateKey(
    {
      name: 'HMAC',
      hash: 'SHA-256',
      length: 256,
    },
    true,
    ['sign', 'verify']
  );

  const keyObject = KeyObject.from(cryptoKey);

  return { cryptoKey, keyObject };
}

describe('Object Comparison Tests', () => {
  describe('deepMatchStrict', () => {
    describe('throws an error', () => {
      [
        {
          description: 'throws when only one argument is provided',
          actual: { a: 1 },
          expected: undefined,
        },
        {
          description: 'throws when comparing two different objects',
          actual: { a: 1, b: 'string' },
          expected: { a: 2, b: 'string' },
        },
        {
          description:
            'throws when comparing two objects with different nested objects',
          actual: createDeepNestedObject(),
          expected: { level1: { level2: { level3: 'differentValue' } } },
        },
        {
          description:
            'throws when comparing two objects with different RegExp properties',
          actual: { pattern: /abc/ },
          expected: { pattern: /def/ },
        },
        {
          description:
            'throws when comparing two arrays with different elements',
          actual: [1, 'two', true],
          expected: [1, 'two', false],
        },
        {
          description:
            'throws when comparing two Date objects with different times',
          actual: new Date(0),
          expected: new Date(1),
        },
        {
          description:
            'throws when comparing two objects with different large number of properties',
          actual: Object.fromEntries(
            Array.from({ length: 100 }, (_, i) => [`key${i}`, i])
          ),
          expected: Object.fromEntries(
            Array.from({ length: 100 }, (_, i) => [`key${i}`, i + 1])
          ),
        },
        {
          description:
            'throws when comparing two objects with different Symbols',
          actual: { [Symbol('test')]: 'symbol' },
          expected: { [Symbol('test')]: 'symbol' },
        },
        {
          description:
            'throws when comparing two objects with different array properties',
          actual: { a: [1, 2, 3] },
          expected: { a: [1, 2, 4] },
        },
        {
          description:
            'throws when comparing two objects with different function properties',
          actual: { fn: () => {} },
          expected: { fn: () => {} },
        },
        {
          description:
            'throws when comparing two objects with different Error instances',
          actual: { error: new Error('Test error 1') },
          expected: { error: new Error('Test error 2') },
        },
        {
          description:
            'throws when comparing two objects with different TypedArray instances and content',
          actual: { typedArray: new Uint8Array([1, 2, 3]) },
          expected: { typedArray: new Uint8Array([4, 5, 6]) },
        },
        {
          description:
            'throws when comparing two Map objects with different entries',
          actual: new Map([
            ['key1', 'value1'],
            ['key2', 'value2'],
          ]),
          expected: new Map([
            ['key1', 'value1'],
            ['key3', 'value3'],
          ]),
        },
        {
          description:
            'throws when comparing two Map objects with different keys',
          actual: new Map([
            ['key1', 'value1'],
            ['key2', 'value2'],
          ]),
          expected: new Map([
            ['key1', 'value1'],
            ['key3', 'value2'],
          ]),
        },
        {
          description:
            'throws when comparing two Map objects with different length',
          actual: new Map([
            ['key1', 'value1'],
            ['key2', 'value2'],
          ]),
          expected: new Map([['key1', 'value1']]),
        },
        {
          description:
            'throws when comparing two Set objects from different realms with different values',
          actual: new vm.runInNewContext('new Set(["value1", "value2"])'),
          expected: new Set(['value1', 'value3']),
        },
        {
          description:
            'throws when comparing two Set objects with different values',
          actual: new Set(['value1', 'value2']),
          expected: new Set(['value1', 'value3']),
        },
        {
          description:
            'throws when comparing plain objects from different realms',
          actual: vm.runInNewContext(`({
            a: 1,
            b: 2n,
            c: "3",
            d: /4/,
            e: new Set([5]),
            f: [6],
            g: new Uint8Array()
          })`),
          expected: { b: 2n, e: new Set([5]), f: [6], g: new Uint8Array() },
        },
        {
          description:
            'throws when comparing two objects with different CryptoKey instances objects',
          actual: async () => {
            return generateCryptoKey();
          },
          expected: async () => {
            return generateCryptoKey();
          },
        },
        {
          description: 'throws when comparing one subset object with another',
          actual: { a: 1, b: 2, c: 3 },
          expected: { b: '2' },
        },
        {
          description: 'throws when comparing one subset array with another',
          actual: [1, 2, 3],
          expected: ['2'],
        },
      ].forEach(({ description, actual, expected }) => {
        it(description, () => {
          assert.throws(() => assert.deepMatchStrict(actual, expected), Error);
        });
      });
    });
  });

  describe('does not throw an error', () => {
    const sym = Symbol('test');
    const func = () => {};

    [
      {
        description: 'compares two identical simple objects',
        actual: { a: 1, b: 'string' },
        expected: { a: 1, b: 'string' },
      },
      {
        description: 'compares two objects with different property order',
        actual: { a: 1, b: 'string' },
        expected: { b: 'string', a: 1 },
      },
      {
        description: 'compares two objects with nested objects',
        actual: createDeepNestedObject(),
        expected: createDeepNestedObject(),
      },
      {
        description: 'compares two objects with circular references',
        actual: createCircularObject(),
        expected: createCircularObject(),
      },
      {
        description: 'compares two arrays with identical elements',
        actual: [1, 'two', true],
        expected: [1, 'two', true],
      },
      {
        description: 'compares two Date objects with the same time',
        actual: new Date(0),
        expected: new Date(0),
      },
      {
        description: 'compares two objects with large number of properties',
        actual: Object.fromEntries(
          Array.from({ length: 100 }, (_, i) => [`key${i}`, i])
        ),
        expected: Object.fromEntries(
          Array.from({ length: 100 }, (_, i) => [`key${i}`, i])
        ),
      },
      {
        description: 'compares two objects with Symbol properties',
        actual: { [sym]: 'symbol' },
        expected: { [sym]: 'symbol' },
      },
      {
        description: 'compares two objects with RegExp properties',
        actual: { pattern: /abc/ },
        expected: { pattern: /abc/ },
      },
      {
        description: 'compares two objects with identical function properties',
        actual: { fn: func },
        expected: { fn: func },
      },
      {
        description: 'compares two objects with mixed types of properties',
        actual: { num: 1, str: 'test', bool: true, sym },
        expected: { num: 1, str: 'test', bool: true, sym },
      },
      {
        description: 'compares two objects with Buffers',
        actual: { buf: Buffer.from('Node.js') },
        expected: { buf: Buffer.from('Node.js') },
      },
      {
        description: 'compares two objects with identical Error properties',
        actual: { error: new Error('Test error') },
        expected: { error: new Error('Test error') },
      },
      {
        description: 'compares two objects with the same TypedArray instance',
        actual: { typedArray: new Uint8Array([1, 2, 3]) },
        expected: { typedArray: new Uint8Array([1, 2, 3]) },
      },
      {
        description: 'compares two Map objects with identical entries',
        actual: new Map([
          ['key1', 'value1'],
          ['key2', 'value2'],
        ]),
        expected: new Map([
          ['key1', 'value1'],
          ['key2', 'value2'],
        ]),
      },
      {
        description: 'compares two Set objects with identical values',
        actual: new Set(['value1', 'value2']),
        expected: new Set(['value1', 'value2']),
      },
      {
        description:
          'compares two Map objects from different realms with identical entries',
        actual: new vm.runInNewContext(
          'new Map([["key1", "value1"], ["key2", "value2"]])'
        ),
        expected: new Map([
          ['key1', 'value1'],
          ['key2', 'value2'],
        ]),
      },
      {
        description:
          'compares two objects with identical getter/setter properties',
        actual: (() => {
          let value = 'test';
          return Object.defineProperty({}, 'prop', {
            get: () => value,
            set: (newValue) => {
              value = newValue;
            },
            enumerable: true,
            configurable: true,
          });
        })(),
        expected: (() => {
          let value = 'test';
          return Object.defineProperty({}, 'prop', {
            get: () => value,
            set: (newValue) => {
              value = newValue;
            },
            enumerable: true,
            configurable: true,
          });
        })(),
      },
      {
        description: 'compares two objects with no prototype',
        actual: { __proto__: null, prop: 'value' },
        expected: { __proto__: null, prop: 'value' },
      },
      {
        description:
          'compares two objects with identical non-enumerable properties',
        actual: (() => {
          const obj = {};
          Object.defineProperty(obj, 'hidden', {
            value: 'secret',
            enumerable: false,
          });
          return obj;
        })(),
        expected: (() => {
          const obj = {};
          Object.defineProperty(obj, 'hidden', {
            value: 'secret',
            enumerable: false,
          });
          return obj;
        })(),
      },
      {
        description: 'compares two identical primitives, string',
        actual: 'foo',
        expected: 'foo',
      },
      {
        description: 'compares two identical primitives, number',
        actual: 1,
        expected: 1,
      },
      {
        description: 'compares two identical primitives, boolean',
        actual: false,
        expected: false,
      },
      {
        description: 'compares two identical primitives, null',
        actual: null,
        expected: null,
      },
      {
        description: 'compares two identical primitives, undefined',
        actual: undefined,
        expected: undefined,
      },
      {
        description: 'compares two identical primitives, Symbol',
        actual: sym,
        expected: sym,
      },
      {
        description:
          'compares one subset object with another, does not throw an error',
        actual: { a: 1, b: 2, c: 3 },
        expected: { b: 2 },
      },
      {
        description:
          'compares one subset array with another, does not throw an error',
        actual: [1, 2, 3],
        expected: [2],
      },
    ].forEach(({ description, actual, expected }) => {
      it(description, () => {
        assert.deepMatchStrict(actual, expected);
      });
    });
  });

  describe('deepMatch', () => {
    describe('throws an error', () => {
      [
        {
          description:
            'throws because the expected value is longer than the actual value',
          actual: [1, 2, 3],
          expected: [1, 2, 3, 4],
        },
        {
          description:
            'deepMatch throws when comparing two objects with null and empty object',
          actual: { a: null },
          expected: { a: {} },
        },
        {
          description: 'throws because only one argument is provided',
          actual: { a: 1 },
          expected: undefined,
        },
        {
          description: 'throws because the first argument is null',
          actual: null,
          expected: { a: 1 },
        },
        {
          description: 'throws because the second argument is null',
          actual: { a: 1 },
          expected: null,
        },
      ].forEach(({ description, actual, expected }) => {
        it(description, () => {
          assert.throws(() => assert.deepMatch(actual, expected), Error);
        });
      });
    });

    describe('does not throw an error', () => {
      [
        {
          description: 'compares two objects with Buffers',
          actual: { buf: Buffer.from('Node.js') },
          expected: { buf: Buffer.from('Node.js') },
        },
        {
          description: 'compares two identical primitives, string',
          actual: 'foo',
          expected: 'foo',
        },

        {
          description: 'compares two identical primitives, number',
          actual: 1,
          expected: 1,
        },

        {
          description: 'compares two identical primitives, bigint',
          actual: 1n,
          expected: 1n,
        },

        {
          description: 'compares two non identical simple objects',
          actual: { a: 1, b: 'foo', c: '1' },
          expected: { a: 1, c: 1 },
        },
        {
          description: 'compares two similar objects with type coercion',
          actual: { a: 1, b: '2' },
          expected: { a: 1, b: 2 },
        },
        {
          description:
            'compares two objects with nested objects and type coercion',
          actual: { level1: { level2: { level3: '42' } } },
          expected: { level1: { level2: { level3: 42 } } },
        },
        {
          description: 'compares two objects with circular references',
          actual: createCircularObject(),
          expected: createCircularObject(),
        },
        {
          description: 'compares two arrays with type coercion',
          actual: [1, '2', true],
          expected: [1, 2, 1],
        },
        {
          description: 'compares two objects with numeric string and number',
          actual: { a: '100' },
          expected: { a: 100 },
        },
        {
          description:
            'compares two objects with boolean and numeric representations',
          actual: { a: 1, b: 0 },
          expected: { a: true, b: false },
        },
        {
          description:
            'compares two objects with undefined and missing properties',
          actual: { a: undefined },
          expected: {},
        },
        {
          description: 'compares one subset object with another',
          actual: { a: 1, b: 2, c: 3 },
          expected: { b: '2' },
        },
        {
          description: 'compares one subset array with another',
          actual: [true],
          expected: [1],
        },
      ].forEach(({ description, actual, expected }) => {
        it(description, () => {
          assert.deepMatch(actual, expected);
        });
      });
    });
  });
  describe('includesStrict', () => {
    describe('throws an error', () => {
      [
        {
          description: 'throws because only one argument is provided',
          actual: () => assert.includesStrict({ a: 1 }),
          expected: Error,
        },
        {
          description:
            'throws when comparing one subset array with another',
          actual: () => assert.includesStrict([1, 2, 3], ['2']),
          expected: Error,
        },
        {
          description:
            'throws when comparing one subset string with another',
          actual: () => assert.includesStrict('abc', '2'),
          expected: Error,
        },
        {
          description:
            'throws because the expected value is longer than the actual value',
          actual: () => assert.includesStrict('abc', 'abcd'),
          expected: Error,
        },
      ].forEach(({ description, actual, expected }) => {
        it(description, () => {
          assert.throws(actual, expected);
        });
      });
    });

    describe('does not throw an error', () => {
      [
        {
          description:
            'compares one subset array with another, it does not throw an error',
          actual: [1, 2, 3],
          expected: [2],
        },
        {
          description:
            'compares one subset string with another, it does not throw an error',
          actual: 'abc',
          expected: 'b',
        },
      ].forEach(({ description, actual, expected }) => {
        it(description, () => {
          assert.includesStrict(actual, expected);
        });
      });
    });
  });

  describe('includes', () => {
    describe('throws an error', () => {
      [
        {
          description: 'throws because only one argument is provided',
          actual: () => assert.includes({ a: 1 }),
          expected: Error,
        },
        {
          description:
            'throws because using includes with a string and an array',
          actual: () => assert.includes('abc', ['a', 'b', 'c']),
          expected: Error,
        },
        {
          description:
            'throws because the expected value is longer than the actual value',
          actual: () => assert.includes('abc', 'abcd'),
          expected: Error,
        },
      ].forEach(({ description, actual, expected }) => {
        it(description, () => {
          assert.throws(actual, expected);
        });
      });
    });

    describe('does not throw an error', () => {
      [
        {
          description: 'compares one subset array with another',
          actual: [1, 2, 3],
          expected: ['2'],
        },
        {
          description: 'compares one subset string with another',
          actual: 'abc',
          expected: 'b',
        },
      ].forEach(({ description, actual, expected }) => {
        it(description, () => {
          assert.includes(actual, expected);
        });
      });
    });
  });
});
