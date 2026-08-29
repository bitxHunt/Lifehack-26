"use client";

import type { Coverage } from "@/lib/types";

export default function CoverageMap({ coverage }: { coverage: Coverage }) {
  return (
    <>
      <p className="hint">
        Twenty questions a shopper asks before buying. Green means the page answers it outright. Red
        means the page is silent, so the agent moves on.
      </p>
      <div className="card">
        <h2>
          Coverage map{" "}
          <span className="pill">
            {coverage.answered} of {coverage.total} answered
          </span>
        </h2>
        <div className="grid">
          {coverage.rows.map((row) => (
            <div className={`cell ${row.status}`} key={row.question}>
              {row.question}
              {row.recoverable && <span className="dot" title="already true, just not written down" />}
            </div>
          ))}
        </div>
        <p className="legend">
          <span className="key answered" /> answered
          <span className="key vague" /> vague, the agent has to guess
          <span className="key silent" /> silent
          <span className="key recoverable-key" /> dot = already true, just unsaid
        </p>
      </div>
    </>
  );
}
