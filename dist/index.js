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
 * was. The copies are hidden from screen readers and keys (aria-hidden,
 * inert) and carry no ids. The list itself is never touched: React's
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
 *   --pg-marquee-gap, --pg-marquee-fade — index.css's.
 *
 * Focus inside it always stops it, so a link can be read and pressed. Out
 * of sight it stops, and goes on where it was. With reduced motion asked
 * for it stands still, no copies.
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
const TOGGLE = "data-pg-marquee-toggle";
const NEXT = "data-pg-marquee-next";
const PREV = "data-pg-marquee-prev";
const MOTION = "pg-marquee";
const MODES = ["flow", "step", "overflow", "none"];
const DIRECTIONS = ["left", "right", "up", "down"];
const HOVERS = ["pause", "slow", "none"];
const TURNS = ["none", "keep"];
/* Under the mouse, "slow": a quarter of the speed. */
const SLOW = 0.25;
/* How quickly the speed follows the mouse and the page: the time it takes
   to get most of the way there. */
const EASE_MS = 250;
const px = (value) => parseFloat(value) || 0;
/* An element's laid-out length along the axis, its margins with it — from
   its computed size, not its box on screen: a band turned by a rotate()
   has a box on screen of another size, and a round a few px off would
   show a jump where it starts again. */
