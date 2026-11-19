# marquee

A strip that scrolls round without a seam — an announcement bar, a row of
logos, a column of testimonials, deals one at a time, a long product title
that does not fit, two bands crossing that race with the page's scroll.
The list is written once; the package copies it beside itself, as many
times as the window needs, and moves it by one list's length, round and
round. No dependencies.

```sh
npm install github:omisilli/marquee#v1.2.1
```

```ts
import { initMarquee, pauseMarquee, playMarquee } from "@plusguard/marquee";
import "@plusguard/marquee/index.css";

initMarquee(); // every marquee on the page, those rendered later too

// stopped and started from code, by window, group or id:
// pauseMarquee("promo"); playMarquee("promo");
```

### Without a build step

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/omisilli/marquee@v1.2.1/index.css" />
<script type="module">
    import { initMarquee } from "https://cdn.jsdelivr.net/gh/omisilli/marquee@v1.2.1/dist/index.js";
    initMarquee();
</script>
```

## The markup

```html
<div data-pg-marquee>                      <!-- the window: what shows -->
    <div data-pg-marquee-track>            <!-- what moves -->
        <ul data-pg-marquee-list>          <!-- the items, once -->
            <li>Free delivery over $50</li>
            <li>New season — <a href="/sale">30% off</a></li>
            <li>Returns free for 60 days</li>
        </ul>
    </div>
</div>
```

The track holds the list alone; the copies go in beside it. Any element
can be the list — a `<ul>`, a `<div>` of cards, a `<p>` with one title.
A mark between the items (✦, •) goes after **every** item, the last too:
then the list and its copies join up with the same mark.

```css
.bar li::after { content: "✦"; margin-left: var(--pg-marquee-gap, 2rem); }
```

## What it does

| `--pg-marquee` | |
| -------------- | --- |
| `flow` (default) | Round and round at `--pg-marquee-speed` |
| `step` | One item at a time: it comes, stays `--pg-marquee-hold`, and the next takes its place |
| `overflow` | Still while the list fits the window — no copies, `data-pg-marquee-fits` — flowing when it does not |
| `none` | Still, no copies: the items as written |

It is CSS, so a media query sets it per screen size — `none` on a phone,
`step` on a computer.

### Flow

The speed is px a second, not a time: a longer list goes round at the same
speed, a shorter one too. Under the mouse it slows to a stop
(`--pg-marquee-hover: pause`), to a quarter (`slow`), or goes on (`none`)
— gently, not with a jump. A finger's tap is no hover: on a phone it goes
on.

### Step

Each item comes into the window's start, stays, and the next takes its
place: deals in a top bar one at a time, going up, each the bar's own
height — or going left, each the bar's own width. After the last, the
first again, from the same side. An item the window's own size: going up,
its height; going left, `width: 100cqw` with `container-type: inline-size`
on the window. Under the mouse, or with focus inside, it waits.
`data-pg-marquee-next` and `-prev` buttons move it at once.

### Overflow

For text that may not fit: a product title in a card. While the list fits,
nothing moves and nothing is copied; narrower, it flows. It is looked at
again whenever the window or the list changes size.

### With the page's scroll

`--pg-marquee-scroll: 0.2`: the page's scroll speed, px a second, times
0.2, is added to the flow — scroll down hard and it races; scroll up and
it slows, stops and turns back; at rest, its own speed again.
`--pg-marquee-turn: keep`: having turned back with the page going up, it
keeps that way until the page goes down again. Two bands crossing are this
on two strips, one going right, each turned a few degrees with `rotate()`.
No GSAP: the package reads the page's scroll position, so Lenis's scroll
is followed the same.

### Up and down

`--pg-marquee-direction: up` or `down`: a column. The window needs a height
of its own — the site's — and is best written with
`data-pg-marquee-axis="y"` in the markup, so it is a column from the first
paint, before the script has looked.

### By hand

`--pg-marquee-drag: on`: a finger or the mouse takes hold of it and drags
it along; let go and it is thrown on at the pointer's speed, easing back
to its own. A finger going along it moves it; going across it scrolls the
page (`touch-action`, written by `index.css`). In step, a swipe is the next
item or the one before. A press that moved is a drag: the click it ends
with goes nowhere — a link under the finger is not followed — while a
plain click on a link still is.

## Stopping

- **Held down it stands still** — a finger, a pen or a mouse button
  (`--pg-marquee-press: pause`, the default; `none` to leave it going). A
  phone has no hover: this is its pause. Let go, it goes on; a finger that
  goes on to scroll the page lets go too.
- **Keyboard focus inside stops it** — Tab to a link in it and it stands
  still, to be read and pressed; out again, it goes on. Focus a mouse press
  leaves behind (`:focus-visible` not matching) does not hold it: the mouse
  has hover for that, and a button pressed would otherwise keep it still
  after the mouse has gone.
- **A group stops together:** `data-pg-marquee-group` on what holds several
  — three columns of testimonials — and the mouse anywhere over it, or
  focus in it, stops every marquee inside, not just the one under the
  mouse. A toggle whose `aria-controls` names the group stops and starts
  them all.
- **A button stops it:** `data-pg-marquee-toggle` with `aria-controls`
  naming the window. It gets `aria-pressed="true"` while stopped, the
  window `data-pg-marquee-paused`. Anything moving for more than five
  seconds should have one (WCAG 2.2.2).
- **From code:** `data-pg-marquee-paused` on the window, written or taken
  away at any time — a React prop does it — or `pauseMarquee(el)` and
  `playMarquee(el)` with a window, a group, or an id. Its toggles show it.
- **Out of sight it stops**, and goes on where it was when it comes back.
- **Reduced motion:** every strip stands still, no copies.

## CSS

Set on the window or above, per screen size with media queries:

| Variable | Default | What |
| -------- | ------- | ---- |
| `--pg-marquee` | `flow` | `flow` · `step` · `overflow` · `none` |
| `--pg-marquee-direction` | `left` | `left` · `right` · `up` · `down` — the way the items go |
| `--pg-marquee-speed` | `50` | Flow: px a second |
| `--pg-marquee-gap` | `2rem` | Between the items, and between the list and its copies — one gap all the way round |
| `--pg-marquee-fade` | `0` | How far the edges fade out — `4rem` |
| `--pg-marquee-hover` | `pause` | Under the mouse: `pause` · `slow` (a quarter) · `none` |
| `--pg-marquee-hold` | `3s` | Step: how long an item stays |
| `--pg-marquee-duration` | `600ms` | Step: how long a move takes |
| `--pg-marquee-easing` | `ease-in-out` | Step: any CSS easing |
| `--pg-marquee-scroll` | `0` | The page's scroll speed times this, added to the flow |
| `--pg-marquee-turn` | `none` | `keep`: turned back by the page going up, it stays turned |
| `--pg-marquee-drag` | `none` | `on`: dragged by a finger or the mouse, thrown on when let go; step: swiped |
| `--pg-marquee-press` | `pause` | Held down, it stands still · `none`: it goes on |

The window clips and is `contain: inline-size`: its width comes from its
place — a flex or grid parent, a card — never from what moves inside it.
The track is as wide as the list and all its copies; without the
containment that width would reach up into the parent: a wider window,
more copies, wider again. A column (`data-pg-marquee-axis="y"`) is not
contained: it takes its height from the site.

## Attributes

| Attribute | On | |
| --------- | -- | --- |
| `data-pg-marquee` | the window | What shows |
| `data-pg-marquee-track` | inside it | What moves; holds the list alone |
| `data-pg-marquee-list` | in the track | The items, once |
| `data-pg-marquee-toggle` | a button, `aria-controls` | Stop / go on — a marquee, or every one in the element named |
| `data-pg-marquee-group` | a parent | The mouse over it, or focus in it, stops every marquee inside |
| `data-pg-marquee-next`, `-prev` | buttons, `aria-controls` | Step: the next item, the one before |
| `data-pg-marquee-axis` | the window | `x` or `y` — written by the script; write `y` in the markup for a column |
| `data-pg-marquee-copy` | the copies | Written by the script: `aria-hidden`, out of the Tab order, no ids — the mouse can press their links |
| `data-pg-marquee-fits` | the window | Overflow: the list fits — still |
| `data-pg-marquee-paused` | the window | Stopped — by its button, or written by the site, any time |
| `data-pg-marquee-drag` | the window | Written by the script: it can be dragged |
| `data-pg-marquee-dragging` | the window | Written by the script: being dragged now |
| `data-pg-marquee-ready` | the window | The script has looked |

## React (Next)

```tsx
"use client";

