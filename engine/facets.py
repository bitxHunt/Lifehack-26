"""What a shopping agent actually looks for, and how it spots it in text.

A "facet" is one dimension of shopper intent -- humidity tolerance, price,
wide fit, and so on. The agent never sees a product's real specs. It only
reads the words on the page, so every facet needs patterns that decide
whether the page *talks about* that facet at all.

Two tiers on purpose:
  strong -> the page says it outright, with a number or a claim.
            The agent is confident and gives full credit.
  weak   -> the page hints at it and the agent has to guess.
            Half credit, because a guessing agent picks someone else.
"""

import re

STRONG_CREDIT = 1.0
WEAK_CREDIT = 0.5

FACETS = {
    "humidity": {
        "label": "Humid / tropical climate",
        "strong": [r"humid", r"tropical", r"sweat[- ]?wick", r"heat and moisture"],
        "weak": [r"breathab", r"ventilat", r"airflow", r"\bmesh\b"],
    },
    "lightweight": {
        "label": "Lightweight",
        "strong": [r"\b\d{2,3}\s?g\b", r"lightweight", r"ultra[- ]?light"],
        "weak": [r"\blight\b", r"minimal"],
    },
    "long_distance": {
        "label": "Long distance / half marathon",
        "strong": [r"half marathon", r"marathon", r"long run", r"21\.?1\s?km", r"long[- ]distance"],
        "weak": [r"endurance", r"distance", r"\b10\s?k\b"],
    },
    "cushioning": {
        "label": "Cushioning",
        "strong": [r"cushion", r"\d{1,2}\s?mm stack", r"stack height", r"plush"],
        "weak": [r"\bsoft\b", r"comfort"],
    },
    "wet_grip": {
        "label": "Grip on wet roads",
        "strong": [r"wet grip", r"wet road", r"wet pavement", r"monsoon", r"slip[- ]resist", r"\brain\b"],
        "weak": [r"traction", r"\bgrip\b", r"outsole"],
    },
    "wide_feet": {
        "label": "Wide feet",
        "strong": [r"wide fit", r"wide feet", r"\b2e\b", r"wide toe box"],
        "weak": [r"roomy", r"toe box"],
    },
    "durability": {
        "label": "Durability / mileage",
        "strong": [r"\b\d{3,4}\s?km\b", r"durab", r"mileage", r"lasts \d+"],
        "weak": [r"hard[- ]wearing", r"tough", r"rubber"],
    },
    "sizing": {
        "label": "Sizing guidance",
        "strong": [r"true to size", r"size up", r"sizing guide", r"runs (small|large)"],
        "weak": [r"\bfit\b", r"\bsizes?\b"],
    },
    "returns": {
        "label": "Returns / exchange",
        "strong": [r"free return", r"\d+[- ]day return", r"exchange policy", r"free exchange"],
        "weak": [r"\breturns?\b", r"warranty"],
    },
    "sustainability": {
        "label": "Sustainability",
        "strong": [r"recycled", r"bluesign", r"sustainab", r"plant[- ]based", r"carbon"],
        "weak": [r"\beco\b", r"\bgreen\b", r"responsib"],
    },
    "local_availability": {
        "label": "Available in Singapore",
        "strong": [r"singapore", r"\bsg\b", r"next[- ]day delivery", r"orchard", r"in stock"],
        "weak": [r"fast delivery", r"ships", r"\bstores?\b"],
    },
    "price_clarity": {
        "label": "Price stated up front",
        "strong": [r"s\$\s?\d+", r"\$\s?\d+"],
        "weak": [r"affordable", r"value for money", r"budget"],
    },
}


def _matches(patterns, text):
    for p in patterns:
        if re.search(p, text, re.IGNORECASE):
            return p
    return None


def read_facet(facet_id, text):
    """How well does this text address one facet, as far as an agent can tell?

    Returns (credit, tier, matched_pattern). Credit is 0.0 when the page is
    silent -- the agent has nothing to go on and will move to the next product.
    """
    facet = FACETS[facet_id]

    hit = _matches(facet["strong"], text)
    if hit:
        return STRONG_CREDIT, "strong", hit

    hit = _matches(facet["weak"], text)
    if hit:
        return WEAK_CREDIT, "weak", hit

    return 0.0, "silent", None
