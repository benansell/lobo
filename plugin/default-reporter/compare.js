'use strict';

const _ = require('lodash');
const chalk = require('chalk');
var logger = require('./../../lib/logger').create();

function diff(left, right) {
  var curly = /^\{.*}/;
  var quote = /^".*"/;
  var round = /^\(.*\)/;
  var square = /^\[.*]/;
  var union = /\s+/;

  try {
    if (curly.test(left) || curly.test(right)) {
      return diffRecord(left, right);
    } else if (quote.test(left) || quote.test(right)) {
      return diffValueWithToken(left, right, '"');
    } else if (round.test(left) || round.test(right)) {
      return diffValueWithToken(left, right, '(');
    } else if (square.test(left) || square.test(right)) {
      return diffList(left, right);
    } else if (union.test(left) || union.test(right)) {
      return diffUnion(left, right);
    }

    return diffValue(left, right);
  } catch (err) {
    var unknown = chalk.yellow('?');
    logger.error('Error during diff ( see \'' + unknown + '\' below)');
    logger.error('Please re-run with verbose option and report the issue');
    logger.debug('Error during diff - Left', left);
    logger.debug('Error during diff - Right', right);
    logger.debug('Error during diff - Error', err);
    var leftLength = left ? left.length : 0;
    var rightLength = right ? right.length : 0;

    return {
      left: _.repeat(unknown, leftLength),
      right: _.repeat(unknown, rightLength)
    };
  }
}

function diffValueWithToken(left, right, token) {
  var l = left.indexOf(token) === -1 ? left : left.substring(1, left.length - 1);
  var r = right.indexOf(token) === -1 ? right : right.substring(1, right.length - 1);
  var value;

  if (token === '"') {
    value = diffValue(l, r);
  } else {
    value = diff(l, r);
  }

  var spacerOnTokenDiff = token === '"' ? ' ' : '^';
  var spacer = left === l && right === r ? ' ' : spacerOnTokenDiff;
  var leftSpacer = left === l ? '' : spacer;
  var rightSpacer = right === r ? '' : spacer;
  value.left = leftSpacer + value.left + leftSpacer;
  value.right = rightSpacer + value.right + rightSpacer;

  return value;
}