import { useEffect } from "react";
import { initMarquee } from "@plusguard/marquee";

export function MarqueeInit() {
    useEffect(() => initMarquee(), []);
    return null;
}
```

The copies are hidden from screen readers and the Tab key — the list is
read once — but on the screen they are as real as the list: a card's link
in a copy is pressed with the mouse like the list's. A press on a copy
puts no focus in it.

Mount it once, high in the tree. The list is never moved or changed —
React's markup stays as React wrote it; the copies go in the track beside
it, and a change to the list (new items, a new label) is copied again.
Render the track with the list alone in it. If `initMarquee` is called
again before the first cleanup runs (React remounting in development),
only the newest call answers. See
[`examples/react/Example.tsx`](examples/react/Example.tsx).

## Example

[`examples/static/index.html`](examples/static/index.html) — an
announcement bar with its stop button (`?speed`, `?dir`, `?hover`,
`?fade`, `?phone=still`, `?press=none`) and stopped from code, deals one at a time with arrows (`?steps=left`,
`?hold`), two rows of logos the opposite ways, testimonials in columns
going up and down — one at a time or all three together (`?group=on`),
each card with a link — review cards in a row beside a score, each product
picture in its box (`pg-imageGroup`); the logos, testimonials, reviews and
deals dragged by hand with `?drag=on`; product titles that move only when
they do not fit,
and two bands crossing that race with the page's scroll (`?scroll`,
`?turn=keep`) — with the browser's own scroll or Lenis (`?lenis`).
