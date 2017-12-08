"use strict";
/* BEGIN LICENSE BLOCK

quickFilters is released under the Creative Commons (CC BY-ND 4.0)
Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 
For details, please refer to license.txt in the root folder of this extension

END LICENSE BLOCK */


quickFilters.RSA = {
  initialise: function initialise(maxDigits) {
    quickFilters.RSA.BigIntModule.reset();
    quickFilters.RSA.BigIntModule.init(maxDigits);
  } ,
  
  log: function log(txt) {
    quickFilters.Util.logDebugOptional('premium.rsa', txt);
  },
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
  BigIntModule : {
    initialised: false,
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
    
    log: function log(txt) {
      quickFilters.RSA.log(txt);
    },
    
    reset: function reset() {
      this.initialised = false;
    },
    
    init: function init(MaxDigits) {
      if (this.initialised) return;
      quickFilters.RSA.log('BigInt.init(' + MaxDigits + ')');
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
      let RSA = quickFilters.RSA;
      if (typeof flag == "boolean" && flag == true) {
        this.digits = null;
      }
      else {
        this.digits = RSA.BigIntModule.ZERO_ARRAY.slice(0);
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
      quickFilters.RSA.log('BigInt.biCopy()');
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
      return (x.isNeg ? "-" : "") + reverseStr(result);
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
      return (x.isNeg ? "-" : "") + reverseStr(result);
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
        
  
  } ,  // BigInt(js module)
  

  Barrett : {
    log: function log(txt) {
      quickFilters.RSA.log(txt);
    },
    
    // BarrettMu, a class for performing Barrett modular reduction computations in
    // JavaScript.
    //
    // Requires BigInt.js.
    //
    // Copyright 2004-2005 David Shapiro.
    //
    // You may use, re-use, abuse, copy, and modify this code to your liking, but
    // please keep this header.
    //
    // Thanks!
    // 
    // Dave Shapiro
    // dave@ohdave.com   
    BarrettMu: function BarrettMu(m) {
      let RSA = quickFilters.RSA,
          BInt = RSA.BigIntModule,
          barret = quickFilters.RSA.Barrett;
      RSA.log('new BarrettMu()');
      BInt.init();
      this.modulus = BInt.biCopy(m);
      this.k = BInt.biHighIndex(this.modulus) + 1;
      let b2k = new BInt.BigInt();
      b2k.digits[2 * this.k] = 1; // b2k = b^(2k)
      this.mu = BInt.biDivide(b2k, this.modulus);
      this.bkplus1 = new BInt.BigInt();
      this.bkplus1.digits[this.k + 1] = 1; // bkplus1 = b^(k+1)
      this.modulo = barret.BarrettMu_modulo;
      this.multiplyMod = barret.BarrettMu_multiplyMod;
      this.powMod = barret.BarrettMu_powMod;
    },

    BarrettMu_modulo: function BarrettMu_modulo(x) {
      let RSA = quickFilters.RSA,
          BInt = RSA.BigIntModule;
      BInt.init();
      let q1 = BInt.biDivideByRadixPower(x, this.k - 1),
          q2 = BInt.biMultiply(q1, this.mu),
          q3 = BInt.biDivideByRadixPower(q2, this.k + 1),
          r1 = BInt.biModuloByRadixPower(x, this.k + 1),
          r2term = BInt.biMultiply(q3, this.modulus),
          r2 = BInt.biModuloByRadixPower(r2term, this.k + 1),
          r = BInt.biSubtract(r1, r2);
      if (r.isNeg) {
        r = BInt.biAdd(r, this.bkplus1);
      }
      let rgtem = BInt.biCompare(r, this.modulus) >= 0;
      while (rgtem) {
        r = BInt.biSubtract(r, this.modulus);
        rgtem = BInt.biCompare(r, this.modulus) >= 0;
      }
      return r;
    },

    BarrettMu_multiplyMod: function BarrettMu_multiplyMod(x, y) {
      let BInt = quickFilters.RSA.BigIntModule,
          xy = BInt.biMultiply(x, y);
      return this.modulo(xy);
    },

    BarrettMu_powMod: function BarrettMu_powMod(x, y) {
      let BInt = quickFilters.RSA.BigIntModule,
          isLog = quickFilters.Preferences.isDebugOption('premium.rsa');
      
      BInt.log('BarrettMu_powMod()');
      BInt.init();
      let result = new BInt.BigInt();
      result.digits[0] = 1;
      let a = x,
          k = y,
          count = 0,
          testStrng = '';
      while (true) {
        if (isLog) {
          testStrng = testStrng + ('   ' + (++count)).slice(-3) + '.'  // left pad counter
            + ' digits[0] = ' 
            + ('     ' + k.digits[0]).slice(-5)   // left pad number
            + '  a=' + a.digits + '\n';
        }
        if ((k.digits[0] & 1) != 0) result = this.multiplyMod(result, a);
        k = BInt.biShiftRight(k, 1);
        if (k.digits[0] == 0 && BInt.biHighIndex(k) == 0) break;
        a = this.multiplyMod(a, a);
      }
      if (isLog) {
        BInt.log(testStrng);
        BInt.log('BarrettMu_powMod().result =' + result.digits);
      }
      return result;
    }

  } ,  // Barrett

  // RSA, a suite of routines for performing RSA public-key computations in JavaScript.
  //
  // Requires BigInt.js and Barrett.js.
  //
  // Copyright 1998-2005 David Shapiro.
  //
  // You may use, re-use, abuse, copy, and modify this code to your liking, but
  // please keep this header.
  // Thanks!
  // 
  // Dave Shapiro
  // dave@ohdave.com   
  
/*
 * @encryptionExponent  The encryption exponent (i.e. public encryption key) to be used for
 *                      encrypting messages.  If you aren't doing any encrypting, a dummy
 *                      exponent such as "10001" can be passed.
 * @decryptionExponent  The decryption exponent (i.e. private decryption key) to be used for
 *                      decrypting messages.  If you aren't doing any decrypting, a dummy
 *                      exponent such as "10001" can be passed.
 * @modulus             The modulus to be used both for encrypting and decrypting messages.
 * @keylength           The optional length of the key, in bits.  If omitted, RSAKeyPair will
 *                      attempt to derive a key length 
 * returns              The "new" object creator returns an
 *                      instance of a key object that can be
 *                      used to encrypt/decrypt messages.
 */
  RSAKeyPair: function RSAKeyPair(encryptionExponent, decryptionExponent, modulus, keylength) {
    if (typeof keylength === 'undefined') keylength = 0; // Unfortunately Postbox cannot do default parameters
    let RSA = quickFilters.RSA,
        BInt = RSA.BigIntModule;
    BInt.init();
    this.e = BInt.biFromHex(encryptionExponent);
    this.d = BInt.biFromHex(decryptionExponent);
    this.m = BInt.biFromHex(modulus);
    // We can do two bytes per digit, so
    // chunkSize = 2 * (number of digits in modulus - 1).
    // Since biHighIndex returns the high index, not the number of digits, 1 has
    // already been subtracted.
    if (!keylength) {
      this.chunkSize = 2 * BInt.biHighIndex(this.m);
    } else {
      this.chunkSize = keylength / 8;
    }
    this.radix = 16;
    this.barrett = new RSA.Barrett.BarrettMu(this.m);
  },
  
/** 
  * @key  The previously-built RSA key whose public key component is to be used to
  *       encrypt the plaintext string.
  * @s    The plaintext string that is to be encrypted, using the RSA assymmetric
  *       encryption method.
  * @pad  when extending the plaintext to the full chunk size required by the RSA
  *       algorithm.  To maintain compatibility with other crypto libraries, the
  *       padding method is described by a string.  The default, if not
  *       specified is "OHDave".  Here are the choices:
  *       'OHDave' - original padding method employed by Dave Shapiro and Rob Saunders.  
  *                  If this method is chosen, the plaintext can be of any length.
  *       'NoPadding' - truncates the plaintext to the length of the RSA key, if it is longer.  If
  *                     its length is shorter, it is padded with zeros.  In either case, the plaintext 
  *                     string is reversed to preserve big-endian order before it is encrypted to
  *                     maintain compatibility with real crypto libraries such as OpenSSL or Microsoft.
  *       'PKCS1Padding' - the PKCS1v1.5 padding method (as described in RFC 2313) is employed to pad the
  *                        plaintext string.  The plaintext string must be no longer than the
  *                        length of the RSA key minus 11, since PKCS1v1.5 requires 3 bytes of overhead 
  *                        and specifies a minimum pad of 8 bytes.  The plaintext string is padded with
  *                        randomly-generated bytes and then its order is reversed to preserve big-endian 
  *                        order before it is encrypted to maintain compatibility with real crypto
  *                        libraries such as OpenSSL or Microsoft.  When the cyphertext is to be decrypted 
  *                        by a crypto library, the library routine's "PKCS1Padding" flag, or its
  *                        equivalent, should be used.  
  * returns   The cyphertext block that results from encrypting the plaintext string s
  *           with the RSA key.
  */    
  encryptedString: function encryptedString(key, s, pad ) {
    const PAD_OHDave = 0;
    const PAD_NoPadding = 1;
    const PAD_PKCS1 = 2;
    if (!pad) pad = 'OHDave';
    if (!key) throw('RSA.encryptedString: No valid encryption key!');
    if (!s) throw('RSA.encryptedString: Nothing to encrypt!');
    let BInt = quickFilters.RSA.BigIntModule,
        padtype;
    switch (pad) {
      case 'OHDave':
        padtype = PAD_OHDave;
        break;
      case 'NoPadding':
        padtype = PAD_NoPadding;
        break;
      case 'PKCS1Padding':
        padtype = PAD_PKCS1;
        break;
      default:
        throw('Invalid padding parameter: ' + pad);
    } 
    BInt.init();
    
    /* If we're not using Dave's padding method, we need to truncate long
     * plaintext blocks to the correct length for the padding method used:
     *       NoPadding    - key length
     *       PKCS1Padding - key length - 11
     */
    let sl, j; 
    switch(padtype) {
      case PAD_OHDave:
        sl = s.length;  // j is unused at first
        break;
      case PAD_NoPadding:
        if (sl > key.chunkSize) {
          sl = key.chunkSize;
        }
        j = key.chunkSize - 1;
        break;
      case PAD_PKCS1:
        if (sl > (key.chunkSize - 11)) {
          sl = key.chunkSize - 11;
        }
        j = sl - 1;
        break;
    }
    
    /*
     * Convert the plaintext string to an array of characters so that we can work
     * with individual characters.
     *
     * Note that, if we're talking to a real crypto library at the other end, we
     * reverse the plaintext order to preserve big-endian order.
     */
    let a = new Array(),
        i = 0;
    for (i = 0; i < sl; i++, j--) {
      if  (padtype == PAD_OHDave)
        a.push(s.charCodeAt(i));  // a[i]=
      else
        a[j] = s.charCodeAt(i); // reverse order
    }

    // add the padding
    // Altered by Rob Saunders (rob@robsaunders.net). New routine pads the
    // string after it has been converted to an array. This fixes an
    // incompatibility with Flash MX's ActionScript.
    if (padtype == PAD_NoPadding)
      i = 0;

    j = key.chunkSize - (sl % key.chunkSize);
    while (j > 0) {
      let rpad = (padtype == PAD_PKCS1) ? 
                 Math.floor(Math.random() * 255)+1 :  // avoid 0
                 0;
      a[i++] = rpad;
      j--;
    }
    
    /*
    * For PKCS1v1.5 padding, we need to fill in the block header.
    */
    if (padtype == PAD_PKCS1) {
      a[sl] = 0;
      a[key.chunkSize - 2] = 2;
      a[key.chunkSize - 1] = 0;
    }

    let al = a.length,
        result = "",
        k, block;
    for (i = 0; i < al; i += key.chunkSize) {
      block = new BInt.BigInt();
      j = 0;
      for (k = i; k < (i + key.chunkSize); ++j) {
        block.digits[j] = a[k++];
        block.digits[j] += a[k++] << 8;
      }
      let crypt = key.barrett.powMod(block, key.e),
          text = (key.radix == 16) ? BInt.biToHex(crypt) : BInt.biToString(crypt, key.radix);
      result += (text + " ");
    }
    return result.substring(0, result.length - 1); // Remove last space.
  },

/** 
  * @key  The previously-built RSA key whose private key component is to be used to
  *       decrypt the cyphertext string.
  * @c    The cyphertext string that is to be decrypted, using the RSA assymmetric
  *       decryption method.
  * returns The plaintext block that results from decrypting the cyphertext string c
  *         with the RSA key.
  * Only the OHDave padding method (e.g. zeros) is supported by
  * this routine *AND* this routine expects little-endian cyphertext, as
  * created by the encryptedString routine (in this module) or the RSAEncode
  * routine (in either CryptoFuncs.pm or CryptoFuncs.php).
  */
  decryptedString: function decryptedString(key, c) {
    if (!key) throw('RSA.decryptedString: No valid decryption key!');
    if (!c) throw('RSA.decryptedString: Nothing to decrypt!');
    let BInt = quickFilters.RSA.BigIntModule;
    BInt.init();
    let blocks = c.split(" "),
        result = "",
        i, j, b;
    for (i = 0; i < blocks.length; ++i) {
      let bi;
      if (key.radix == 16) {
        bi = BInt.biFromHex(blocks[i]);
      }
      else {
        bi = BInt.biFromString(blocks[i], key.radix);
      }
      b = key.barrett.powMod(bi, key.d);
      for (j = 0; j <= BInt.biHighIndex(b); ++j) {
        result += String.fromCharCode(b.digits[j] & 255,
                                      b.digits[j] >> 8);
      }
    }
    // Remove trailing null, if any.
    if (result.charCodeAt(result.length - 1) == 0) {
      result = result.substring(0, result.length - 1);
    }
    return result;
  }

}