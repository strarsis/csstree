'use strict';

var constants = require('./const');
var PUNCTUATION = constants.PUNCTUATION;
var SYMBOL_TYPE = constants.SYMBOL_TYPE;
var SYMBOL_TYPE_LENGTH = SYMBOL_TYPE.length;
var TYPE = constants.TYPE;
var FULLSTOP = TYPE.FullStop;
var PLUSSIGN = TYPE.PlusSign;
var HYPHENMINUS = TYPE.HyphenMinus;
var PUNCTUATOR = TYPE.Punctuator;
var TAB = 9;
var N = 10;
var F = 12;
var R = 13;
var SPACE = 32;
var BACK_SLASH = 92;
var E = 101; // 'e'.charCodeAt(0)

function firstCharOffset(source) {
    // detect BOM (https://en.wikipedia.org/wiki/Byte_order_mark)
    if (source.charCodeAt(0) === 0xFEFF ||  // UTF-16BE
        source.charCodeAt(0) === 0xFFFE) {  // UTF-16LE
        return 1;
    }

    return 0;
}

function isHex(code) {
    return (code >= 48 && code <= 57) || // 0 .. 9
           (code >= 65 && code <= 70) || // A .. F
           (code >= 97 && code <= 102);  // a .. f
}

function isNumber(code) {
    return code >= 48 && code <= 57;
}

function isNewline(source, offset, code) {
    if (code === N || code === F || code === R) {
        if (code === R && offset + 1 < source.length && source.charCodeAt(offset + 1) === N) {
            return 2;
        }

        return 1;
    }

    return 0;
}

function cmpChar(testStr, offset, referenceCode) {
    var code = testStr.charCodeAt(offset);

    // code.toLowerCase()
    if (code >= 65 && code <= 90) {
        code = code | 32;
    }

    return code === referenceCode;
}

function cmpStr(testStr, start, end, referenceStr) {
    if (end - start !== referenceStr.length) {
        return false;
    }

    if (start < 0 || end > testStr.length) {
        return false;
    }

    for (var i = start; i < end; i++) {
        var testCode = testStr.charCodeAt(i);
        var refCode = referenceStr.charCodeAt(i - start);

        // testStr[i].toLowerCase()
        if (testCode >= 65 && testCode <= 90) {
            testCode = testCode | 32;
        }

        if (testCode !== refCode) {
            return false;
        }
    }

    return true;
}

function endsWith(testStr, referenceStr) {
    return cmpStr(testStr, testStr.length - referenceStr.length, testStr.length, referenceStr);
}

function findLastNonSpaceLocation(scanner) {
    for (var i = scanner.source.length - 1; i >= 0; i--) {
        var code = scanner.source.charCodeAt(i);

        if (code !== SPACE && code !== TAB && code !== R && code !== N && code !== F) {
            break;
        }
    }

    return scanner.getLocation(i + 1);
}

function findWhitespaceEnd(source, offset) {
    for (; offset < source.length; offset++) {
        var code = source.charCodeAt(offset);

        if (code !== SPACE && code !== TAB && code !== R && code !== N && code !== F) {
            break;
        }
    }

    return offset;
}

function findCommentEnd(source, offset) {
    var commentEnd = source.indexOf('*/', offset);

    if (commentEnd === -1) {
        return source.length;
    }

    return commentEnd + 2;
}

function findStringEnd(source, offset, quote) {
    for (; offset < source.length; offset++) {
        var code = source.charCodeAt(offset);

        // TODO: bad string
        if (code === BACK_SLASH) {
            offset++;
        } else if (code === quote) {
            offset++;
            break;
        }
    }

    return offset;
}

function findDecimalNumberEnd(source, offset) {
    for (; offset < source.length; offset++) {
        var code = source.charCodeAt(offset);

        if (code < 48 || code > 57) {  // not a 0 .. 9
            break;
        }
    }

    return offset;
}

function findNumberEnd(source, offset, allowFraction) {
    var code;

    offset = findDecimalNumberEnd(source, offset);

    // fraction: .\d+
    if (allowFraction && offset + 1 < source.length && source.charCodeAt(offset) === FULLSTOP) {
        code = source.charCodeAt(offset + 1);

        if (isNumber(code)) {
            offset = findDecimalNumberEnd(source, offset + 1);
        }
    }

    // exponent: e[+-]\d+
    if (offset + 1 < source.length) {
        if ((source.charCodeAt(offset) | 32) === E) { // case insensitive check for `e`
            code = source.charCodeAt(offset + 1);

            if (code === PLUSSIGN || code === HYPHENMINUS) {
                if (offset + 2 < source.length) {
                    code = source.charCodeAt(offset + 2);
                }
            }

            if (isNumber(code)) {
                offset = findDecimalNumberEnd(source, offset + 2);
            }
        }
    }

    return offset;
}

// skip escaped unicode sequence that can ends with space
// [0-9a-f]{1,6}(\r\n|[ \n\r\t\f])?
function findEscaseEnd(source, offset) {
    for (var i = 0; i < 7 && offset + i < source.length; i++) {
        var code = source.charCodeAt(offset + i);

        if (i !== 6 && isHex(code)) {
            continue;
        }

        if (i > 0) {
            offset += i - 1 + isNewline(source, offset + i, code);
            if (code === SPACE || code === TAB) {
                offset++;
            }
        }

        break;
    }

    return offset;
}

function findIdentifierEnd(source, offset) {
    for (; offset < source.length; offset++) {
        var code = source.charCodeAt(offset);

        if (code === BACK_SLASH) {
            offset = findEscaseEnd(source, offset + 1);
        } else if (code < SYMBOL_TYPE_LENGTH && PUNCTUATION[code] === PUNCTUATOR) {
            break;
        }
    }

    return offset;
}

module.exports = {
    firstCharOffset: firstCharOffset,

    isHex: isHex,
    isNumber: isNumber,
    isNewline: isNewline,

    cmpChar: cmpChar,
    cmpStr: cmpStr,
    endsWith: endsWith,

    findLastNonSpaceLocation: findLastNonSpaceLocation,
    findWhitespaceEnd: findWhitespaceEnd,
    findCommentEnd: findCommentEnd,
    findStringEnd: findStringEnd,
    findDecimalNumberEnd: findDecimalNumberEnd,
    findNumberEnd: findNumberEnd,
    findEscaseEnd: findEscaseEnd,
    findIdentifierEnd: findIdentifierEnd
};
