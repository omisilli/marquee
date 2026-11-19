/*
 * marquee — a strip that scrolls round without a seam: an announcement
 * bar, a row of logos, a column of testimonials.
 *
 *   <div data-pg-marquee>                     the window: what shows
 *       <div data-pg-marquee-track>           what moves
 *           <ul data-pg-marquee-list>         the items, once — the site's
 *               <li>Free delivery over $50</li>
 *               <li>New season, 30% off</li>
 *           </ul>
 *       </div>
 *   </div>
 *
 * This file copies the list beside itself, as many times as the window
 * needs to be full while it moves, and moves the track by one list's
 * length, round and round: where it starts again looks just like where it
 * was. The copies are hidden from screen readers (aria-hidden) and out of
 * the Tab order, and carry no ids — but the mouse can press a link in
 * one: on the screen it is as real as the list's. The list itself is never touched: React's
 * markup stays as React wrote it — render the track with the list alone
 * in it.
 *
 * What it does, per screen size — CSS variables on the window or above:
 *   --pg-marquee            flow (default): round at --pg-marquee-speed ·
 *                           step: one item at a time, held
 *                           --pg-marquee-hold between moves · overflow:
 *                           still while the list fits, flowing when it
 *                           does not · none: still, no copies
 *   --pg-marquee-direction  left (default) · right · up · down
 *   --pg-marquee-speed      px a second, flow (default 50)
 *   --pg-marquee-hold       step: how long an item stays (default 3s)
 *   --pg-marquee-duration   step: how long a move takes (default 600ms)
 *   --pg-marquee-easing     step: any CSS easing (default ease-in-out)
 *   --pg-marquee-hover      pause (default) · slow · none — under the
 *                           mouse; it slows down or speeds up gently
 *   --pg-marquee-scroll     0 (default): the page's scroll does nothing ·
 *                           a number: the page's scroll speed, times it,
 *                           is added to the flow — faster as the page
 *                           goes down, turning back as it goes up
 *   --pg-marquee-turn       none (default) · keep: having turned with the
 *                           page going up, it keeps that way until the
 *                           page goes down again
 *   --pg-marquee-drag       none (default) · on: a finger or the mouse
 *                           drags it along; let go, it is thrown on, and
 *                           eases back to its own speed — step: a swipe
 *                           is the next item or the one before
 *   --pg-marquee-press      pause (default) · none: held down — a finger,
 *                           a pen, a mouse button — it stands still; let
 *                           go, it goes on. A phone has no hover: this is
 *                           its pause
 *   --pg-marquee-gap, --pg-marquee-fade — index.css's.
 *
 * Focus inside it always stops it, so a link can be read and pressed. Out
 * of sight it stops, and goes on where it was.
 *
 * data-pg-marquee-group on any parent: the mouse over it, or focus in it,
 * stops every marquee inside — columns of testimonials stand still
 * together; a toggle naming the group stops them all. With reduced motion asked
 * for it stands still, no copies.
 *
 * Stopped from code: data-pg-marquee-paused on the window — written or
 * taken away at any time (a React prop), or pauseMarquee(el) and
 * playMarquee(el), with a window, a group, or its id.
 *
 * Buttons, anywhere, naming the window with aria-controls:
 *   data-pg-marquee-toggle   stop / go on — aria-pressed="true" while
 *                            stopped, and the window data-pg-marquee-paused
 *   data-pg-marquee-next     step: the next item now
 *   data-pg-marquee-prev     step: the one before
 *
 * No dependencies.
 */

const ROOT = "data-pg-marquee";
const TRACK = "data-pg-marquee-track";
const LIST = "data-pg-marquee-list";
const COPY = "data-pg-marquee-copy";
const AXIS = "data-pg-marquee-axis";
const FITS = "data-pg-marquee-fits";
const PAUSED = "data-pg-marquee-paused";
const READY = "data-pg-marquee-ready";
const GROUP = "data-pg-marquee-group";
const TOGGLE = "data-pg-marquee-toggle";
const NEXT = "data-pg-marquee-next";
const PREV = "data-pg-marquee-prev";
const DRAG = "data-pg-marquee-drag";
const DRAGGING = "data-pg-marquee-dragging";
const MOTION = "pg-marquee";

