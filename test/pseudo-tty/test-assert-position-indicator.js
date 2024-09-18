'use strict';
require('../common');
const assert = require('assert');

process.env.NODE_DISABLE_COLORS = true;
process.stderr.columns = 20;

function checkStrings() {
  assert.strictEqual('123456789ABCDEFGHI', '1!3!5!7!9!BC!!!GHI');
}

// Confirm that there is no position indicator.
assert.throws(
  () => { checkStrings(); },
  (err) => !err.message.includes('^'),
);

process.stderr.columns = 80;

// Confirm that there is a position indicator.
assert.throws(
  () => { checkStrings(); },
  {
    message: 'Expected values to be strictly equal:\n' +
      '\n' +
      "'123456789ABCDEFGHI' !== '1!3!5!7!9!BC!!!GHI'\n" +
      '  ^ ^ ^ ^ ^  ^^^    \n',
  },
);
