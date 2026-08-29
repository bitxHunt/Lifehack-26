/**
 * Turns rough seller input -- a photo, a few notes, a handful of known facts --
 * into page copy, i.e. a `Product.content` array.
 *
 * Calls Claude when ANTHROPIC_API_KEY is set. Falls back to a deterministic
 * template otherwise, so the create-listing flow never depends on network
 * access -- same fallback philosophy as the rest of the demo.
 */

import { FACETS } from "./facets";
import type { ListingDraftRequest, ListingDraftResponse } from "./types";

const MODEL = "claude-sonnet-5";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

export async function draftListingContent(input: ListingDraftRequest): Promise<ListingDraftResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      return await draftWithClaude(input, apiKey);
    } catch (err) {
      console.error("Claude draft failed, falling back to template:", err);
    }
  }
  return { content: draftWithTemplate(input), source: "template" };
}

/** No network, no API key -- just turns the known facts into plain lines. */
function draftWithTemplate(input: ListingDraftRequest): string[] {
  const lines: string[] = [input.name];

  if (input.brand) {
    lines.push(`${input.brand} ${input.name}.`);
  }
  if (input.notes?.trim()) {
    lines.push(input.notes.trim());
  }
  for (const value of Object.values(input.facts ?? {})) {
    if (value) lines.push(value);
  }
  if (input.price_sgd) {
    lines.push(`S$${input.price_sgd}`);
  }

  return lines.filter(Boolean);
}

async function draftWithClaude(
  input: ListingDraftRequest,
  apiKey: string,
): Promise<ListingDraftResponse> {
  const factLines = Object.entries(input.facts ?? {})
    .filter(([, value]) => value)
    .map(([facetId, value]) => `- ${FACETS[facetId as keyof typeof FACETS]?.label ?? facetId}: ${value}`)
    .join("\n");

  const prompt = [
    `Write product page copy for "${input.name}"${input.brand ? ` by ${input.brand}` : ""}.`,
    input.price_sgd ? `Price: S$${input.price_sgd}.` : "",
    input.notes?.trim() ? `Seller notes: ${input.notes.trim()}` : "",
    factLines
      ? `Known facts -- state each one explicitly, in plain language, with the numbers given:\n${factLines}`
      : "",
    "",
    "Write 6-10 short lines a shopper, or an AI shopping assistant reading this page on their " +
      "behalf, would actually find useful. State facts plainly and specifically (numbers, " +
      "conditions, named use cases) rather than vague adjectives -- an assistant looks for " +
      "concrete claims, not marketing tone. One fact per line, no headings, no markdown, just " +
      "the lines of copy in the order they should appear on the page.",
  ]
    .filter(Boolean)
    .join("\n");

  const content: Record<string, unknown>[] = [];
  const image = parseDataUrl(input.photo_data_url);
  if (image) {
    content.push({ type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } });
  }
  content.push({ type: "text", text: prompt });

  const response = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 500,
      messages: [{ role: "user", content }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  const text: string = data.content?.[0]?.text ?? "";
  const lines = text
    .split("\n")
    .map((line: string) => line.replace(/^[-*\d.\s]+/, "").trim())
    .filter(Boolean);

  return { content: lines.length > 0 ? lines : draftWithTemplate(input), source: "llm" };
}

function parseDataUrl(dataUrl?: string): { mediaType: string; data: string } | null {
  if (!dataUrl) return null;
  const match = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  return match ? { mediaType: match[1], data: match[2] } : null;
}
