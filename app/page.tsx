import Dashboard from "@/components/Dashboard";
import { BRAND_PRODUCT_ID, QUERIES, getProduct } from "@/lib/catalog";
import { optimisationLoop } from "@/lib/fixer";
import { coverage, explainLoss, runQuery, shelfReport, unbackedClaims } from "@/lib/simulator";
import type { QueryView } from "@/lib/types";

/**
 * The whole simulation is deterministic, in-memory and cheap, so we run it once
 * on the server and hand the finished numbers to the client. Switching queries
 * or replaying the fix loop then costs nothing -- no round trip mid-demo.
 *
 * The same functions are exposed over HTTP under /api/* for anyone who wants to
 * poke at the raw JSON.
 */
export default function Page() {
  const product = getProduct(BRAND_PRODUCT_ID);
  const report = shelfReport();

  const queries = QUERIES.map((q) => ({ id: q.id, text: q.text }));
  const views: Record<string, QueryView> = Object.fromEntries(
    QUERIES.map((q) => [q.id, { ranking: runQuery(q), explanation: explainLoss(q) }]),
  );

  const leader = report.share_of_voice[0];

  return (
    <>
      <header className="top">
        <div className="wrap">
          <div className="brandline">
            <span className="logo">AgentShelf</span>
            <span className="tagline">what AI assistants recommend instead of you</span>
          </div>
          <div className="subject">
            <h1>
              {product.name} &middot; S${product.price_sgd}
            </h1>
            <p className="muted">
              Running shoes &middot; Singapore &middot; tested against {QUERIES.length} real shopper
              questions
            </p>
          </div>
          <div className="stats">
            <div className="stat alarm">
              <div className="val">
                {report.shelf_score}
                <small>/100</small>
              </div>
              <div className="lbl">Shelf score across {QUERIES.length} questions</div>
            </div>
            <div className="stat alarm">
              <div className="val">{report.win_rate}%</div>
              <div className="lbl">Questions where we are the top pick</div>
            </div>
            <div className="stat">
              <div className="val">{report.recommend_rate}%</div>
              <div className="lbl">Questions where we get mentioned at all</div>
            </div>
            <div className="stat">
              <div className="val">{leader.name.split(" ")[0]}</div>
              <div className="lbl">Wins {leader.percent}% of this category</div>
            </div>
          </div>
        </div>
      </header>

      <Dashboard
        queries={queries}
        views={views}
        coverage={coverage()}
        loopHistory={optimisationLoop().history}
        flags={unbackedClaims()}
      />
    </>
  );
}
