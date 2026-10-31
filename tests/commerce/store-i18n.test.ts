import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import en from "../../src/messages/en.json";
import mn from "../../src/messages/mn.json";

type Messages = Record<string, unknown>;
const LOCALES: [string, Messages][] = [["en", en as Messages], ["mn", mn as Messages]];

const lookup = (messages: Messages, key: string) =>
  key.split(".").reduce<unknown>((acc, k) => (acc && typeof acc === "object" ? (acc as Messages)[k] : undefined), messages);

function storefrontSources() {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry.name)) files.push(full);
    }
  };
  walk("src/components");
  walk("src/app/(customer)");
  return files.map((file) => ({ file, source: fs.readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "") }));
}

test("every storefront text key used in the code exists in both languages", () => {
  const keys = new Set<string>();
  for (const { source } of storefrontSources()) {
    // st("key") reads the "store" block (useStoreT); t("key") reads from the top (useI18n).
    if (/useStoreT\(\)/.test(source)) for (const match of source.matchAll(/\bst\(\s*"([a-z0-9_]+)"/g)) keys.add(`store.${match[1]}`);
    if (/useI18n\(\)/.test(source)) for (const match of source.matchAll(/\bt\(\s*"([A-Za-z0-9_.]+)"/g)) keys.add(match[1]);
  }
  assert.ok(keys.size > 300, `expected the scan to find the storefront's keys, found ${keys.size}`);
  for (const [locale, messages] of LOCALES) {
    const missing = [...keys].filter((key) => typeof lookup(messages, key) !== "string");
    assert.deepEqual(missing, [], `${locale} is missing keys`);
  }
});

test("storefront texts have the same keys and placeholders in Mongolian and English", () => {
  const store = (messages: Messages) => messages.store as Record<string, string>;
  assert.deepEqual(Object.keys(store(mn as Messages)).sort(), Object.keys(store(en as Messages)).sort());
  const names = (text: string) => [...new Set(text.match(/\{\w+\}/g) ?? [])].sort();
  for (const [key, text] of Object.entries(store(en as Messages))) {
    assert.deepEqual(names(store(mn as Messages)[key]), names(text), `store.${key}`);
  }
});
