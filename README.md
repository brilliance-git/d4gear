# d4gear

A small CLI that pulls the skill / gear / paragon **priority lists** out of a
Mobalytics Diablo 4 build guide, so you can see at a glance what to
prioritize without scrolling through the whole page.

## How it works

Mobalytics build pages are server-rendered: the entire build (skills,
paragon boards, gear, priority ordering) is embedded directly in the page
HTML as a `window.__PRELOADED_STATE__ = {...}` blob. This tool fetches the
page, extracts that JSON, and reformats the priority lists it contains.

Note: `isGreater` / `isMasterwork` flags on an affix (shown here with a
`★`) are what Mobalytics highlights in orange on the site — i.e. the
"core"/Greater-Affix-worthy stats.

## Importing a build (no terminal needed)

The live page has a **bookmarklet importer**. Fetching Mobalytics from a
server (a GitHub Action, a normal backend) gets a 403 — their CDN blocks
known cloud/datacenter IP ranges outright, regardless of headers — so the
importer instead runs *inside* the Mobalytics page itself, in your own
browser, where it's just a normal page view:

1. On the live site, drag the **"📥 Export D4 Build"** button to your
   bookmarks bar.
2. Open any Mobalytics D4 build guide in your browser, and click that
   bookmark. It reads the page's own embedded build data (same-origin, no
   fetch involved) and downloads a small `<slug>.json` fragment.
3. Back on the live site, drop that file onto the "Add a build" box (or
   click it to choose the file).

The build now shows up in the build switcher. By default this only saves
to that browser's `localStorage` — click **"Download data.js"** to export
the full merged library (built-ins + everything you've imported) as a file
you can commit to `web/data.js` to make it permanent and visible to
everyone, e.g. via GitHub's own web-based "Upload files" page (no git
required) or by asking whoever maintains the repo. Re-importing a build you
already have updates it in place. See `web/bookmarklet.js` for the
extraction logic (a browser-side port of `lib/buildReport.js`).

## CLI usage

```sh
node bin/cli.js "https://mobalytics.gg/diablo-4/builds/<class>-<build-slug>"
```

Options:

- `--variant N` — a build guide can have multiple variants (e.g. "Early
  Game" vs. "End Game"). Defaults to `0`; run without this flag first to see
  what's available, then re-run with the variant you want.
- `--json` — print the extracted report as JSON instead of formatted text.
- `--file PATH` — read a locally saved page instead of fetching the URL
  (View Source / Save As → HTML). Useful if you're running this somewhere
  without outbound network access.

## Example

```sh
node bin/cli.js --file fixtures/sample-page.html --variant 1
```

## Web page

`web/index.html` is a small interactive page: pick a **saved build** from
the dropdown, pick a variant (e.g. "Early Game" vs. "End Game"), then expand
a gear slot's card to see its affix / socket / tempering priority. Builds
come from two places, merged together (imported ones win on a name clash):
`web/data.js` (built-in, shipped with the repo) and this browser's
`localStorage` (added via the bookmarklet importer above). The page also
remembers which build you had open last.

The easiest way to add a build is the **bookmarklet importer** above. You
can also manage `web/data.js` directly with `bin/generate-web-data.js` if
you're running it somewhere Mobalytics doesn't block (e.g. your own
machine, not a datacenter/CI IP) — adding a build is matched by the
guide's own Mobalytics slug, so running it again against the same guide
**updates that build in place** instead of duplicating it, and running it
against a different guide **adds** a new one alongside what's already
there:

```sh
# Add or update a build (fetches the URL)
node bin/generate-web-data.js "https://mobalytics.gg/diablo-4/builds/<class>-<build-slug>" --out web/data.js

# ...or from a locally saved page
node bin/generate-web-data.js --file page.html --out web/data.js

# See what's currently saved
node bin/generate-web-data.js --list --out web/data.js

# Drop a build you no longer want (slug printed by --list)
node bin/generate-web-data.js --remove <buildSlug> --out web/data.js
```

Then open `web/index.html` in a browser (or serve the `web/` folder, e.g.
via GitHub Pages) — no rebuild step needed, it just reads the updated
`data.js`.

The repo ships with one build already generated from
`fixtures/sample-page.html` so the page works out of the box as a demo.

## Limitations

- Only the **relative order within each category** (affixes / sockets /
  tempering) is reproduced from the page's own data — these are shown as
  separate sub-lists per gear slot rather than merged into one sequence,
  because Mobalytics doesn't order categories consistently across item
  types (aspects vs. unique items), and merging them would fabricate an
  order that isn't actually verified by the source data.
- Rune/socket flavor text (e.g. what "Jah" or "Igni" actually do) isn't
  included — only the rune name, since that text isn't present in the
  priority data itself.
- If Mobalytics changes their page structure, `extractPreloadedState` /
  `findBuildDocument` may need updating — the `--file` option plus
  `test/report.test.js` and `fixtures/sample-page.html` make it easy to
  check whether the extraction still works against a freshly saved page.

## Tests

```sh
npm test
```
