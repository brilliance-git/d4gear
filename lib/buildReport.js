'use strict';

function slugToLabel(slug) {
  if (!slug) return '';
  return slug
    .split('-')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/**
 * Priority order within each category (gear stats, sockets, tempering) is
 * exactly the order Mobalytics lists it in, and directly reflects what a
 * reader should prioritize. Categories are kept separate rather than merged
 * into one sequence, because the on-page ordering between categories isn't
 * consistent across item types (aspects vs. unique items) and merging them
 * would fabricate an order that isn't actually verified.
 */
function slotPriority(gameEntity) {
  const mods = gameEntity?.modifiers || {};

  const affixes = (mods.gearStats || [])
    .filter(Boolean)
    .map((s) => ({ label: slugToLabel(s.id), core: !!(s.isGreater || s.isMasterwork) }));

  const sockets = (mods.socketStats || [])
    .filter(Boolean)
    .map((s) => ({ label: slugToLabel(s.slug), socketType: s.type }));

  const tempering = (mods.temperingStats || [])
    .filter(Boolean)
    .map((s) => ({ label: slugToLabel(s.id), core: !!(s.isGreater || s.isMasterwork) }));

  return { affixes, sockets, tempering };
}

function collapseSkillPriority(priorityList) {
  const out = [];
  for (const entry of priorityList || []) {
    const slug = entry?.slug;
    if (!slug) continue;
    const last = out[out.length - 1];
    if (last && last.slug === slug) {
      last.count++;
    } else {
      out.push({ slug, label: slugToLabel(slug), count: 1 });
    }
  }
  return out;
}

function buildReport(doc, variantIndex = 0) {
  const variants = doc?.data?.buildVariants?.values || [];
  if (variants.length === 0) {
    throw new Error('No build variants found in this document.');
  }
  if (variantIndex < 0 || variantIndex >= variants.length) {
    const list = variants.map((v, i) => `  [${i}] ${v.title}`).join('\n');
    throw new Error(`Variant index ${variantIndex} out of range. Available variants:\n${list}`);
  }

  const variant = variants[variantIndex];
  const gb = variant.genericBuilder || {};

  const gear = (gb.slots || [])
    .filter((slot) => slot?.gameEntity?.title)
    .map((slot) => ({
      slot: slugToLabel(slot.gameSlotSlug),
      item: slot.gameEntity.title,
      priority: slotPriority(slot.gameEntity),
    }));

  const assignedSkills = (gb.assignedSkills?.skills || [])
    .filter((s) => s?.skill?.name)
    .map((s) => ({ position: s.position, name: s.skill.name }));

  const skillPriority = collapseSkillPriority(gb.skillTree?.priorityList);

  const paragonPriority = (gb.paragon?.priorityList || [])
    .filter((p) => p?.slug)
    .map((p) => ({ label: slugToLabel(p.slug), isGlyph: p.type === 'glyph' }));

  const talismanPriority = (gb.talismansPriorityList || [])
    .filter((t) => t?.slug)
    .map((t) => ({
      item: slugToLabel(t.slug),
      priority: (t.modifiers || []).filter(Boolean).map((m) => slugToLabel(m.slug)),
    }));

  return {
    buildName: doc?.data?.name || doc?.slugifiedName || 'Unknown Build',
    variantTitle: variant.title,
    availableVariants: variants.map((v) => v.title),
    gear,
    assignedSkills,
    skillPriority,
    paragonPriority,
    talismanPriority,
  };
}

module.exports = { buildReport, slugToLabel };
