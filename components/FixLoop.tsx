"use client";

import { useEffect, useState } from "react";

import type { LoopStep } from "@/lib/types";

const STEP_DELAY_MS = 600;

export default function FixLoop({ history }: { history: LoopStep[] }) {
  const [shown, setShown] = useState(0);
  const [running, setRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  // Reveal one round at a time, so the score visibly climbs during a demo.
  useEffect(() => {
    if (!running) {
      return;
    }

    if (shown >= history.length) {
      const done = setTimeout(() => {
        setRunning(false);
        setHasRun(true);
      }, STEP_DELAY_MS);
      return () => clearTimeout(done);
    }

    const next = setTimeout(() => setShown(shown + 1), shown === 0 ? 0 : STEP_DELAY_MS);
    return () => clearTimeout(next);
  }, [running, shown, history.length]);

  function run() {
    setShown(0);
    setRunning(true);
  }

  return (
    <>
      <p className="hint">
        Each round adds the single highest-value missing sentence, then re-runs all 10 questions.
        Nothing about the shoe changes &mdash; only the words on the page.
      </p>
      <div className="card">
        <button className="run" onClick={run} disabled={running}>
          {running ? "Running…" : hasRun ? "Run again" : "Run the loop"}
        </button>

        <div id="loop">
          {history.slice(0, shown).map((step, index) => {
            const previous = index > 0 ? history[index - 1] : null;
            const delta = previous ? step.shelf_score - previous.shelf_score : 0;

            return (
              <div className="step" key={step.round}>
                <div className="n">round {step.round}</div>
                <div className="added">
                  {step.round === 0 ? (
                    <em>starting point &mdash; the page as it is today</em>
                  ) : (
                    <>
                      <em>added:</em> {step.added}
                    </>
                  )}
                </div>
                <div className="metric">
                  <b>{step.shelf_score}</b>
                  <small>
                    shelf score {delta > 0 && <span className="up">+{delta}</span>}
                  </small>
                </div>
                <div className="metric">
                  <b>{step.win_rate}%</b>
                  <small>top pick</small>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