const MODES = ["flow", "step", "overflow", "none"] as const;
const DIRECTIONS = ["left", "right", "up", "down"] as const;
const HOVERS = ["pause", "slow", "none"] as const;
const TURNS = ["none", "keep"] as const;
const DRAGS = ["none", "on"] as const;
const PRESSES = ["pause", "none"] as const;
type Mode = (typeof MODES)[number];
type Direction = (typeof DIRECTIONS)[number];
type Hover = (typeof HOVERS)[number];

/* Under the mouse, "slow": a quarter of the speed. */
const SLOW = 0.25;
/* How quickly the speed follows the mouse and the page: the time it takes
   to get most of the way there. */
const EASE_MS = 250;
/* Moved this far, a press is a drag — and no click. */
const DRAG_PX = 6;
/* A step swiped this far goes to the next item. */
const SWIPE_PX = 40;
/* Thrown, at most this many times its own speed. */
const THROW = 30;

type Settings = {
    mode: Mode;
    direction: Direction;
    speed: number;
    hold: number;
    duration: number;
    easing: string;
    hover: Hover;
    scroll: number;
    keep: boolean;
    drag: boolean;
    press: boolean;
};

type Drag = { id: number; at: number; t: number; moved: number; velocity: number; dragging: boolean };

type Marquee = {
    root: HTMLElement;
    track: HTMLElement;
    list: HTMLElement;
    settings: Settings;
    /* What the copies and the motion were made for: made again when it
       changes. */
    made: string;
    copies: HTMLElement[];
    /* One round: the list's length and the gap after it, px; and the time
       a flow takes over it, ms. */
    length: number;
    round: number;
    still: boolean;
    flow: Animation | null;
    // Who has stopped it.
    under: boolean; // the mouse
    focused: boolean;
    paused: boolean; // its toggle, or code
    pressed: boolean; // held down
    drag: Drag | null;
    inSight: boolean;
    // The flow's speed, as a share of --pg-marquee-speed: where it is, and
    // the way it goes with the page (-1 having turned back).
    rate: number;
    way: 1 | -1;
    // step
    at: number; // shift, px, along the round
    stops: number[];
    move: Animation | null;
    timer: number;
};

const px = (value: string): number => parseFloat(value) || 0;

/* An element's laid-out length along the axis, its margins with it — from
   its computed size, not its box on screen: a band turned by a rotate()
   has a box on screen of another size, and a round a few px off would
   show a jump where it starts again. */
function lengthOf(el: Element, y: boolean): number {
    const css = getComputedStyle(el);
    return y ? px(css.height) + px(css.marginTop) + px(css.marginBottom) : px(css.width) + px(css.marginLeft) + px(css.marginRight);
}

function keyword<T extends string>(css: CSSStyleDeclaration, name: string, values: readonly T[]): T {
    const raw = css.getPropertyValue(name).trim().toLowerCase();
    return (values as readonly string[]).includes(raw) ? (raw as T) : values[0];
}

/* A time variable, in ms — seconds or ms written. */
function timeOf(css: CSSStyleDeclaration, name: string, fallback: number): number {
    const raw = css.getPropertyValue(name).trim();
    const n = Number.parseFloat(raw);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(0, raw.endsWith("ms") ? n : n * 1000);
}

function numberOf(css: CSSStyleDeclaration, name: string, fallback: number): number {
    const n = Number.parseFloat(css.getPropertyValue(name));
    return Number.isFinite(n) ? n : fallback;
}

function settingsOf(root: HTMLElement): Settings {
    const css = getComputedStyle(root);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    return {
        mode: reduced ? "none" : keyword(css, "--pg-marquee", MODES),
        direction: keyword(css, "--pg-marquee-direction", DIRECTIONS),
        speed: Math.max(1, numberOf(css, "--pg-marquee-speed", 50)),
        hold: timeOf(css, "--pg-marquee-hold", 3000),
        duration: timeOf(css, "--pg-marquee-duration", 600),
        easing: css.getPropertyValue("--pg-marquee-easing").trim() || "ease-in-out",
        hover: keyword(css, "--pg-marquee-hover", HOVERS),
        scroll: Math.max(0, numberOf(css, "--pg-marquee-scroll", 0)),
        keep: keyword(css, "--pg-marquee-turn", TURNS) === "keep",
        drag: keyword(css, "--pg-marquee-drag", DRAGS) === "on",
        press: keyword(css, "--pg-marquee-press", PRESSES) === "pause",
    };
}

