#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { extractPreloadedState } = require('../lib/extractState');
const { findBuildDocument } = require('../lib/findBuildDoc');
const { buildAllVariantsReport } = require('../lib/buildReport');

const DEFAULT_OUT = path.join(__dirname, '..', 'web', 'data.js');

function parseArgs(argv) {
  const args = { out: DEFAULT_OUT, file: null, url: null, list: false, remove: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--file') args.file = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--list') args.list = true;
    else if (a === '--remove') args.remove = argv[++i];
    else if (a === '--help' || a === '-h') args.help = true;
    else if (!a.startsWith('--')) args.url = a;
  }
  return args;
}

function printUsage() {
  console.error(
    [
      'Manage the build library that web/index.html reads (web/data.js).',
      '',
      'Add or update a build (matched by its Mobalytics slug, so re-running',
      'against the same guide updates it in place instead of duplicating it):',
      '  generate-web-data.js <mobalytics-build-url> [--out web/data.js]',
      '  generate-web-data.js --file page.html [--out web/data.js]',
      '',
      'Manage the library:',
      '  generate-web-data.js --list [--out web/data.js]',
      '  generate-web-data.js --remove <buildSlug> [--out web/data.js]',
    ].join('\n')
  );
}

/** web/data.js is a file we generate ourselves (window.D4_BUILD_DATA = {...};), so a
 * plain regex + JSON.parse is fine here — this never touches untrusted Mobalytics HTML. */
function loadLibrary(outPath) {
  if (!fs.existsSync(outPath)) return [];
  try {
    const contents = fs.readFileSync(outPath, 'utf8');
    const match = contents.match(/^window\.D4_BUILD_DATA\s*=\s*([\s\S]*?);\s*$/);
    if (!match) return [];
    const parsed = JSON.parse(match[1]);
    return Array.isArray(parsed.builds) ? parsed.builds : [];
  } catch (err) {
    console.error(`Warning: couldn't read existing library at ${outPath} (${err.message}); starting fresh.`);
    return [];
  }
}

function writeLibrary(outPath, builds) {
  const contents = `window.D4_BUILD_DATA = ${JSON.stringify({ builds }, null, 2)};\n`;
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, contents);
}

function describeBuild(b) {
  const variantNames = (b.variants || []).map((v) => v.variantTitle).join(', ');
  return `  ${b.buildSlug}  —  ${b.buildName}${variantNames ? ` (${variantNames})` : ''}`;
}

async function loadHtml(args) {
  if (args.file) {
    return fs.readFileSync(args.file, 'utf8');
  }
  const res = await fetch(args.url, {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; d4gear-priority-tool/1.0)' },
  });
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printUsage();
    return;
  }

  if (args.list) {
    const builds = loadLibrary(args.out);
    if (builds.length === 0) {
      console.log(`No builds saved yet in ${args.out}.`);
    } else {
      console.log(`${builds.length} build(s) in ${args.out}:`);
      builds.forEach((b) => console.log(describeBuild(b)));
    }
    return;
  }

  if (args.remove) {
    const builds = loadLibrary(args.out);
    const next = builds.filter((b) => b.buildSlug !== args.remove);
    if (next.length === builds.length) {
      throw new Error(`No build with slug "${args.remove}" found in ${args.out}.`);
    }
    writeLibrary(args.out, next);
    console.log(`Removed "${args.remove}". ${next.length} build(s) remain.`);
    return;
  }

  if (!args.url && !args.file) {
    printUsage();
    process.exit(1);
  }

  const html = await loadHtml(args);
  const state = extractPreloadedState(html);
  const doc = findBuildDocument(state);

  if (!doc) {
    throw new Error(
      'Could not find build data in the page. Make sure the URL points to a ' +
        'Mobalytics build guide page (mobalytics.gg/diablo-4/builds/...).'
    );
  }

  const report = buildAllVariantsReport(doc);
  const entry = Object.assign({ sourceUrl: args.url || null, updatedAt: new Date().toISOString() }, report);

  const builds = loadLibrary(args.out);
  const existingIndex = builds.findIndex((b) => b.buildSlug === entry.buildSlug);
  const action = existingIndex === -1 ? 'Added' : 'Updated';
  if (existingIndex === -1) {
    builds.push(entry);
  } else {
    builds[existingIndex] = entry;
  }

  writeLibrary(args.out, builds);
  console.log(`${action} "${entry.buildName}" (${entry.buildSlug}). ${builds.length} build(s) total in ${args.out}.`);
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
