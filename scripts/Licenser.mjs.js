/* 
  BEGIN LICENSE BLOCK

  quickFilters is released under the Creative Commons (CC BY-ND 4.0)
  Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 
  For details, please refer to license.txt in the root folder of this extension

  END LICENSE BLOCK 
*/

import * as crypto from './qi-crypto.mjs.js';
import {RSA} from './rsa/RSA.mjs.js';
import {log} from './qi-util.mjs.js';

const LicenseStates = {
    NotValidated: 0, // default status
    Valid: 1,
    Expired: 2, // valid, but expired
    Invalid: 3,
    MailNotConfigured: 4,
    MailDifferent: 5,
    Empty: 6,
}

const ADDON_NAME = "quickFilters";

async function getDefaultIdentity(accountId) {
    const legacyIdentityMethod = (messenger.identities) ? false : true;
    const _getDefaultIdentity = messenger.identities ? messenger.identities.getDefault : messenger.accounts.getDefaultIdentity;
    try {
      if (legacyIdentityMethod)
        return await _getDefaultIdentity(accountId);
      try {  // Tb 91
        return await _getDefaultIdentity(accountId, false);  // avoid loading folders!
      }
      catch(ex) { // older versions don't have the second parameter
        return await await _getDefaultIdentity(accountId);
      }
    }
    catch (ex) {
      console.log(ADDON_NAME + " Licenser - getDefaultIdentity() failed", ex);
    }
    return null; // should not happen
}

// format QF-EMAIL:DATE  // ;CRYPTO
// example: QF-joe.bloggs@gotmail.com:2015-05-20;
function getDate(license) {
  // get mail+date portion
  let arr = license.split(';');
  if (!arr.length) {
    log(ADDON_NAME + " Licenser", "getDate() failed - no ; found");
    return ""; 
  }
  // get date portion
  let arr1=arr[0].split(':');
  if (arr1.length<2) {
    log(ADDON_NAME + "Licenser", "getDate() failed - no : found");
    return '';
  }
  return arr1[1];
}

function getMail(license) {
  let arr1 = license.split(':');
  if (!arr1.length) {
    log(ADDON_NAME + " Licenser", "getMail() failed - no : found");
    return '';
  }
  let pos = arr1[0].indexOf('-') + 1;
  return arr1[0].substr(pos); // split off QF- or QFD-
}


export class Licenser {
  constructor(LicenseKey, options = {}) {
    // the constructor ONLY sets the Licensekey, it does not set date etc.
    this.reset();    
    this.ForceSecondaryIdentity = options.hasOwnProperty("forceSecondaryIdentity")
      ? options.forceSecondaryIdentity
      : false;
    this.debug = options.debug || false;
      
    this.LicenseKey = LicenseKey;
    this.key_type = crypto.getKeyType(LicenseKey);
    
    if (this.key_type == 1 && this.ForceSecondaryIdentity) {
      this.ForceSecondaryIdentity = false;
      this.logDebug("Sorry, but forcing secondary email addresses with a Domain license is not supported!");
    }
  }
  
  reset() { // initialize License Cache
    this.ValidationStatus = LicenseStates.NotValidated;
    this.RealLicense = "";
    this.ExpiredDays = -1;
    this.LicensedDaysLeft = 0;
    this.decryptedDate = "";
    this.decryptedMail = "";
  }
  
  // public Interface - note that "description" can be consumed by the front end.
  get info() {
    return {
      status: this.ValidationStatusShortDescription,
      description: this.ValidationStatusDescription,
      licensedDaysLeft: this.LicensedDaysLeft,
      expiredDays: this.ExpiredDays,
      expiryDate: this.decryptedDate,
      email: this.decryptedMail,
      licenseKey: this.LicenseKey,
      decryptedPart: this.RealLicense,
      keyType: this.key_type,
      // helper functions (transformed internal getters)
      isValid: this.isValid,
      isExpired: this.isExpired,
    }
  }
  
