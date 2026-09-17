'use strict';

const MARKER = 'window.__PRELOADED_STATE__=';

/**
 * Mobalytics build pages are server-rendered: the full build data (skills,
 * paragon, gear, priority lists) is embedded directly in the page HTML as a
 * `window.__PRELOADED_STATE__=<json>;` assignment. This walks brace depth
 * from the marker to find the matching closing brace, so it doesn't depend
 * on trailing `;` formatting or exact whitespace.
 */
function extractPreloadedState(html) {
  const start = html.indexOf(MARKER);
  if (start === -1) {
    throw new Error('window.__PRELOADED_STATE__ not found in page HTML. The page structure may have changed.');
  }

  const jsonStart = start + MARKER.length;
  let depth = 0;
  let inString = false;
  let escaped = false;
  let end = -1;

  for (let i = jsonStart; i < html.length; i++) {
    const ch = html[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }

  if (end === -1) {
    throw new Error('Could not find the end of the __PRELOADED_STATE__ JSON object.');
  }

  const jsonText = html.slice(jsonStart, end);
  return JSON.parse(jsonText);
}

module.exports = { extractPreloadedState };
