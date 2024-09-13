import { spawnPromisified } from '../common/index.mjs';
import * as fixtures from '../common/fixtures.mjs';
import assert from 'node:assert';
import { execPath } from 'node:process';
import { describe, it } from 'node:test';

// Helper function to assert the spawned process
async function assertSpawnedProcess(args, options = {}, expected = {}) {
  const { code, signal, stderr, stdout } = await spawnPromisified(execPath, args, options);

  if (expected.stderr) {
    assert.match(stderr, expected.stderr);
  }

  if (expected.stdout) {
    assert.match(stdout, expected.stdout);
  }

  assert.strictEqual(code, expected.code ?? 0);
  assert.strictEqual(signal, expected.signal ?? signal);
}

// Common expectation for experimental feature warning in stderr
const experimentalFeatureWarning = { stderr: /--entry-url is an experimental feature/ };

describe('--entry-url', { concurrency: true }, () => {
  it('should reject loading absolute path that contains %', async () => {
    await assertSpawnedProcess(
      ['--entry-url', fixtures.path('es-modules/test-esm-double-encoding-native%20.mjs')],
      {},
      {
        code: 1,
        stderr: /ERR_MODULE_NOT_FOUND/,
      }
    );
  });

  it('should support loading properly encoded absolute Unix path', async () => {
    await assertSpawnedProcess(
      ['--entry-url', fixtures.fileURL('es-modules/test-esm-double-encoding-native%20.mjs').pathname],
      {},
      experimentalFeatureWarning
    );
  });

  it('should support loading absolute URLs', async () => {
    await assertSpawnedProcess(
      ['--entry-url', fixtures.fileURL('printA.js')],
      {},
      {
        ...experimentalFeatureWarning,
        stdout: /A/,
      }
    );
  });

  it('should support loading relative URLs', async () => {
    await assertSpawnedProcess(
      ['--entry-url', 'es-modules/print-entrypoint.mjs?key=value#hash'],
      { cwd: fixtures.fileURL('./') },
      {
        ...experimentalFeatureWarning,
        stdout: /print-entrypoint\.mjs\?key=value#hash/,
      }
    );
  });

  it('should support loading `data:` URLs', async () => {
    await assertSpawnedProcess(
      ['--entry-url', 'data:text/javascript,console.log(import.meta.url)'],
      {},
      {
        ...experimentalFeatureWarning,
        stdout: /data:text\/javascript,console\.log\(import\.meta\.url\)/,
      }
    );
  });

  it('should support loading TypeScript URLs', async () => {
    const typescriptUrls = [
      'typescript/cts/test-require-ts-file.cts',
      'typescript/mts/test-import-ts-file.mts',
    ];

    for (const url of typescriptUrls) {
      await assertSpawnedProcess(
        ['--entry-url', '--experimental-strip-types', fixtures.fileURL(url)],
        {},
        {
          ...experimentalFeatureWarning,
          stdout: /Hello, TypeScript!/,
        }
      );
    }
  });

});
