'use strict';
const { emitExperimentalWarning } = require('internal/util');

emitExperimentalWarning('SQLite');
module.exports = internalBinding('sqlite');

const statementIterate = module.exports.StatementSync.prototype.iterate;
module.exports.StatementSync.prototype.iterate = function iterate() {
  return Iterator.from(statementIterate.apply(this, arguments));
}
