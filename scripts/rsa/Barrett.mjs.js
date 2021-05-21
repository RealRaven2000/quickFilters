import {BigIntModule} from './BigIntModule.mjs.js';

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

export class Barrett {
    constructor(m) {
      BigIntModule.init();
      BigIntModule.logDebug("New Barrett instance!");
      this.modulus = BigIntModule.biCopy(m);
      this.k = BigIntModule.biHighIndex(this.modulus) + 1;
      let b2k = new BigIntModule.BigInt();
      b2k.digits[2 * this.k] = 1; // b2k = b^(2k)
      this.mu = BigIntModule.biDivide(b2k, this.modulus);
      this.bkplus1 = new BigIntModule.BigInt();
      this.bkplus1.digits[this.k + 1] = 1; // bkplus1 = b^(k+1)
      this.modulo = this.BarrettMu_modulo;
      this.multiplyMod = this.BarrettMu_multiplyMod;
      this.powMod = this.BarrettMu_powMod;
    }

    log(txt) {
      console.log(txt);
    }
    
    BarrettMu_modulo(x) {
      BigIntModule.init();
      let q1 = BigIntModule.biDivideByRadixPower(x, this.k - 1),
          q2 = BigIntModule.biMultiply(q1, this.mu),
          q3 = BigIntModule.biDivideByRadixPower(q2, this.k + 1),
          r1 = BigIntModule.biModuloByRadixPower(x, this.k + 1),
          r2term = BigIntModule.biMultiply(q3, this.modulus),
          r2 = BigIntModule.biModuloByRadixPower(r2term, this.k + 1),
          r = BigIntModule.biSubtract(r1, r2);
      if (r.isNeg) {
        r = BigIntModule.biAdd(r, this.bkplus1);
      }
      let rgtem = BigIntModule.biCompare(r, this.modulus) >= 0;
      while (rgtem) {
        r = BigIntModule.biSubtract(r, this.modulus);
        rgtem = BigIntModule.biCompare(r, this.modulus) >= 0;
      }
      return r;
    }

    BarrettMu_multiplyMod(x, y) {
      let xy = BigIntModule.biMultiply(x, y);
      return this.modulo(xy);
    }

    BarrettMu_powMod(x, y) {
			
      let isLog = true; //use LegacyPrefs API messenger.LegacyPrefs.getPref(); QuickFolders.Preferences.isDebugOption('premium.rsa');
      
      BigIntModule.logDebug('BarrettMu_powMod()');
      BigIntModule.init();
      let result = new BigIntModule.BigInt();
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
        k = BigIntModule.biShiftRight(k, 1);
        if (k.digits[0] == 0 && BigIntModule.biHighIndex(k) == 0) break;
        a = this.multiplyMod(a, a);
      }
      if (isLog) {
        BigIntModule.logDebug(testStrng);
        BigIntModule.logDebug('BarrettMu_powMod().result =' + result.digits);
      }
      return result;
    }
}
