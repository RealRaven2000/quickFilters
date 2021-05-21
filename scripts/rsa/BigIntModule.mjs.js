// import log from ...

  // BigInt, a suite of routines for performing multiple-precision arithmetic in JavaScript.
  //
  // Copyright 1998-2005 David Shapiro.
  //
  // You may use, re-use, abuse,
  // copy, and modify this code to your liking, but please keep this header.
  // Thanks!
  //
  // Dave Shapiro
  // dave@ohdave.com

export var BigIntModule = {
    initialised: false,
    isDebug: false,
    biRadixBase: 2,
    biRadixBits: 16,
    bitsPerDigit: null,
    biRadix: null,
    biHalfRadix : null,
    biRadixSquared : null,
    maxDigitVal : null,
    maxInteger : 9999999999999998,  
    maxDigits: null, // Change this to accommodate your largest number size. Use setMaxDigits() to change it!
    ZERO_ARRAY: [],
    hexatrigesimalToChar: [],
    hexToChar: [],
    highBitMasks: [],
    lowBitMasks: [],
    bigZero:null, 
    bigOne:null,
    dpl10: 15, // The maximum number of digits in base 10 you can convert to an integer without JavaScript throwing up on you.
    // lr10 = 10 ^ dpl10
    lr10 : null,
    
    logDebug: function logDebug(txt) {
      // from RSA.log
      // quickFilters.Util.logDebugOptional('premium.rsa', txt);
      if (this.isDebug)
        console.log(txt);
    },
    
    reset: function reset() {
      this.initialised = false;
    },
    
    init: function init(MaxDigits) {
      if (this.initialised) return;
      this.logDebug('BigInt.init(' + MaxDigits + ')');
      this.bitsPerDigit = this.biRadixBits;
      this.biRadix = 1 << 16; // = 2^16 = 65536
      this.biHalfRadix = this.biRadix >>> 1;
      this.biRadixSquared = this.biRadix * this.biRadix,
      this.maxDigitVal = this.biRadix - 1;
      
      this.setMaxDigits(20); 
      this.lr10 = this.biFromNumber(1000000000000000);
      this.hexatrigesimalToChar = new Array(
       '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
       'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
       'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
       'u', 'v', 'w', 'x', 'y', 'z'
      );
      this.hexToChar = new Array('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f');
      this.highBitMasks = new Array(0x0000, 0x8000, 0xC000, 0xE000, 0xF000, 0xF800,
                             0xFC00, 0xFE00, 0xFF00, 0xFF80, 0xFFC0, 0xFFE0,
                             0xFFF0, 0xFFF8, 0xFFFC, 0xFFFE, 0xFFFF);      
      this.lowBitMasks = new Array(0x0000, 0x0001, 0x0003, 0x0007, 0x000F, 0x001F,
                            0x003F, 0x007F, 0x00FF, 0x01FF, 0x03FF, 0x07FF,
                            0x0FFF, 0x1FFF, 0x3FFF, 0x7FFF, 0xFFFF);    
      if (MaxDigits)
        this.setMaxDigits(MaxDigits); // 11 - 64bit / 19 - 128bit
      this.initialised = true;
    },
    
    setMaxDigits: function setMaxDigits(value) {
      this.maxDigits = parseInt(value,10);
      this.ZERO_ARRAY = new Array(this.maxDigits);
      for (let iza = 0; iza < this.ZERO_ARRAY.length; iza++) 
        this.ZERO_ARRAY[iza] = 0;
      this.bigZero = new this.BigInt();
      this.bigOne = new this.BigInt();
      this.bigOne.digits[0] = 1;
    },
    
    // this is an object and will be instatiated and extended many times!
    BigInt: function BigInt(flag) {
      if (typeof flag == "boolean" && flag == true) {
        this.digits = null;
      }
      else {
        this.digits = BigIntModule.ZERO_ARRAY.slice(0); // cannot use this here
      }
      this.isNeg = false;
    },
    
    biFromDecimal: function biFromDecimal(s) {
      let isNeg = s.charAt(0) == '-',
          i = isNeg ? 1 : 0,
          result;
      // Skip leading zeros.
      while (i < s.length && s.charAt(i) == '0') ++i;
      if (i == s.length) {
        result = new this.BigInt();
      }
      else {
        let digitCount = s.length - i,
            fgl = digitCount % this.dpl10;
        if (fgl == 0) fgl = this.dpl10;
        result = this.biFromNumber(Number(s.substr(i, fgl)));
        i += fgl;
        while (i < s.length) {
          result = this.biAdd(this.biMultiply(result, this.lr10),
                              this.biFromNumber(Number(s.substr(i, this.dpl10))));
          i += this.dpl10;
        }
        result.isNeg = isNeg;
      }
      return result;
    },

    biCopy: function biCopy(bi) {
      this.logDebug('BigInt.biCopy()');
      let result = new this.BigInt(true);
      result.digits = bi.digits.slice(0);
      result.isNeg = bi.isNeg;
      return result;
    } ,

    biFromNumber: function biFromNumber(i) {
      let result = new this.BigInt();
      result.isNeg = i < 0;
      i = Math.abs(i);
      let j = 0;
      while (i > 0) {
        result.digits[j++] = i & this.maxDigitVal;
        i >>= this.biRadixBits;
      }
      return result;
    },    
    
    reverseStr: function reverseStr(s) {
      let result = "";
      for (let i = s.length - 1; i > -1; --i) {
        result += s.charAt(i);
      }
      return result;
    },

    biToString: function biToString(x, radix) {
      // 2 <= radix <= 36
      let b = new this.BigInt();
      b.digits[0] = radix;
      let qr = this.biDivideModulo(x, b),
          result = this.hexatrigesimalToChar[qr[1].digits[0]];
      while (this.biCompare(qr[0], this.bigZero) == 1) {
        qr = this.biDivideModulo(qr[0], b);
        digit = qr[1].digits[0];
        result += this.hexatrigesimalToChar[qr[1].digits[0]];
      }
      return (x.isNeg ? "-" : "") + this.reverseStr(result);
    },

    biToDecimal: function biToDecimal(x) {
      let b = new this.BigInt();
      b.digits[0] = 10;
      let qr = this.biDivideModulo(x, b),
          result = String(qr[1].digits[0]);
      while (this.biCompare(qr[0], this.bigZero) == 1) {
        qr = this.biDivideModulo(qr[0], b);
        result += String(qr[1].digits[0]);
      }
      return (x.isNeg ? "-" : "") + this.reverseStr(result);
    },
    // +++++++++++++++++++++++++++++++++++++++++++++++++++
    digitToHex: function digitToHex(n) {
      let mask = 0xf,
          result = "";
      for (let i = 0; i < 4; ++i) {
        result += this.hexToChar[n & mask];
        n >>>= 4;
      }
      return this.reverseStr(result);
    },

    biToHex: function biToHex(x) {
      let result = "",
          n = this.biHighIndex(x);
      for (let i = this.biHighIndex(x); i > -1; --i) {
        result += this.digitToHex(x.digits[i]);
      }
      return result;
    },

    charToHex: function charToHex(c) {
      let ZERO = 48,
          NINE = ZERO + 9,
          littleA = 97,
          littleZ = littleA + 25,
          bigA = 65,
          bigZ = 65 + 25,
          result;

      if (c >= ZERO && c <= NINE) {
        result = c - ZERO;
      } else if (c >= bigA && c <= bigZ) {
        result = 10 + c - bigA;
      } else if (c >= littleA && c <= littleZ) {
        result = 10 + c - littleA;
      } else {
        result = 0;
      }
      return result;
    },

    hexToDigit: function hexToDigit(s) {
      let result = 0,
          sl = Math.min(s.length, 4);
      for (let i = 0; i < sl; ++i) {
        result <<= 4;
        result |= this.charToHex(s.charCodeAt(i))
      }
      return result;
    },

    biFromHex: function biFromHex(s) {
      let result = new this.BigInt(),
          sl = s.length;
      for (let i = sl, j = 0; i > 0; i -= 4, ++j) {
        result.digits[j] = this.hexToDigit(s.substr(Math.max(i - 4, 0), Math.min(i, 4)));
      }
      return result;
    },

    biFromString: function biFromString(s, radix) {
      let isNeg = s.charAt(0) == '-',
          istop = isNeg ? 1 : 0,
          result = new this.BigInt(),
          place = new this.BigInt();
      place.digits[0] = 1; // radix^0
      for (let i = s.length - 1; i >= istop; i--) {
        let c = s.charCodeAt(i),
            digit = charToHex(c),
            biDigit = this.biMultiplyDigit(place, digit);
        result = this.biAdd(result, biDigit);
        place = this.biMultiplyDigit(place, radix);
      }
      result.isNeg = isNeg;
      return result;
    },

    biDump: function biDump(b) {
      return (b.isNeg ? "-" : "") + b.digits.join(" ");
    },

    biAdd: function biAdd(x, y) {
      let result;

      if (x.isNeg != y.isNeg) {
        y.isNeg = !y.isNeg;
        result = this.biSubtract(x, y);
        y.isNeg = !y.isNeg;
      }
      else {
        result = new this.BigInt();
        let c = 0,
            n;
        for (let i = 0; i < x.digits.length; ++i) {
          n = x.digits[i] + y.digits[i] + c;
          result.digits[i] = n & 0xffff;
          c = Number(n >= this.biRadix);
        }
        result.isNeg = x.isNeg;
      }
      return result;
    },

    biSubtract: function biSubtract(x, y) {
      let result;
      if (x.isNeg != y.isNeg) {
        y.isNeg = !y.isNeg;
        result = this.biAdd(x, y);
        y.isNeg = !y.isNeg;
      } else {
        result = new this.BigInt();
        let n, c;
        c = 0;
        for (let i = 0; i < x.digits.length; ++i) {
          n = x.digits[i] - y.digits[i] + c;
          result.digits[i] = n & 0xffff;
          // Stupid non-conforming modulus operation.
          if (result.digits[i] < 0) 
            result.digits[i] += this.biRadix;
          c = 0 - Number(n < 0);
        }
        // Fix up the negative sign, if any.
        if (c == -1) {
          c = 0;
          for (let i = 0; i < x.digits.length; ++i) {
            n = 0 - result.digits[i] + c;
            result.digits[i] = n & 0xffff;
            // Stupid non-conforming modulus operation.
            if (result.digits[i] < 0) 
              result.digits[i] += this.biRadix;
            c = 0 - Number(n < 0);
          }
          // Result is opposite sign of arguments.
          result.isNeg = !x.isNeg;
        } else {
          // Result is same sign.
          result.isNeg = x.isNeg;
        }
      }
      return result;
    },

    biHighIndex: function biHighIndex(x) {
      let result = x.digits.length - 1;
      while (result > 0 && x.digits[result] == 0) {
        --result;
      }
      return result;
    },

    biNumBits: function biNumBits(x) {
      let n = this.biHighIndex(x),
          d = x.digits[n],
          m = (n + 1) * this.bitsPerDigit,
          result;
      for (result = m; result > m - this.bitsPerDigit; --result) {
        if ((d & 0x8000) != 0) break;
        d <<= 1;
      }
      return result;
    },

    biMultiply: function biMultiply(x, y) {
      let result = new this.BigInt(),
          c,
          n = this.biHighIndex(x),
          t = this.biHighIndex(y),
          u, uv, k;

      for (let i = 0; i <= t; ++i) {
        c = 0;
        k = i;
        for (let j = 0; j <= n; ++j, ++k) {
          uv = result.digits[k] + x.digits[j] * y.digits[i] + c;
          result.digits[k] = uv & this.maxDigitVal;
          c = uv >>> this.biRadixBits;
        }
        result.digits[i + n + 1] = c;
      }
      // Someone give me a logical xor, please.
      result.isNeg = x.isNeg != y.isNeg;
      return result;
    },

    biMultiplyDigit: function biMultiplyDigit(x, y) {
      let n, c, uv,
          result = new this.BigInt();
      n = this.biHighIndex(x);
      c = 0;
      for (let j = 0; j <= n; ++j) {
        uv = result.digits[j] + x.digits[j] * y + c;
        result.digits[j] = uv & this.maxDigitVal;
        c = uv >>> this.biRadixBits;
      }
      result.digits[1 + n] = c;
      return result;
    },

    arrayCopy: function arrayCopy(src, srcStart, dest, destStart, n) {
      let m = Math.min(srcStart + n, src.length);
      for (let i = srcStart, j = destStart; i < m; ++i, ++j) {
        dest[j] = src[i];
      }
    },
        
    biShiftLeft: function biShiftLeft(x, n) {
      let digitCount = Math.floor(n / this.bitsPerDigit),
          result = new this.BigInt();
      this.arrayCopy(x.digits, 0, result.digits, digitCount,
                result.digits.length - digitCount);
      let bits = n % this.bitsPerDigit,
          rightBits = this.bitsPerDigit - bits,
          i, i1;
      for (i = result.digits.length - 1, i1 = i - 1; i > 0; --i, --i1) {
        result.digits[i] = ((result.digits[i] << bits) & this.maxDigitVal) |
                           ((result.digits[i1] & this.highBitMasks[bits]) >>>
                            (rightBits));
      }
      result.digits[0] = ((result.digits[i] << bits) & this.maxDigitVal);
      result.isNeg = x.isNeg;
      return result;
    },
     
    biShiftRight: function biShiftRight(x, n) {
      let digitCount = Math.floor(n / this.bitsPerDigit),
          result = new this.BigInt();
      this.arrayCopy(x.digits, digitCount, result.digits, 0, x.digits.length - digitCount);
      let bits = n % this.bitsPerDigit,
          leftBits = this.bitsPerDigit - bits,
          i, i1;
      for (i = 0, i1 = i + 1; i < result.digits.length - 1; ++i, ++i1) {
        result.digits[i] = (result.digits[i] >>> bits) |
                           ((result.digits[i1] & this.lowBitMasks[bits]) << leftBits);
      }
      result.digits[result.digits.length - 1] >>>= bits;
      result.isNeg = x.isNeg;
      return result;
    },

    biMultiplyByRadixPower: function biMultiplyByRadixPower(x, n) {
      let result = new this.BigInt();
      this.arrayCopy(x.digits, 0, result.digits, n, result.digits.length - n);
      return result;
    },

    biDivideByRadixPower: function biDivideByRadixPower(x, n) {
      let result = new this.BigInt();
      this.arrayCopy(x.digits, n, result.digits, 0, result.digits.length - n);
      return result;
    },

    biModuloByRadixPower: function biModuloByRadixPower(x, n) {
      let result = new this.BigInt();
      this.arrayCopy(x.digits, 0, result.digits, 0, n);
      return result;
    },

    biCompare: function biCompare(x, y) {
      if (x.isNeg != y.isNeg) {
        return 1 - 2 * Number(x.isNeg);
      }
      for (let i = x.digits.length - 1; i >= 0; --i) {
        if (x.digits[i] != y.digits[i]) {
          if (x.isNeg) {
            return 1 - 2 * Number(x.digits[i] > y.digits[i]);
          } else {
            return 1 - 2 * Number(x.digits[i] < y.digits[i]);
          }
        }
      }
      return 0;
    },

    biDivideModulo: function biDivideModulo(x, y) {
      let nb = this.biNumBits(x),
          tb = this.biNumBits(y),
          origYIsNeg = y.isNeg,
          q, r;
      if (nb < tb) {
        // |x| < |y|
        if (x.isNeg) {
          q = this.biCopy(this.bigOne);
          q.isNeg = !y.isNeg;
          x.isNeg = false;
          y.isNeg = false;
          r = this.biSubtract(y, x);
          // Restore signs, 'cause they're references.
          x.isNeg = true;
          y.isNeg = origYIsNeg;
        } else {
          q = new this.BigInt();
          r = this.biCopy(x);
        }
        return new Array(q, r);
      }

      q = new this.BigInt();
      r = x;

      // Normalize Y.
      let t = Math.ceil(tb / this.bitsPerDigit) - 1,
          lambda = 0;
      while (y.digits[t] < this.biHalfRadix) {
        y = this.biShiftLeft(y, 1);
        ++lambda;
        ++tb;
        t = Math.ceil(tb / this.bitsPerDigit) - 1;
      }
      // Shift r over to keep the quotient constant. We'll shift the
      // remainder back at the end.
      r = this.biShiftLeft(r, lambda);
      nb += lambda; // Update the bit count for x.
      let n = Math.ceil(nb / this.bitsPerDigit) - 1,
          b = this.biMultiplyByRadixPower(y, n - t);
      while (this.biCompare(r, b) != -1) {
        ++q.digits[n - t];
        r = this.biSubtract(r, b);
      }
      let _Radix = this.biRadix;
      for (let i = n; i > t; --i) {
        let ri = (i >= r.digits.length) ? 0 : r.digits[i],
            ri1 = (i - 1 >= r.digits.length) ? 0 : r.digits[i - 1],
            ri2 = (i - 2 >= r.digits.length) ? 0 : r.digits[i - 2],
            yt = (t >= y.digits.length) ? 0 : y.digits[t],
            yt1 = (t - 1 >= y.digits.length) ? 0 : y.digits[t - 1];
        if (ri == yt) {
          q.digits[i - t - 1] = this.maxDigitVal;
        } else {
          q.digits[i - t - 1] = Math.floor((ri * _Radix + ri1) / yt);
        }

        let c1 = q.digits[i - t - 1] * ((yt * _Radix) + yt1),
            c2 = (ri * this.biRadixSquared) + ((ri1 * _Radix) + ri2);
        while (c1 > c2) {
          --q.digits[i - t - 1];
          c1 = q.digits[i - t - 1] * ((yt * _Radix) | yt1);
          c2 = (ri * _Radix * _Radix) + ((ri1 * _Radix) + ri2);
        }

        b = this.biMultiplyByRadixPower(y, i - t - 1);
        r = this.biSubtract(r, this.biMultiplyDigit(b, q.digits[i - t - 1]));
        if (r.isNeg) {
          r = this.biAdd(r, b);
          --q.digits[i - t - 1];
        }
      }
      r = this.biShiftRight(r, lambda);
      // Fiddle with the signs and stuff to make sure that 0 <= r < y.
      q.isNeg = x.isNeg != origYIsNeg;
      if (x.isNeg) {
        if (origYIsNeg) {
          q = this.biAdd(q, this.bigOne);
        } else {
          q = this.biSubtract(q, this.bigOne);
        }
        y = this.biShiftRight(y, lambda);
        r = this.biSubtract(y, r);
      }
      // Check for the unbelievably stupid degenerate case of r == -0.
      if (r.digits[0] == 0 && this.biHighIndex(r) == 0) r.isNeg = false;

      return new Array(q, r);
    },

    biDivide: function biDivide(x, y) {
      return this.biDivideModulo(x, y)[0];
    },

    biModulo: function biModulo(x, y) {
      return this.biDivideModulo(x, y)[1];
    },

    biMultiplyMod: function biMultiplyMod(x, y, m) {
      return this.biModulo(this.biMultiply(x, y), m);
    },

    biPow: function biPow(x, y) {
      let result = this.bigOne,
          a = x;
      while (true) {
        if ((y & 1) != 0) result = this.biMultiply(result, a);
        y >>= 1;
        if (y == 0) break;
        a = this.biMultiply(a, a);
      }
      return result;
    },

    biPowMod: function biPowMod(x, y, m) {
      let result = this.bigOne,
          a = x,
          k = y;
      while (true) {
        if ((k.digits[0] & 1) != 0) result = this.biMultiplyMod(result, a, m);
        k = this.biShiftRight(k, 1);
        if (k.digits[0] == 0 && this.biHighIndex(k) == 0) break;
        a = this.biMultiplyMod(a, a, m);
      }
      return result;
    }
}

