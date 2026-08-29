#!/usr/bin/env python3
"""AgentShelf prototype server.

    python3 run.py             # start the web UI on http://localhost:8000
    python3 run.py --report    # print the same findings straight to the terminal

Standard library only, so there is nothing to install.
"""

import argparse
import json
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from engine import catalog, fixer, simulator

WEB_DIR = Path(__file__).parent / "web"
CONTENT_TYPES = {".html": "text/html", ".js": "text/javascript", ".css": "text/css"}


def build_api(path):
    """Map a URL path to a JSON payload, or None if it is not an API route."""
    if path == "/api/report":
        return {
            "report": simulator.shelf_report(),
            "product": {
                "name": catalog.get_product(catalog.BRAND_PRODUCT_ID)["name"],
                "price_sgd": catalog.get_product(catalog.BRAND_PRODUCT_ID)["price_sgd"],
                "content": catalog.get_product(catalog.BRAND_PRODUCT_ID)["content"],
            },
            "queries": [{"id": q["id"], "text": q["text"]} for q in catalog.QUERIES],
        }

    if path.startswith("/api/query/"):
        query = catalog.get_query(path.rsplit("/", 1)[-1])
        return {
            "ranking": simulator.run_query(query),
            "explanation": simulator.explain_loss(query),
        }

    if path == "/api/coverage":
        return simulator.coverage()

    if path == "/api/fixes":
        return {"fixes": fixer.suggest_fixes()}

    if path == "/api/loop":
        return fixer.optimisation_loop()

    if path == "/api/trust":
        return {"flags": simulator.unbacked_claims()}

    return None


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = urlparse(self.path).path

        try:
            payload = build_api(path)
        except KeyError:
            return self.send_error(404, "Unknown id")

        if payload is not None:
            body = json.dumps(payload).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            return self.wfile.write(body)

        name = "index.html" if path == "/" else path.lstrip("/")
        target = (WEB_DIR / name).resolve()
        if not target.is_file() or WEB_DIR.resolve() not in target.parents:
            return self.send_error(404, "Not found")

        body = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", CONTENT_TYPES.get(target.suffix, "text/plain"))
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass  # keep the terminal clean during a demo


def print_report():
    """Terminal version of the demo, for a quick sanity check."""
    report = simulator.shelf_report()
    print(f"\n  AGENTSHELF - {report['product']}\n  {'=' * 58}")
    print(f"  Shelf score      {report['shelf_score']}/100")
    print(f"  Won the query    {report['win_rate']}% of the time")
    print(f"  Recommended      {report['recommend_rate']}% of the time\n")

    print("  WHO THE AGENT PICKS INSTEAD")
    for row in report["share_of_voice"]:
        bar = "#" * row["percent"]
        print(f"    {row['name']:<28} {row['percent']:>3}%  {bar}")

    hero = catalog.QUERIES[0]
    explanation = simulator.explain_loss(hero)
    print(f"\n  WHY WE LOST\n  \"{explanation['query']}\"")
    print(f"    We ranked #{explanation['our_rank']} ({explanation['our_score']}/100). "
          f"{explanation['winner_name']} won with {explanation['winner_score']}/100.\n")

    print("  SILENT STRENGTHS - true about the shoe, missing from the page")
    for item in explanation["silent_strengths"]:
        print(f"    [{item['points_lost']:>4} pts] {item['label']}")
        print(f"               add: {item['fix']}")

    if explanation["real_gaps"]:
        print("\n  REAL GAPS - the shoe genuinely does not do this")
        for item in explanation["real_gaps"]:
            print(f"    [{item['points_lost']:>4} pts] {item['label']}")

    cov = simulator.coverage()
    print(f"\n  COVERAGE  {cov['answered']}/{cov['total']} shopper questions answered "
          f"({cov['percent']}%)")

    loop = fixer.optimisation_loop()
    print("\n  SELF-FIXING LOOP")
    for step in loop["history"]:
        label = "starting point" if step["round"] == 0 else step["label"]
        print(f"    round {step['round']}  shelf {step['shelf_score']:>3}/100  "
              f"wins {step['win_rate']:>3}%  |  {label}")

    flags = simulator.unbacked_claims()
    if flags:
        print("\n  UNBACKED COMPETITOR CLAIMS")
        for flag in flags:
            print(f"    {flag['product']}: claims \"{flag['label']}\", spec sheet does not back it")
    print()


def main():
    parser = argparse.ArgumentParser(description="AgentShelf prototype")
    parser.add_argument("--report", action="store_true", help="print findings and exit")
    # Render (and most hosts) inject the port to listen on. Locally it is 8000.
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", 8000)))
    # Locally we stay on loopback; a host needs us reachable from outside.
    parser.add_argument("--host", default=os.environ.get("HOST", "127.0.0.1"))
    args = parser.parse_args()

    if args.report:
        return print_report()

    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"AgentShelf listening on {args.host}:{args.port}  (ctrl-c to stop)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped")
        sys.exit(0)


if __name__ == "__main__":
    main()
