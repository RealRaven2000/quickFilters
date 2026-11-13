import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

export const messages = JSON.parse(readFileSync(new URL("../../_locales/en/messages.json", import.meta.url), "utf8"));
export function getMessage(key, substitutions = []) {
  assert(messages[key], `Missing message: ${key}`);
  const entry = messages[key];
  return entry.message.replace(/\$(\w+)\$/g, (_match, name) => {
    const placeholder = Object.entries(entry.placeholders || {}).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1];
    assert(placeholder, `Missing placeholder ${key}.${name}`);
    return placeholder.content.replace(/\$(\d+)/g, (_match, index) => String(substitutions[Number(index) - 1] ?? ""));
  });
}

// The UI tests replace browser mocks; messenger keeps their catalog available.
globalThis.messenger = { i18n: { getMessage } };
