'use strict';

const {
  Array,
  ArrayPrototypeFill,
  ArrayPrototypeJoin,
  ArrayPrototypePush,
  ArrayPrototypeSlice,
  ArrayPrototypeSplice,
  StringPrototypeEndsWith,
  StringPrototypeIndexOf,
  StringPrototypeSlice,
  StringPrototypeSplit,
} = primordials;

const colors = require('internal/util/colors');
const { inspect } = require('internal/util/inspect');

const kStartSingleArrayPlaceholder = '|**~__';
const kEndSingleArrayPlaceholder = '__~**|';
const kMaxStringLength = 512;
const kNopLinesToCollapse = 5;

function inspectValue(val, additionalConfig = {}) {
  return inspect(val, {
    compact: false,
    customInspect: false,
    depth: 1000,
    maxArrayLength: Infinity,
    showHidden: false,
    showProxy: false,
    sorted: true,
    getters: true,
    ...additionalConfig,
  });
}

function areLinesEqual(actual, expected, checkCommaDisparity) {
  if (!checkCommaDisparity) {
    return actual === expected;
  }
  return actual === expected || `${actual},` === expected || actual === `${expected},`;
}

function getSingularizeArrayValuesString(value) {
  return `${kStartSingleArrayPlaceholder}${value}${kEndSingleArrayPlaceholder}`;
}

function removePlaceholder(value) {
  const startIndex = StringPrototypeIndexOf(value, kStartSingleArrayPlaceholder);
  const endIndex = StringPrototypeIndexOf(value, kEndSingleArrayPlaceholder) + kEndSingleArrayPlaceholder.length;

  if (startIndex !== -1 && endIndex !== -1) {
    return StringPrototypeSlice(value, 0, startIndex) + StringPrototypeSlice(value, endIndex);
  }

  return value;
}

function cleanDiffFromSingularizedArrays(diff) {
  for (let i = 0; i < diff.length; i++) {
    diff[i].value = removePlaceholder(diff[i].value);
  }
  return diff;
}

const inspectOptions = { getSingularizeArrayValuesString };

function myersDiff(actual, expected) {
  const checkCommaDisparity = actual != null && typeof actual === 'object';

  actual = StringPrototypeSplit(inspectValue(actual, inspectOptions), '\n');
  expected = StringPrototypeSplit(inspectValue(expected, inspectOptions), '\n');

  const actualLength = actual.length;
  const expectedLength = expected.length;
  const max = actualLength + expectedLength;
  const v = ArrayPrototypeFill(Array(2 * max + 1), 0);

  const trace = [];

  for (let diffLevel = 0; diffLevel <= max; diffLevel++) {
    const newTrace = ArrayPrototypeSlice(v);
    ArrayPrototypePush(trace, newTrace);

    for (let diagonalIndex = -diffLevel; diagonalIndex <= diffLevel; diagonalIndex += 2) {
      let x;
      if (diagonalIndex === -diffLevel ||
        (diagonalIndex !== diffLevel && v[diagonalIndex - 1 + max] < v[diagonalIndex + 1 + max])) {
        x = v[diagonalIndex + 1 + max];
      } else {
        x = v[diagonalIndex - 1 + max] + 1;
      }

      let y = x - diagonalIndex;

      while (x < actualLength && y < expectedLength && areLinesEqual(actual[x], expected[y], checkCommaDisparity)) {
        x++;
        y++;
      }

      v[diagonalIndex + max] = x;

      if (x >= actualLength && y >= expectedLength) {
        const diff = backtrack(trace, actual, expected, checkCommaDisparity);
        return cleanDiffFromSingularizedArrays(diff);
      }
    }
  }
}

function backtrack(trace, actual, expected, checkCommaDisparity) {
  const actualLength = actual.length;
  const expectedLength = expected.length;
  const max = actualLength + expectedLength;

  let x = actualLength;
  let y = expectedLength;
  const result = [];

  for (let diffLevel = trace.length - 1; diffLevel >= 0; diffLevel--) {
    const v = trace[diffLevel];
    const diagonalIndex = x - y;
    let prevDiagonalIndex;

    if (diagonalIndex === -diffLevel ||
      (diagonalIndex !== diffLevel && v[diagonalIndex - 1 + max] < v[diagonalIndex + 1 + max])) {
      prevDiagonalIndex = diagonalIndex + 1;
    } else {
      prevDiagonalIndex = diagonalIndex - 1;
    }

    const prevX = v[prevDiagonalIndex + max];
    const prevY = prevX - prevDiagonalIndex;

    while (x > prevX && y > prevY) {
      const value = !checkCommaDisparity ||
        StringPrototypeEndsWith(actual[x - 1], ',') ? actual[x - 1] : expected[y - 1];
      ArrayPrototypePush(result, { __proto__: null, type: 'nop', value });
      x--;
      y--;
    }

    if (diffLevel > 0) {
      if (x > prevX) {
        ArrayPrototypePush(result, { __proto__: null, type: 'insert', value: actual[x - 1] });
        x--;
      } else {
        ArrayPrototypePush(result, { __proto__: null, type: 'delete', value: expected[y - 1] });
        y--;
      }
    }
  }

  return result.reverse();
}

