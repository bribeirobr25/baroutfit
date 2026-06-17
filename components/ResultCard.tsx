"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/lib/i18n/provider";
import type { Dict } from "@/lib/i18n/dictionaries";
import type { AnalyzeOk, BrandMatch, ScoreBand, Wrinkle } from "@/lib/types";
import { APP_NAME } from "@/lib/brand";

const BAND_TEXT: Record<ScoreBand, string> = {
  high: "text-good",
  medium: "text-warn",
  low: "text-bad",
  indeterminate: "text-indeterminate",
  "out-of-scope": "text-indeterminate",
};
const BAND_BAR: Record<ScoreBand, string> = {
  high: "bg-good",
  medium: "bg-warn",
  low: "bg-bad",
  indeterminate: "bg-indeterminate",
  "out-of-scope": "bg-indeterminate",
};
const WRINKLE_TEXT: Record<Wrinkle, string> = {
  low: "text-good",
  medium: "text-warn",
  high: "text-bad",
  unknown: "text-indeterminate",
};

interface Item {
  label: string;
  value: string;
}

function foundItems(data: AnalyzeOk, dict: Dict): Item[] {
  const f = data.findings;
  const items: Item[] = [];
  if (f.fiberType.verified && f.fiberType.value)
    items.push({ label: dict.finding.fiberType, value: String(f.fiberType.value) });
  if (f.fiber.verified && f.fiber.value)
    items.push({ label: dict.finding.fiber, value: f.fiber.value });
  if (f.gsm.verified && f.gsm.value != null)
    items.push({ label: dict.finding.gsm, value: `${f.gsm.value} g/m²` });
  if (f.weave.verified && f.weave.value)
    items.push({ label: dict.finding.weave, value: String(f.weave.value) });
  if (f.spinning.verified && f.spinning.value)
    items.push({
      label: dict.finding.spinning,
      value: String(f.spinning.value).replace(/-/g, " "),
    });
  if (f.elastane.verified && f.elastane.value != null)
    items.push({ label: dict.finding.elastane, value: `${f.elastane.value}%` });
  if (f.polyester.verified && f.polyester.value != null)
    items.push({ label: dict.finding.polyester, value: `${f.polyester.value}%` });
  if (f.nonIron.value)
    items.push({ label: dict.finding.nonIron, value: dict.value.nonIron });
  if (f.construction.length > 0)
    items.push({
      label: dict.finding.construction,
      value: f.construction.join(", "),
    });
  return items;
}

function missingLabels(data: AnalyzeOk, dict: Dict): string[] {
  const map: Record<string, string> = {
    fiber: dict.finding.fiber,
    fiberType: dict.finding.fiberType,
    gsm: dict.finding.gsm,
    weave: dict.finding.weave,
    spinning: dict.finding.spinning,
  };
  return data.missing.map((k) => map[k]).filter(Boolean);
}

// Editorial tier (S+/A+/…) -> plain-language group. The tier is OUR judgment, so
// it's labelled "our rating", never "verified" (audit Risk 4).
function tierGroup(tier: string): "top" | "high" | "mid" {
  if (tier.startsWith("S")) return "top";
  if (tier.startsWith("A")) return "high";
  return "mid";
}

// Factual spec rows from our verified KB reference (audit Risk 4: these are
// "verified at source", distinct from the tier judgment).
function referenceRows(
  ref: NonNullable<BrandMatch["reference"]>,
  dict: Dict,
): Item[] {
  const items: Item[] = [];
  if (ref.fiber) items.push({ label: dict.finding.fiber, value: ref.fiber });
  if (ref.gsm != null)
    items.push({ label: dict.finding.gsm, value: `${ref.gsm} g/m²` });
  if (ref.weave) items.push({ label: dict.finding.weave, value: String(ref.weave) });
  if (ref.origin) items.push({ label: dict.result.madeIn, value: ref.origin });
  return items;
}

function IronIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M2.5 16.5h15.8c.4-3.2-.4-7.5-6-7.5-3.2 0-5.2.9-6.7 2.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M2.5 16.5v2.2h16.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M16 9l1.6-2.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function Row({ label, value }: Item) {
  return (
    <div className="flex items-baseline gap-3 font-mono">
      <span className="text-[0.66rem] uppercase tracking-[0.14em] text-muted">
        {label}
      </span>
      <span className="min-w-3 flex-1 translate-y-[-0.2em] border-b border-dotted border-line" />
      <span className="text-right text-sm font-bold text-ink">{value}</span>
    </div>
  );
}

function proxied(src: string): string {
  return `/api/image?src=${encodeURIComponent(src)}`;
}

