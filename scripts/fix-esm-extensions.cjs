// After tsc emits ESM (with `module: ESNext` + `moduleResolution: Bundler`),
// the output files reference relative imports without `.js` extensions:
//
//   import * as foo from "./foo";   // Node ESM rejects this
//
// Node ESM requires explicit `.js` (or `/index.js` for directory imports).
// Bundler resolution is friendlier to write source in but doesn't help at
// runtime. This script walks dist/esm and rewrites each relative `from "..."`
// to add the right `.js` (or `/index.js`) suffix.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "dist", "esm");

function fixOne(filePath) {
  const dir = path.dirname(filePath);
  let src = fs.readFileSync(filePath, "utf8");

  src = src.replace(
    /((?:from|import)\s*\()?\s*(?:from\s+)?(['"])(\.{1,2}\/[^'"\n]*?)\2/g,
    (match, _imp, q, spec) => {
      // skip if already has an extension or is an asset import
      if (/\.(js|json|cjs|mjs)$/.test(spec)) return match;

      const absJs = path.resolve(dir, spec + ".js");
      const absIndex = path.resolve(dir, spec, "index.js");
      let resolved;
      if (fs.existsSync(absJs)) {
        resolved = spec + ".js";
      } else if (fs.existsSync(absIndex)) {
        resolved = spec + "/index.js";
      } else {
        return match; // unknown — leave alone
      }
      // preserve the original quote style
      return match.replace(spec, resolved);
    },
  );

  fs.writeFileSync(filePath, src);
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith(".js")) fixOne(full);
  }
}

walk(ROOT);
console.log("esm extension fix complete");
