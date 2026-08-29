"""Turning findings into a to-do list, ranked by what it is worth.

A brand does not need 40 suggestions. It needs to know which sentence to write
first. So every fix is priced in points recoverable across the whole set of
shopper questions, not just the one query in front of you.
"""

from . import catalog
from .facets import FACETS
from .simulator import read_page, run_query, shelf_report


def suggest_fixes(product_id=catalog.BRAND_PRODUCT_ID, patches=None):
    """Rank the missing sentences by how much they would win back."""
    product = catalog.get_product(product_id)
    reading = read_page(product, patches)

    suggestions = []
    for facet_id, evidence in product["truth"].items():
        seen = reading[facet_id]
        if seen["tier"] == "strong":
            continue  # already said clearly, nothing to recover

        recoverable = 0.0
        affected = []
        for query in catalog.QUERIES:
            weight = query["weights"].get(facet_id)
            if not weight:
                continue
            if query["max_price"] is not None and product["price_sgd"] > query["max_price"]:
                continue  # priced out of this question anyway
            gain = weight * (1.0 - seen["credit"])
            if gain > 0:
                recoverable += gain / sum(query["weights"].values()) * 100
                affected.append(query["text"])

        if recoverable == 0:
            continue

        suggestions.append({
            "facet": facet_id,
            "label": FACETS[facet_id]["label"],
            "current_state": "vague" if seen["tier"] == "weak" else "not mentioned at all",
            "line_to_add": evidence,
            "points_recoverable": round(recoverable),
            "queries_affected": affected,
        })

    suggestions.sort(key=lambda s: -s["points_recoverable"])
    return suggestions


def apply_fixes(facet_ids, product_id=catalog.BRAND_PRODUCT_ID):
    """Build the patch that adds those sentences to the page."""
    product = catalog.get_product(product_id)
    lines = [product["truth"][f] for f in facet_ids if f in product["truth"]]
    return {product_id: lines}


def optimisation_loop(product_id=catalog.BRAND_PRODUCT_ID, max_rounds=10):
    """Fix the single highest-value gap, re-run the whole shelf, repeat.

    This is the demo moment: the score climbs on its own, one sentence at a
    time, and every step names the sentence that moved it.
    """
    applied = []
    patches = {product_id: []}
    history = [{
        "round": 0,
        "added": None,
        "facet": None,
        **_snapshot(patches, product_id),
    }]

    for round_no in range(1, max_rounds + 1):
        suggestions = suggest_fixes(product_id, patches)
        if not suggestions:
            break

        best = suggestions[0]
        patches[product_id].append(best["line_to_add"])
        applied.append(best["facet"])
        history.append({
            "round": round_no,
            "added": best["line_to_add"],
            "facet": best["facet"],
            "label": best["label"],
            **_snapshot(patches, product_id),
        })

    return {
        "history": history,
        "final_page": catalog.get_product(product_id)["content"] + patches[product_id],
        "applied_facets": applied,
    }


def _snapshot(patches, product_id):
    report = shelf_report(patches, product_id)
    hero = run_query(catalog.QUERIES[0], patches)
    hero_result = next(r for r in hero["results"] if r["product_id"] == product_id)
    return {
        "shelf_score": report["shelf_score"],
        "win_rate": report["win_rate"],
        "recommend_rate": report["recommend_rate"],
        "hero_rank": hero_result["rank"],
        "hero_score": hero_result["score"],
    }
