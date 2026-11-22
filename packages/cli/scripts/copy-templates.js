#!/usr/bin/env node

/** Copy workspace template assets and bundled marketplace specs into the CLI. */

import { cpSync, readFileSync, readdirSync, statSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";

const EXCLUDED_TEMPLATE_ENTRIES = new Set(["__pycache__", ".DS_Store"]);
const EXCLUDED_TEMPLATE_EXTENSIONS = new Set([".pyc", ".pyo", ".ts"]);

function shouldSkipTemplateEntry(entry) {
  return (
    EXCLUDED_TEMPLATE_ENTRIES.has(entry) ||
    EXCLUDED_TEMPLATE_EXTENSIONS.has(extname(entry))
  );
}

/**
 * Recursively copy directory, excluding source and runtime cache artifacts.
 * Python hooks are executed during local tests, so ignored `__pycache__`
 * directories can exist alongside template assets and must stay out of the tarball.
 *
 * @param {string} src - Source directory
 * @param {string} dest - Destination directory
 */
function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });

  for (const entry of readdirSync(src)) {
    if (shouldSkipTemplateEntry(entry)) {
      continue;
    }

    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      cpSync(srcPath, destPath);
    }
  }
}

copyDir("../templates/assets", "dist/templates");

const marketplace = join("..", "..", "marketplace");
const catalogPath = join(marketplace, "index.json");
const { templates } = JSON.parse(readFileSync(catalogPath, "utf-8"));
const starterSpecs = templates.filter((entry) => entry.bundled === true);
const seen = new Set();
for (const { id, type, path } of starterSpecs) {
  if (type !== "spec" || typeof id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || path !== `specs/${id}` || seen.has(id)) {
    throw new Error(`Invalid or duplicate bundled marketplace spec: ${id}`);
  }
  seen.add(id);
  const source = join(marketplace, path);
  statSync(join(source, "index.md"));
  copyDir(source, join("dist", "templates", "starter-specs", id));
}
cpSync(catalogPath, join("dist", "templates", "marketplace-index.json"));

// Copy src/migrations/manifests to dist/migrations/manifests
copyDir("src/migrations/manifests", "dist/migrations/manifests");
console.log("Copied src/migrations/manifests/ to dist/migrations/manifests/");

console.log("Template copy complete.");
