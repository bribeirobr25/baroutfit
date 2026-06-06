"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import type { AnalyzeOk, AnalyzeResult } from "@/lib/types";
import { AnalyzingState } from "./AnalyzingState";
import { ResultCard } from "./ResultCard";

type UiState =
  | { status: "input" }
  | { status: "analyzing" }
  | { status: "result"; data: AnalyzeOk }
  | { status: "error" };

const CLIENT_TIMEOUT_MS = 18_000; // SPEC §2: 15-20s ceiling on the analyzing state

function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function Analyzer() {
  const { dict } = useI18n();
  const [url, setUrl] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [state, setState] = useState<UiState>({ status: "input" });

  async function analyze() {
    if (!isValidHttpUrl(url)) {
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
        body: JSON.stringify({ url: url.trim() }),
        signal: controller.signal,
      });
      const data = (await res.json()) as AnalyzeResult;
      if (data.status === "ok") {
        setState({ status: "result", data });
      } else {
        setState({ status: "error" });
      }
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

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void analyze();
  }

  return (
    <div className="w-full" aria-live="polite">
      {state.status === "input" && (
        <form onSubmit={onSubmit} className="w-full" noValidate>
          <div className="flex flex-col sm:flex-row gap-3">
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
              className="flex-1 rounded-xl border border-line bg-paper-raised px-4 py-3.5 text-ink placeholder:text-muted/70 focus:border-accent"
            />
            <button
              type="submit"
              className="rounded-xl bg-ink px-6 py-3.5 font-medium text-paper transition-opacity hover:opacity-90"
            >
              {dict.input.button}
            </button>
          </div>
          {invalid && (
            <p id="url-error" role="alert" className="mt-2 text-sm text-bad">
              {dict.input.errorInvalid}
            </p>
          )}
        </form>
      )}

      {state.status === "analyzing" && <AnalyzingState />}

      {state.status === "result" && (
        <div className="space-y-6">
          <ResultCard data={state.data} />
          <button
            type="button"
            onClick={reset}
            className="rounded-xl border border-line px-5 py-3 text-sm font-medium text-ink transition-colors hover:bg-paper-raised"
          >
            {dict.result.again}
          </button>
        </div>
      )}

      {state.status === "error" && (
        <div className="space-y-6">
          <div
            role="alert"
            className="rounded-2xl border border-line bg-paper-raised p-6 sm:p-8"
          >
            <p className="font-display text-xl text-ink mb-2">
              {dict.result.confidence.unreadable}
            </p>
            <p className="text-muted">{dict.error.unreadable}</p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="rounded-xl border border-line px-5 py-3 text-sm font-medium text-ink transition-colors hover:bg-paper-raised"
          >
            {dict.result.again}
          </button>
        </div>
      )}
    </div>
  );
}
