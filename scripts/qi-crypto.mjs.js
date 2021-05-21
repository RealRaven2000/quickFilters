/* note the encryption key is private. Do not reverse engineer */
/* 
  BEGIN LICENSE BLOCK

  QuickFolders is released under the Creative Commons (CC BY-ND 4.0)
  Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 
  For details, please refer to license.txt in the root folder of this extension

  END LICENSE BLOCK 
*/

export function getDecryption_key(key_type) {
  switch (key_type) {
    case 0:  // private
      return "1933eef03efab13188c903d69d293d4db35372620a0c26f23e1f805ba2d4e87";
    case 1:  // domain
      return "";
    default:
      return -1; // unknown or free license
  }
}

export function getModulus(key_type) {
  switch (key_type) {
    case 0:  // private
      return "1ef94b8a38bcfecc0dc49517045dd7362b3e8181be290a4dc298c807b052297";
    case 1:  // domain
      return "";
    default:
      return -1; // unknown or free license
  }
}

// determine the type of key from the prefix - this is Add-on specific!
// extend this method to introduce other types of licenses.
export function getKeyType(licenseKey) {
  if (!licenseKey) 
    return 0; // default to Pro, but that doesn't mean there is a valid license!
  if (licenseKey.startsWith('QID')) {
    return 1; // Domain License
  } else {
    return 0; // Pro License
  } // SmartTemplates uses "S1" for standard licenses with key_type=2
}


export function getMaxDigits(key_type) {
  switch (key_type) {
    case 0:  // private
      return 35;
    case 1:  // domain
      return 67;
    default:
      return 0; // unknown or free license
  }
}
  
export function getKeyLength(key_type) {
  switch (key_type) {
    case 0:  // private
      return 256;
    case 1:  // domain
      return 512;
    default:
      return 0; // unknown or free license
  }
}

