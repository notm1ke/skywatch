# Skywatch design guidelines

How the app should look, feel and behave. Written from the routing page, the waypoints page and the OG image work
(Nov 2026). Where a pattern has a reference implementation it's named, so copy from the code rather than from this
document: if the two disagree, the code is newer.

Reference implementations:

| What | Where |
|---|---|
| Map-first page: routing | `apps/web/components/routing/` |
| Map-first page: waypoints | `apps/web/components/waypoints/` |
| Shared UI | `apps/web/components/ui/` (`hint.tsx`, `bar-toggle.tsx`, `scroll-area.tsx`, `copy-button.tsx`, `empty.tsx`) |
| OG images | `apps/web/app/(app)/**/opengraph-image.tsx`, data in `apps/web/geojson/` |

## Principles

1. **Map first.** On a map page the map is the page. Everything on it can be hovered and clicked, and the panels exist to
   explain what you pointed at, not to be the way in.
2. **Chrome stays quiet.** Floating panels and bars are translucent and thin. Color is reserved for meaning.
3. **Explain things.** Anything with jargon gets a tooltip in plain words (see `Hint`). The people using this aren't all
   pilots.
4. **State is shareable.** What's open and what's filtered lives in the URL.
5. **Fast beats fancy.** Interaction never waits on a re-upload, a refetch or a re-layout (see "Maps and performance").
6. **One look across pages.** Reuse the shell, the bar, the panel and the tooltip. Don't invent a new one per page.

## Page shell

Full height, map on top, a bar under it. Mirrors routing and waypoints. The bar is always the last thing on the page,
at the bottom of the screen (with a table it goes under the table, see "Variant: map and table").

```tsx
<div className="flex h-(--page-height) flex-col">
	<div className="relative min-h-0 flex-1">
		<TheMap />                {/* absolute inset-0 inside */}
		<HoverHint />             {/* pointer-events-none, over the map */}
		<Panel />                 {/* floating, over the map */}
	</div>
	<FilterBar />               {/* h-10, shrink-0 */}
</div>
```

- Height comes from the `--page-height` token (viewport minus the app chrome). Don't hardcode pixel heights; use tokens
  (`--page-height`, `--map-height`, `--detail-panel-width`, ...) from `app/globals.css`.
- The map root is `absolute inset-0 overflow-hidden` with `data-fullscreen={false}`. Pass its ref to `MapControls` so
  fullscreen works.
- Mobile and desktop share one map block. Switch position and orientation with props
  (`position={mobile ? "bottom-right" : "top-right"}`), don't duplicate the `<Map>`.

### Variant: map and table (TFRs)

For data that's worth scanning as rows, keep the table and make it the map's twin (`apps/web/components/tfr/`). Map on
top (58% of the page, draggable divider: pointer, arrow keys, double click resets), the table below it, and **the bar
last, at the very bottom of the screen**. The bar always goes at the bottom on these pages, under the table too: it
reads as the page's footer and its tooltips open upward into the content. The divider handle sits on the border between
the map and the table. The panel floats over the map, so the table keeps its full width.

- The shell sets `--tfr-split` (a unitless number); the panel's scroll viewport uses it:
  `max-h-[max(10rem,calc(var(--page-height)*var(--tfr-split)-8.5rem))]`.
- Hover and selection live in one zustand store that both views read: hovering a row picks the shape out on the map and
  the other way round, a click on either opens the panel, a TFR opened on the map is scrolled into view in the table
  (the grid is virtual: work out the row's offset, don't look for its element).