function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// Lightbox (G3): full-screen view of the proxied image. Esc / backdrop / ✕ to
// close, arrows + ←/→ to page, focus-trapped, focus restored on close. Rendered
// via a portal only when open (so SSR / static render never calls createPortal).
export function Lightbox({
  images,
  index,
  alt,
  dict,
  onClose,
  onPrev,
  onNext,
}: {
  images: string[];
  index: number;
  alt: string;
  dict: Dict;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Latest callbacks via a ref so the mount-only effect below never re-runs on
  // navigation (paging re-renders with new closures) — otherwise it would
  // re-attach the listener and steal focus off the arrow on every page change.
  const cbRef = useRef({ onClose, onPrev, onNext });
  useEffect(() => {
    cbRef.current = { onClose, onPrev, onNext };
  });

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // freeze background scroll

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        cbRef.current.onClose();
      } else if (e.key === "ArrowLeft") {
        cbRef.current.onPrev();
      } else if (e.key === "ArrowRight") {
        cbRef.current.onNext();
      } else if (e.key === "Tab") {
        const f = ref.current?.querySelectorAll<HTMLElement>("button");
        if (!f || f.length === 0) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 outline-none backdrop-blur-sm"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={dict.result.galleryClose}
        className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-paper/85 text-lg text-ink transition hover:bg-paper"
      >
        ✕
      </button>

      {index > 0 && (
        <button
          type="button"
          onClick={onPrev}
          aria-label={dict.result.galleryPrev}
          className="absolute left-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-paper/85 text-xl text-ink transition hover:bg-paper"
        >
          ‹
        </button>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={proxied(images[index])}
        alt={`${alt} — ${index + 1}/${images.length}`}
        className="max-h-[90vh] max-w-[92vw] object-contain"
      />

      {index < images.length - 1 && (
        <button
          type="button"
          onClick={onNext}
          aria-label={dict.result.galleryNext}
          className="absolute right-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-paper/85 text-xl text-ink transition hover:bg-paper"
        >
          ›
        </button>
      )}

      {images.length > 1 && (
        <span className="absolute bottom-5 left-1/2 -translate-x-1/2 font-mono text-xs text-paper/80">
          {index + 1} / {images.length}
        </span>
      )}
    </div>
  );
}

// Gallery: a native scroll-snap strip (mobile swipe preserved) with desktop
// prev/next arrows + a thumbnail row (≥3 images) or dots (2). Active slide is
// tracked from scroll position. Click a slide to open the lightbox. Images go
// through the same-origin /api/image proxy, so the CSP stays closed. (G2/G3)
function ProductGallery({ images, alt, dict }: { images: string[]; alt: string; dict: Dict }) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const multi = images.length > 1;

  function goTo(i: number) {
    const strip = stripRef.current;
    if (!strip) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    strip.scrollTo({ left: i * strip.clientWidth, behavior: reduce ? "auto" : "smooth" });
  }

  function onScroll() {
    const strip = stripRef.current;
    if (!strip || strip.clientWidth === 0) return;
    const i = Math.round(strip.scrollLeft / strip.clientWidth);
    if (i !== active) setActive(i);
  }

  return (
    <div>
      {/* image viewport — gradient + arrows scoped here so they track the image,
          not the thumbnail row below */}
      <div className="relative">
        <div
          ref={stripRef}
          onScroll={onScroll}
          className="flex snap-x snap-mandatory overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
          role="group"
          aria-roledescription="gallery"
          aria-label={alt}
        >
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => {
                setActive(i);
                setLightboxOpen(true);
              }}
              aria-label={`${dict.result.galleryImage} ${i + 1}`}
              className="w-full shrink-0 cursor-zoom-in snap-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={proxied(src)}
                alt={`${alt} — ${i + 1}/${images.length}`}
                loading={i === 0 ? "eager" : "lazy"}
                className="max-h-[28rem] w-full bg-paper object-contain"
              />
            </button>
          ))}
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-paper-raised to-transparent"
        />

        {multi && (
          <>
            <button
              type="button"
              onClick={() => goTo(Math.max(0, active - 1))}
              disabled={active === 0}
              aria-label={dict.result.galleryPrev}
              className="absolute left-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-paper/80 text-lg text-ink backdrop-blur transition hover:bg-paper disabled:opacity-0"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => goTo(Math.min(images.length - 1, active + 1))}
              disabled={active === images.length - 1}
              aria-label={dict.result.galleryNext}
              className="absolute right-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-paper/80 text-lg text-ink backdrop-blur transition hover:bg-paper disabled:opacity-0"
            >
              ›
            </button>
          </>
        )}
      </div>

      {multi &&
        (images.length >= 3 ? (
          <div className="flex justify-center gap-2 px-3 pb-1 pt-3">
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`${dict.result.galleryImage} ${i + 1}`}
                aria-current={i === active}
                className={`h-12 w-12 shrink-0 overflow-hidden rounded-md border transition ${
                  i === active ? "border-accent" : "border-line opacity-60 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={proxied(src)} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        ) : (
          <div className="flex justify-center gap-2 pt-3">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`${dict.result.galleryImage} ${i + 1}`}
                aria-current={i === active}
                className={`h-1.5 rounded-full transition-all ${
                  i === active ? "w-6 bg-accent" : "w-1.5 bg-line"
                }`}
              />
            ))}
          </div>
        ))}

      {/* lightboxOpen is false on the server/initial render, so createPortal
          never runs during SSR/static render (no document needed there). */}
      {lightboxOpen &&
        createPortal(
          <Lightbox
            images={images}
            index={active}
            alt={alt}
            dict={dict}
            onClose={() => {
              setLightboxOpen(false);
              goTo(active);
            }}
            onPrev={() => setActive((i) => Math.max(0, i - 1))}
            onNext={() => setActive((i) => Math.min(images.length - 1, i + 1))}
          />,
          document.body,
        )}
    </div>
  );
}

export function ResultCard({ data, sourceUrl }: { data: AnalyzeOk; sourceUrl?: string }) {
  const { dict } = useI18n();
  const found = foundItems(data, dict);
  const missing = missingLabels(data, dict);
  const band = data.score.band;
  const isOutOfScope = band === "out-of-scope";
  const hideScore = band === "indeterminate" || isOutOfScope;

  return (
    <article className="atl-tag atl-hairline relative overflow-hidden rounded-3xl border border-line bg-paper-raised shadow-[0_40px_90px_-40px_rgba(0,0,0,0.9)]">
      {/* product gallery — proxied same-origin so the CSP stays closed. A
          horizontal scroll-snap strip (mobile-first); first image eager, the
          rest lazy. Capped to bound proxy fetches. */}
      {data.images && data.images.length > 0 ? (
        <ProductGallery images={data.images} alt={dict.category[data.category]} dict={dict} />
      ) : (
        // Honest empty-state (§6/M3): say the photo wasn't read rather than
        // render silence. Slim + muted so it isn't mistaken for a broken image.
        <p className="border-b border-line px-7 py-3 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted sm:px-10">
          {dict.result.noPhoto}
        </p>
      )}

      <div className="p-7 sm:p-10">
        {/* header */}
        <div className="flex items-center justify-between border-b border-line pb-4 font-mono text-[0.64rem] uppercase tracking-[0.18em] text-muted">
          <span>
            {APP_NAME} · {dict.result.reportLabel}
          </span>
          <span>{dict.category[data.category]}</span>
        </div>

        {/* verdict */}
        <div className="flex flex-col gap-5 pt-7 sm:flex-row sm:items-end sm:justify-between">
          <p
            className={`font-display text-5xl font-bold leading-[0.95] tracking-[-0.03em] sm:text-6xl ${BAND_TEXT[band]}`}
          >
            {dict.result.band[band]}
          </p>
          {!hideScore && (
            <div className="shrink-0 font-mono sm:text-right">
              <p className={`text-4xl font-bold ${BAND_TEXT[band]}`}>
                {data.score.value}
                <span className="text-xl text-muted">/100</span>
              </p>
              <div className="mt-2 h-1.5 w-44 overflow-hidden rounded-full bg-line">
                <div
                  className={`h-full origin-left rounded-full ${BAND_BAR[band]}`}
                  style={{
                    width: `${data.score.value}%`,
                    animation: "atl-sweep 0.9s cubic-bezier(0.16,1,0.3,1) both",
                  }}
                />
              </div>
            </div>
          )}
        </div>
        {isOutOfScope && (
          <p className="mt-3 max-w-lg text-sm text-muted">{dict.result.outOfScope}</p>
        )}
        {data.categoryConfidence === "low" && (
          <p className="mt-3 text-sm text-muted">{dict.result.categoryLow}</p>
        )}

        {/* Audited reference (decisão #4), under the verdict. Kept distinct from
            the page `findings` below: this is OUR audit of the product (a KB
            reference), not a claim about the exact pasted SKU (brands.ts caveat).
            Specs = fact ("verified at source", only when fully verified); tier =
            our judgment ("our rating"). Brand-level matches keep the generic note. */}
        {data.brandMatch?.reference ? (
          (() => {
            const ref = data.brandMatch.reference;
            const rows = referenceRows(ref, dict);
            return (
              <div className="mt-6 rounded-2xl border border-line bg-paper/50 p-5">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="rounded-full bg-accent px-2 py-0.5 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-accent-ink">
                    {dict.result.auditedTag}
                  </span>
                  <span className="font-display font-semibold text-ink">
                    {data.brandMatch.name}
                  </span>
                  <span className="text-sm text-muted">· {ref.product}</span>
                </div>

                {/* our rating — editorial judgment */}
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted">
                    {dict.result.ourRating}
                  </span>
                  <span className="font-display text-lg font-semibold text-ink">
                    {dict.result.tier[tierGroup(ref.tier)]}
                  </span>
                </div>

                {/* specs — fact, only when fully verified */}
                {ref.confidence === "verified" ? (
                  rows.length > 0 && (
                    <div className="mt-3 border-t border-line pt-3">
                      <p className="mb-2 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-good">
                        {dict.result.verifiedAtSource}
                      </p>
                      <div className="space-y-1.5">
                        {rows.map((it) => (
                          <Row key={it.label} label={it.label} value={it.value} />
                        ))}
                      </div>
                    </div>
                  )
                ) : (
                  <p className="mt-3 text-sm text-muted">
                    {dict.result.referencePartial}
                  </p>
                )}
              </div>
            );
          })()
        ) : data.brandMatch?.ref ? (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-line bg-paper/50 p-4">
            <span className="mt-0.5 rounded-full bg-accent px-2 py-0.5 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-accent-ink">
              {dict.result.auditedTag}
            </span>
            <p className="text-sm leading-relaxed text-ink">
              <span className="font-display font-semibold">{data.brandMatch.name}</span>{" "}
              <span className="text-muted">· {dict.result.brandMatch}</span>
            </p>
          </div>
        ) : null}

        {/* will it wrinkle */}
        <div className="mt-8 flex items-center gap-4 border-t border-line pt-6">
          <IronIcon className={`h-7 w-7 shrink-0 ${WRINKLE_TEXT[data.wrinkle]}`} />
          <div>
            <p className="font-mono text-[0.64rem] uppercase tracking-[0.18em] text-muted">
              {dict.result.wrinkleQuestion}
            </p>
            <p
              className={`font-display text-2xl font-medium leading-tight ${WRINKLE_TEXT[data.wrinkle]}`}
            >
              {dict.result.wrinkle[data.wrinkle]}
            </p>
          </div>
        </div>

        {/* composition & spec — read from the page */}
        {found.length > 0 && (
          <div className="mt-8 border-t border-line pt-6">
            <p className="mb-4 font-mono text-[0.64rem] uppercase tracking-[0.18em] text-muted">
              {dict.result.found}{" "}
              <span className="text-good">· {dict.result.verifiedTag}</span>
            </p>
            <div className="space-y-2.5">
              {found.map((it) => (
                <Row key={it.label} label={it.label} value={it.value} />
              ))}
            </div>
          </div>
        )}

        {/* not stated */}
        {missing.length > 0 && (
          <div className="mt-8 border-t border-line pt-6">
            <p className="mb-3 font-mono text-[0.64rem] uppercase tracking-[0.18em] text-muted">
              {dict.result.missing}
            </p>
            <ul className="flex flex-wrap gap-2 font-mono text-xs uppercase tracking-wider">
              {missing.map((label) => (
                <li
                  key={label}
                  className="rounded-full border border-dashed border-line px-3 py-1 text-muted"
                >
                  {label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* confidence — suppressed when out-of-scope (decision #7) */}
        {!isOutOfScope && (
          <div className="mt-7 flex items-center justify-between border-t border-line pt-4 font-mono text-[0.64rem] uppercase tracking-[0.18em] text-muted">
            <span>{dict.result.confidenceLabel}</span>
            <span className="font-bold text-ink">
              {dict.result.confidence[data.confidence]}
            </span>
          </div>
        )}

        {/* Open on the store — the URL the user pasted (not an endorsement).
            New tab + noopener; host shown so it's clear where it leads. */}
        {sourceUrl && hostLabel(sourceUrl) && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-line bg-paper/50 px-5 py-3.5 font-mono text-[0.64rem] uppercase tracking-[0.16em] text-ink transition hover:border-accent"
          >
            <span>{dict.result.openStore}</span>
            <span className="flex items-center gap-2 text-muted">
              {hostLabel(sourceUrl)}
              <span aria-hidden className="not-italic">↗</span>
            </span>
          </a>
        )}
      </div>
    </article>
  );
}
