#!/usr/bin/env node
'use strict';

const fs = require('fs');
const { extractPreloadedState } = require('../lib/extractState');
const { findBuildDocument } = require('../lib/findBuildDoc');
const { buildReport } = require('../lib/buildReport');
const { formatReportText } = require('../lib/formatText');
const { BROWSER_HEADERS } = require('../lib/httpHeaders');

function parseArgs(argv) {
  const args = { variant: 0, json: false, file: null, url: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--file') args.file = argv[++i];
    else if (a === '--variant') args.variant = parseInt(argv[++i], 10) || 0;
    else if (a === '--json') args.json = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else if (!a.startsWith('--')) args.url = a;
  }
  return args;
}

function printUsage() {
  console.error(
    [
      'Usage:',
      '  mobalytics-priority <mobalytics-build-url> [--variant N] [--json]',
      '  mobalytics-priority --file page.html [--variant N] [--json]',
      '',
      'Options:',
      '  --variant N   Which build variant to show (default: 0). A build guide can',
      '                have several variants (e.g. "Early Game" vs "End Game"); run',
      '                without this flag first to see what is available.',
      '  --json        Print the extracted report as JSON instead of formatted text.',
      '  --file PATH   Read a locally saved page (View Source / Save As HTML) instead',
      '                of fetching the URL. Useful if the live fetch is blocked.',
    ].join('\n')
  );
}

async function loadHtml(args) {
  if (args.file) {
    return fs.readFileSync(args.file, 'utf8');
  }
  const res = await fetch(args.url, { headers: BROWSER_HEADERS });
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || (!args.url && !args.file)) {
    printUsage();
    process.exit(args.help ? 0 : 1);
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

  const report = buildReport(doc, args.variant);
  console.log(args.json ? JSON.stringify(report, null, 2) : formatReportText(report));
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
