/* eslint-disable object-shorthand */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
 
 
/* 
  ORIGINAL CODE:
  https://searchfox.org/comm-esr78/source/mail/components/extensions/parent/ext-accounts.js
  SCHEMA:
  https://searchfox.org/comm-esr78/source/mail/components/extensions/schemas/accounts.json
  
  This is a workaround for [Bug 1715968] - which doesn't prompt user to update a legacy add-on whgen it requires new permissions. Since we already have full permissions, we need to copy the code from the original API module for now.
  
  
  this way I can omit:
  "permissions": [
    "accountsRead"
  ],    
  
  Do undo, and use the "real" module we can later replace messenger.ex_accounts with messenger.accounts
  
  */
  
ChromeUtils.defineModuleGetter(
  this,
  "MailServices",
  "resource:///modules/MailServices.jsm"
);
ChromeUtils.defineModuleGetter(
  this,
  "toXPCOMArray",
  "resource:///modules/iteratorUtils.jsm"
);

/**
 * Converts an nsIMsgIdentity to a simple object for use in messages.
 * @param {nsIMsgAccount} account
 * @param {nsIMsgIdentity} identity
 * @return {Object}
 */
 function convertMailIdentity(account, identity) {
  if (!account || !identity) {
    return null;
  }
  identity = identity.QueryInterface(Ci.nsIMsgIdentity);
  return {
    accountId: account.key,
    id: identity.key,
    label: identity.label || "",
    name: identity.fullName || "",
    email: identity.email || "",
    replyTo: identity.replyTo || "",
    organization: identity.organization || "",
    composeHtml: identity.composeHtml,
    signature: identity.htmlSigText || "",
    signatureIsPlainText: !identity.htmlSigFormat,
  };
}

/**
 * Convert a folder URI to a human-friendly path.
 * @return {String}
 */
 function folderURIToPath(accountId, uri) {
  let server = MailServices.accounts.getAccount(accountId).incomingServer;
  let rootURI = server.rootFolder.URI;
  if (rootURI == uri) {
    return "/";
  }
  // The .URI property of an IMAP folder doesn't have %-encoded characters, but
  // may include literal % chars. Services.io.newURI(uri) applies encodeURI to
  // the returned filePath, but will not encode any literal % chars, which will
  // cause decodeURIComponent to fail (bug 1707408).
  if (server.type == "imap") {
    return uri.substring(rootURI.length);
  }
  let path = Services.io.newURI(uri).filePath;
  return path
    .split("/")
    .map(decodeURIComponent)
    .join("/");
}


const folderTypeMap = new Map([
  [Ci.nsMsgFolderFlags.Inbox, "inbox"],
  [Ci.nsMsgFolderFlags.Drafts, "drafts"],
  [Ci.nsMsgFolderFlags.SentMail, "sent"],
  [Ci.nsMsgFolderFlags.Trash, "trash"],
  [Ci.nsMsgFolderFlags.Templates, "templates"],
  [Ci.nsMsgFolderFlags.Archive, "archives"],
  [Ci.nsMsgFolderFlags.Junk, "junk"],
  [Ci.nsMsgFolderFlags.Queue, "outbox"],
]);

/**
 * Converts an nsIMsgFolder to a simple object for use in API messages.
 *
 * @param {nsIMsgFolder} folder - The folder to convert.
 * @param {string} [accountId] - An optimization to avoid looking up the
 *     account. The value from nsIMsgHdr.accountKey must not be used here.
 * @return {Object}
 */
 function convertFolder(folder, accountId) {
  if (!folder) {
    return null;
  }
  if (!accountId) {
    let server = folder.server;
    let account = MailServices.accounts.FindAccountForServer(server);
    accountId = account.key;
  }

  let folderObject = {
    accountId,
    name: folder.prettyName,
    path: folderURIToPath(accountId, folder.URI),
  };

  for (let [flag, typeName] of folderTypeMap.entries()) {
    if (folder.flags & flag) {
      folderObject.type = typeName;
    }
  }

  return folderObject;
}

/**
 * Converts an nsIMsgFolder and all subfolders to a simple object for use in
 * API messages.
 *
 * @param {nsIMsgFolder} folder - The folder to convert.
 * @param {string} [accountId] - An optimization to avoid looking up the
 *     account. The value from nsIMsgHdr.accountKey must not be used here.
 * @return {Array}
 */
 function traverseSubfolders(folder, accountId) {
  let f = convertFolder(folder, accountId);
  f.subFolders = [];
  if (folder.hasSubFolders) {
    for (let subFolder of folder.subFolders) {
      f.subFolders.push(
        traverseSubfolders(subFolder, accountId || f.accountId)
      );
    }
  }
  return f;
}

function convertAccount(account) {
  if (!account) {
    return null;
  }

  account = account.QueryInterface(Ci.nsIMsgAccount);
  let server = account.incomingServer;
  if (server.type == "im") {
    return null;
  }

  let folders;
  try {
    folders = traverseSubfolders(
      account.incomingServer.rootFolder,
      account.key
    ).subFolders;
  }
  catch (ex) {
    console.log("traverseSubfolders failed:", account, ex);
  }

  return {
    id: account.key,
    name: account.incomingServer.prettyName,
    type: account.incomingServer.type,
    folders,
    identities: account.identities.map(id => convertMailIdentity(account, id)),
  };
}

var ex_accounts = class extends ExtensionAPI {
  getAPI(context) {
    return {
      ex_accounts: {
        async list() {
          let accounts = [];
          for (let account of MailServices.accounts.accounts) {
            try {
              account = convertAccount(account);
              if (account) {
                accounts.push(account);
              }
            }
            catch(ex) {
              console.log("convertAccount failed:", account, ex);
            }
          }
          return accounts;
        },
        async get(accountId) {
          let account = MailServices.accounts.getAccount(accountId);
          return convertAccount(account);
        },
        async getDefault() {
          let account = MailServices.accounts.defaultAccount;
          return convertAccount(account);
        },
        async getDefaultIdentity(accountId) {
          let account = MailServices.accounts.getAccount(accountId);
          return convertMailIdentity(account, account?.defaultIdentity);
        },
        async setDefaultIdentity(accountId, identityId) {
          let account = MailServices.accounts.getAccount(accountId);
          if (!account) {
            throw new ExtensionError(`Account not found: ${accountId}`);
          }
          for (let identity of account.identities) {
            if (identity.key == identityId) {
              account.defaultIdentity = identity;
              return;
            }
          }
          throw new ExtensionError(
            `Identity ${identityId} not found for ${accountId}`
          );
        },
      },
    };
  }
};