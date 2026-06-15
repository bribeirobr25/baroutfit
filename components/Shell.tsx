"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useI18n } from "@/lib/i18n/provider";
import { APP_NAME } from "@/lib/brand";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Analyzer } from "./Analyzer";

// Three.js is heavy and hero-only — load it lazily after hydration so it never
// blocks first paint. The hero shows a warm CSS gradient until it arrives.
const FabricBackground = dynamic(
  () => import("./FabricBackground").then((m) => m.FabricBackground),
  { ssr: false },
);

// "Atelier" landing: a live WebGL fabric hero, a kinetic headline, the tool, and
// a principle section that rises on scroll. All motion is gated behind
// prefers-reduced-motion via gsap.matchMedia (content is visible by default).
export function Shell() {
  const { dict, locale } = useI18n();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        gsap.from(".hero-word", {
          yPercent: 115,
          duration: 1,
          ease: "power4.out",
          stagger: 0.06,
          delay: 0.1,
        });
        gsap.from(".hero-fade", {
          y: 18,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.12,
          delay: 0.5,
        });
        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
          gsap.from(el, {
            y: 40,
            opacity: 0,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 85%" },
          });
        });
      }, root);
      return () => ctx.revert();
    });
    return () => mm.revert();
  }, [locale]);

  const headWords = dict.app.headlineMain.split(" ");

  return (
    <div ref={root} className="flex min-h-full flex-col">
      {/* nav */}
      <nav className="fixed inset-x-0 top-0 z-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8 sm:py-5">
          <Link
            href="/"
            className="font-display text-lg font-bold tracking-tight text-ink"
          >
            {APP_NAME}
            <span className="text-accent">.</span>
          </Link>
          <LanguageSwitcher />
        </div>
      </nav>

      <main className="flex-1">
        {/* hero */}
        <section className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden px-5 pb-20 pt-28 sm:px-8 sm:pt-32">
          {/* immediate gradient (shows before Three loads / if WebGL is absent) */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(120% 90% at 70% 10%, rgba(255,90,54,0.18), transparent 55%), radial-gradient(90% 80% at 15% 80%, rgba(255,194,75,0.12), transparent 55%), #08080a",
            }}
          />
          <FabricBackground />
          {/* legibility veil */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-paper/40 via-paper/10 to-paper"
          />

          <div className="mx-auto w-full max-w-6xl">
            <p className="hero-fade text-gradient font-mono text-[0.7rem] font-bold uppercase tracking-[0.32em]">
              {dict.home.heroKicker}
            </p>

            <h1 className="mt-5 font-display text-[clamp(2.7rem,9vw,6.5rem)] font-bold leading-[0.92] tracking-[-0.03em] text-ink">
              <span className="hero-fade block text-muted">
                {dict.app.headlineLead}
              </span>
              <span className="mt-1 block">
                {headWords.map((w, i) => (
                  <span
                    key={`${w}-${i}`}
                    className="mr-[0.22em] inline-block overflow-hidden align-bottom"
                  >
                    <span className="hero-word inline-block">{w}</span>
                  </span>
                ))}
              </span>
            </h1>

            <p className="hero-fade mt-7 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              {dict.app.tagline}
            </p>

            <div className="hero-fade mt-10">
              <Analyzer />
            </div>
          </div>

          {/* scroll cue */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-6 mx-auto flex w-full max-w-6xl px-5 sm:px-8"
          >
            <span
              className="font-mono text-[0.62rem] uppercase tracking-[0.3em] text-muted"
              style={{ animation: "atl-cue 2.4s ease-in-out infinite" }}
            >
              ↓ {dict.home.scrollCue}
            </span>
          </div>
        </section>

        {/* the principle */}
        <section className="border-t border-line px-5 py-24 sm:px-8 sm:py-32">
          <div className="mx-auto max-w-6xl">
            <p
              data-reveal
              className="text-gradient font-mono text-[0.7rem] font-bold uppercase tracking-[0.32em]"
            >
              {dict.home.principleKicker}
            </p>
            <h2
              data-reveal
              className="mt-5 max-w-3xl font-display text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[1.02] tracking-[-0.02em] text-ink"
            >
              {dict.home.principleTitle}
            </h2>

            <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
              {[
                { n: "01", t: dict.home.p1Title, b: dict.home.p1Body },
                { n: "02", t: dict.home.p2Title, b: dict.home.p2Body },
                { n: "03", t: dict.home.p3Title, b: dict.home.p3Body },
              ].map((p) => (
                <div
                  key={p.n}
                  data-reveal
                  className="flex flex-col gap-4 bg-paper p-8 sm:p-9"
                >
                  <span className="font-mono text-xs tracking-[0.2em] text-accent">
                    {p.n}
                  </span>
                  <h3 className="font-display text-xl font-medium text-ink">
                    {p.t}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted">{p.b}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted">
          <span>
            {APP_NAME} · {new Date().getFullYear()}
          </span>
          <span className="hidden sm:inline">{dict.app.footerTagline}</span>
        </div>
      </footer>
    </div>
  );
}
