"use client";

import { useState } from "react";

import ClaimCheck from "./ClaimCheck";
import CoverageMap from "./CoverageMap";
import FixLoop from "./FixLoop";
import ListingCreator from "./ListingCreator";
import Scoreboard from "./Scoreboard";
import type { Coverage, LoopStep, QueryView, UnbackedClaim } from "@/lib/types";

const TABS = [
  { id: "scoreboard", label: "Scoreboard" },
  { id: "coverage", label: "Question coverage" },
  { id: "loop", label: "Fix & re-run" },
  { id: "trust", label: "Claim check" },
  { id: "listing", label: "Create listing" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface Props {
  queries: { id: string; text: string }[];
  views: Record<string, QueryView>;
  coverage: Coverage;
  loopHistory: LoopStep[];
  flags: UnbackedClaim[];
}

export default function Dashboard({ queries, views, coverage, loopHistory, flags }: Props) {
  const [tab, setTab] = useState<TabId>("scoreboard");

  return (
    <>
      <nav className="tabs wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab${t.id === tab ? " is-active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="wrap">
        <section className={`panel${tab === "scoreboard" ? " is-active" : ""}`}>
          <Scoreboard queries={queries} views={views} />
        </section>

        <section className={`panel${tab === "coverage" ? " is-active" : ""}`}>
          <CoverageMap coverage={coverage} />
        </section>

        <section className={`panel${tab === "loop" ? " is-active" : ""}`}>
          <FixLoop history={loopHistory} />
        </section>

        <section className={`panel${tab === "trust" ? " is-active" : ""}`}>
          <ClaimCheck flags={flags} />
        </section>

        <section className={`panel${tab === "listing" ? " is-active" : ""}`}>
          <ListingCreator />
        </section>
      </main>
    </>
  );
}
