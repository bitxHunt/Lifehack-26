"""The simulated shopping agent.

It reads product pages the way ChatGPT would -- text only, no spec sheet, no
photos, no brand loyalty -- scores each product against what the shopper asked
for, and picks a winner. Then it explains itself, which is the part brands can
actually act on.

Swapping this for a real LLM call later means replacing `score_product` and
keeping every other function as-is.
"""

from . import catalog
from .facets import FACETS, read_facet

TOP_N = 3  # an assistant usually names about three products


def page_text(product, patches=None):
    """The full text an agent would read, including any fixes applied so far."""
    lines = list(product["content"])
    if patches:
        lines += patches.get(product["id"], [])
    return "\n".join(lines)


def read_page(product, patches=None):
    """What the agent understands about every facet, from the page alone."""
    text = page_text(product, patches)
    return {
        facet_id: dict(zip(("credit", "tier", "matched"), read_facet(facet_id, text)))
        for facet_id in FACETS
    }


def score_product(product, query, patches=None):
    """Score one product against one shopper question."""
    if query["max_price"] is not None and product["price_sgd"] > query["max_price"]:
        return {
            "product_id": product["id"],
            "name": product["name"],
            "price_sgd": product["price_sgd"],
            "is_ours": product["is_ours"],
            "score": 0,
            "excluded": True,
            "exclusion_reason": f"S${product['price_sgd']} is over the shopper's S${query['max_price']} budget",
            "breakdown": [],
        }

    reading = read_page(product, patches)
    total_weight = sum(query["weights"].values())
    earned = 0.0
    breakdown = []

    for facet_id, weight in query["weights"].items():
        seen = reading[facet_id]
        points = weight * seen["credit"]
        earned += points
        breakdown.append({
            "facet": facet_id,
            "label": FACETS[facet_id]["label"],
            "weight": weight,
            "tier": seen["tier"],
            "points": round(points, 2),
            "max_points": weight,
        })

    breakdown.sort(key=lambda b: (-b["weight"], b["facet"]))

    return {
        "product_id": product["id"],
        "name": product["name"],
        "price_sgd": product["price_sgd"],
        "is_ours": product["is_ours"],
        "score": round(earned / total_weight * 100),
        "excluded": False,
        "exclusion_reason": None,
        "breakdown": breakdown,
    }


def run_query(query, patches=None):
    """Rank the whole shelf against one shopper question."""
    results = [score_product(p, query, patches) for p in catalog.PRODUCTS]
    results.sort(key=lambda r: (-r["score"], r["name"]))

    for position, result in enumerate(results, start=1):
        result["rank"] = position
        result["recommended"] = position <= TOP_N and not result["excluded"] and result["score"] > 0

    return {
        "query_id": query["id"],
        "query": query["text"],
        "max_price": query["max_price"],
        "results": results,
    }


# --- Why we lost -----------------------------------------------------------

def explain_loss(query, patches=None, product_id=catalog.BRAND_PRODUCT_ID):
    """Compare our product against the winner and say exactly what cost us.

    Every gap lands in one of two buckets:
      silent strength -- the shoe genuinely does this, the page never says so.
                         Fixable with a sentence.
      real gap        -- the shoe genuinely doesn't. Fixable only in the factory.
    """
    ranked = run_query(query, patches)
    ours = next(r for r in ranked["results"] if r["product_id"] == product_id)
    winner = ranked["results"][0]

    product = catalog.get_product(product_id)
    our_points = {b["facet"]: b for b in ours["breakdown"]}
    winner_points = {b["facet"]: b for b in winner["breakdown"]}

    silent_strengths, real_gaps = [], []

    for facet_id, weight in query["weights"].items():
        mine = our_points.get(facet_id, {}).get("points", 0)
        theirs = winner_points.get(facet_id, {}).get("points", 0)
        if theirs <= mine:
            continue

        entry = {
            "facet": facet_id,
            "label": FACETS[facet_id]["label"],
            "points_lost": round(theirs - mine, 2),
            "our_tier": our_points.get(facet_id, {}).get("tier", "silent"),
            "winner_tier": winner_points.get(facet_id, {}).get("tier", "silent"),
        }

        if facet_id in product["truth"]:
            entry["fix"] = product["truth"][facet_id]
            silent_strengths.append(entry)
        else:
            entry["fix"] = None
            real_gaps.append(entry)

    silent_strengths.sort(key=lambda e: -e["points_lost"])
    real_gaps.sort(key=lambda e: -e["points_lost"])

    return {
        "query": ranked["query"],
        "our_rank": ours["rank"],
        "our_score": ours["score"],
        "winner_name": winner["name"],
        "winner_score": winner["score"],
        "beaten_by": max(0, winner["score"] - ours["score"]),
        "silent_strengths": silent_strengths,
        "real_gaps": real_gaps,
    }