  get ValidationStatusShortDescription() {
    switch(this.ValidationStatus) {
      case LicenseStates.Valid:
        return "Valid";
      case LicenseStates.Expired:
        return "Expired";
      case LicenseStates.NotValidated:
        return "NotValidated";     
      case LicenseStates.Invalid:
        return "Invalid";
      case LicenseStates.MailNotConfigured:
        return "MailNotConfigured";
      case LicenseStates.MailDifferent:
        return "MailDifferent";
      case LicenseStates.Empty:
        return "Empty";
      default: return "UnknownStatus";
    }
  }

  get ValidationStatusDescription() {
    switch(this.ValidationStatus) {
      case LicenseStates.Valid:
        return "Valid";
      case LicenseStates.Expired:
        return `Valid but expired since ${this.ExpiredDays} days`;
      case LicenseStates.NotValidated:
        return "Not Validated";     
      case LicenseStates.Invalid:
        return "Invalid";
      case LicenseStates.MailNotConfigured:
        return "Mail Not Configured";
      case LicenseStates.MailDifferent:
        return "Mail Different";
      case LicenseStates.Empty:
        return "Empty";
      default: return "Unknown Status";
    }
  }

  get isValid() {
    return (this.ValidationStatus == LicenseStates.Valid);
  }

  get isExpired() { // valid, but expired
    return (this.ValidationStatus == LicenseStates.Expired);
  }
  
  // for future use (standard license / trial periods)
	async graceDate() {
		let graceDate = "", isResetDate = false;
		try {
			graceDate = Services.prefs.getStringPref("license.gracePeriodDate");
		}
		catch(ex) { 
			isResetDate = true; 
		}
		let today = new Date().toISOString().substr(0, 10); // e.g. "2019-07-18"
		if (!graceDate || graceDate>today) {
			graceDate = today; // cannot be in the future
			isResetDate = true;
		}
		else {
			// if a license exists & is expired long ago, use the last day of expiration date.
			if (this.ValidationStatus == LicenseStates.Expired) {
				if (graceDate < this.getDecryptedDate()) {
					this.logDebug("Extending graceDate from {0} to {1}".replace("{0}",graceDate).replace("{1}", this.getDecryptedDate()));
					graceDate = this.getDecryptedDate();
					isResetDate = true;
				}
			}
		}
		if (isResetDate) {
      /* TO DO!! */
      await messenger.LegacyPrefs.setPref("extensions.quickfolders.license.gracePeriodDate", graceDate);
    }
		// log("Returning Grace Period Date: " + graceDate);
		return graceDate;
	}  
  
	async TrialDays() {
		let graceDate; // actually the install date
		const period = 28,
		      SINGLE_DAY = 1000*60*60*24; 
		try {
      if (this.ValidationStatus == LicenseStates.Expired) {
        // [issue 100] Trial period should restart on license expiry
        graceDate = this.DecryptedDate;
      }
      else {
        try {
          graceDate = 
            await messenger.LegacyPrefs.getPref("extensions.quickfilters.license.gracePeriodDate");
        }
        catch (e) {graceDate = ""}
      }
			if (!graceDate) graceDate = await this.graceDate(); // create the date
		}
		catch(ex) { 
		  // if it's not there, set it now!
			graceDate = await this.graceDate(); 
		}
		let today = (new Date()),
		    installDate = new Date(graceDate),
				days = Math.floor( (today.getTime() - installDate.getTime()) / SINGLE_DAY);
		// later.setDate(later.getDate()-period);
    return (period - days); // returns number of days left, or -days since trial expired if past period
	}

  isIdMatchedLicense(idMail, licenseMail) {
    try {
      switch(this.key_type) {
        case 0: // pro license
          return (idMail.toLowerCase() == licenseMail);
        case 1: // domain matching 
          // only allow one *
          if ((licenseMail.match(/\*/g)||[]).length != 1)
              return false;
          // replace * => .*
          let r = new RegExp(licenseMail.replace("*",".*"));
          let t = r.test(idMail);
          return t;
      }
    }
    catch (ex) {
      log(ADDON_NAME + " Licenser\nvalidateLicense.isIdMatchedLicense() failed", ex);
    }
    return false;
  }
  
  getCrypto() {
    let arr = this.LicenseKey.split(';');
    if (arr.length<2) {
      this.logDebug(ADDON_NAME + " Licenser","getCrypto()","failed - no ; found");
      return null;
    }
    return arr[1];
  }
  
