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

## Usage

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

`web/index.html` is a small interactive page: pick a variant (e.g. "Early
Game" vs. "End Game") and a gear slot, and it shows that slot's affix /
socket / tempering priority, plus a "Build Priorities" section for skill
points, paragon glyphs, and talismans. It reads its data from `web/data.js`.

Generate `web/data.js` from a build guide, then open `web/index.html` in a
browser (or serve the `web/` folder, e.g. via GitHub Pages):

```sh
node bin/generate-web-data.js "https://mobalytics.gg/diablo-4/builds/<class>-<build-slug>" --out web/data.js
# or: node bin/generate-web-data.js --file page.html --out web/data.js
```

The repo ships with `web/data.js` already generated from
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