function formatValue(value) {
  if (value.length > kMaxStringLength) {
    return `${StringPrototypeSlice(value, 0, kMaxStringLength + 1)}...`;
  }
  return value;
}

function pushGroupedLinesMessage(message, color) {
  ArrayPrototypeSplice(message, message.length - 1, 0, `${colors[color]}...${colors.white}`);
}

function getSimpleDiff(diff, isStringComparison) {
  const actual = formatValue(diff[0].value);
  const expected = formatValue((diff[1] || diff[0]).value);

  let message = `${actual} !== ${expected}`;
  const maxTerminalLength = process.stderr.isTTY ? process.stderr.columns : 80;
  const comparisonLength = (StringPrototypeSlice(actual, 1, -1).length + StringPrototypeSlice(expected, 1, -1).length);
  const showIndicator = isStringComparison && (comparisonLength <= maxTerminalLength);

  if (showIndicator) {
    let indicator = '';
    for (let i = 0; i < actual.length; i++) {
      indicator += actual[i] !== expected[i] ? '^' : ' ';
    }
    message += `\n${indicator}`;
  }

  return message;
}

function printMyersDiff(diff, simpleDiff, isStringComparison) {
  if (simpleDiff) {
    return { __proto__: null, message: getSimpleDiff(diff, isStringComparison), skipped: false };
  }

  const message = [];
  let skipped = false;
  let previousType = 'null';
  let nopCount = 0;
  let lastInserted = null;
  let lastDeleted = null;
  let identicalInsertedCount = 0;
  let identicalDeletedCount = 0;

  for (let diffIdx = 0; diffIdx < diff.length; diffIdx++) {
    const { type, value } = diff[diffIdx];
    const typeChanged = previousType && (type !== previousType);

    if (type === 'insert') {
      if (!typeChanged && (lastInserted === value)) {
        identicalInsertedCount++;
      } else {
        ArrayPrototypePush(message, `${colors.green}+${colors.white} ${formatValue(value)}`);
      }
    } else if (type === 'delete') {
      if (!typeChanged && (lastDeleted === value)) {
        identicalDeletedCount++;
      } else {
        ArrayPrototypePush(message, `${colors.red}-${colors.white} ${formatValue(value)}`);
      }
    } else if (type === 'nop') {
      if (nopCount <= kNopLinesToCollapse) {
        ArrayPrototypePush(message, `${colors.white}  ${formatValue(value)}`);
      }
      nopCount++;
    }

    const shouldGroupInsertedLines = ((previousType === 'insert' && typeChanged) ||
      (type === 'insert' && lastInserted !== value)) && identicalInsertedCount;
    const shouldGroupDeletedLines = ((previousType === 'delete' && typeChanged) ||
      (type === 'delete' && lastDeleted !== value)) && identicalDeletedCount;

    if (typeChanged && previousType === 'nop') {
      if (nopCount > kNopLinesToCollapse) {
        pushGroupedLinesMessage(message, 'blue');
        skipped = true;
      }
      nopCount = 0;
    } else if (shouldGroupInsertedLines) {
      pushGroupedLinesMessage(message, 'green');
      identicalInsertedCount = 0;
      skipped = true;
    } else if (shouldGroupDeletedLines) {
      pushGroupedLinesMessage(message, 'red');
      identicalDeletedCount = 0;
      skipped = true;
    }

    if (type === 'insert') {
      lastInserted = value;
    } else if (type === 'delete') {
      lastDeleted = value;
    }

    previousType = type;
  }

  return { __proto__: null, message: `\n${ArrayPrototypeJoin(message, '\n')}`, skipped };
}

module.exports = { myersDiff, printMyersDiff };
