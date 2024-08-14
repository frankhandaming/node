'use strict';
const {
  SafeArrayIterator,
  globalThis,
} = primordials;

const { emitExperimentalWarning } = require('internal/util');

emitExperimentalWarning('SQLite');
module.exports = internalBinding('sqlite');

const {Iterator} = globalThis;
const statementIterate = module.exports.StatementSync.prototype.iterate;
module.exports.StatementSync.prototype.iterate = function iterate() {
  return new SafeArrayIterator(statementIterate.apply(this, arguments));
  return statementIterate.apply(this, arguments);
  return Iterator.from(
    statementIterate.apply(this, arguments)
    // new SafeArrayIterator(statementIterate.apply(this, arguments))
  );
};