def unbacked_claims():
    """Competitors making strong claims their spec sheet does not support.

    Once brands start writing for agents, some will simply write whatever wins.
    This is the trust check: page says it, spec sheet doesn't back it.
    """
    flags = []
    for product in catalog.PRODUCTS:
        if product["is_ours"]:
            continue
        reading = read_page(product)
        for facet_id, seen in reading.items():
            if seen["tier"] == "strong" and facet_id not in product["truth"]:
                flags.append({
                    "product": product["name"],
                    "facet": facet_id,
                    "label": FACETS[facet_id]["label"],
                    "matched": seen["matched"],
                })
    return flags


# --- Coverage map ----------------------------------------------------------

def coverage(product_id=catalog.BRAND_PRODUCT_ID, patches=None):
    """Which shopper questions can this page answer at all?"""
    product = catalog.get_product(product_id)
    reading = read_page(product, patches)

    rows = []
    for question, needed in catalog.QUESTIONS:
        tiers = [reading[f]["tier"] for f in needed]
        if all(t == "strong" for t in tiers):
            status = "answered"
        elif all(t != "silent" for t in tiers):
            status = "vague"
        else:
            status = "silent"
        rows.append({
            "question": question,
            "facets": needed,
            "status": status,
            "recoverable": status != "answered" and all(
                reading[f]["tier"] == "strong" or f in product["truth"] for f in needed
            ),
        })

    answered = sum(1 for r in rows if r["status"] == "answered")
    return {
        "product": product["name"],
        "rows": rows,
        "answered": answered,
        "total": len(rows),
        "percent": round(answered / len(rows) * 100),
    }


# --- Whole-shelf report ----------------------------------------------------

def shelf_report(patches=None, product_id=catalog.BRAND_PRODUCT_ID):
    """Run every shopper question and summarise how we did across all of them."""
    runs = [run_query(q, patches) for q in catalog.QUERIES]

    ours = []
    for run in runs:
        result = next(r for r in run["results"] if r["product_id"] == product_id)
        ours.append({
            "query_id": run["query_id"],
            "query": run["query"],
            "rank": result["rank"],
            "score": result["score"],
            "recommended": result["recommended"],
            "excluded": result["excluded"],
            "winner": run["results"][0]["name"],
        })

    total = len(ours)
    wins = sum(1 for o in ours if o["rank"] == 1)
    recommended = sum(1 for o in ours if o["recommended"])

    # Share of voice: how often each brand takes the top slot.
    share = {}
    for run in runs:
        winner = run["results"][0]["name"]
        share[winner] = share.get(winner, 0) + 1
    share_of_voice = sorted(
        ({"name": k, "wins": v, "percent": round(v / total * 100)} for k, v in share.items()),
        key=lambda s: -s["wins"],
    )

    return {
        "product": catalog.get_product(product_id)["name"],
        "shelf_score": round(sum(o["score"] for o in ours) / total),
        "win_rate": round(wins / total * 100),
        "recommend_rate": round(recommended / total * 100),
        "queries": ours,
        "share_of_voice": share_of_voice,
    }
