# CompoBeach Design System: KRYPTON-86

> A metrology-lab spec sheet for comparing LLMs. Warm paper, black ink, hairline rules, crop marks. **One** calibrated orange does all of the signalling.

This document is the only design reference.

---

## 1. Principles

1. **One signal colour.** Kr-86 orange (`#ff5b14`) is the only hue that carries meaning: primary action, the winning or cheapest lane, focus, active state. If everything is orange, nothing is. Aim for less than 5% of any screen.
2. **Ink on paper.** The UI is printed, not lit. There are no gradients, glows, blur, glassmorphism or soft drop shadows. The only depth is a hard 3px ink offset on primary buttons. (The one exception is the spectrum figure; see §8.)
3. **Hairlines over boxes.** Use 1px rules to structure content. Fill a box only when it is an interactive container.
4. **Numbers are instruments.** Tokens, $ and ms are always mono and tabular, and right-aligned in tables. Precision is part of the look.
5. **Annotate like a drawing.** Section numbers (`01`, `02`), figure captions (`fig. 06 —`), units after values. Labels are small uppercase mono with wide tracking.
6. **Square corners everywhere.** `border-radius: 0`, with no exceptions.
7. **Honest data.** A missing value shows `n/a`, never `0`. A model with no price shows `no price`, never `$0.00`.

---

## 2. Colour tokens

| Token | Hex | Role |
|---|---|---|
| `paper` | `#ece6d8` | App background |
| `sheet` | `#f4efe4` | Surfaces: panels, inputs, cards |
| `rule` | `#b9ae96` | Secondary hairlines, table row dividers, graph paper |
| `graphite` | `#6b6354` | Muted text, labels, captions |
| `ink` | `#14110d` | Foreground text, primary borders, inverted blocks |
| `kr` | `#ff5b14` | **The** accent: primary fill, winner, focus ring, active |
| `cobalt` | `#1b3cff` | Links, secondary info, diff "added" side |
| `redline` | `#d8121b` | Errors, refusals, destructive borders/fills |
| `redline-text` | `#b80f17` | Red **text** on paper (meets AA) |

Contrast rules (measured):
- `ink` on `paper`: ~16:1. Use for all body text.
- `graphite` on `paper`: ~4.8:1. AA for small text, so labels are fine.
- `ink` on `kr`: ~6:1. **Text on orange is always `ink`**, never white.
- `kr` on `paper`: ~2.6:1. **Never use orange for text.** Orange is a fill, a border, a bar or a marker only.
- `cobalt` on `paper`: ~5.4:1. OK for link text.
- `redline` on `paper` is ~4.2:1, so use `redline-text` for small red text.

Tints are allowed only as flat alpha fills of `kr` (18%) or `redline` (10%), for example a highlighted table row or an error banner.

---

## 3. Typography

