module.exports = {
  env: {
    browser: true,
    es2024: true,
    node: true,
    webextensions: true,
  },
  globals: {
    browser: "readonly",
    gFolderDisplay: "readonly",
    gTabmail: "readonly",
    messenger: "readonly",
    i18n: "readonly",
    ChromeUtils: "readonly",
    Components: "readonly",
    GetSelectedMsgFolders: "readonly",
    MsgFilters: "readonly",
    msgWindow: "readonly",
    PathUtils: "readonly",
    Services: "readonly",
    quickFilters: "readonly",
  },
  extends: ["eslint:recommended"],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
  rules: {
    // your rules here
    "no-const-assign": "error",
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "no-undef": "error",
    "no-redeclare": "error",
    eqeqeq: "off",
    curly: "warn",
  },
};
