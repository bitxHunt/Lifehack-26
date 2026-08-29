# AgentShelf

**See what AI assistants recommend instead of you — and the exact sentence that cost you the sale.**

A working prototype for the Rezolve AI hackathon problem statement: helping brands
make product content that AI shopping agents can actually understand and recommend.

---

## The problem in one paragraph

People are starting to shop by asking instead of searching. Not *"running shoes size 10"*
but *"I'm training for a half marathon in Singapore's humid weather and need lightweight
shoes under S$200."* An AI assistant answers that by **reading text**. It never sees the
photos, the packaging, or the spec sheet in your PIM.

So a page that says *"Upper: engineered mesh. Midsole: EVA. Weight: 218g"* is invisible
for that question — even when the shoe is genuinely perfect for it. A worse shoe whose
page happens to say *"built for humid long runs"* wins instead. The brand never finds out,
because there is no ranking page to check.

## What this prototype does

It simulates the shopping agent, so you can watch yourself lose and see why.

Five running shoes, ten real shopper questions, one city (Singapore). The tool:

1. **Scoreboard** — runs a shopper question against all five products and ranks them the
   way an assistant would. Your product is highlighted. You currently place 3rd.
2. **Why we lost** — names the winner, the point gap, and the specific facts that
   decided it.
3. **Question coverage** — 20 things a shopper asks before buying, marked green / amber /
   red depending on whether your page answers them.
4. **Fix & re-run** — adds the single highest-value missing sentence, re-runs all ten
   questions, and repeats. The score climbs from **25 → 86** and top-pick rate from
   **0% → 60%**, without changing anything about the shoe.
5. **Claim check** — flags competitors making strong claims their spec sheet doesn't back.

## The idea underneath

Every product in the catalog carries **two separate records**:

| record | what it is | who can see it |
| --- | --- | --- |
| `content` | the words actually on the product page | the agent, and only this |
| `truth` | what the shoe really is, from the spec sheet | nobody — it's the ground truth we score against |

That split is the whole product. It lets the tool sort every gap into two piles:

- **Silent strengths** — the shoe genuinely does this, the page never says so.
  Fixable with one sentence, today, for free. *This is where the money is.*
- **Real gaps** — the shoe genuinely doesn't. No amount of copywriting fixes it.

Most teams will build a tool that says "your content scores 46/100." This one says
"you lost the half-marathon query to Meridian by 46 points, and **three of the four
reasons are things your shoe already does — you just never wrote them down.**"

It also means the tool can't be gamed into recommending lies, which is what the claim
check tab is about. Once brands learn that mentioning humidity wins, some will simply
write it whether it's true or not.

## Running it

Python 3.9+. No dependencies, nothing to install.

```bash
cd agentshelf

python3 run.py            # web UI at http://localhost:8000
python3 run.py --report   # same findings, straight to the terminal
```

Terminal output looks like this:

```
  AGENTSHELF - Striden Velocity Air 3
  ==========================================================
  Shelf score      25/100
  Won the query    0% of the time
  Recommended      50% of the time

  WHO THE AGENT PICKS INSTEAD
    Meridian Pace 2               50%  ##################################
    Kaze Flux Lite                50%  ##################################

  WHY WE LOST
  "I'm training for a half marathon in Singapore's humid weather..."
    We ranked #3 (46/100). Meridian Pace 2 won with 92/100.

  SILENT STRENGTHS - true about the shoe, missing from the page
    [ 3.0 pts] Long distance / half marathon
               add: Tuned for half marathon race pace and long runs up to 21.1km.
```

## How it is built

```
agentshelf/
├── run.py              stdlib HTTP server + JSON API + terminal report
├── engine/
│   ├── facets.py       the 12 things an agent looks for, and how it spots them in text
│   ├── catalog.py      hardcoded demo data: 5 products, 10 queries, 20 questions
│   ├── simulator.py    scoring, ranking, why-we-lost, coverage map, claim check
│   └── fixer.py        ranked fix list + the self-improving loop
└── web/                single-page UI, vanilla JS, no build step
```

### How the agent "reads" a page

There is no LLM in this prototype — the reading step is deterministic on purpose, so the
demo runs offline, instantly, and gives the same answer every time.

Each facet has two tiers of pattern:

- **strong** — the page states it outright, usually with a number
  (`half marathon`, `800km`, `wide fit`, `true to size`). Full credit.
- **weak** — the page only hints at it and the agent has to guess
  (`mesh`, `comfort`, `rubber`). **Half credit**, because a guessing agent picks someone else.
- **silent** — nothing at all. Zero.

A product's score for a question is `earned ÷ total_weight × 100`, where each facet's
weight is how much that particular shopper cares about it. Price is a hard filter: over
budget means excluded entirely, exactly as an assistant would.

This is genuinely computed, not hardcoded. Edit a `content` line in `catalog.py` and the
rankings move.

### Swapping in a real LLM

The seam is `simulator.score_product()`. Replace the pattern matching with a call to
Claude — pass the page text and the shopper question, ask for a score plus reasoning —
and every other function keeps working unchanged. `explain_loss`, `coverage`,
`suggest_fixes` and `optimisation_loop` all sit on top of it.

Suggested next step: `engine/agent.py` with a `PatternAgent` (what exists now) and a
`ClaudeAgent`, picked by env var. Demo falls back to `PatternAgent` when there's no API
key, so a dead conference wifi never kills the pitch.

## What's hardcoded (and what a real version would do)

| hardcoded now | real version |
| --- | --- |
| 5 products in `catalog.py` | upload a CSV / Shopify export |
| 10 shopper queries | LLM generates hundreds per category |
| 20 coverage questions | mined from real search logs and reviews |
| pattern matching as the agent | actual calls to Claude / ChatGPT / Perplexity |
| `truth` written by hand | pulled from the brand's PIM or spec sheets |
| one category, one city | any catalog, any market |

## Demo script (90 seconds)

1. Open on the **Scoreboard**. "This is a genuinely good shoe. Watch it lose."
   Point at rank #3.
2. Read one line from **Why we lost**: *"It's rated for 21.1km. The page never says so."*
3. Flip to **Coverage** — a wall of red. "Twenty questions a buyer asks. It answers two."
4. Hit **Run the loop**. Let the number climb 25 → 86 on screen. Say nothing.
5. Close on **Claim check**: "And here's what happens when everyone starts optimising
   for this. We built the check for that too."
