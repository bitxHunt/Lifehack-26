"use client";

import { useState } from "react";

import Scoreboard from "./Scoreboard";
import CoverageMap from "./CoverageMap";
import { FACETS, FACET_IDS } from "@/lib/facets";
import type { FacetFacts, ListingDraftResponse, ListingScoreResponse } from "@/lib/types";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ListingCreator() {
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [facts, setFacts] = useState<FacetFacts>({});
  const [photo, setPhoto] = useState<string | null>(null);

  const [contentText, setContentText] = useState("");
  const [draftSource, setDraftSource] = useState<ListingDraftResponse["source"] | null>(null);

  const [drafting, setDrafting] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ListingScoreResponse | null>(null);

  async function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(await fileToDataUrl(file));
  }

  async function generateDescription() {
    if (!name.trim()) {
      setError("Give it a product name first.");
      return;
    }
    setError(null);
    setDrafting(true);
    try {
      const res = await fetch("/api/listing/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          brand,
          price_sgd: Number(price) || undefined,
          notes,
          facts,
          photo_data_url: photo ?? undefined,
        }),
      });
      const data = (await res.json()) as ListingDraftResponse & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not generate a description");
      setContentText(data.content.join("\n"));
      setDraftSource(data.source);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate a description");
    } finally {
      setDrafting(false);
    }
  }

  async function scoreListing() {
    const content = contentText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (!name.trim() || content.length === 0) {
      setError("Add a product name and some description lines first.");
      return;
    }
    setError(null);
    setScoring(true);
    try {
      const res = await fetch("/api/listing/score", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, brand, price_sgd: Number(price) || undefined, content, facts }),
      });
      const data = (await res.json()) as ListingScoreResponse & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not score this listing");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not score this listing");
    } finally {
      setScoring(false);
    }
  }

  return (
    <>
      <p className="hint">
        Put up a new listing the way a seller actually would: a photo, a few notes, the things you
        know are true. We draft the page copy, then run it through the same agent that scores the
        rest of the shelf &mdash; against the same four competitors, the same ten shopper questions.
      </p>

      <div className="split">
        <div className="card">
          <h2>1. What is it?</h2>

          <div className="form-row">
            <label>Product name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Velocity Air 4" />
          </div>
          <div className="form-row two">
            <div>
              <label>Brand</label>
              <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Your brand" />
            </div>
            <div>
              <label>Price (S$)</label>
              <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="179" inputMode="numeric" />
            </div>
          </div>

          <div className="form-row">
            <label>Photo</label>
            <input type="file" accept="image/*" onChange={onPhotoChange} />
            {photo && <img src={photo} alt="Uploaded product" className="photo-preview" />}
          </div>

          <div className="form-row">
            <label>Notes for the copywriter</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Whatever you'd tell a photographer or a copywriter -- what it's for, who it's for, what makes it different."
              rows={3}
            />
          </div>

          <div className="form-row">
            <label>Quick facts (optional, but this is what beats a spec dump)</label>
            <div className="quickfacts">
              {FACET_IDS.map((facetId) => (
                <input
                  key={facetId}
                  value={facts[facetId] ?? ""}
                  onChange={(e) => setFacts((f) => ({ ...f, [facetId]: e.target.value || undefined }))}
                  placeholder={FACETS[facetId].label}
                />
              ))}
            </div>
          </div>

          <button className="run" onClick={generateDescription} disabled={drafting}>
            {drafting ? "Writing..." : "Generate description"}
          </button>
        </div>

        <div className="card">
          <h2>2. The page copy</h2>
          <p className="hint" style={{ marginBottom: 10 }}>
            This is all the agent will ever read. Edit freely, one fact per line.
            {draftSource === "template" && (
              <> Drafted from your notes and facts directly &mdash; set ANTHROPIC_API_KEY to have Claude write it.</>
            )}
            {draftSource === "llm" && <> Drafted by Claude from your photo, notes and facts.</>}
          </p>
          <textarea
            className="content-editor"
            value={contentText}
            onChange={(e) => setContentText(e.target.value)}
            placeholder="Generate a description, or just write the lines yourself."
            rows={12}
          />
          <button className="run" onClick={scoreListing} disabled={scoring} style={{ marginTop: 12 }}>
            {scoring ? "Scoring..." : "Score this listing"}
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {result && (
        <div className="listing-results">
          <div className="stats">
            <div className={`stat${result.shelf_score < 60 ? " alarm" : ""}`}>
              <div className="val">
                {result.shelf_score}
                <small>/100</small>
              </div>
              <div className="lbl">Shelf score across {result.queries.length} questions</div>
            </div>
            <div className={`stat${result.win_rate < 30 ? " alarm" : ""}`}>
              <div className="val">{result.win_rate}%</div>
              <div className="lbl">Questions where this listing wins</div>
            </div>
            <div className="stat">
              <div className="val">{result.recommend_rate}%</div>
              <div className="lbl">Questions where it gets mentioned at all</div>
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <Scoreboard queries={result.queries} views={result.views} />
          </div>

          <div style={{ marginTop: 24 }}>
            <CoverageMap coverage={result.coverage} />
          </div>
        </div>
      )}
    </>
  );
}
