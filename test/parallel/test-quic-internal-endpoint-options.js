// Flags: --expose-internals
'use strict';

const common = require('../common');
if (!common.hasQuic)
  common.skip('missing quic');
const {
  strictEqual,
  throws,
} = require('node:assert');

const {
  Endpoint,
} = require('internal/quic/quic');

const {
  inspect,
} = require('util');

const {
  suite,
  test,
} = require('node:test');

const callbackConfig = {
  onsession() {},
  session: {},
  stream: {},
};

suite('quic internal endpoint options', async () => {

  test('invalid options', async () => {
    ['a', null, false, NaN].forEach((i) => {
      throws(() => new Endpoint(callbackConfig, i), {
        code: 'ERR_INVALID_ARG_TYPE',
      });
    });
  });

  test('valid options', async () => {
    // Just Works... using all defaults
    new Endpoint(callbackConfig, {});
    new Endpoint(callbackConfig);
    new Endpoint(callbackConfig, undefined);
  });

  test('various cases', async () => {
    const cases = [
      {
        key: 'retryTokenExpiration',
        valid: [
          1, 10, 100, 1000, 10000, 10000n,
        ],
        invalid: [-1, -1n, 'a', null, false, true, {}, [], () => {}]
      },
      {
        key: 'tokenExpiration',
        valid: [
          1, 10, 100, 1000, 10000, 10000n,
        ],
        invalid: [-1, -1n, 'a', null, false, true, {}, [], () => {}]
      },
      {
        key: 'maxConnectionsPerHost',
        valid: [
          1, 10, 100, 1000, 10000, 10000n,
        ],
        invalid: [-1, -1n, 'a', null, false, true, {}, [], () => {}]
      },
      {
        key: 'maxConnectionsTotal',
        valid: [
          1, 10, 100, 1000, 10000, 10000n,
        ],
        invalid: [-1, -1n, 'a', null, false, true, {}, [], () => {}]
      },
      {
        key: 'maxStatelessResetsPerHost',
        valid: [
          1, 10, 100, 1000, 10000, 10000n,
        ],
        invalid: [-1, -1n, 'a', null, false, true, {}, [], () => {}]
      },
      {
        key: 'addressLRUSize',
        valid: [
          1, 10, 100, 1000, 10000, 10000n,
        ],
        invalid: [-1, -1n, 'a', null, false, true, {}, [], () => {}]
      },
      {
        key: 'maxRetries',
        valid: [
          1, 10, 100, 1000, 10000, 10000n,
        ],
        invalid: [-1, -1n, 'a', null, false, true, {}, [], () => {}]
      },
      {
        key: 'maxPayloadSize',
        valid: [
          1, 10, 100, 1000, 10000, 10000n,
        ],
        invalid: [-1, -1n, 'a', null, false, true, {}, [], () => {}]
      },
      {
        key: 'unacknowledgedPacketThreshold',
        valid: [
          1, 10, 100, 1000, 10000, 10000n,
        ],
        invalid: [-1, -1n, 'a', null, false, true, {}, [], () => {}]
      },
      {
        key: 'validateAddress',
        valid: [true, false, 0, 1, 'a'],
        invalid: [],
      },
      {
        key: 'disableStatelessReset',
        valid: [true, false, 0, 1, 'a'],
        invalid: [],
      },
      {
        key: 'ipv6Only',
        valid: [true, false, 0, 1, 'a'],
        invalid: [],
      },
      {
        key: 'cc',
        valid: [
          Endpoint.CC_ALGO_RENO,
          Endpoint.CC_ALGO_CUBIC,
          Endpoint.CC_ALGO_BBR,
          Endpoint.CC_ALGO_RENO_STR,
          Endpoint.CC_ALGO_CUBIC_STR,
          Endpoint.CC_ALGO_BBR_STR,
        ],
        invalid: [-1, 4, 1n, 'a', null, false, true, {}, [], () => {}],
      },
      {
        key: 'udpReceiveBufferSize',
        valid: [0, 1, 2, 3, 4, 1000],
        invalid: [-1, 'a', null, false, true, {}, [], () => {}],
      },
      {
        key: 'udpSendBufferSize',
        valid: [0, 1, 2, 3, 4, 1000],
        invalid: [-1, 'a', null, false, true, {}, [], () => {}],
      },
      {
        key: 'udpTTL',
        valid: [0, 1, 2, 3, 4, 255],
        invalid: [-1, 256, 'a', null, false, true, {}, [], () => {}],
      },
      {
        key: 'resetTokenSecret',
        valid: [
          new Uint8Array(16),
          new Uint16Array(8),
          new Uint32Array(4),
        ],
        invalid: [
          'a', null, false, true, {}, [], () => {},
          new Uint8Array(15),
          new Uint8Array(17),
          new ArrayBuffer(16),
        ],
      },
      {
        key: 'tokenSecret',
        valid: [
          new Uint8Array(16),
          new Uint16Array(8),
          new Uint32Array(4),
        ],
        invalid: [
          'a', null, false, true, {}, [], () => {},
          new Uint8Array(15),
          new Uint8Array(17),
          new ArrayBuffer(16),
        ],
      },
      {
        // Unknown options are ignored entirely for any value type
        key: 'ignored',
        valid: ['a', null, false, true, {}, [], () => {}],
        invalid: [],
      },
    ];

    for (const { key, valid, invalid } of cases) {
      for (const value of valid) {
        const options = {};
        options[key] = value;
        new Endpoint(callbackConfig, options);
      }

      for (const value of invalid) {
        const options = {};
        options[key] = value;
        throws(() => new Endpoint(callbackConfig, options), {
          code: 'ERR_INVALID_ARG_VALUE',
        });
      }
    }
  });

  const endpoint = new Endpoint(callbackConfig, {});
  test('endpoint can be ref/unrefed without error', () => {
    endpoint.unref();
    endpoint.ref();
  });

  test('endpoint can be inspected', () => {
    strictEqual(typeof inspect(endpoint), 'string');
  });

  test('endpoint with object address', () => {
    new Endpoint(callbackConfig, {
      address: { host: '127.0.0.1:0' },
    });
    throws(() => new Endpoint(callbackConfig, { address: '127.0.0.1:0' }), {
      code: 'ERR_INVALID_ARG_TYPE',
    });
  });

  endpoint.close();
  await endpoint.closed;
});
