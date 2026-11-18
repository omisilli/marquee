"use client";

import { useEffect, type CSSProperties } from "react";
import { initMarquee } from "@plusguard/marquee";
import "@plusguard/marquee/index.css";

/*
 * Next (App Router). Mount once, high in the tree — the root layout:
 *
 *   <body>
 *       <MarqueeInit />
 *       {children}
 *   </body>
 *
 * It watches every marquee on the page, those rendered later too — a route
 * change, a list that arrives. The list is never moved or changed: the
 * copies go in the track beside it. Called again before the first cleanup
 * runs (React remounting in development), only the newest call answers.
 */
export function MarqueeInit() {
    useEffect(() => initMarquee(), []);
    return null;
}

/* Settings are CSS variables: a style prop here, a class or a media query
   in a stylesheet just the same. */
type Vars = CSSProperties & Record<`--pg-marquee${string}`, string | number>;

/*
 * An announcement bar, its stop button beside it. The ✦ after every item —
 * the last too — joins the list and its copies with the same mark; put it
 * in the stylesheet: .bar li::after { content: "✦"; margin-left: 2rem }.
 */
export function AnnouncementBar({ items }: { items: React.ReactNode[] }) {
    return (
        <div className="bar" style={{ display: "flex", alignItems: "center" }}>
            <div data-pg-marquee id="promo" style={{ flex: "1 1 0%", minWidth: 0 }}>
                <div data-pg-marquee-track>
                    <ul data-pg-marquee-list>
                        {items.map((item, i) => (
                            <li key={i}>{item}</li>
                        ))}
                    </ul>
                </div>
            </div>
            {/* aria-pressed is the package's from the first press on */}
            <button type="button" data-pg-marquee-toggle aria-controls="promo" aria-pressed="false" aria-label="Stop the announcements">
                ❚❚
            </button>
        </div>
    );
}

/* Deals one at a time, going up, each the bar's own height; arrows by
   aria-controls. Written as a column from the first paint. */
export function DealsBar({ deals }: { deals: React.ReactNode[] }) {
    const height = "2.75rem";
    return (
        <div style={{ display: "flex", alignItems: "center" }}>
            <button type="button" data-pg-marquee-prev aria-controls="deals" aria-label="The deal before">
                ‹
            </button>
            <div
                data-pg-marquee
                id="deals"
                data-pg-marquee-axis="y"
                style={{ flex: "1 1 0%", minWidth: 0, height, "--pg-marquee": "step", "--pg-marquee-direction": "up", "--pg-marquee-gap": "0px", "--pg-marquee-hold": "4s" } as Vars}
            >
                <div data-pg-marquee-track style={{ width: "100%" }}>
                    <ul data-pg-marquee-list style={{ width: "100%" }}>
                        {deals.map((deal, i) => (
                            <li key={i} style={{ height, display: "grid", placeItems: "center" }}>
                                {deal}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            <button type="button" data-pg-marquee-next aria-controls="deals" aria-label="The next deal">
                ›
            </button>
        </div>
    );
}

/* Logos, two rows the opposite ways, the edges fading. */
export function LogoRows({ top, bottom }: { top: string[]; bottom: string[] }) {
    const row = (names: string[], direction: "left" | "right") => (
        <div data-pg-marquee style={{ "--pg-marquee-direction": direction, "--pg-marquee-fade": "6rem", "--pg-marquee-gap": "3.5rem", "--pg-marquee-speed": 40 } as Vars}>
            <div data-pg-marquee-track>
                <ul data-pg-marquee-list>
                    {names.map((name) => (
                        <li key={name}>{name}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
    return (
        <div style={{ display: "grid", gap: "1.5rem" }}>
            {row(top, "left")}
            {row(bottom, "right")}
        </div>
    );
}

/* Testimonials in a column; going up or down needs a height. */
export function TestimonialColumn({ quotes, direction = "up", speed = 30 }: { quotes: { text: string; name: string }[]; direction?: "up" | "down"; speed?: number }) {
    return (
        <div
            data-pg-marquee
            data-pg-marquee-axis="y"
            style={{ height: "28rem", "--pg-marquee-direction": direction, "--pg-marquee-speed": speed, "--pg-marquee-gap": "1rem", "--pg-marquee-fade": "4rem" } as Vars}
        >
            <div data-pg-marquee-track>
                <div data-pg-marquee-list>
                    {quotes.map((q) => (
                        <figure key={q.name} className="card">
                            <blockquote>{q.text}</blockquote>
                            <figcaption>{q.name}</figcaption>
                        </figure>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* A product title in one line: still while it fits, flowing when not. */
export function ProductTitle({ children }: { children: React.ReactNode }) {
    return (
        <div data-pg-marquee style={{ whiteSpace: "nowrap", "--pg-marquee": "overflow", "--pg-marquee-speed": 35, "--pg-marquee-hover": "none" } as Vars}>
            <div data-pg-marquee-track>
                <p data-pg-marquee-list>
                    <span>{children}</span>
                </p>
            </div>
        </div>
    );
}

/* Two bands crossing, racing with the page's scroll — no GSAP. */
export function CrossingBands({ one, two }: { one: string[]; two: string[] }) {
    const band = (words: string[], turn: string, direction: "left" | "right") => (
        <div
            data-pg-marquee
            style={{ gridArea: "1 / 1", width: "120vw", transform: `rotate(${turn})`, "--pg-marquee-direction": direction, "--pg-marquee-scroll": 0.2, "--pg-marquee-hover": "none", "--pg-marquee-speed": 60 } as Vars}
        >
            <div data-pg-marquee-track>
                <ul data-pg-marquee-list>
                    {words.map((word) => (
                        <li key={word}>{word}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
    return (
        <div style={{ display: "grid", placeItems: "center", height: "26rem", overflow: "clip" }}>
            {band(one, "-4deg", "left")}
            {band(two, "3deg", "right")}
        </div>
    );
}
