const get = (path) => fetch(path).then((r) => r.json());
const el = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

// --- tabs ------------------------------------------------------------------

document.querySelectorAll(".tab").forEach((tab) => {
  tab.onclick = () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("is-active"));
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("is-active"));
    tab.classList.add("is-active");
    el("panel-" + tab.dataset.tab).classList.add("is-active");
  };
});

// --- header + query list ---------------------------------------------------

async function boot() {
  const data = await get("/api/report");
  const r = data.report;

  el("product-name").textContent = data.product.name + "  ·  S$" + data.product.price_sgd;

  el("stats").innerHTML = `
    <div class="stat alarm"><div class="val">${r.shelf_score}<small>/100</small></div>
      <div class="lbl">Shelf score across 10 questions</div></div>
    <div class="stat alarm"><div class="val">${r.win_rate}%</div>
      <div class="lbl">Questions where we are the top pick</div></div>
    <div class="stat"><div class="val">${r.recommend_rate}%</div>
      <div class="lbl">Questions where we get mentioned at all</div></div>
    <div class="stat"><div class="val">${r.share_of_voice[0].name.split(" ")[0]}</div>
      <div class="lbl">Wins ${r.share_of_voice[0].percent}% of this category</div></div>`;

  el("queries").innerHTML = data.queries
    .map((q, i) => `<button class="q${i === 0 ? " is-active" : ""}" data-q="${q.id}">${esc(q.text)}</button>`)
    .join("");

  document.querySelectorAll(".q").forEach((btn) => {
    btn.onclick = () => {
      document.querySelectorAll(".q").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      loadQuery(btn.dataset.q);
    };
  });

  loadQuery(data.queries[0].id);
  loadCoverage();
  loadTrust();
}

// --- scoreboard ------------------------------------------------------------

async function loadQuery(id) {
  const { ranking, explanation } = await get("/api/query/" + id);

  el("ranking").innerHTML = ranking.results
    .map((p) => {
      if (p.excluded) {
        return `<div class="row excluded${p.is_ours ? " ours" : ""}">
          <div class="row-head"><span class="rank">—</span>
            <span class="pname">${esc(p.name)}</span>
            <span class="price">S$${p.price_sgd}</span></div>
          <div class="tagline-sm">Ruled out: ${esc(p.exclusion_reason)}</div></div>`;
      }
      const top = p.breakdown.filter((b) => b.tier === "silent" && b.weight >= 2).map((b) => b.label);
      return `<div class="row${p.is_ours ? " ours" : ""}">
        <div class="row-head">
          <span class="rank">#${p.rank}</span>
          <span class="pname">${esc(p.name)}</span>
          ${p.recommended ? '<span class="badge">recommended</span>' : ""}
          <span class="price">S$${p.price_sgd}</span>
          <span class="score">${p.score}</span></div>
        <div class="bar"><span style="width:${p.score}%"></span></div>
        ${top.length ? `<div class="tagline-sm">page says nothing about: ${esc(top.join(", "))}</div>` : ""}
      </div>`;
    })
    .join("");

  const e = explanation;
  let html = `<p class="verdict">We ranked <strong>#${e.our_rank}</strong> with ${e.our_score}/100.
    ${esc(e.winner_name)} took the recommendation with ${e.winner_score}/100
    — ${e.beaten_by} points ahead of us.</p>`;

  if (e.silent_strengths.length) {
    html += `<div class="group-title">Silent strengths — true about the shoe, missing from the page</div>`;
    html += e.silent_strengths
      .map((g) => `<div class="gap">
        <div class="g-label">${esc(g.label)}</div>
        <div class="g-cost">cost us ${g.points_lost} points · page is ${g.our_tier === "silent" ? "silent" : "vague"}, theirs is explicit</div>
        <div class="g-fix">add: ${esc(g.fix)}</div></div>`)
      .join("");
  }

  if (e.real_gaps.length) {
    html += `<div class="group-title">Real gaps — the shoe genuinely does not do this</div>`;
    html += e.real_gaps
      .map((g) => `<div class="gap real">
        <div class="g-label">${esc(g.label)}</div>
        <div class="g-cost">cost us ${g.points_lost} points · no amount of copywriting fixes this</div></div>`)
      .join("");
  }

  if (!e.silent_strengths.length && !e.real_gaps.length) {
    html += `<p class="muted">Nothing lost here — we are already the top pick for this question.</p>`;
  }

  el("explanation").innerHTML = html;
}

// --- coverage --------------------------------------------------------------

async function loadCoverage() {
  const c = await get("/api/coverage");
  el("coverage-count").textContent = `${c.answered} of ${c.total} answered`;
  el("coverage").innerHTML = c.rows
    .map((row) => `<div class="cell ${row.status}">${esc(row.question)}
      ${row.recoverable ? '<span class="dot" title="already true, just not written down"></span>' : ""}</div>`)
    .join("");
}

// --- self-fixing loop ------------------------------------------------------

el("run-loop").onclick = async (ev) => {
  const button = ev.target;
  button.disabled = true;
  button.textContent = "Running…";
  el("loop").innerHTML = "";

  const { history } = await get("/api/loop");

  for (const step of history) {
    const prev = history[history.indexOf(step) - 1];
    const delta = prev ? step.shelf_score - prev.shelf_score : 0;
    const label = step.round === 0
      ? "<em>starting point — the page as it is today</em>"
      : `<em>added:</em> ${esc(step.added)}`;

    el("loop").insertAdjacentHTML("beforeend", `
      <div class="step">
        <div class="n">round ${step.round}</div>
        <div class="added">${label}</div>
        <div class="metric"><b>${step.shelf_score}</b>
          <small>shelf score ${delta > 0 ? `<span class="up">+${delta}</span>` : ""}</small></div>
        <div class="metric"><b>${step.win_rate}%</b><small>top pick</small></div>
      </div>`);

    await new Promise((done) => setTimeout(done, 600));
  }

  button.textContent = "Run again";
  button.disabled = false;
};

// --- claim check -----------------------------------------------------------

async function loadTrust() {
  const { flags } = await get("/api/trust");
  el("trust").innerHTML = flags.length
    ? flags
        .map((f) => `<div class="flag">
          <div class="who">${esc(f.product)} claims “${esc(f.label)}”</div>
          <div class="why">Matched on “${esc(f.matched)}” in the page copy, but nothing in their spec sheet supports it.</div>
        </div>`)
        .join("")
    : '<p class="muted">No unbacked claims found.</p>';
}

boot();