function diffUnion(left, right) {
  var leftUnion = parse(left, ' ');
  var rightUnion = parse(right, ' ');
  var token = /[{\[("]/;
  var i = 0;
  var j = 0;
  var acc = {left: '', right: ''};
  var leftMax = leftUnion.length - 1;
  var rightMax = rightUnion.length - 1;

  while (i <= leftMax || j <= rightMax) {
    var l = i > leftMax ? '' : leftUnion[i];
    var r = j > rightMax ? '' : rightUnion[j];
    var value;

    // check for union where args are of different types
    if ((token.test(l) || token.test(r)) && l[0] !== r[0]) {
      value = {left: _.repeat(' ', l.length), right: _.repeat('^', r.length)};
    } else {
      value = diff(l, r);
    }

    var isLastItem = i > leftMax && j === rightMax || j > rightMax && j === leftMax;
    var itemsExistInBothLists = l !== '' && r !== '';
    var spacer = isLastItem || itemsExistInBothLists ? ' ' : '^';
    var leftSpacer = i === leftMax || value.left === '' ? '' : spacer;
    var rightSpacer = j === rightMax || value.right === '' ? '' : spacer;
    acc.left += value.left + leftSpacer;
    acc.right += value.right + rightSpacer;
    i++;
    j++;
  }

  return acc;
}

function diffList(left, right) {
  var leftList = deconstructList(left);
  var rightList = deconstructList(right);
  var i = 0;
  var j = 0;
  var acc = {left: ' ', right: ' '};
  var leftMax = leftList.length - 1;
  var rightMax = rightList.length - 1;

  while (i <= leftMax || j <= rightMax) {
    var l = i > leftMax ? '' : leftList[i];
    var r = j > rightMax ? '' : rightList[j];

    var value = diff(l, r);
    var isLastItem = i > leftMax && j === rightMax || j > rightMax && j === leftMax;
    var itemsExistInBothLists = l !== '' && r !== '';
    var spacer = isLastItem || itemsExistInBothLists ? ' ' : '^';
    var leftSpacer = value.left === '' ? '' : spacer;
    var rightSpacer = value.right === '' ? '' : spacer;
    acc.left += value.left + leftSpacer;
    acc.right += value.right + rightSpacer;
    i++;
    j++;
  }

  // correct empty list length;
  if (acc.left.length === 1) {
    acc.left += ' ';
  }

  if (acc.right.length === 1) {
    acc.right += ' ';
  }

  return acc;
}

function deconstructList(str) {
  if (str === '[]') {
    return [];
  }

  var inner = removeToken(str, '[', ']');

  return parse(inner, ',');
}

function diffRecord(left, right) {
  var leftRecord = deconstructRecord(left);
  var rightRecord = deconstructRecord(right);

  var makeKeyCompareFor = function(item) {
    return function(x) {
      return x.key === item.key;
    };
  };

  // check for differences
  for (var j = 0; j < leftRecord.length; j++) {
    var leftItem = leftRecord[j];
    var rightItem = _.find(rightRecord, makeKeyCompareFor(leftItem));

    if (rightItem) {
      var value = diff(leftItem.value, rightItem.value);
      leftItem.hint = value.left + leftItem.hint;
      rightItem.hint = value.right + rightItem.hint;
    } else {
      leftItem.hint = _.repeat('^', leftItem.key.length + leftItem.value.length + leftItem.hint.length + 3);
      leftItem.key = null;
      leftItem.value = null;
    }
  }

  // check for keys in right not in left
  for (var k = 0; k < rightRecord.length; k++) {
    var item = rightRecord[k];
    var l = _.find(leftRecord, makeKeyCompareFor(item));

    if (!l) {
      if (rightRecord.length === 1) {
        item.hint = _.repeat('^', item.key.length + item.value.length + item.hint.length + 3);
        item.key = null;
        item.value = null;
      } else {
        var suffix = k === rightRecord.length - 1 ? ' ' : '^';
        item.hint = '  ' + _.repeat('^', item.key.length + item.value.length + item.hint.length - 1) + suffix + ' ';
        item.key = null;
        item.value = null;
      }
    }
  }

  return {left: constructRecord(leftRecord), right: constructRecord(rightRecord)};
}

function deconstructRecord(str) {
  if (str === '') {
    return [];
  }

  var inner = removeToken(str, '{', '}');
  var values = parse(inner, ',');
  var record = [];

  for (var i = 0; i < values.length; i++) {
    var parts = parse(values[i], '=');
    var value = parts[1].trim();
    var hint = _.repeat(' ', parts[1].length - value.length);
    record.push({key: parts[0], value: value, hint: hint});
  }

  return record;
}

function parse(str, token) {
  var values = [];
  var lastIndex = -1;
  var count = 0;

  for (var i = 0; i < str.length; i++) {
    var c = str[i];

    if (c === '{' || c === '[' || c === '(') {
      count++;
    } else if (c === '}' || c === ']' || c === ')') {
      count--;
    } else if (count === 0 && c === token) {
      values.push(str.substring(lastIndex + 1, i));
      lastIndex = i;
    }
  }

  values.push(str.substring(lastIndex + 1));

  return values;
}

function constructRecord(parts) {
  if (parts.length === 0) {
    return '';
  }

  var record = ' ';

  for (var i = 0; i < parts.length; i++) {
    var p = parts[i];

    if (p.key) {
      record += _.repeat(' ', p.key.length + 2) + p.hint;
    } else {
      record = record.substring(0, record.length - 1) + p.hint;
    }
  }

  return record;
}

function removeToken(str, start, end) {
  var from = str.indexOf(start);
  var to = str.lastIndexOf(end);

  return str.substring(from + 1, to);
}

function diffValue(left, right) {
  var isNumeric = /-?\d+(?:.\d+)?(?:e[+|-]\d+)?/;
  var matchLeft = isNumeric.exec(left);
  var matchRight = isNumeric.exec(right);

  if (matchLeft && matchLeft[0].length === left.length && matchRight && matchRight[0].length === right.length) {
    return diffNumericValue(left, right);
  }

  return diffNonNumericValue(left, right);
}

function diffNumericValue(left, right) {
  var l = splitNumber(left);
  var r = splitNumber(right);

  var whole = diffNonNumericValue(reverse(l.whole), reverse(r.whole));
  var fraction = diffNonNumericValue(l.fraction, r.fraction);

  var result = {
    left: reverse(whole.left) + l.decimal + fraction.left,
    right: reverse(whole.right) + r.decimal + fraction.right
  };

  return result;
}

function reverse(s) {
  return s.split('').reverse().join('');
}

function splitNumber(str) {
  var result = {whole: '', fraction: '', decimal: ''};

  var parts = str.split(/\./);
  result.whole = parts[0];

  if (parts.length > 1) {
    result.decimal = ' ';
    result.fraction = parts[1];
  }

  return result;
}

function diffNonNumericValue(left, right) {
  var i = 0;
  var j = 0;
  var result = {left: '', right: ''};
  var ioffset = -1;
  var joffset = -1;

  if (left.length < right.length) {
    var matchRight = right.match(new RegExp(left));
    ioffset = matchRight ? matchRight.index : -1;
  } else if (left.length > right.length) {
    var matchLeft = left.match(new RegExp(right));
    joffset = matchLeft ? matchLeft.index : -1;
  }

  while (i < left.length || j < right.length) {
    var l = i < ioffset || i >= left.length ? null : left[i];
    var r = i < joffset || j >= right.length ? null : right[j];

    if (l === r) {
      result.left += ' ';
      result.right += ' ';
    } else if (left.length === right.length) {
      result.left += ' ';
      result.right += '^';
    } else if (left.length <= right.length) {
      result.right += '^';

      if (l && i > ioffset) {
        result.left += ' ';
      }
    } else {
      result.left += '^';

      if (r && j > joffset) {
        result.right += ' ';
      }
    }

    var previousI = i;

    if (j >= ioffset) {
      i++;
    }

    if (previousI >= joffset) {
      j++;
    }
  }

  return result;
}

module.exports = {
  diff: diff,
  diffValue: diffValue
};
