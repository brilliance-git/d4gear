#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { extractPreloadedState } = require('../lib/extractState');
const { findBuildDocument } = require('../lib/findBuildDoc');
const { buildAllVariantsReport } = require('../lib/buildReport');

function parseArgs(argv) {
  const args = { out: path.join(__dirname, '..', 'web', 'data.js'), file: null, url: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--file') args.file = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (!a.startsWith('--')) args.url = a;
  }
  return args;
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

  if (!args.url && !args.file) {
    console.error('Usage: generate-web-data.js <mobalytics-build-url> [--out web/data.js]');
    console.error('   or: generate-web-data.js --file page.html [--out web/data.js]');
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
  const contents = `window.D4_BUILD_DATA = ${JSON.stringify(report, null, 2)};\n`;

  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  fs.writeFileSync(args.out, contents);
  console.log(`Wrote ${args.out} (${report.variants.length} variant(s): ${report.variants.map((v) => v.variantTitle).join(', ')})`);
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