const vertical = (m: Marquee): boolean => m.settings.direction === "up" || m.settings.direction === "down";
/* The way the items go: -1 towards the start (left, up), 1 the other. */
const sense = (m: Marquee): number => (m.settings.direction === "right" || m.settings.direction === "down" ? 1 : -1);
const shift = (m: Marquee, at: number): string => `translate${vertical(m) ? "Y" : "X"}(${at}px)`;

/* The window's own, not a list inside a list. */
function partsOf(root: HTMLElement): { track: HTMLElement; list: HTMLElement } | null {
    const own = (el: Element): boolean => el.closest(`[${ROOT}]`) === root;
    const track = [...root.querySelectorAll<HTMLElement>(`[${TRACK}]`)].find(own);
    const list = track && [...track.querySelectorAll<HTMLElement>(`[${LIST}]:not([${COPY}])`)].find(own);
    return track && list ? { track, list } : null;
}

/* ---------- Copies ---------- */

/* What Tab would stop on. */
const FOCUSABLE = "a[href], area[href], button, input, select, textarea, iframe, summary, [tabindex], [contenteditable]";

/* A copy: for screen readers and the Tab key it is not there — once is
   enough — but on the screen it is, and the mouse can press its links. */
function copyOf(list: HTMLElement): HTMLElement {
    const copy = list.cloneNode(true) as HTMLElement;
    [copy, ...copy.querySelectorAll<HTMLElement>("[id]")].forEach((el) => el.removeAttribute("id"));
    copy.querySelectorAll<HTMLElement>(FOCUSABLE).forEach((el) => el.setAttribute("tabindex", "-1"));
    copy.setAttribute(COPY, "");
    copy.setAttribute("aria-hidden", "true");
    return copy;
}

/* Where the mouse or focus stops it: the window, or the group it is in. */
const reach = (m: Marquee): HTMLElement => m.root.closest<HTMLElement>(`[${GROUP}]`) ?? m.root;

function clear(m: Marquee): void {
    m.flow?.cancel();
    m.flow = null;
    m.move?.cancel();
    m.move = null;
    clearTimeout(m.timer);
    m.copies.forEach((copy) => copy.remove());
    m.copies = [];
}

/* ---------- Making it ---------- */

/* Measure, copy, set going — again only when what it is made for has
   changed: the settings, the window's size, the list's. */
function make(m: Marquee, force = false): void {
    m.settings = settingsOf(m.root);
    const s = m.settings;
    const y = vertical(m);
    m.root.setAttribute(AXIS, y ? "y" : "x");
    m.root.toggleAttribute(DRAG, s.drag && s.mode !== "none");

    const window_ = y ? m.root.clientHeight : m.root.clientWidth;
    const size = lengthOf(m.list, y);
    const css = getComputedStyle(m.track);
    const gap = px(y ? css.rowGap : css.columnGap);
    const made = [s.mode, s.direction, s.speed, s.hold, s.duration, s.easing, Math.round(window_), Math.round(size), Math.round(gap)].join("|");
    if (!force && made === m.made) return;
    m.made = made;

    // What it was doing: a flow goes on from where it was.
    const progress = m.flow && m.round ? ((Number(m.flow.currentTime) || 0) % m.round) / m.round : 0;
    clear(m);
    m.length = size + gap;

    const fits = size <= window_ + 0.5;
    m.still = s.mode === "none" || m.length <= 0 || (s.mode === "overflow" && fits);
    if (s.mode === "overflow" && fits) m.root.setAttribute(FITS, "");
    else m.root.removeAttribute(FITS);
    m.root.setAttribute(READY, "");
    if (m.still) return;

    // Enough copies that the window is full all the way round.
    const count = Math.max(1, Math.ceil(window_ / m.length));
    for (let i = 0; i < count; i++) m.copies.push(copyOf(m.list));
    m.track.append(...m.copies);

    if (s.mode === "step") {
        // Where each item starts along the list: the ones before it and
        // the list's own gap between them.
        const listCss = getComputedStyle(m.list);
        const inner = px(y ? listCss.rowGap : listCss.columnGap);
        let along = 0;
        m.stops = [...m.list.children].map((item) => {
            const at = along;
            along += lengthOf(item, y) + inner;
            return at;
        });
        m.at = 0;
        wait(m);
        return;
    }

    // flow (overflow that does not fit flows too). One round from 0 to the
    // list's length; far along a long time, so a flow turned back by the
    // page has a long way to go back before it would run out.
    const from = sense(m) < 0 ? 0 : -m.length;
    const to = sense(m) < 0 ? -m.length : 0;
    m.round = (m.length / s.speed) * 1000;
    m.flow = m.track.animate({ transform: [shift(m, from), shift(m, to)] }, { duration: m.round, iterations: Infinity, easing: "linear", id: MOTION });
    m.flow.currentTime = m.round * (10000 + progress);
    pace(m, true);
}

