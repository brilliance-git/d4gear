'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { extractPreloadedState } = require('../lib/extractState');
const { findBuildDocument } = require('../lib/findBuildDoc');
const { buildReport } = require('../lib/buildReport');

const fixtureHtml = fs.readFileSync(
  path.join(__dirname, '..', 'fixtures', 'sample-page.html'),
  'utf8'
);

test('extractPreloadedState parses the embedded JSON', () => {
  const state = extractPreloadedState(fixtureHtml);
  assert.ok(state.diablo4State);
});

test('extractPreloadedState throws a clear error when the marker is missing', () => {
  assert.throws(() => extractPreloadedState('<html></html>'), /not found/);
});

test('findBuildDocument locates the build document', () => {
  const state = extractPreloadedState(fixtureHtml);
  const doc = findBuildDocument(state);
  assert.equal(doc.data.name, 'Skeletal Warrior Minions');
});

test('buildReport reproduces the known Ring of Power Mages priorities (variant 0)', () => {
  const state = extractPreloadedState(fixtureHtml);
  const doc = findBuildDocument(state);
  const report = buildReport(doc, 0);

  assert.equal(report.variantTitle, 'Early Game Army');

  const ring1 = report.gear.find((g) => g.slot === 'Ring 1');
  assert.equal(ring1.item, 'Aspect of Gloom');
  assert.deepEqual(
    ring1.priority.affixes.map((a) => a.label),
    ['Critical Strike Chance', 'Vulnerable Damage Multiplier', 'Shadow Damage Multiplier', 'Maximum Life']
  );
  assert.equal(ring1.priority.affixes[0].core, true);
  assert.equal(ring1.priority.affixes[1].core, false);
});

test('buildReport reproduces the known Blood Moon Breeches priorities (variant 1)', () => {
  const state = extractPreloadedState(fixtureHtml);
  const doc = findBuildDocument(state);
  const report = buildReport(doc, 1);

  const pants = report.gear.find((g) => g.slot === 'Pants');
  assert.equal(pants.item, 'Blood Moon Breeches');
  assert.deepEqual(
    pants.priority.affixes.map((a) => a.label),
    ['Intelligence', 'Critical Strike Damage Multiplier', 'Maximum Life', 'Armor']
  );
  assert.equal(pants.priority.affixes[1].core, true);
  assert.deepEqual(
    pants.priority.sockets.map((s) => s.label),
    ['Jah', 'Igni']
  );
});

test('buildReport collapses repeated skill point ranks', () => {
  const state = extractPreloadedState(fixtureHtml);
  const doc = findBuildDocument(state);
  const report = buildReport(doc, 0);

  const skeletonMage = report.skillPriority.find((s) => s.slug === 'skeleton-mage');
  assert.equal(skeletonMage.count, 15);
});

test('buildReport throws a helpful error for an out-of-range variant', () => {
  const state = extractPreloadedState(fixtureHtml);
  const doc = findBuildDocument(state);
  assert.throws(() => buildReport(doc, 99), /out of range/);
});