Fonts (Google Fonts):

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Condensed:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Serif:wght@400;600&family=IBM+Plex+Sans:wght@400;600&display=swap" rel="stylesheet" />
```

(Or self-host with `@fontsource/ibm-plex-sans-condensed` and `@fontsource/ibm-plex-mono`. The app is local, so self-hosting is preferred.)

- **Display / UI:** IBM Plex Sans Condensed
- **Data / labels / code:** IBM Plex Mono
- **Reply stocks only:** IBM Plex Serif (lane B) and IBM Plex Sans (lane D). See "Lane identity: paper stocks". Never use them in the app chrome.

| Style | Font | Size / line-height | Weight | Treatment |
|---|---|---|---|---|
| Display | Sans Condensed | 88 / 0.9 | 700 | UPPERCASE, tracking `-0.03em` |
| H1 | Sans Condensed | 48 / 1.0 | 700 | UPPERCASE, tracking `-0.03em` |
| H2 | Sans Condensed | 30 / 1.1 | 500 | Sentence case |
| H3 | Sans Condensed | 20 / 1.2 | 500 | Sentence case |
| Body | Sans Condensed | 16 / 1.5 | 400 | Max width 62ch |
| Body small | Sans Condensed | 14 / 1.5 | 400 | |
| Data | Plex Mono | 13 / 1.6 | 400 | `tabular-nums` |
| Label | Plex Mono | 11 / 1.4 | 500 | UPPERCASE, tracking `0.12–0.16em`, `graphite` |
| Metric (big) | Sans Condensed | 40–60 / 1.0 | 700 | tracking `-0.04em`, `tabular-nums` |

Rules:
- Every number (tokens, $, ms, turn #) uses mono with `font-variant-numeric: tabular-nums`. Big hero metrics are the one exception and use Sans Condensed 700.
- Format tokens with thousands separators (`12,402`). Show $ to 4 decimals under $1 (`$0.0712`) and 2 above. Durations are `412 ms` or `1.21 s`.
- Units come after the value, in `graphite`: `2,904 <span>tok</span>`.

---

## 4. Spacing, grid and layout

**6px base unit.** Allowed steps: `6 · 12 · 18 · 24 · 36 · 48 · 72 · 96`.

In Tailwind, `--spacing: 6px`, so `p-1` = 6px, `p-2` = 12px, `p-3` = 18px, `p-4` = 24px, `p-6` = 36px, `p-8` = 48px, `p-12` = 72px, `p-16` = 96px.

- Page background: `paper` plus a 24px graph-paper grid (ink at 5% alpha).
- The main app frame gets 1px `ink` rules on its left and right edges, like a sheet margin, and a flat `rgb(236 230 216 / .6)` paper wash so the graph paper shows through faintly.
- Panel padding is 24px; dense lane columns use 18px.
- Gap between panels is 18px.
- Compare view: lanes are equal-width columns (2–4) separated by 1px `ink` rules, not gaps.

---

## 5. Borders, depth, texture

| Element | Spec |
|---|---|
| Primary border | `1px solid ink` |
| Secondary rule | `1px solid rule` |
| Radius | `0` everywhere |
| Primary button shadow | `3px 3px 0 ink` (hard, no blur) |
| Focus | `outline: 2px solid kr; outline-offset: 2px` |
| Crop marks | 12×12px L-shaped `kr` corners at top-left and bottom-right of featured panels, offset −7px |
| Graph paper | `linear-gradient` 1px lines, `rgba(20,17,13,.05)`, 24px cell |
| Section index | Inverted ink block: `bg-ink text-paper px-1.5` mono 11px, followed by the label and a 1px ink rule filling the row |

Use crop marks on **featured** panels only (the active lane, the composer, the summary row). Don't put them on every card.

---

## 6. Motion

Motion is minimal and mechanical, like an instrument settling.
- Duration 120–180ms, `cubic-bezier(.2,0,0,1)`. Never bounce or spring.
- Button press: translate `(1px,1px)` on hover and `(3px,3px)` on active, with the shadow shrinking to match.
- Streaming: a 1-character `kr` block cursor `▍` at the end of streaming text, blinking with `steps(1)` at 1s.
- Progress / streaming bar: hard-edged fill with no easing shimmer.
- Respect `prefers-reduced-motion`: turn off the cursor blink and press translates.

---

## 7. Components

### Button
- Text is Plex Mono 12px, weight 500, UPPERCASE, tracking `0.12em`, padding `12px 18px`, followed by a trailing `→` glyph.
- **Primary:** `bg-kr text-ink`, `3px 3px 0 ink` shadow. Only **one** primary per view, for example "Send to all lanes".
- **Secondary (ghost):** `1px ink` border, transparent background. On hover it inverts to `bg-ink text-paper`.
- **Destructive:** `1px redline` border with `redline-text`. Add a confirm step for delete run.
- **Disabled:** 35% opacity, `cursor: not-allowed`, no shadow.
- **Icon button:** 36×36, ghost style.

Standard labels (sentence case in source; the button styles them uppercase):

| Action | Label |
|---|---|
| Primary send | `Send to all lanes`, or just `Send` when there is one lane |
| Duplicate | `Duplicate lane` |
| Delete run | `Delete run` |
| Lane limit reached | `Max 4 lanes` (disabled) |

### Input / Textarea (composer)
- `bg-sheet`, `1px ink` border, Plex Mono 14px, padding `12px`.
- The label sits above: mono 11px uppercase, `graphite`.
- Focus uses the `kr` 2px outline at a 2px offset.
- Composer hint text sits under it in `graphite`, right-aligned: `⌘↵ send`.

### Select (provider / model / effort)
- Same box as input. Use a mono `▾` glyph instead of a chevron icon.
- Models without a price show a `no price` tag inline.

### Toggle (caching, synced scroll, rendered/raw)
- A 42×18 track with a `1px ink` border and a 12×12 square knob.
- **Off:** transparent track, `graphite` knob.
- **On:** `kr` track, `ink` knob.

### Segmented control (Rendered / Raw / Diff)
- Square segments joined by a shared `1px ink` border.
- The active segment is `bg-ink text-paper`.

### Tag
- Mono 11px, uppercase, tracking `0.1em`, padding `3px 8px`, `1px currentColor` border.

| Variant | Style |
|---|---|
| Neutral (`lane-only`, `est.`) | `ink` border and text |
| Solid (`streaming`) | `bg-ink text-paper` |
| Winner (`cheapest`, `fastest`, `fewest out`) | `bg-kr text-ink` |
| Error (`refused`, `error`) | `redline` border, `redline-text` text |
| Muted (`n/a`, `no price`) | `rule` border, `graphite` text |

### Alert / inline notice
- `bg-sheet`, `1px ink` border, 6px `kr` left border, mono 13px.
- Error variant: the left border is `redline`, with a 10% redline tint.
- Used for things like "Cache read = 0 on turn 1: prefix is below the model minimum." (info) or "Lane C: 401, OPENAI_API_KEY not set." (error).

### Panel
- `bg-sheet` with a `1px ink` border.
- Header: mono 11px uppercase with an 8px bottom padding and a `1px rule` divider.
- Featured panels add crop marks.

### Progress / meter
- 18px tall, `1px ink` border, with 12px tick lines (`rule`) across the track like a ruler.
- Fill is a hard-edged `kr` bar.

### Data table (session totals, history)
- Plex Mono 13px.
- Headers: 10px uppercase in `ink`, tracking `0.16em`, with a `1px ink` bottom rule.
- Rows have a `1px rule` divider and 10px vertical padding.
- Numeric columns are right-aligned and tabular.
- The highlighted row (current lane or winner) gets an 18% `kr` tint, with text staying `ink`.

### Event log
The raw stream for a run, for debugging. It lives in a collapsible `EVENTS` drawer under the Compare view.
- Plex Mono 12.5px / 1.75, `graphite`, `white-space: pre-wrap`.
- Each line: a lane/turn key in `ink` (`a/2`), the event name, dot leaders, then the value.
- Values are `ink`. Errors and refusals are `redline-text`. No orange text.

```
a/2 thinking ............... summarized
b/2 delta → 1,846 tok ...... done
c/2 stop_reason ............ refusal
a/2 usage · cache_read ..... 12,402
```

---

## 8. CompoBeach patterns

### Masthead / wordmark
- `COMPO/BEACH` in Sans Condensed 700, UPPERCASE, tracking `-0.04em`, line-height 0.9.
- The `/` is `kr`. This is the **one** exception to "never use orange for text": the slash is a graphic mark, not readable text, and appears only in the wordmark.
- App header: about 30px, set in the left of the header bar.
- Empty / about screen: 150px.
- **No eyebrow line** above it (or above any heading). See §10.

### Spectrum figure (`fig. 06`)
The brand's origin story: the accent is pinned to the krypton-86 line at 605.78 nm.
- A 54px-tall bar with a `1px ink` border, filled with the visible band 400–700 nm:
  `linear-gradient(90deg, #7a00c8 0%, #2e2bff 13%, #00a3ff 27%, #00d27a 40%, #a6e000 53%, #ffd000 60%, #ff8a00 68%, #ff3a00 80%, #c40000 100%)`.
- A 1px `ink` marker at `left: 68.6%`, extending 10px above and 22px below the bar, labeled `605.78 nm — ref.` in mono 10px.
- Under the bar, a 12px ruler tick strip: ink ticks every 10% (full height) and every 2% (5px).
- Caption: `fig. 06 — visible band 400–700 nm. Accent is pinned to the marked line: it marks the winning lane, and no other hue carries meaning.` in mono 11px `graphite`.
- Shown **only** on the empty / about screen. This figure is the single exception to "no gradients" and "no purple".

### Lane identity: paper stocks
Each lane's replies are printed on a different **stock**: its own background, reply font and text colours. Two replies side by side should never be mistaken for each other at a glance.

Hue still isn't used to tell lanes apart: stocks differ in value (light/dark), temperature (warm/cool) and typeface, and **orange stays reserved** for "this one".

| Lane | Stock | Background | Text | Muted | Rule | Reply font | Size / leading |
|---|---|---|---|---|---|---|---|
| A | **Sheet** | `#f4efe4` warm cream | `#14110d` | `#6b6354` | `#b9ae96` | IBM Plex Sans Condensed 400 | 16 / 1.5 |
| B | **Carbon** | `#1c1914` near-black | `#ece6d8` | `#a39a88` | `#3a342b` | IBM Plex Serif 400 | 16 / 1.65 |
| C | **Vellum** | `#dfe2dc` cool grey | `#14110d` | `#5b6058` | `#a9ada3` | IBM Plex Mono 400 | 14 / 1.7 |
| D | **Kraft** | `#d8c6a5` brown paper | `#14110d` | `#5e4f37` | `#a8916a` | IBM Plex Sans 400 | 15 / 1.55 |

All muted-on-background pairs meet AA (≥4.7:1).

How the stock is applied:
- **Only the reply body takes the stock.** That is the turn list (user prompt and assistant reply) and the lane-only reply box. The lane header, the session-totals strip and the per-turn chips stay on the shared `paper` chrome in mono, so metrics line up and compare cleanly across lanes.
- **User prompt blocks** inside a lane are 6% `ink` on light stocks and 6% `paper` on Carbon, with a `YOU · T2` label in the stock's muted colour.
- **Lane letter block:** a 24×24 square filled with the stock background, with a `1px ink` border and the mono letter in the stock's text colour. The block doubles as the lane's swatch everywhere (summary row, history, diff dropdown).
- **Winner:** in the summary row only, the winner's letter block switches to `bg-kr text-ink`.
- **Carbon-specific overrides** (dark stock):
  - Links use `#8fa2ff` (light cobalt).
  - Code blocks use a `#2a251e` background with paper-coloured text.
  - Inline code uses a `#2a251e` background with a `#3a342b` border.
  - The streaming cursor stays `kr`.
  - The focus ring stays `kr`.
- **Vellum** is already mono, so its code blocks use `bg-ink text-paper` to stand apart from the prose.
- **Assignment:** stocks follow lane slots (1st lane = A/Sheet, 2nd = B/Carbon, …). The default 2 lanes give Sheet vs Carbon, the strongest contrast. **Duplicate lane** takes the next free slot, so a duplicate gets a different stock.
- **Lane config card:** the card shows the stock name (`B · CARBON`) next to the letter block. A stock override select is optional, nice-to-have in v1.

> Typeface affects how long a reply *looks*. That's why every length/cost comparison lives in the shared mono chrome (totals strip, chips, summary row), never in the stock area.

Lane header: letter block, then the label, then `model · effort` in mono `graphite`, then a context-file chip (`ctx: spec.md`).

### Lane column (Compare)
- Columns are separated by 1px `ink` rules.
- A sticky header is followed by a sticky **session-totals strip**: `bg-paper` with ink rules top and bottom, mono 11px, showing `IN 3,118 · CACHED 12,402 · OUT 2,904 · $0.0712 · 2 TURNS`. Hovering it shows the per-turn table.
- Turns stack vertically on the lane's **stock** (see "Lane identity: paper stocks"). The user prompt sits in a tinted block with the `YOU · T2` label, and the assistant reply is rendered markdown in the stock's font.
- A lane-only turn carries the `lane-only` neutral tag next to its label.
- The lane-only reply box is a compact input at the bottom of the column.

### Per-turn chip
- Collapsed, it is one mono 11px line in a `1px rule` box: `in 3.1k · cached 12.4k · out 2.9k · $0.0712 · 4.2 s`.
- Expanded, it becomes a mini table with these rows: new input, cache write, cache read, output, reasoning, est. vs actual, and **saved by cache**. The saved-by-cache value gets a `kr` underline.
- Missing values render as `n/a` in `graphite`.

### Artifacts row
- Sits under the per-turn chip, on the shared `paper` chrome (not the stock): `1px rule` box, mono 11px.
- Header line: `ARTIFACTS · 3` on the left, `folder ↗` on the right.
- One line per file: name, size in `graphite`, then `open ↗` and `download` as underlined ink links (cobalt on hover).

### Summary row
- A full-width strip above the columns, with crop marks.
- Three slots: `CHEAPEST`, `FASTEST` and `FEWEST OUT`. Each shows a lane letter block plus a big metric (Sans Condensed 700, about 40px).

### Lane states
| State | Treatment |
|---|---|
| Streaming | `streaming` solid tag, blinking `kr` ▍ cursor at end of text |
| Thinking | Collapsible `THINKING` block: `1px rule` dashed border, `graphite` text |
| Done | Per-turn chip appears; no extra decoration |
| Refused | `refused` error tag + error alert with `stop_reason` |
| Error | Error alert inline in the column; other lanes keep going |
| No key / no price | Muted tag; model select still usable |

### Lane config card (Configure)
- A panel with the lane letter, then fields in a 2-column grid using 12px gaps.
- The context-file drop zone is a `1px dashed ink` box with mono `DROP .md`. While a file is dragged over it, the border turns `kr`.
- **Duplicate lane** is a ghost button and **Remove** is a destructive button.

### History sidebar
- About 280px wide, `bg-sheet`, with a `1px ink` right rule.
- Each run shows the prompt snippet (2 lines, Sans 14), the models as mono letters, and the total $ right-aligned.
- The active run gets a 6px `kr` left bar.

### Rendered replies (react-markdown)
- The body font, size and colours come from the lane's stock. Use `var(--stock-*)` (see the Tailwind setup), never hard-coded colours.
- Headings use the **stock's font** at weight 600, one step smaller than the type scale (an H1 in a reply is 30px, an H2 is 20px). Display uppercase is not used inside replies.
- Inline code: Plex Mono on a `--stock-code-bg` background with a `1px --stock-rule` border.
- Code blocks: `bg-ink text-paper` on light stocks and `#2a251e` on Carbon; mono 13px, 18px padding. Comments inside ink code blocks use `#8d8371`.
- Links use `--stock-link` and are underlined.
- Tables use the data-table spec.
- Blockquotes have a 3px `ink` left rule and `graphite` text.

### Diff mode (Monaco)
Custom light theme `krypton`:

```ts
monaco.editor.defineTheme('krypton', {
  base: 'vs',
  inherit: true,
  rules: [{ token: 'comment', foreground: '6b6354' }],
  colors: {
    'editor.background': '#f4efe4',
    'editor.foreground': '#14110d',
    'editorLineNumber.foreground': '#b9ae96',
    'editorLineNumber.activeForeground': '#14110d',
    'editor.selectionBackground': '#ff5b1440',
    'editorCursor.foreground': '#ff5b14',
    'diffEditor.insertedTextBackground': '#1b3cff22',
    'diffEditor.removedTextBackground': '#d8121b22',
    'diffEditor.insertedLineBackground': '#1b3cff12',
    'diffEditor.removedLineBackground': '#d8121b12',
    'diffEditor.border': '#14110d',
  },
});
```
Set the font to `IBM Plex Mono` at 13px.

---

## 9. Tailwind v4 setup

`src/client/styles/theme.css`:

```css
@import "tailwindcss";

@theme {
  --color-paper:        #ece6d8;
  --color-sheet:        #f4efe4;
  --color-rule:         #b9ae96;
  --color-graphite:     #6b6354;
  --color-ink:          #14110d;
  --color-kr:           #ff5b14;
  --color-cobalt:       #1b3cff;
  --color-redline:      #d8121b;
  --color-redline-text: #b80f17;

  --font-sans: "IBM Plex Sans Condensed", ui-sans-serif, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, monospace;

  --spacing: 6px;

  --radius-*: initial;          /* kill every radius utility */
  --shadow-*: initial;          /* kill soft shadows */
  --shadow-hard: 3px 3px 0 var(--color-ink);
  --shadow-hard-sm: 2px 2px 0 var(--color-ink);

  --ease-instrument: cubic-bezier(.2, 0, 0, 1);
}

@layer base {
  html { @apply bg-paper text-ink font-sans antialiased; }
  body {
    background-image:
      linear-gradient(rgb(20 17 13 / .05) 1px, transparent 1px),
      linear-gradient(90deg, rgb(20 17 13 / .05) 1px, transparent 1px);
    background-size: 24px 24px;
  }
  ::selection { background: var(--color-kr); color: var(--color-ink); }
  :focus-visible { outline: 2px solid var(--color-kr); outline-offset: 2px; }
  .num { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
}

@layer components {
  .label { @apply font-mono text-[11px] font-medium uppercase tracking-[.14em] text-graphite; }

  .btn { @apply inline-flex items-center gap-1.5 px-3 py-2 font-mono text-xs font-medium uppercase tracking-[.12em]
                 transition-transform duration-150 ease-instrument disabled:opacity-35 disabled:cursor-not-allowed; }
  .btn::after { content: "→"; }
  /* compose in markup: class="btn btn-primary" */
  .btn-primary { @apply bg-kr text-ink shadow-hard hover:translate-x-px hover:translate-y-px hover:shadow-hard-sm
                        active:translate-x-[3px] active:translate-y-[3px] active:shadow-none; }
  .btn-ghost   { @apply border border-ink hover:bg-ink hover:text-paper; }
  .btn-danger  { @apply border border-redline text-redline-text; }

  .panel   { @apply relative border border-ink bg-sheet p-4; }
  .panel-h { @apply mb-3 border-b border-rule pb-1.5 font-mono text-[11px] font-medium uppercase tracking-[.14em] text-ink; }
  .crop::before, .crop::after {
    content: ""; position: absolute; width: 12px; height: 12px; border: 1px solid var(--color-kr);
  }
  .crop::before { top: -7px; left: -7px; border-right: 0; border-bottom: 0; }
  .crop::after  { bottom: -7px; right: -7px; border-left: 0; border-top: 0; }

  .input { @apply w-full border border-ink bg-sheet px-2 py-2 font-mono text-sm placeholder:text-graphite/60; }
  .tag   { @apply inline-block border border-current px-[8px] py-[3px] font-mono text-[11px] uppercase tracking-[.1em]; }
  .lane-id { @apply inline-grid size-4 place-items-center border border-ink font-mono text-xs font-semibold;
             background: var(--stock-bg); color: var(--stock-fg); }
}

/* ---- Lane stocks: put data-stock="a|b|c|d" on the lane body ---- */
[data-stock] {
  background: var(--stock-bg); color: var(--stock-fg);
  font-family: var(--stock-font); font-size: var(--stock-size); line-height: var(--stock-leading);
}
[data-stock="a"] { --stock-bg:#f4efe4; --stock-fg:#14110d; --stock-muted:#6b6354; --stock-rule:#b9ae96;
  --stock-font:"IBM Plex Sans Condensed",sans-serif; --stock-size:16px; --stock-leading:1.5;
  --stock-link:#1b3cff; --stock-code-bg:#ece6d8; --stock-pre-bg:#14110d; --stock-pre-fg:#ece6d8; }
[data-stock="b"] { --stock-bg:#1c1914; --stock-fg:#ece6d8; --stock-muted:#a39a88; --stock-rule:#3a342b;
  --stock-font:"IBM Plex Serif",serif; --stock-size:16px; --stock-leading:1.65;
  --stock-link:#8fa2ff; --stock-code-bg:#2a251e; --stock-pre-bg:#2a251e; --stock-pre-fg:#ece6d8; }
[data-stock="c"] { --stock-bg:#dfe2dc; --stock-fg:#14110d; --stock-muted:#5b6058; --stock-rule:#a9ada3;
  --stock-font:"IBM Plex Mono",monospace; --stock-size:14px; --stock-leading:1.7;
  --stock-link:#1b3cff; --stock-code-bg:#d2d6cf; --stock-pre-bg:#14110d; --stock-pre-fg:#ece6d8; }
[data-stock="d"] { --stock-bg:#d8c6a5; --stock-fg:#14110d; --stock-muted:#5e4f37; --stock-rule:#a8916a;
  --stock-font:"IBM Plex Sans",sans-serif; --stock-size:15px; --stock-leading:1.55;
  --stock-link:#1b3cff; --stock-code-bg:#cdb995; --stock-pre-bg:#14110d; --stock-pre-fg:#ece6d8; }
```

> Note: with `--spacing: 6px`, `size-4` = 24px and `p-4` = 24px. Use arbitrary values (`py-[3px]`) for sub-unit details.

---

## 10. Do / Don't

**Do**
- Use one primary button per view.
- Use orange only to mean "this one" (winner, active, primary, focus).
- Right-align numbers, use tabular figures and put units after values.
- Number sections and caption figures (`fig. 02 — cost per turn`).
- Show `n/a` for missing data.

**Don't**
- Rounded corners, pill shapes, soft shadows, gradients, glow, blur. (Only exception: the spectrum figure.)
- Use orange for text, or white text on orange. (Only exception: the wordmark slash.)
- Eyebrow / kicker lines above headings. They're an AI-template tell. Use section indexes and figure captions instead.
- Give lanes hues (red lane, blue lane). Lanes differ by stock (value, temperature and typeface) plus their letter.
- Put metrics on the stock. Numbers belong in the shared mono chrome.
- Use emoji or icon-library icons. Prefer mono glyphs: `→ ▾ ⇄ ▍ × +`.
- Use purple. Any purple. (Only exception: the violet end of the spectrum figure.)
