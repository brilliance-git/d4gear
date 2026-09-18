/**
 * Source for the "Export D4 Build" bookmarklet.
 *
 * This is a deliberate, minimal port of lib/findBuildDoc.js + lib/buildReport.js
 * to browser JS with no build step, because it has to run as a bookmarklet
 * inline on mobalytics.gg's own page (same-origin there, so it can read
 * window.__PRELOADED_STATE__ directly - no fetch, no CORS, nothing for a
 * WAF/bot-detection rule to block). Keep this in sync with lib/buildReport.js
 * by hand if that logic changes; there's no shared build step between the
 * Node CLI and this browser script.
 *
 * web/index.html fetches this file's own source (same origin) and wraps it
 * in a `javascript:` URI for the draggable bookmarklet link, so this file
 * is the single source of truth - never hand-edit a separately-minified copy.
 */
(function () {
  function slugToLabel(slug) {
    if (!slug) return '';
    return slug
      .split('-')
      .map(function (w) {
        return w ? w.charAt(0).toUpperCase() + w.slice(1) : w;
      })
      .join(' ');
  }

  function slugify(text) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  function slotPriority(gameEntity) {
    var mods = (gameEntity && gameEntity.modifiers) || {};

    function mapStats(list, withCore) {
      return (list || []).filter(Boolean).map(function (s) {
        var out = { label: slugToLabel(s.id || s.slug) };
        if (withCore) out.core = !!(s.isGreater || s.isMasterwork);
        return out;
      });
    }

    return {
      affixes: mapStats(mods.gearStats, true),
      sockets: mapStats(mods.socketStats, false),
      tempering: mapStats(mods.temperingStats, true),
    };
  }

  function collapseSkillPriority(priorityList) {
    var out = [];
    (priorityList || []).forEach(function (entry) {
      var slug = entry && entry.slug;
      if (!slug) return;
      var last = out[out.length - 1];
      if (last && last.slug === slug) {
        last.count++;
      } else {
        out.push({ slug: slug, label: slugToLabel(slug), count: 1 });
      }
    });
    return out;
  }

  function buildVariantReport(doc, variantIndex) {
    var variants = (doc.data && doc.data.buildVariants && doc.data.buildVariants.values) || [];
    var variant = variants[variantIndex];
    var gb = variant.genericBuilder || {};

    var gear = (gb.slots || [])
      .filter(function (slot) {
        return slot && slot.gameEntity && slot.gameEntity.title;
      })
      .map(function (slot) {
        return {
          slotSlug: slot.gameSlotSlug,
          slot: slugToLabel(slot.gameSlotSlug),
          item: slot.gameEntity.title,
          priority: slotPriority(slot.gameEntity),
        };
      });

    var assignedSkills = ((gb.assignedSkills && gb.assignedSkills.skills) || [])
      .filter(function (s) {
        return s && s.skill && s.skill.name;
      })
      .map(function (s) {
        return { position: s.position, name: s.skill.name };
      });

    var skillPriority = collapseSkillPriority(gb.skillTree && gb.skillTree.priorityList);

    var paragonPriority = ((gb.paragon && gb.paragon.priorityList) || [])
      .filter(function (p) {
        return p && p.slug;
      })
      .map(function (p) {
        return { label: slugToLabel(p.slug), isGlyph: p.type === 'glyph' };
      });

    var talismanPriority = (gb.talismansPriorityList || [])
      .filter(function (t) {
        return t && t.slug;
      })
      .map(function (t) {
        return {
          item: slugToLabel(t.slug),
          priority: (t.modifiers || []).filter(Boolean).map(function (m) {
            return slugToLabel(m.slug);
          }),
        };
      });

    return {
      variantTitle: variant.title,
      gear: gear,
      assignedSkills: assignedSkills,
      skillPriority: skillPriority,
      paragonPriority: paragonPriority,
      talismanPriority: talismanPriority,
    };
  }

  function findBuildDocument(state) {
    var queries =
      (state &&
        state.diablo4State &&
        state.diablo4State.apollo &&
        state.diablo4State.apollo.graphqlV2 &&
        state.diablo4State.apollo.graphqlV2.queries) ||
      [];

    for (var i = 0; i < queries.length; i++) {
      var q = queries[i];
      if (!q.queryKey || q.queryKey[0] !== 'ngf-ug-featured-document-page') continue;
      var entries = (q.state && q.state.data) || [];
      for (var j = 0; j < entries.length; j++) {
        var entry = entries[j];
        var doc =
          entry &&
          entry.game &&
          entry.game.documents &&
          entry.game.documents.userGeneratedDocumentBySlug &&
          entry.game.documents.userGeneratedDocumentBySlug.data;
        if (doc) return doc;
      }
    }
    return null;
  }

  var state = window.__PRELOADED_STATE__;
  if (!state) {
    alert(
      'D4 Gear Priority importer: no window.__PRELOADED_STATE__ found on this page.\n' +
        'Make sure you are on a Mobalytics build guide page, then try again.'
    );
    return;
  }

  var doc = findBuildDocument(state);
  if (!doc) {
    alert('D4 Gear Priority importer: could not find build data in this page.');
    return;
  }

  var variants = (doc.data && doc.data.buildVariants && doc.data.buildVariants.values) || [];
  if (!variants.length) {
    alert('D4 Gear Priority importer: this build has no variants to export.');
    return;
  }

  var buildName = (doc.data && doc.data.name) || doc.slugifiedName || 'Unknown Build';
  var entry = {
    buildSlug: doc.slugifiedName || doc.id || slugify(buildName),
    buildName: buildName,
    sourceUrl: location.href,
    updatedAt: new Date().toISOString(),
    variants: variants.map(function (_, i) {
      return buildVariantReport(doc, i);
    }),
  };

  var blob = new Blob([JSON.stringify(entry, null, 2)], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = entry.buildSlug + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  alert(
    'Exported "' + buildName + '" (' + variants.length + ' variant(s)) as ' + a.download + '.\n\n' +
      'Drop that file onto the "Import a build" box on the d4gear site to add it.'
  );
})();