  // Testing purpose, may be removed
  encryptLicense () {
    this.logDebug('encryptLicense - initialising with maxDigits:', this.RSA_maxDigits);
    RSA.initialise(this.RSA_maxDigits);
    // 64bit key pair
    this.logDebug('encryptLicense - creating key pair object with bit length:', this.RSA_keylength);
    let key = new RSA.RSAKeyPair(
      this.RSA_encryption,
      this.RSA_decryption,
      this.RSA_modulus,
      this.RSA_keylength
    );
    this.logDebug('encryptLicense - starting encryption…');
    let Encrypted = RSA.encryptedString(key, this.LicenseKey, 'OHDave');
    this.logDebug('encryptLicense - finished encrypting registration key', {
      length: Encrypted.length,
      Encrypted
    });
    return Encrypted;    
  }    
  

  // Get these information from the crypto module, which is unique for each add-on.
  get RSA_encryption() {
    return ""
  }
  get RSA_decryption() {
    return crypto.getDecryption_key(this.key_type);
  }
  get RSA_modulus() {
    return crypto.getModulus(this.key_type);
  }
  get RSA_keylength() {
    return crypto.getKeyLength(this.key_type);      
  }
  get RSA_maxDigits() {
    return crypto.getMaxDigits(this.key_type);      
  }
  get Key_Type() {
    return crypto.getKeyType(this.LicenseKey);
  }

  getClearTextMail() { 
    return getMail(this.LicenseKey);
  }
  getDecryptedMail() {
    return getMail(this.RealLicense + ":xxx");
  }
  
  getDecryptedDate() {
    return getDate(this.RealLicense + ":xxx");
  }

