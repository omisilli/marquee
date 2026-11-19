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
export function AnnouncementBar({ items, paused = false }: { items: React.ReactNode[]; paused?: boolean }) {
    // paused: stopped from React — data-pg-marquee-paused written or taken
    // away; its toggle shows it. The toggle and pauseMarquee() write the same.
    return (
        <div className="bar" style={{ display: "flex", alignItems: "center" }}>
            <div data-pg-marquee id="promo" data-pg-marquee-paused={paused ? "" : undefined} style={{ flex: "1 1 0%", minWidth: 0 }}>
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

/* Logos, two rows the opposite ways, the edges fading — dragged by hand:
   a finger or the mouse takes hold, and let go they are thrown on. */
export function LogoRows({ top, bottom }: { top: string[]; bottom: string[] }) {
    const row = (names: string[], direction: "left" | "right") => (
        <div data-pg-marquee style={{ "--pg-marquee-direction": direction, "--pg-marquee-fade": "6rem", "--pg-marquee-gap": "3.5rem", "--pg-marquee-speed": 40, "--pg-marquee-drag": "on" } as Vars}>
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
                            {/* In a copy too, pressed with the mouse like this one. */}
                            <a href="https://www.google.com" target="_blank" rel="noopener">
                                See the order →
                            </a>
                            <figcaption>{q.name}</figcaption>
                        </figure>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* Several columns stopping together: data-pg-marquee-group on what holds
   them — the mouse over any, or focus in any, stops them all; a toggle
   naming the group stops and starts them all. */
export function TestimonialColumns({ columns }: { columns: { text: string; name: string }[][] }) {
    return (
        <>
            <button type="button" data-pg-marquee-toggle aria-controls="testimonials" aria-pressed="false">
                Stop all
            </button>
            <div id="testimonials" data-pg-marquee-group style={{ display: "grid", gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`, gap: "1rem" }}>
                {columns.map((quotes, i) => (
                    <TestimonialColumn key={i} quotes={quotes} direction={i % 2 ? "down" : "up"} speed={22 + i * 8} />
                ))}
            </div>
        </>
    );
}

/* Review cards in a row beside the score. Each product picture in its box
   the house way (pg-imageGroup): the box has the height and the shape, the
   picture fills it — no baseline gap, no box stretched by the picture. */
export function ReviewRow({ reviews }: { reviews: { title?: string; text: string; name: string; product: string; href: string; picture: string }[] }) {
    return (
        <div data-pg-marquee style={{ "--pg-marquee-gap": "1rem", "--pg-marquee-fade": "3rem", "--pg-marquee-speed": 30 } as Vars}>
            <div data-pg-marquee-track>
                <div data-pg-marquee-list>
                    {reviews.map((r) => (
                        <figure key={r.name} className="review">
                            <span className="stars" aria-label="5 out of 5">
                                ★★★★★
                            </span>
                            {r.title && <p className="review-title">{r.title}</p>}
                            <blockquote>{r.text}</blockquote>
                            <b>{r.name}</b>
                            <a className="review-product" href={r.href}>
                                <span className="pg-imageGroup" style={{ height: "2.75rem", aspectRatio: "1" }}>
                                    <img src={r.picture} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                </span>
                                <span>
                                    <small>Bought</small> {r.product}
                                </span>
                            </a>
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
            style={{ position: "absolute", top: "50%", left: "-50vw", right: "-50vw", translate: "0 -50%", rotate: turn, "--pg-marquee-direction": direction, "--pg-marquee-scroll": 0.2, "--pg-marquee-hover": "none", "--pg-marquee-speed": 60 } as Vars}
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
    // Half a screen longer than the page on each side: turned, their ends
    // never come into sight. The crossing clips them at the page's edge.
    return (
        <div style={{ position: "relative", height: "26rem", overflow: "clip" }}>
            {band(one, "-4deg", "left")}
            {band(two, "3deg", "right")}
        </div>
    );
}