/* ---------- Flow: its speed ---------- */

/* What it should be going at now, as a share of the speed. */
function aim(m: Marquee, velocity: number): number {
    const s = m.settings;
    if (m.focused || m.paused || m.pressed || m.drag?.dragging) return 0;
    const hover = m.under ? (s.hover === "pause" ? 0 : s.hover === "slow" ? SLOW : 1) : 1;
    // The page's scroll, px a second, times --pg-marquee-scroll, onto the
    // flow: going down it adds, going up it takes away — and turns it back.
    const page = s.scroll ? (s.scroll * velocity) / s.speed : 0;
    return hover * (m.way + page);
}

/* Set the rate at once (the first time) or let the loop ease it. */
function pace(m: Marquee, now = false): void {
    if (!m.flow) return;
    if (now) {
        m.rate = aim(m, 0);
        m.flow.playbackRate = m.rate;
        sight(m);
        return;
    }
    wake();
}

function sight(m: Marquee): void {
    if (!m.flow) return;
    if (m.inSight && !m.paused) {
        if (m.flow.playState !== "running") m.flow.play();
    } else if (m.flow.playState === "running") m.flow.pause();
}

/* ---------- Step ---------- */

function holds(m: Marquee): boolean {
    return m.paused || m.focused || m.pressed || !m.inSight || (m.under && m.settings.hover !== "none");
}

/* Wait --pg-marquee-hold, then the next — unless something holds it. */
function wait(m: Marquee): void {
    clearTimeout(m.timer);
    if (m.still || m.settings.mode !== "step" || holds(m)) return;
    m.timer = window.setTimeout(() => step(m, sense(m) < 0 ? 1 : -1), m.settings.hold);
}

/* One item on (1) or back (-1). The round goes on without a seam: past the
   last, the first again — the copy, then the list, which look the same. */
function step(m: Marquee, by: 1 | -1): void {
    if (m.still || !m.stops.length) return;
    clearTimeout(m.timer);
    let from = m.at;
    let to: number;
    if (by > 0) {
        if (from >= m.length - 0.5) from = 0;
        const i = m.stops.findIndex((stop) => stop > from + 0.5);
        to = i < 0 ? m.length : m.stops[i];
    } else {
        if (from <= 0.5) from = m.length;
        const before = m.stops.filter((stop) => stop < from - 0.5);
        to = before.length ? before[before.length - 1] : 0;
    }
    const old = m.move;
    m.move = m.track.animate({ transform: [shift(m, -from), shift(m, -to)] }, { duration: m.settings.duration, easing: m.settings.easing, fill: "forwards", id: MOTION });
    old?.cancel();
    m.at = to;
    m.move.onfinish = () => wait(m);
}

/* ---------- Everything on the page ---------- */

let live: object | null = null;
const marquees = new Map<HTMLElement, Marquee>();

/* The page's scroll, px a second, smoothed; and one loop for every flow
   that eases its speed. */
let velocity = 0;
let lastY = 0;
let lastT = 0;
let loop = 0;

function frame(now: number): void {
    loop = 0;
    const y = scrollY;
    // Woken after a rest: no speed from the scroll made while it slept.
    const fresh = !lastT || now - lastT > 100;
    const dt = fresh ? 16 : now - lastT;
    const raw = fresh ? 0 : ((y - lastY) / dt) * 1000;
    lastY = y;
    lastT = now;
    const k = 1 - Math.exp(-dt / EASE_MS);
    velocity += (raw - velocity) * k;
    if (Math.abs(velocity) < 1 && raw === 0) velocity = 0;

    let busy = velocity !== 0;
    marquees.forEach((m) => {
        if (!m.flow) return;
        if (m.settings.keep && m.settings.scroll) {
            if (velocity < -40) m.way = -1;
            else if (velocity > 40) m.way = 1;
        }
        const target = aim(m, m.settings.scroll ? velocity : 0);
        if (Math.abs(target - m.rate) > 0.002) {
            m.rate += (target - m.rate) * k;
            busy = true;
        } else m.rate = target;
        if (m.flow.playbackRate !== m.rate) m.flow.playbackRate = m.rate;
    });
    if (busy) wake();
}