  async validate() {
    this.reset();
    this.logDebug("validateLicense", { LicenseKey: this.LicenseKey });
    
    if (!this.LicenseKey) {
      this.ValidationStatus = LicenseStates.Empty;
      this.logDebug(this);
      return [this.ValidationStatus, ''];
    }    

    let encrypted = this.getCrypto();  
    if (!encrypted) {
      this.ValidationStatus = LicenseStates.Invalid;
      this.logDebug('validateLicense()\n returns ', [
        this.ValidationStatusDescription,
        this.ValidationStatus,
      ]);
      return [this.ValidationStatus, ''];
    }
    
    this.logDebug("RSA.initialise", this.RSA_maxDigits);
    RSA.initialise(this.RSA_maxDigits);
    this.logDebug('Creating RSA key + decrypting');
    let key = new RSA.RSAKeyPair("", this.RSA_decryption, this.RSA_modulus, this.RSA_keylength);

    // verify against remainder of string
    try {
      this.logDebug("get RSA.decryptedString()");
      this.RealLicense = RSA.decryptedString(key, encrypted);
      this.logDebug("Decryption Complete", { RealLicense: this.RealLicense });
    } catch (ex) {
      this.logDebug('RSA Decryption failed: ', ex);
    }
    
    if (!this.RealLicense) {
      this.ValidationStatus = LicenseStates.Invalid;
      this.logDebug('validateLicense()\n returns ', [
        this.ValidationStatusDescription,
        this.ValidationStatus,
      ]);
      return [this.ValidationStatus, ''];
    }
    
    this.decryptedDate = this.getDecryptedDate();
    // check ISO format YYYY-MM-DD
    let regEx = /^\d{4}-\d{2}-\d{2}$/;
    if (!this.decryptedDate.match(regEx)) {
      this.ValidationStatus = LicenseStates.Invalid;
      this.logDebug('encountered garbage date: ', this.decryptedDate);
      this.logDebug('validateLicense()\n returns ', [
        this.ValidationStatusDescription,
        this.ValidationStatus,
      ]);
      this.decryptedDate = ""; // throw it away!
      return this.info;
    }

    // ******* CHECK MAIL IS MATCHING ********
    let clearTextEmail = this.getClearTextMail().toLocaleLowerCase();
    this.decryptedMail = this.getDecryptedMail().toLocaleLowerCase();
    if (clearTextEmail != this.decryptedMail) {
      this.ValidationStatus = LicenseStates.MailDifferent;
      this.logDebug('validateLicense()\n returns ', [
        this.ValidationStatusDescription,
        this.ValidationStatus,
      ]);
      return this.info;
    }

    // ******* CHECK LICENSE EXPIRY  ********
    // get current date
    let today = new Date();
    let dateString = today.toISOString().substr(0, 10);
    if (this.decryptedDate < dateString) {
      let licDate = new Date(this.decryptedDate);
      this.ExpiredDays = parseInt((today - licDate) / (1000 * 60 * 60 * 24)); 
      this.logDebug('validateLicense()\n returns ', [
        this.ValidationStatusDescription,
        this.ValidationStatus,
      ]);
      // Do not stop here, but continue the validation process and only if the
      // Valid state is reached, set to Expired.
      this.LicensedDaysLeft = 0;
    } else {
      let today = new Date(),
          licDate = new Date(this.decryptedDate);
      this.LicensedDaysLeft = parseInt((licDate - today) / (1000 * 60 * 60 * 24)); 
      this.ExpiredDays = 0;
    }

    
    // ******* MATCH MAIL ACCOUNT  ********
    // check mail accounts for setting
    // if not found return MailNotConfigured
    
    let accounts = await messenger.accounts.list();
    let AllowFallbackToSecondaryIdentiy = false;

    if (this.key_type == 0 || this.key_type == 2) {
      // Private License - Check if secondary mode is necessary (if not already enforced)
      if (this.ForceSecondaryIdentity) {
        AllowFallbackToSecondaryIdentiy = true;
      } else {
        let hasDefaultIdentity = false;
        for (let account of accounts) {
          let defaultIdentity = await getDefaultIdentity(account.id);
          if (defaultIdentity) {
            hasDefaultIdentity = true;
            break;
          }
        }
        if (!hasDefaultIdentity) {
          AllowFallbackToSecondaryIdentiy = true;
          log(ADDON_NAME + " Licenser",
              "License Check: There is no account with default identity!\n" +
              "You may want to check your account configuration as this might impact some functionality.\n" + 
              "Allowing use of secondary email addresses...");
        }
      }
    }
    
    for (let account of accounts) {
      let defaultIdentity = await getDefaultIdentity(account.id); 
      if (defaultIdentity) {
        this.logDebug(ADDON_NAME + " Licenser", {
            "Iterate accounts" : account.name,
            "Default Identity" : defaultIdentity.id,
        });
        if (!defaultIdentity.email) {
          this.logDebug("Default Identity of this account has no associated email!", {account: account.name, defaultIdentity});
          continue;
        }
        if (this.isIdMatchedLicense(defaultIdentity.email, this.decryptedMail)) {
          this.ValidationStatus = (this.ExpiredDays == 0) ? LicenseStates.Valid : LicenseStates.Expired;
          this.logDebug("Default Identity of this account matched!", {
            account: account.name, 
            identity: defaultIdentity.email,
            status: this.ValidationStatusDescription
          });
          return this.info;
        }

      } 
      if (AllowFallbackToSecondaryIdentiy) {

        this.logDebug(ADDON_NAME + " Licenser", {
            "Iterate all identities of account" : account.name,
            "Identities" : account.identities,
        });
        for (let identity of account.identities) {
          if (this.ForceSecondaryIdentity && defaultIdentity && defaultIdentity.id == identity.id) {
            this.logDebug("Skipping default identity!", {identity});
            continue;
          }          
          if (!identity.email) {
            this.logDebug("Identity has no associated email!", {identity});
            continue;
          }
          if (this.isIdMatchedLicense(identity.email, this.decryptedMail)) {
            this.ValidationStatus = (this.ExpiredDays == 0) ? LicenseStates.Valid : LicenseStates.Expired;
            this.logDebug("Identity of this account matched!", {
              account: account.name, 
              identity: identity.email,
              status: this.ValidationStatusDescription
            });
            return this.info;
          }
        }
        
      }
    }
    
    this.ValidationStatus = LicenseStates.MailNotConfigured;
    return this.info;
  }
  
  logDebug(msg, detail) {
    if (this.debug) {
      if(!detail) {
        detail = msg;
        msg = ADDON_NAME + " Licenser";
      }
      log(msg, detail);
    }
  }  
}

