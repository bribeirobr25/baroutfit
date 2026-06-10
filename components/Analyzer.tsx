"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import type { AnalyzeOk, AnalyzeResult } from "@/lib/types";
import { EXAMPLES_BY_LOCALE } from "@/lib/examples";
import { AnalyzingState } from "./AnalyzingState";
import { ResultCard } from "./ResultCard";

type UiState =
  | { status: "input" }
  | { status: "analyzing" }
  | { status: "result"; data: AnalyzeOk }
  | { status: "error" };

// Covers the server fast path plus the reader-proxy fallback for blocked shops.
const CLIENT_TIMEOUT_MS = 29_000;

function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function Analyzer() {
  const { dict, locale } = useI18n();
  const examples = EXAMPLES_BY_LOCALE[locale];
  const [url, setUrl] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [state, setState] = useState<UiState>({ status: "input" });

  async function analyze(target?: string) {
    const value = (target ?? url).trim();
    if (!isValidHttpUrl(value)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setState({ status: "analyzing" });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: value }),
        signal: controller.signal,
      });
      const data = (await res.json()) as AnalyzeResult;
      setState(
        data.status === "ok" ? { status: "result", data } : { status: "error" },
      );
    } catch {
      setState({ status: "error" });
    } finally {
      clearTimeout(timer);
    }
  }

  function reset() {
    setState({ status: "input" });
    setUrl("");
    setInvalid(false);
  }

  function pickExample(exampleUrl: string) {
    setUrl(exampleUrl);
    void analyze(exampleUrl);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void analyze();
  }

  return (
    <div className="w-full" aria-live="polite">
      {state.status === "input" && (
        <div className="w-full">
          <form onSubmit={onSubmit} noValidate>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="url"
                inputMode="url"
                autoComplete="off"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (invalid) setInvalid(false);
                }}
                placeholder={dict.input.placeholder}
                aria-label={dict.input.placeholder}
                aria-invalid={invalid}
                aria-describedby={invalid ? "url-error" : undefined}
                className="flex-1 rounded-full border border-line bg-paper-raised px-5 py-4 text-ink placeholder:text-muted focus:border-accent"
              />
              <button
                type="submit"
                className="rounded-full bg-accent px-7 py-4 font-semibold text-accent-ink transition-transform hover:scale-[1.02] active:scale-95"
              >
                {dict.input.button}
              </button>
            </div>
            {invalid && (
              <p id="url-error" role="alert" className="mt-3 text-sm text-accent">
                {dict.input.errorInvalid}
              </p>
            )}
          </form>

          {/* Engagement: one-tap example reads (audited houses + a mall brand). */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted">
              {dict.input.tryExamples}
            </span>
            {examples.map((ex) => (
              <button
                key={ex.label}
                type="button"
                onClick={() => pickExample(ex.url)}
                className="rounded-full border border-line px-3.5 py-1.5 text-sm text-ink transition-colors hover:border-accent hover:text-accent"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {state.status === "analyzing" && <AnalyzingState />}

      {state.status === "result" && (
        <div className="space-y-6">
          <ResultCard data={state.data} />
          <button
            type="button"
            onClick={reset}
            className="rounded-full border border-line px-6 py-3 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
          >
            {dict.result.again}
          </button>
        </div>
      )}

      {state.status === "error" && (
        <div className="space-y-6">
          <div
            role="alert"
            className="roupas-tag rounded-2xl border border-line bg-paper-raised p-7 sm:p-9"
          >
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-accent">
              No reading
            </p>
            <p className="mt-3 font-display text-2xl italic text-ink">
              {dict.result.confidence.unreadable}
            </p>
            <p className="mt-3 text-muted">{dict.error.unreadable}</p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="rounded-full border border-line px-6 py-3 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
          >
            {dict.result.again}
          </button>
        </div>
      )}
    </div>
  );
}
