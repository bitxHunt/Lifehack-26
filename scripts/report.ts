/**
 * Terminal version of the demo, for a quick sanity check.
 *
 *   npm run report
 *
 * Same numbers the web UI shows, printed straight to stdout.
 */

import { QUERIES } from "../lib/catalog";
import { optimisationLoop } from "../lib/fixer";
import { coverage, explainLoss, shelfReport, unbackedClaims } from "../lib/simulator";

/** Render a number the way Python would, so this matches the original output. */
function num(value: number): string {
  return Number.isInteger(value) ? `${value}.0` : String(value);
}

function main() {
  const report = shelfReport();

  console.log(`\n  AGENTSHELF - ${report.product}\n  ${"=".repeat(58)}`);
  console.log(`  Shelf score      ${report.shelf_score}/100`);
  console.log(`  Won the query    ${report.win_rate}% of the time`);
  console.log(`  Recommended      ${report.recommend_rate}% of the time\n`);

  console.log("  WHO THE AGENT PICKS INSTEAD");
  for (const row of report.share_of_voice) {
    const bar = "#".repeat(row.percent);
    console.log(`    ${row.name.padEnd(28)} ${String(row.percent).padStart(3)}%  ${bar}`);
  }

  const hero = QUERIES[0];
  const explanation = explainLoss(hero);
  console.log(`\n  WHY WE LOST\n  "${explanation.query}"`);
  console.log(
    `    We ranked #${explanation.our_rank} (${explanation.our_score}/100). ` +
      `${explanation.winner_name} won with ${explanation.winner_score}/100.\n`,
  );

  console.log("  SILENT STRENGTHS - true about the shoe, missing from the page");
  for (const item of explanation.silent_strengths) {
    console.log(`    [${num(item.points_lost).padStart(4)} pts] ${item.label}`);
    console.log(`               add: ${item.fix}`);
  }

  if (explanation.real_gaps.length > 0) {
    console.log("\n  REAL GAPS - the shoe genuinely does not do this");
    for (const item of explanation.real_gaps) {
      console.log(`    [${num(item.points_lost).padStart(4)} pts] ${item.label}`);
    }
  }

  const cov = coverage();
  console.log(
    `\n  COVERAGE  ${cov.answered}/${cov.total} shopper questions answered (${cov.percent}%)`,
  );

  const loop = optimisationLoop();
  console.log("\n  SELF-FIXING LOOP");
  for (const step of loop.history) {
    const label = step.round === 0 ? "starting point" : step.label;
    console.log(
      `    round ${step.round}  shelf ${String(step.shelf_score).padStart(3)}/100  ` +
        `wins ${String(step.win_rate).padStart(3)}%  |  ${label}`,
    );
  }

  const flags = unbackedClaims();
  if (flags.length > 0) {
    console.log("\n  UNBACKED COMPETITOR CLAIMS");
    for (const flag of flags) {
      console.log(
        `    ${flag.product}: claims "${flag.label}", spec sheet does not back it`,
      );
    }
  }
  console.log();
}

main();
