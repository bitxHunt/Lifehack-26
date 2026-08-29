"use client";

import { useState } from "react";

import type { QueryView } from "@/lib/types";

interface Props {
  queries: { id: string; text: string }[];
  views: Record<string, QueryView>;
}

export default function Scoreboard({ queries, views }: Props) {
  const [selected, setSelected] = useState(queries[0].id);
  const { ranking, explanation } = views[selected];

  return (
    <>
      <p className="hint">
        Pick what a shopper asks. The agent reads only the words on each product page &mdash; no
        photos, no spec sheet, no brand loyalty.
      </p>

      <div className="queries">
        {queries.map((q) => (
          <button
            key={q.id}
            className={`q${q.id === selected ? " is-active" : ""}`}
            onClick={() => setSelected(q.id)}
          >
            {q.text}
          </button>
        ))}
      </div>

      <div className="split">
        <div className="card">
          <h2>Who the agent picks</h2>
          <div>
            {ranking.results.map((p) => {
              if (p.excluded) {
                return (
                  <div key={p.product_id} className={`row excluded${p.is_ours ? " ours" : ""}`}>
                    <div className="row-head">
                      <span className="rank">&mdash;</span>
                      <span className="pname">{p.name}</span>
                      <span className="price">S${p.price_sgd}</span>
                    </div>
                    <div className="tagline-sm">Ruled out: {p.exclusion_reason}</div>
                  </div>
                );
              }

              // Heavily weighted facets the page says nothing about at all.
              const unsaid = p.breakdown
                .filter((b) => b.tier === "silent" && b.weight >= 2)
                .map((b) => b.label);

              return (
                <div key={p.product_id} className={`row${p.is_ours ? " ours" : ""}`}>
                  <div className="row-head">
                    <span className="rank">#{p.rank}</span>
                    <span className="pname">{p.name}</span>
                    {p.recommended && <span className="badge">recommended</span>}
                    <span className="price">S${p.price_sgd}</span>
                    <span className="score">{p.score}</span>
                  </div>
                  <div className="bar">
                    <span style={{ width: `${p.score}%` }} />
                  </div>
                  {unsaid.length > 0 && (
                    <div className="tagline-sm">page says nothing about: {unsaid.join(", ")}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <h2>Why we lost</h2>
          <div>
            <p className="verdict">
              We ranked <strong>#{explanation.our_rank}</strong> with {explanation.our_score}/100.{" "}
              {explanation.winner_name} took the recommendation with {explanation.winner_score}/100
              &mdash; {explanation.beaten_by} points ahead of us.
            </p>

            {explanation.silent_strengths.length > 0 && (
              <>
                <div className="group-title">
                  Silent strengths &mdash; true about the shoe, missing from the page
                </div>
                {explanation.silent_strengths.map((g) => (
                  <div className="gap" key={g.facet}>
                    <div className="g-label">{g.label}</div>
                    <div className="g-cost">
                      cost us {g.points_lost} points &middot; page is{" "}
                      {g.our_tier === "silent" ? "silent" : "vague"}, theirs is explicit
                    </div>
                    <div className="g-fix">add: {g.fix}</div>
                  </div>
                ))}
              </>
            )}

            {explanation.real_gaps.length > 0 && (
              <>
                <div className="group-title">
                  Real gaps &mdash; the shoe genuinely does not do this
                </div>
                {explanation.real_gaps.map((g) => (
                  <div className="gap real" key={g.facet}>
                    <div className="g-label">{g.label}</div>
                    <div className="g-cost">
                      cost us {g.points_lost} points &middot; no amount of copywriting fixes this
                    </div>
                  </div>
                ))}
              </>
            )}

            {explanation.silent_strengths.length === 0 && explanation.real_gaps.length === 0 && (
              <p className="muted">
                Nothing lost here &mdash; we are already the top pick for this question.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
