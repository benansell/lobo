import * as Chalk from "chalk";
import * as _ from "lodash";
import {createLogger, Logger} from "./logger";

export interface Difference {
  readonly left: string;
  readonly right: string;
}

interface Item {
  hint: string;
  key: string;
  value: string;
}

interface NumberDetail {
  decimal: string;
  fraction: string;
  whole: string;
}

export interface Comparer {
  diff(left: string, right: string): Difference;
}

export class ComparerImp {

  private logger: Logger;

  public constructor(logger: Logger) {
    this.logger = logger;
  }

  public diff(left: string, right: string): Difference {
    let curly = /^{.*}/;
    let quote = /^".*"/;
    let round = /^\(.*\)/;
    let square = /^\[.*]/;
    let union = /\s+/;

    try {
      if (curly.test(left) || curly.test(right)) {
        return this.diffRecord(left, right);
      } else if (quote.test(left) || quote.test(right)) {
        return this.diffValueWithToken(left, right, "\"");
      } else if (round.test(left) || round.test(right)) {
        return this.diffValueWithToken(left, right, "(");
      } else if (square.test(left) || square.test(right)) {
        return this.diffList(left, right);
      } else if (union.test(left) || union.test(right)) {
        return this.diffUnion(left, right);
      }

      return this.diffValue(left, right);
    } catch (err) {
      let unknown = "?";
      this.logger.error("Error during diff ( see \"" + unknown + "\" below)");
      this.logger.error("Please re-run with verbose option and report the issue");
      this.logger.debug("Error during diff - Left", left);
      this.logger.debug("Error during diff - Right", right);
      this.logger.debug("Error during diff - Error", err);
      let leftLength = left ? left.length : 0;
      let rightLength = right ? right.length : 0;

      return {
        left: Chalk.yellow(_.repeat(unknown, leftLength)),
        right: Chalk.yellow(_.repeat(unknown, rightLength))
      };
    }
  }

  public diffValueWithToken(left: string, right: string, token: string): Difference {
    let l = left.indexOf(token) === -1 ? left : left.substring(1, left.length - 1);
    let r = right.indexOf(token) === -1 ? right : right.substring(1, right.length - 1);
    let valueWithoutToken;
    let spacer: string;

    if (token === "\"") {
      valueWithoutToken = this.diffValue(l, r);
      spacer = left !== right && l === r ? "^" : " ";
    } else {
      valueWithoutToken = this.diff(l, r);
      spacer = left !== right && (l === r || l === "" || r === "") ? "^" : " ";
    }

    let leftSpacer = left === l ? "" : spacer;
    let rightSpacer = right === r ? "" : spacer;

    let value = {left: leftSpacer + valueWithoutToken.left + leftSpacer, right: rightSpacer + valueWithoutToken.right + rightSpacer };

    return value;
  }