function wake(): void {
    if (!loop) loop = requestAnimationFrame(frame);
}

/* The windows a target names: a window, or every one inside a group or any
   element; an id or the element itself. */
function windowsOf(target: Element | string): HTMLElement[] {
    const el = typeof target === "string" ? document.getElementById(target) : target;
    if (!el) return [];
    if (el.hasAttribute(ROOT)) return [el as HTMLElement];
    return [...el.querySelectorAll<HTMLElement>(`[${ROOT}]`)];
}

/* Stop, or go on, from code — the same as its toggle; it is written on the
   window as data-pg-marquee-paused, which is all a React prop needs to do
   too. */
export function pauseMarquee(target: Element | string): void {
    windowsOf(target).forEach((root) => root.setAttribute(PAUSED, ""));
}
export function playMarquee(target: Element | string): void {
    windowsOf(target).forEach((root) => root.removeAttribute(PAUSED));
}

/* Start watching every marquee on the page, those rendered later too;
   returns the cleanup for a React effect. Only the newest call answers. */
export function initMarquee(): () => void {
    if (typeof document === "undefined") return () => {};
    const self = {};
    live = self;

    let dirty = true;
    let pending = 0;
    const changed = new Set<HTMLElement>();

    const sizes = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => schedule());
    const sights =
        typeof IntersectionObserver === "undefined"
            ? null
            : new IntersectionObserver((entries) => {
                  entries.forEach((entry) => {
                      const m = marquees.get(entry.target as HTMLElement);
                      if (!m) return;
                      m.inSight = entry.isIntersecting;
                      sight(m);
                      wait(m);
                  });
              });

    const add = (root: HTMLElement): void => {
        const parts = partsOf(root);
        if (!parts) return;
        const m: Marquee = {
            root,
            ...parts,
            settings: settingsOf(root),
            made: "",
            copies: [],
            length: 0,
            round: 0,
            still: true,
            flow: null,
            under: false,
            focused: false,
            paused: root.hasAttribute(PAUSED),
            pressed: false,
            drag: null,
            inSight: !sights,
            rate: 1,
            way: 1,
            at: 0,
            stops: [],
            move: null,
            timer: 0,
        };
        marquees.set(root, m);
        sizes?.observe(root);
        sizes?.observe(parts.list);
        sights?.observe(root);
        make(m, true);
    };
    const remove = (m: Marquee): void => {
        clear(m);
        [AXIS, FITS, READY, DRAG, DRAGGING].forEach((name) => m.root.removeAttribute(name));
        sizes?.unobserve(m.root);
        sizes?.unobserve(m.list);
        sights?.unobserve(m.root);
        marquees.delete(m.root);
    };

    const update = (): void => {
        pending = 0;
        if (live !== self) return;
        if (dirty) {
            dirty = false;
            const roots = new Set(document.querySelectorAll<HTMLElement>(`[${ROOT}]`));
            marquees.forEach((m) => {
                const parts = roots.has(m.root) ? partsOf(m.root) : null;
                if (!parts || parts.list !== m.list || parts.track !== m.track) remove(m);
            });
            roots.forEach((root) => !marquees.has(root) && add(root));
        }
        marquees.forEach((m) => make(m, changed.has(m.root)));
        changed.clear();
    };
    const schedule = (): void => {
        if (!pending) pending = requestAnimationFrame(update);
    };

    // A marquee added or taken away: look round the page again. A change in
    // a list — new items, a new label — copies it again. The copies coming
    // and going are this file's own.
    const isCopy = (node: Node): boolean => node instanceof Element && node.hasAttribute(COPY);
    const mo = new MutationObserver((records) => {
        for (const r of records) {
            const nodes = [...r.addedNodes, ...r.removedNodes];
            if (r.type === "childList" && nodes.length && nodes.every(isCopy)) continue;
            const el = r.target instanceof Element ? r.target : r.target.parentElement;
            if (!el || el.closest(`[${COPY}]`)) continue;
            const list = el.closest(`[${LIST}]`);
            const root = list?.closest<HTMLElement>(`[${ROOT}]`);
            if (root && marquees.has(root)) changed.add(root);
            if (r.type === "childList" && nodes.some((n) => n instanceof Element && (n.matches(`[${ROOT}], [${TRACK}], [${LIST}]`) || !!n.querySelector(`[${ROOT}]`)))) dirty = true;
            if (r.type === "attributes" && r.attributeName === ROOT) dirty = true;
            if (r.type === "attributes" && r.attributeName === PAUSED) {
                const m = marquees.get(r.target as HTMLElement);
                if (m) stop(m, m.root.hasAttribute(PAUSED));
            }
        }
        schedule();
    });
    mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: [ROOT, PAUSED] });

    // Stopped or going on — by a toggle, by code, by a React prop: the
    // window says so, and every toggle naming it.
    const stop = (m: Marquee, paused: boolean): void => {
        if (m.paused === paused) return;
        m.paused = paused;
        sight(m);
        pace(m);
        wait(m);
        document.querySelectorAll<HTMLElement>(`[${TOGGLE}][aria-controls]`).forEach((b) => {
            const named = windowsOf(b.getAttribute("aria-controls")!).map((root) => marquees.get(root)).filter((x): x is Marquee => !!x);
            if (named.includes(m)) b.setAttribute("aria-pressed", String(named.every((x) => x.paused)));
        });
    };

    // Under the mouse (a mouse — a finger's tap is no hover), focus inside.
    const marqueeOf = (target: EventTarget | null): Marquee | undefined => {
        const root = target instanceof Element ? target.closest<HTMLElement>(`[${ROOT}]`) : null;
        return root ? marquees.get(root) : undefined;
    };
    const onOver = (event: PointerEvent): void => {
        if (live !== self || event.pointerType !== "mouse") return;
        // Out of the window altogether: over nothing.
        const over = event.type === "pointerout" ? event.relatedTarget : event.target;
        marquees.forEach((m) => {
            const under = over instanceof Node && reach(m).contains(over);
            if (under === m.under) return;
            m.under = under;
            pace(m);
            wait(m);
        });
    };
    const onFocus = (): void => {
        if (live !== self) return;
        marquees.forEach((m) => {
            const focused = reach(m).contains(document.activeElement);
            if (focused === m.focused) return;
            m.focused = focused;
            pace(m);
            wait(m);
        });
    };

    // Its buttons, by aria-controls: a marquee, or anything holding some —
    // a group — whose marquees a toggle stops and starts together.
    const onClick = (event: MouseEvent): void => {
        if (live !== self || !(event.target instanceof Element)) return;
        const button = event.target.closest<HTMLElement>(`[${TOGGLE}], [${NEXT}], [${PREV}]`);
        if (!button) return;
        const id = button.getAttribute("aria-controls");
        const targets = (id ? windowsOf(id).map((root) => marquees.get(root)) : [marqueeOf(button)]).filter((m): m is Marquee => !!m);
        if (!targets.length) return;
        if (button.hasAttribute(TOGGLE)) {
            const paused = !targets.every((m) => m.paused);
            targets.forEach((m) => {
                m.root.toggleAttribute(PAUSED, paused);
                stop(m, paused);
            });
            if (!id) button.setAttribute("aria-pressed", String(paused));
        } else {
            const m = targets[0];
            if (m.settings.mode === "step" && !m.still) step(m, button.hasAttribute(NEXT) === sense(m) < 0 ? 1 : -1);
        }
    };

    // A press on a copy's link: no focus on it — a copy is hidden from
    // screen readers, and focus inside it would be lost to them. The click
    // itself goes through.
    const onDown = (event: MouseEvent): void => {
        if (live !== self || !(event.target instanceof Element)) return;
        const hit = event.target.closest(FOCUSABLE);
        if (hit && hit.closest(`[${COPY}]`)) event.preventDefault();
    };

    const onScroll = (): void => {
        if (live === self) wake();
    };

    // Held down: it stands still (--pg-marquee-press). Dragged
    // (--pg-marquee-drag: on): it follows the pointer, and let go it is
    // thrown on at the pointer's speed, easing back to its own. A press
    // that moved is a drag, not a click.
    let thrown: HTMLElement | null = null;
    const along = (m: Marquee, event: PointerEvent): number => (vertical(m) ? event.clientY : event.clientX);
    const onPress = (event: PointerEvent): void => {
        if (live !== self || event.button !== 0) return;
        const m = marqueeOf(event.target);
        if (!m || m.still) return;
        if (m.settings.press) {
            m.pressed = true;
            pace(m);
            wait(m);
        }
        if (m.settings.drag) m.drag = { id: event.pointerId, at: along(m, event), t: event.timeStamp, moved: 0, velocity: 0, dragging: false };
    };
    const onMove = (event: PointerEvent): void => {
        marquees.forEach((m) => {
            const d = m.drag;
            if (!d || d.id !== event.pointerId) return;
            const at = along(m, event);
            const delta = at - d.at;
            const dt = Math.max(1, event.timeStamp - d.t);
            d.at = at;
            d.t = event.timeStamp;
            d.moved += delta;
            d.velocity += ((delta / dt) * 1000 - d.velocity) * 0.5;
            if (!d.dragging) {
                if (Math.abs(d.moved) < DRAG_PX) return;
                d.dragging = true;
                m.root.setAttribute(DRAGGING, "");
                getSelection()?.removeAllRanges(); // a drag, not a selection
                try {
                    m.root.setPointerCapture(event.pointerId);
                } catch {}
                pace(m);
            }
            // A flow follows the pointer: its time moved by the distance.
            if (m.flow && m.round && m.length) {
                m.flow.playbackRate = 0;
                m.rate = 0;
                m.flow.currentTime = (Number(m.flow.currentTime) || 0) + delta * (m.round / m.length) * sense(m);
            }
        });
    };
    const onRelease = (event: PointerEvent): void => {
        marquees.forEach((m) => {
            if (m.pressed && (!m.drag || m.drag.id === event.pointerId)) {
                m.pressed = false;
                pace(m);
                wait(m);
            }
            const d = m.drag;
            if (!d || d.id !== event.pointerId) return;
            m.drag = null;
            if (!d.dragging) return;
            m.root.removeAttribute(DRAGGING);
            thrown = m.root;
            setTimeout(() => (thrown = null));
            if (m.flow && event.type === "pointerup") {
                // Thrown on at the pointer's speed, as a share of its own.
                const rate = Math.max(-THROW, Math.min(THROW, (d.velocity * sense(m)) / m.settings.speed));
                m.rate = rate;
                m.flow.playbackRate = rate;
                wake();
            } else if (m.settings.mode === "step" && Math.abs(d.moved) >= SWIPE_PX) {
                step(m, d.moved < 0 ? 1 : -1);
            } else wait(m);
        });
    };
    // The click a drag ends with goes nowhere; nor does a link's own drag.
    const onDragClick = (event: MouseEvent): void => {
        if (thrown && event.target instanceof Node && thrown.contains(event.target)) {
            event.preventDefault();
            event.stopPropagation();
        }
    };
    const onNativeDrag = (event: DragEvent): void => {
        const m = marqueeOf(event.target);
        if (m?.settings.drag) event.preventDefault();
    };

    // Focus has left by the time the next task runs.
    const onBlur = (): void => void setTimeout(onFocus);
    const onOut = (event: PointerEvent): void => {
        if (!event.relatedTarget) onOver(event);
    };
    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerout", onOut);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onBlur);
    document.addEventListener("click", onClick);
    document.addEventListener("click", onDragClick, true);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("pointerdown", onPress);
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onRelease);
    document.addEventListener("pointercancel", onRelease);
    document.addEventListener("dragstart", onNativeDrag);
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", schedule);
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    motion.addEventListener?.("change", schedule);
    // The fonts arrive: every label has its real width now.
    document.fonts?.ready.then(() => {
        marquees.forEach((m) => changed.add(m.root));
        schedule();
    });
    lastY = scrollY;

    update();

    return () => {
        mo.disconnect();
        sizes?.disconnect();
        sights?.disconnect();
        document.removeEventListener("pointerover", onOver);
        document.removeEventListener("pointerout", onOut);
        document.removeEventListener("focusin", onFocus);
        document.removeEventListener("focusout", onBlur);
        document.removeEventListener("click", onClick);
        document.removeEventListener("click", onDragClick, true);
        document.removeEventListener("mousedown", onDown);
        document.removeEventListener("pointerdown", onPress);
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onRelease);
        document.removeEventListener("pointercancel", onRelease);
        document.removeEventListener("dragstart", onNativeDrag);
        removeEventListener("scroll", onScroll);
        removeEventListener("resize", schedule);
        motion.removeEventListener?.("change", schedule);
        if (pending) cancelAnimationFrame(pending);
        if (live === self) {
            live = null;
            marquees.forEach(remove);
        }
    };
}