- "In view" bar toggle: the table lists only what the map is showing (`view` is the map's bounds, written on `moveend`).
- A type has one definition (`types.ts`: label, icon, hex color, matching badge color, plain-words description) used by
  the map, the chips, the panel and the table's type menu.
- Small things get a **dot** at low zoom that fades out as the outline becomes a shape you can point at (a stadium's TFR
  is a speck at national scale). The dot's hit layer has a `maxzoom` so it stops once it's faded.
- Overlapping shapes: of everything under the pointer, the one with the smallest bounding box wins.
- `DataGrid` takes a pixel `height`: measure the box it sits in with a `ResizeObserver`.
- The map needs `map.resize()` from its own `ResizeObserver` when the divider moves.

## Floating panels

Over the map, never beside it.

- Chrome: `rounded-lg border bg-background/90 shadow-lg backdrop-blur`. Search inputs use the same recipe.
- Desktop: top-left, fixed width (`lg:w-80` for routing, `lg:w-96` for waypoints). Mobile: full width with `inset-x-2`
  (routing's list sits at the bottom, waypoints' search at the top).
- Wrap panels in `pointer-events-none` and put `pointer-events-auto` on the cards, so the gaps between them stay part of
  the map.
- One panel does one job at a time. A list is **replaced** by the details of what you picked (routing), or the details
  sit under the search (waypoints). Never show both open and fighting for height.
- Scrolling: use the shared `ScrollArea` (edge masks). Put the max height on the **viewport**, not the root:
  `viewportClassName="max-h-[calc(var(--page-height)-11rem)]"`.
- Close with an X in the details header and with Esc, which closes whatever is on top (open search results first, then
  the open item). **One** dismiss control per panel; closing also clears the search box.

## The bar

`flex h-10 shrink-0 divide-x overflow-x-auto border-t bg-background text-sm`, children are full height, separated by
dividers (not gaps, not pills).

- Toggles are `BarToggle` (`components/ui/bar-toggle.tsx`): tinted `bg-accent/60` while on, muted while off.
- Filter chips: color dot (`size-2 rounded-full`) + mono code + mono count (`text-xs tabular-nums text-muted-foreground`).
  A hidden type is `opacity-50`. Counts come from the **whole** data set so they don't move when you toggle one.
- Right side: `ml-auto`, the count ("1,234 of 69,883 waypoints") and a `Clear` text button (disabled when there's
  nothing to clear).
- Every control in it gets a `Hint`.

## Tooltips (`Hint`)

`components/ui/hint.tsx`. Opens above (the bar is at the bottom), 300ms delay. Three parts:

1. **Title:** what it is (with the color dot and code for types).
2. **Body:** one or two plain sentences on what it means or does.
3. **Note:** under a divider, the current state and the consequence of a click ("12 routes. Click to hide them.").

Use `disabled` while the control's own popover is open. Prefer `Hint` over raw `title=` attributes; a plain `Tooltip` is
for icon-only buttons that just need a label.

## Details panel anatomy

1. **Header:** a 40px tile in the type's color at 15% (`${color}26`) with its icon, the id in mono
   (`text-lg font-semibold tracking-tight`) with a ghost copy button, a muted subtitle (`type · place`), and the X.
2. **Blurb:** what this thing is, in a `bg-muted/50` callout. This is the first section: no tag rows above it.
3. **Sections:** `border-t px-3 py-3`, a title in `font-mono text-[10px] tracking-wider uppercase text-muted-foreground`,
   then rows. Group by meaning (Position, Airways, Preferred routes, Charts), not by data type.
4. **Rows:** label (`w-16`, muted) and value (`font-mono`, `wrap-anywhere`) at `text-xs`. Long values wrap, never scroll
   sideways (`grid-cols-1` or `min-w-0`).
5. **Empty answers are sentences**, not blanks: "Not part of any airway.", "Not used in any FAA preferred route."
6. Things that link elsewhere really link (airport chips go to `/airports/XXX`, route pairs to `/routing?from=…&to=…`).

## Maps and performance

- **Hover and selection never change a filter on a big source.** In Mapbox a `setFilter` marks the layer's whole source
  for reload, so on a 70k-point source every hover re-processes every tile and the highlight trails the mouse. Put the
  hovered and selected items in their own tiny GeoJSON source (0 to 2 features) with constant filters, and update that
  source's data instead. A filter on the big source is fine for rare, deliberate actions (toggling a type chip).
- Hit targets: a second layer with a bigger radius and `0.01` opacity (opacity `0` layers aren't queried). Only pass
  `interactiveLayerIds` once those layers exist.
- Hover: ring in the ink color, plus a hint at the top center of the map saying what a click will do
  (`pointer-events-none absolute top-2 left-1/2 …`, offset by half the panel width on desktop). Cursor is `pointer` over
  anything clickable.
- Selection: **amber `#f59e0b`** ring + dot + label, always shown whatever the filters and zoom say. A click on the
  background closes the panel. Selecting dims the rest of the data to context (routing).
- Decluttering by zoom: encode it in the paint expression (`interpolate` on zoom with a `match` on type in each stop,
  radius 0 until a type's zoom) instead of adding layers. A type pops in rather than grows.
- Flying: ask the map to fly through the store (`flyTo(id, zoom)` with a token), don't reach for the map ref from a
  panel. The request waits for the map and the data.
- Data in the page should be slimmed to what the map draws. Detail loads on click. 70k waypoints as compact tuples
  is 2MB; as full GeoJSON it was 27MB.

## Color

- **Selected / "this one":** amber `#f59e0b`.
- **Status:** red `-400` closure or critical, orange `-400` ground stop, yellow `-400` delay, green normal. `blue-500`
  and `fill-accent` mean live / current. `animate-pulse` means "happening right now" (and skeletons), nothing else.
- **Waypoint types** (`components/waypoints/types.ts`, the single source, also used by the OG image): WP `#a78bfa`,
  RP `#14b8a6`, MR `#06b6d4`, CN `#3b82f6`, MW `#84cc16`, NRS `#ec4899`, VFR `#22c55e`, RADAR `#ef4444`.
- **Airway families:** J blue, V green, Q violet, T teal, Y cyan, anything else slate.
- **Route types** (`components/routing/geo.ts`): H blue, L green, TEC amber, NAR violet, SHD pink, SLD rose, HPD cyan.
- A type has one color everywhere it appears: the dot, the chip, the icon tile, the OG image.
- Prefer tokens and theme classes (`bg-background`, `text-muted-foreground`, `border`) over hardcoded zinc, so dark mode
  comes free. Hex only for map paint and images.

## Shape and type

- Floating chrome `rounded-lg`; chips, badges and counts `rounded-sm`; `rounded-full` only for real dots and avatars.
- Ladder: `text-sm` for chrome and body, `text-xs` for details and secondary, `text-[10px]` for section titles and the
  densest mono. Anything numeric or code-like (IATA, ids, counts, times) is `font-mono tabular-nums`; numbers inside a
  sentence aren't.
- No underline-on-hover. Rows and chips go one step darker/lighter (`hover:bg-accent`, `hover:bg-accent/40`).
- Arrows between places are the `ArrowRight` icon (the `Leg` component), not the `→` character.

## URL state

`history.replaceState`, not the Next router: no re-render, no history entry per click. One hook per page
(`url-sync.ts`): restore only what the link says, then write on change.

- routing: `?from=airport:ORD&to=artcc:ZNY&both=1&hide=TEC,L&complete=1&view=pairs&route=<key>`
- waypoints: `?id=ABR&charts=ifr&hide=WP,RP`
- tfrs: `?id=6/7601&hide=SECURITY&view=map`
- Ids that go in a URL are stable keys (a route is `ORIGIN.DEST.TYPE.SEQ`), not database ids, and are validated by a
  regex when read.

## States

- **Loading:** skeletons shaped like the real thing. On a map page a small purple/neutral badge with a spinner at the
  bottom-left. Counts say "Loading …".
- **Error:** the `Empty` component with an icon tile (red), "Something went wrong", one sentence, and a Retry button.
- **No results:** a sentence that names the query ("No waypoints start with “XYZ”.").
- **Stale data:** content stays, `opacity-60`, while the next result loads (`keepPreviousData`).

## OG images

`app/(app)/<route>/opengraph-image.tsx`. 800 x 400, white, the dotted map, nothing else loud.

- **Map:** `~/geojson/dotted-map.json` through `geoMercator` (center `[-96, 38]`). US dots `#00BCFF`, everything else
  `#52525C` at 50%, 4px squares drawn from their top-left corner.
- **Signature:** bottom-left, `absolute bottom-8 left-8`: "Skywatch" in Instrument Serif at 31px, and under it the
  page's name in JetBrains Mono, uppercase, `text-sm text-zinc-600`. Don't move it.
- **Placement:** base and routing are centered at scale 550. TFRs shift right 20%. Airports, waypoints and the airport
  pages use scale 500 with the US centered at x=531 (`translate([531, 200])`), so a column of text fits on the left
  and the whole east coast still fits. At scale 550 shifted, Boston gets cut off.
- **Marker per page:** TFRs recolor dots red; routing recolors the dots along six real corridors yellow (7px) with red
  (9px) airport dots; airports are amber diamonds; waypoints are type-colored circles (US dots dropped to 38% so blue,
  cyan and teal stay readable); an airport's own page puts an amber ring and dot on it (radius 14 ring, 26 faint ring,
  4.5 dot). Route and airport dots **snap to the grid** and are drawn bigger than the 4px dots, or the trail reads as
  noise.
- **Data is baked** into `apps/web/geojson/og-*.json` (routes, airports, waypoints). The web build can't count on the
  gateway being up, and a static OG route is built at deploy time. Keep these small, thin them (one marker per ~1 to
  2 degree cell), restrict to the lower 48 so Hawaii and Alaska don't land in odd corners, and make the pick seeded so
  a rebuild is identical. The generator scripts aren't in the repo: re-derive from the gateway.
- **Dynamic OG routes** (`airports/[iata]`) must call the gateway with a plain `fetch(url, init)`. The oRPC client
  hands `fetch` a `Request` object, which comes back as a synthetic 500 in the OG route on Next 16.4.
- **Text in the image** is HTML positioned over the SVG (Satori renders SVG as an image, so custom fonts don't load
  inside it). The info column on airport pages is plain text on the page, no card, and no dot is ever drawn left of
  x=262.
- Names are clamped at 26 characters on a word boundary with a `…`, after collapsing repeated spaces and stripping
  dangling `-`, `,` or an unclosed `(`.
- Check one by loading the page, reading its `og:image` meta tag (the URL has a content hash) and fetching that.

### The dotted map data

- It's a square grid in Mercator space, 1.2157 degrees of longitude per step, keyed by country (`US`, `MX`, `CA`, `CU`,
  `BS`). Only append to a country's list: other pages key dots as `US-123`.
- Lakes are deliberately empty. Isolated islands out at sea look like mistakes, so leave them off.
- Check completeness against real coastlines (Natural Earth 50m countries and lakes) before adding.

## Data and deploys

- Shape data on the server and send the map what it draws; fetch the rest on demand.
- **Endpoint changes are additive.** Add a new endpoint next to the old one; old and new web builds both have to work
  against the new gateway. Removing the old one is a later change, after both are live.
- **Deploy the gateway before the web app.** A web build that expects a new shape against an old gateway, or the reverse,
  crashes the page (it happened: `iataCode.join` on a string).
- Parsers of free-text feeds (the FAA operations plan) must never throw and must keep the original line; classification
  is decoration (color, icon, explanation) and unmatched text falls back to a neutral style.
- Anything that goes into a database query pattern is validated first (`/^[A-Z0-9]{2,8}$/`).

## Gotchas

- `apps/web/tsconfig.json` must not have `references`. Next 16.4's build type-checks with `tsc --project`, which honors
  them, and the gateway project is never built, so every gateway type becomes `{}`. A throwaway tsconfig that `extends`
  it doesn't inherit `references`, so check with the real one:
  `node_modules/.bin/tsc --project tsconfig.json --noEmit --incremental false` (ignore the gitignored `clear.test.ts`).
- `cnfast` doesn't reliably dedupe conflicting classes (`relative` vs `absolute`), and the shared `ScrollArea` root is
  always `relative`.
- Tailwind v4: `h-(--var)`, `wrap-anywhere`, `lg:` is 1024px. `break-words` doesn't change min-content sizing in grids.
- `react-map-gl` Layers re-apply `filter` whenever it deep-differs. Keep filters constant, or move what changes
  elsewhere (see Maps and performance).

## Working agreements

- Make code changes with the Edit and Write tools, not `sed` or scripts, so the diffs are visible.
- Run typecheck and lint after changes. Don't open the browser to verify unless asked; when asked, use `agent-browser`.
  Say plainly when something wasn't viewed.
- Ask before writing to the local database. The production database is read-only. Never reset the local one.
- Don't commit unless asked. The user generates Prisma migrations.