function lengthOf(el, y) {
    const css = getComputedStyle(el);
    return y ? px(css.height) + px(css.marginTop) + px(css.marginBottom) : px(css.width) + px(css.marginLeft) + px(css.marginRight);
}
function keyword(css, name, values) {
    const raw = css.getPropertyValue(name).trim().toLowerCase();
    return values.includes(raw) ? raw : values[0];
}
/* A time variable, in ms — seconds or ms written. */
function timeOf(css, name, fallback) {
    const raw = css.getPropertyValue(name).trim();
    const n = Number.parseFloat(raw);
    if (!Number.isFinite(n))
        return fallback;
    return Math.max(0, raw.endsWith("ms") ? n : n * 1000);
}
function numberOf(css, name, fallback) {
    const n = Number.parseFloat(css.getPropertyValue(name));
    return Number.isFinite(n) ? n : fallback;
}
function settingsOf(root) {
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
    };
}
const vertical = (m) => m.settings.direction === "up" || m.settings.direction === "down";
/* The way the items go: -1 towards the start (left, up), 1 the other. */
const sense = (m) => (m.settings.direction === "right" || m.settings.direction === "down" ? 1 : -1);
const shift = (m, at) => `translate${vertical(m) ? "Y" : "X"}(${at}px)`;
/* The window's own, not a list inside a list. */
function partsOf(root) {
    const own = (el) => el.closest(`[${ROOT}]`) === root;
    const track = [...root.querySelectorAll(`[${TRACK}]`)].find(own);
    const list = track && [...track.querySelectorAll(`[${LIST}]:not([${COPY}])`)].find(own);
    return track && list ? { track, list } : null;
}
/* ---------- Copies ---------- */
function copyOf(list) {
    const copy = list.cloneNode(true);
    [copy, ...copy.querySelectorAll("[id]")].forEach((el) => el.removeAttribute("id"));
    copy.setAttribute(COPY, "");
    copy.setAttribute("aria-hidden", "true");
    copy.inert = true;
    return copy;
}
function clear(m) {
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
function make(m, force = false) {
    m.settings = settingsOf(m.root);
    const s = m.settings;
    const y = vertical(m);
    m.root.setAttribute(AXIS, y ? "y" : "x");
    const window_ = y ? m.root.clientHeight : m.root.clientWidth;
    const size = lengthOf(m.list, y);
    const css = getComputedStyle(m.track);
    const gap = px(y ? css.rowGap : css.columnGap);
    const made = [s.mode, s.direction, s.speed, s.hold, s.duration, s.easing, Math.round(window_), Math.round(size), Math.round(gap)].join("|");
    if (!force && made === m.made)
        return;
    m.made = made;
    // What it was doing: a flow goes on from where it was.
    const progress = m.flow && m.round ? ((Number(m.flow.currentTime) || 0) % m.round) / m.round : 0;
    clear(m);
    m.length = size + gap;
    const fits = size <= window_ + 0.5;
    m.still = s.mode === "none" || m.length <= 0 || (s.mode === "overflow" && fits);
    if (s.mode === "overflow" && fits)
        m.root.setAttribute(FITS, "");
    else
        m.root.removeAttribute(FITS);
    m.root.setAttribute(READY, "");
    if (m.still)
        return;
    // Enough copies that the window is full all the way round.
    const count = Math.max(1, Math.ceil(window_ / m.length));
    for (let i = 0; i < count; i++)
        m.copies.push(copyOf(m.list));
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
function aim(m, velocity) {
    const s = m.settings;
    if (m.focused || m.paused)
        return 0;
    const hover = m.under ? (s.hover === "pause" ? 0 : s.hover === "slow" ? SLOW : 1) : 1;
    // The page's scroll, px a second, times --pg-marquee-scroll, onto the
    // flow: going down it adds, going up it takes away — and turns it back.
    const page = s.scroll ? (s.scroll * velocity) / s.speed : 0;
    return hover * (m.way + page);
}
/* Set the rate at once (the first time) or let the loop ease it. */
function pace(m, now = false) {
    if (!m.flow)
        return;
    if (now) {
        m.rate = aim(m, 0);
        m.flow.playbackRate = m.rate;
        sight(m);
        return;
    }
    wake();
}
function sight(m) {
    if (!m.flow)
        return;
    if (m.inSight && !m.paused) {
        if (m.flow.playState !== "running")
            m.flow.play();
    }
    else if (m.flow.playState === "running")
        m.flow.pause();
}
/* ---------- Step ---------- */
function holds(m) {
    return m.paused || m.focused || !m.inSight || (m.under && m.settings.hover !== "none");
}
/* Wait --pg-marquee-hold, then the next — unless something holds it. */
function wait(m) {
    clearTimeout(m.timer);
    if (m.still || m.settings.mode !== "step" || holds(m))
        return;
    m.timer = window.setTimeout(() => step(m, sense(m) < 0 ? 1 : -1), m.settings.hold);
}
/* One item on (1) or back (-1). The round goes on without a seam: past the
   last, the first again — the copy, then the list, which look the same. */
function step(m, by) {
    if (m.still || !m.stops.length)
        return;
    clearTimeout(m.timer);
    let from = m.at;
    let to;
    if (by > 0) {
        if (from >= m.length - 0.5)
            from = 0;
        const i = m.stops.findIndex((stop) => stop > from + 0.5);
        to = i < 0 ? m.length : m.stops[i];
    }
    else {
        if (from <= 0.5)
            from = m.length;
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
let live = null;
const marquees = new Map();
/* The page's scroll, px a second, smoothed; and one loop for every flow
   that eases its speed. */
let velocity = 0;
let lastY = 0;
let lastT = 0;
let loop = 0;
function frame(now) {
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
    if (Math.abs(velocity) < 1 && raw === 0)
        velocity = 0;
    let busy = velocity !== 0;
    marquees.forEach((m) => {
        if (!m.flow)
            return;
        if (m.settings.keep && m.settings.scroll) {
            if (velocity < -40)
                m.way = -1;
            else if (velocity > 40)
                m.way = 1;
        }
        const target = aim(m, m.settings.scroll ? velocity : 0);
        if (Math.abs(target - m.rate) > 0.002) {
            m.rate += (target - m.rate) * k;
            busy = true;
        }
        else
            m.rate = target;
        if (m.flow.playbackRate !== m.rate)
            m.flow.playbackRate = m.rate;
    });
    if (busy)
        wake();
}
function wake() {
    if (!loop)
        loop = requestAnimationFrame(frame);
}
/* Start watching every marquee on the page, those rendered later too;
   returns the cleanup for a React effect. Only the newest call answers. */
export function initMarquee() {
    if (typeof document === "undefined")
        return () => { };
    const self = {};
    live = self;
    let dirty = true;
    let pending = 0;
    const changed = new Set();
    const sizes = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => schedule());
    const sights = typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                const m = marquees.get(entry.target);
                if (!m)
                    return;
                m.inSight = entry.isIntersecting;
                sight(m);
                wait(m);
            });
        });
    const add = (root) => {
        const parts = partsOf(root);
        if (!parts)
            return;
        const m = {
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
    const remove = (m) => {
        clear(m);
        [AXIS, FITS, READY].forEach((name) => m.root.removeAttribute(name));
        sizes?.unobserve(m.root);
        sizes?.unobserve(m.list);
        sights?.unobserve(m.root);
        marquees.delete(m.root);
    };
    const update = () => {
        pending = 0;
        if (live !== self)
            return;
        if (dirty) {
            dirty = false;
            const roots = new Set(document.querySelectorAll(`[${ROOT}]`));
            marquees.forEach((m) => {
                const parts = roots.has(m.root) ? partsOf(m.root) : null;
                if (!parts || parts.list !== m.list || parts.track !== m.track)
                    remove(m);
            });
            roots.forEach((root) => !marquees.has(root) && add(root));
        }
        marquees.forEach((m) => make(m, changed.has(m.root)));
        changed.clear();
    };
    const schedule = () => {
        if (!pending)
            pending = requestAnimationFrame(update);
    };
    // A marquee added or taken away: look round the page again. A change in
    // a list — new items, a new label — copies it again. The copies coming
    // and going are this file's own.
    const isCopy = (node) => node instanceof Element && node.hasAttribute(COPY);
    const mo = new MutationObserver((records) => {
        for (const r of records) {
            const nodes = [...r.addedNodes, ...r.removedNodes];
            if (r.type === "childList" && nodes.length && nodes.every(isCopy))
                continue;
            const el = r.target instanceof Element ? r.target : r.target.parentElement;
            if (!el || el.closest(`[${COPY}]`))
                continue;
            const list = el.closest(`[${LIST}]`);
            const root = list?.closest(`[${ROOT}]`);
            if (root && marquees.has(root))
                changed.add(root);
            if (r.type === "childList" && nodes.some((n) => n instanceof Element && (n.matches(`[${ROOT}], [${TRACK}], [${LIST}]`) || !!n.querySelector(`[${ROOT}]`))))
                dirty = true;
            if (r.type === "attributes" && r.attributeName === ROOT)
                dirty = true;
        }
        schedule();
    });
    mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: [ROOT] });
    // Under the mouse (a mouse — a finger's tap is no hover), focus inside.
    const marqueeOf = (target) => {
        const root = target instanceof Element ? target.closest(`[${ROOT}]`) : null;
        return root ? marquees.get(root) : undefined;
    };
    const onOver = (event) => {
        if (live !== self || event.pointerType !== "mouse")
            return;
        // Out of the window altogether: over nothing.
        const over = event.type === "pointerout" ? event.relatedTarget : event.target;
        marquees.forEach((m) => {
            const under = over instanceof Node && m.root.contains(over);
            if (under === m.under)
                return;
            m.under = under;
            pace(m);
            wait(m);
        });
    };
    const onFocus = () => {
        if (live !== self)
            return;
        marquees.forEach((m) => {
            const focused = m.root.contains(document.activeElement);
            if (focused === m.focused)
                return;
            m.focused = focused;
            pace(m);
            wait(m);
        });
    };
    // Its buttons, by aria-controls.
    const onClick = (event) => {
        if (live !== self || !(event.target instanceof Element))
            return;
        const button = event.target.closest(`[${TOGGLE}], [${NEXT}], [${PREV}]`);
        const id = button?.getAttribute("aria-controls");
        const root = id ? document.getElementById(id) : null;
        const m = root ? marquees.get(root) : marqueeOf(button);
        if (!button || !m)
            return;
        if (button.hasAttribute(TOGGLE)) {
            m.paused = !m.paused;
            m.root.toggleAttribute(PAUSED, m.paused);
            document.querySelectorAll(`[${TOGGLE}][aria-controls="${m.root.id}"]`).forEach((b) => b.setAttribute("aria-pressed", String(m.paused)));
            if (!m.root.id)
                button.setAttribute("aria-pressed", String(m.paused));
            sight(m);
            pace(m);
            wait(m);
        }
        else if (m.settings.mode === "step" && !m.still) {
            step(m, button.hasAttribute(NEXT) === sense(m) < 0 ? 1 : -1);
        }
    };
    const onScroll = () => {
        if (live === self)
            wake();
    };
    // Focus has left by the time the next task runs.
    const onBlur = () => void setTimeout(onFocus);
    const onOut = (event) => {
        if (!event.relatedTarget)
            onOver(event);
    };
    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerout", onOut);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onBlur);
    document.addEventListener("click", onClick);
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
        removeEventListener("scroll", onScroll);
        removeEventListener("resize", schedule);
        motion.removeEventListener?.("change", schedule);
        if (pending)
            cancelAnimationFrame(pending);
        if (live === self) {
            live = null;
            marquees.forEach(remove);
        }
    };
}
