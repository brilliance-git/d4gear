'use strict';

function formatSlotList(items, { withCoreMarker } = {}) {
  return items.map((item, i) => {
    const marker = withCoreMarker && item.core ? '  ★' : '';
    return `    ${String(i + 1).padStart(2)}. ${item.label}${marker}`;
  });
}

function formatReportText(report) {
  const lines = [];

  lines.push(`${report.buildName} — ${report.variantTitle}`);
  const others = report.availableVariants.filter((v) => v !== report.variantTitle);
  if (others.length > 0) {
    lines.push(`(other variants available: ${others.join(', ')} — use --variant N)`);
  }

  if (report.assignedSkills.length > 0) {
    lines.push('', '== ASSIGNED SKILLS ==');
    for (const s of report.assignedSkills) lines.push(`  ${s.position}. ${s.name}`);
  }

  if (report.skillPriority.length > 0) {
    lines.push('', '== SKILL POINT PRIORITY ==');
    report.skillPriority.forEach((s, i) => {
      lines.push(`  ${i + 1}. ${s.label}${s.count > 1 ? ` x${s.count}` : ''}`);
    });
  }

  if (report.paragonPriority.length > 0) {
    lines.push('', '== PARAGON GLYPH PRIORITY ==');
    report.paragonPriority.forEach((p, i) => {
      lines.push(`  ${i + 1}. ${p.label}${p.isGlyph ? ' (glyph)' : ''}`);
    });
  }

  if (report.gear.length > 0) {
    lines.push('', '== GEAR / AFFIX PRIORITY ==');
    for (const g of report.gear) {
      lines.push('', `${g.slot} — ${g.item}`);
      if (g.priority.affixes.length > 0) {
        lines.push('  Affix Priority: (★ = core / Greater Affix target)');
        lines.push(...formatSlotList(g.priority.affixes, { withCoreMarker: true }));
      }
      if (g.priority.sockets.length > 0) {
        lines.push('  Sockets:');
        lines.push(...formatSlotList(g.priority.sockets));
      }
      if (g.priority.tempering.length > 0) {
        lines.push('  Tempering Priority:');
        lines.push(...formatSlotList(g.priority.tempering, { withCoreMarker: true }));
      }
    }
  }

  if (report.talismanPriority.length > 0) {
    lines.push('', '== TALISMAN / CHARM PRIORITY ==');
    report.talismanPriority.forEach((t, i) => {
      const suffix = t.priority.length ? ` — ${t.priority.join(', ')}` : '';
      lines.push(`  ${i + 1}. ${t.item}${suffix}`);
    });
  }

  return lines.join('\n');
}

module.exports = { formatReportText };
