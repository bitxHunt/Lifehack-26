"use client";

import type { UnbackedClaim } from "@/lib/types";

export default function ClaimCheck({ flags }: { flags: UnbackedClaim[] }) {
  return (
    <>
      <p className="hint">
        Once brands write for agents, some will write whatever wins. This checks every strong claim
        on a page against the spec sheet behind it.
      </p>
      <div className="card">
        <h2>Unbacked claims</h2>
        <div>
          {flags.length === 0 ? (
            <p className="muted">No unbacked claims found.</p>
          ) : (
            flags.map((f) => (
              <div className="flag" key={`${f.product}-${f.facet}`}>
                <div className="who">
                  {f.product} claims &ldquo;{f.label}&rdquo;
                </div>
                <div className="why">
                  Matched on &ldquo;{f.matched}&rdquo; in the page copy, but nothing in their spec
                  sheet supports it.
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