  public diffUnion(left: string, right: string): Difference {
    let leftUnion = this.parse(left, " ");
    let rightUnion = this.parse(right, " ");
    let token = /[{[("]/;
    let i = 0;
    let j = 0;
    let acc = {left: "", right: ""};
    let leftMax = leftUnion.length - 1;
    let rightMax = rightUnion.length - 1;

    while (i <= leftMax || j <= rightMax) {
      let l = i > leftMax ? "" : leftUnion[i];
      let r = j > rightMax ? "" : rightUnion[j];
      let value;

      // check for union where args are of different types
      if ((token.test(l) || token.test(r)) && l[0] !== r[0]) {
        value = {left: _.repeat(" ", l.length), right: _.repeat("^", r.length)};
      } else {
        value = this.diff(l, r);
      }

      let isLastItem = i > leftMax && j === rightMax || j > rightMax && j === leftMax;
      let itemsExistInBothLists = l !== "" && r !== "";
      let spacer = isLastItem || itemsExistInBothLists ? " " : "^";
      let leftSpacer = i === leftMax || value.left === "" ? "" : spacer;
      let rightSpacer = j === rightMax || value.right === "" ? "" : spacer;
      acc.left += value.left + leftSpacer;
      acc.right += value.right + rightSpacer;
      i++;
      j++;
    }

    return acc;
  }

  public diffList(left: string, right: string): Difference {
    let leftList = this.deconstructList(left);
    let rightList = this.deconstructList(right);
    let i = 0;
    let j = 0;
    let acc = {left: " ", right: " "};
    let leftMax = leftList.length - 1;
    let rightMax = rightList.length - 1;

    while (i <= leftMax || j <= rightMax) {
      let l = i > leftMax ? "" : leftList[i];
      let r = j > rightMax ? "" : rightList[j];
      let isLastItem = i > leftMax && j === rightMax || j > rightMax && i === leftMax;

      let value: Difference;

      if (l === r) {
        let noDifference = _.repeat(" ", l.length);
        value = <Difference> { left: noDifference, right: noDifference };
        i++;
        j++;
      } else if (rightList.indexOf(l, j) > 0) {
        value = this.diff("", r);
        j++;
      } else if (leftList.indexOf(r, i) > 0) {
        value = this.diff(l, "");
        i++;
      } else {
        value = this.diff(l, r);
        i++;
        j++;
      }

      let itemsExistInBothLists = l !== "" && r !== "";
      let spacer = isLastItem || itemsExistInBothLists ? " " : "^";
      let leftSpacer = value.left === "" ? "" : spacer;
      let rightSpacer = value.right === "" ? "" : spacer;
      acc.left += value.left + leftSpacer;
      acc.right += value.right + rightSpacer;
    }

    // correct empty list length;
    if (acc.left.length === 1) {
      acc.left += " ";
    }

    if (acc.right.length === 1) {
      acc.right += " ";
    }

    return acc;
  }

  public deconstructList(str: string): string[] {
    if (str === "[]") {
      return [];
    }

    let inner = this.removeToken(str, "[", "]");

    return this.parse(inner, ",");
  }

  public diffRecord(left: string, right: string): Difference {
    let leftRecord = this.deconstructRecord(left);
    let rightRecord = this.deconstructRecord(right);

    let makeKeyCompareFor = (item: Item) => (x: Item) => x.key === item.key;

    // check for differences
    for (let j = 0; j < leftRecord.length; j++) {
      let leftItem = leftRecord[j];
      let rightItem = _.find(rightRecord, makeKeyCompareFor(leftItem));

      if (rightItem) {
        let value = this.diff(leftItem.value, rightItem.value);
        leftItem.hint = value.left + leftItem.hint;
        rightItem.hint = value.right + rightItem.hint;
      } else {
        leftItem.hint = _.repeat("^", leftItem.key.length + leftItem.value.length + leftItem.hint.length + 3);
        leftItem.key = "";
      }
    }

    // check for keys in right not in left
    for (let k = 0; k < rightRecord.length; k++) {
      let item = rightRecord[k];
      let l = _.find(leftRecord, makeKeyCompareFor(item));

      if (!l) {
        if (rightRecord.length === 1) {
          item.hint = _.repeat("^", item.key.length + item.value.length + item.hint.length + 3);
          item.key = "";
        } else {
          let suffix = k === rightRecord.length - 1 ? " " : "^";
          item.hint = "  " + _.repeat("^", item.key.length + item.value.length + item.hint.length - 1) + suffix + " ";
          item.key = "";
        }
      }
    }

    return {left: this.constructRecord(leftRecord), right: this.constructRecord(rightRecord)};
  }

  public deconstructRecord(str: string): Item[] {
    if (str === "") {
      return [];
    }

    let inner = this.removeToken(str, "{", "}");
    let values = this.parse(inner, ",");
    let record = [];

    for (let i = 0; i < values.length; i++) {
      let parts = this.parse(values[i], "=");
      let value = parts[1].trim();
      let hint = _.repeat(" ", parts[1].length - value.length);
      record.push({key: parts[0], value: value, hint: hint});
    }

    return record;
  }

  public parse(str: string, token: string): string[] {
    let values = [];
    let lastIndex = -1;
    let count = 0;

    for (let i = 0; i < str.length; i++) {
      let c = str[i];

      if (c === "{" || c === "[" || c === "(") {
        count++;
      } else if (c === "}" || c === "]" || c === ")") {
        count--;
      } else if (count === 0 && c === token) {
        values.push(str.substring(lastIndex + 1, i));
        lastIndex = i;
      }
    }

    values.push(str.substring(lastIndex + 1));

    return values;
  }

  public constructRecord(parts: Item[]): string {
    if (parts.length === 0) {
      return "";
    }

    let record = " ";

    for (let i = 0; i < parts.length; i++) {
      let p = parts[i];

      if (p.key) {
        record += _.repeat(" ", p.key.length + 2) + p.hint;
      } else {
        record = record.substring(0, record.length - 1) + p.hint;
      }
    }

    return record;
  }

  public removeToken(str: string, start: string, end: string): string {
    let from = str.indexOf(start);
    let to = str.lastIndexOf(end);

    return str.substring(from + 1, to);
  }

  public diffValue(left: string, right: string): Difference {
    let isNumeric = /-?\d+(?:.\d+)?(?:e[+|-]\d+)?/;
    let matchLeft = isNumeric.exec(left);
    let matchRight = isNumeric.exec(right);

    if (matchLeft && matchLeft[0].length === left.length && matchRight && matchRight[0].length === right.length) {
      return this.diffNumericValue(left, right);
    }

    return this.diffNonNumericValue(left, right);
  }

  public diffNumericValue(left: string, right: string): Difference {
    let l = this.splitNumber(left);
    let r = this.splitNumber(right);

    let whole = this.diffNonNumericValue(this.reverse(l.whole), this.reverse(r.whole));
    let fraction = this.diffNonNumericValue(l.fraction, r.fraction);

    let result = {
      left: this.reverse(whole.left) + l.decimal + fraction.left,
      right: this.reverse(whole.right) + r.decimal + fraction.right
    };

    return result;
  }

  public reverse(s: string): string {
    return s.split("").reverse().join("");
  }

  public splitNumber(str: string): NumberDetail {
    let result = {whole: "", fraction: "", decimal: ""};

    let parts = str.split(/\./);
    result.whole = parts[0];

    if (parts.length > 1) {
      result.decimal = " ";
      result.fraction = parts[1];
    }

    return result;
  }

  public diffNonNumericValue(left: string, right: string): Difference {
    let i = 0;
    let j = 0;
    let result = {left: "", right: ""};
    let ioffset = -1;
    let joffset = -1;

    if (left.length < right.length) {
      let matchRight = right.match(new RegExp(left));
      ioffset = matchRight && matchRight.index ? matchRight.index : -1;
    } else if (left.length > right.length) {
      let matchLeft = left.match(new RegExp(right));
      joffset = matchLeft && matchLeft.index ? matchLeft.index : -1;
    }

    while (i < left.length || j < right.length) {
      let l = j < ioffset || i >= left.length ? null : left[i];
      let r = i < joffset || j >= right.length ? null : right[j];

      if (l === r) {
        result.left += " ";
        result.right += " ";
      } else if (left.length === right.length) {
        result.left += " ";
        result.right += "^";
      } else if (left.length <= right.length) {
        result.right += "^";

        if (l && i > ioffset) {
          result.left += " ";
        }
      } else {
        result.left += "^";

        if (r && j > joffset) {
          result.right += " ";
        }
      }

      let previousI = i;

      if (j >= ioffset) {
        i++;
      }

      if (previousI >= joffset) {
        j++;
      }
    }

    return result;
  }
}

export function createComparer(): Comparer {
  return new ComparerImp(createLogger());
}
