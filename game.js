// @ts-check
/**
 * Aspire — Down the Wire
 * Single-player learning micro-game: prioritize under pressure using Impact vs Effort.
 *
 * Design notes:
 * - Scores (Impact, Risk, Effort) are clamped 0..5; baseline 2/2/2.
 * - Resources: Time (6), Focus (5), Goodwill (3), Momentum (0; earned from positive Impact deltas).
 * - 3 rounds, exactly 3 options per round (A/B/C), 2 intermissions with 2 upgrade choices each (pick at most 1).
 * - Escalation: in Round 3 if Focus < 2, an extra +1 Risk is applied after the choice (low focus = mistakes).
 */

/* ----------------------------- Types (JSDoc) ----------------------------- */
/**
 * @typedef {Object} Deltas
 * @property {number} impact
 * @property {number} risk
 * @property {number} effort
 * @property {number} time
 * @property {number} focus
 * @property {number} goodwill
 */
/**
 * @typedef {Object} Option
 * @property {string} label
 * @property {string} blurb         // short workplace-real description
 * @property {Deltas} deltas
 * @property {string} consequence   // 1–2 short paragraphs
 */
/**
 * @typedef {Object} Round
 * @property {string} stakes
 * @property {string} setup         // 2-sentence scenario
 * @property {[Option, Option, Option]} options
 */
/**
 * @typedef {Object} Upgrade
 * @property {string} id
 * @property {string} name
 * @property {string} desc
 * @property {number} cost          // momentum cost
 * @property {(state: GameState) => void} apply
 */
/**
 * @typedef {Object} PendingBuffs
 * @property {number} effortReduction // applied to next round's selected option
 * @property {number} riskReduction
 */
/**
 * @typedef {Object} GameState
 * @property {number} round           // 0..2 while playing
 * @property {number} time
 * @property {number} focus
 * @property {number} goodwill
 * @property {number} momentum
 * @property {number} impact
 * @property {number} risk
 * @property {number} effort
 * @property {PendingBuffs} buffs
 * @property {string[]} log
 */

/* ------------------------------- Content -------------------------------- */

/** @type {Round[]} */
const ROUNDS = [
  {
    stakes: "Round 1 · Low-Medium Stakes",
    setup:
      "It's 3pm Friday. Your manager asks you to tidy the team's weekly status report before Monday's leadership review — and you also have two prep tasks for your own project due Monday morning.",
    options: [
      {
        label: "Polish the status report end-to-end",
        blurb: "Rewrite the narrative, refresh charts, proofread.",
        deltas: { impact: +2, risk: -1, effort: +2, time: -2, focus: -2, goodwill: +1 },
        consequence:
          "Leadership notices the cleaner narrative on Monday. Your manager is grateful, but you head into the weekend with your own prep work still untouched.",
      },
      {
        label: "Quick pass + flag top 3 issues to your manager",
        blurb: "Skim the report, comment the gaps, suggest who can fix what.",
        deltas: { impact: +1, risk: -1, effort: +1, time: -1, focus: -1, goodwill: +1 },
        consequence:
          "You give your manager something actionable without taking it all on. The report still improves and you keep room for your own work — a balanced move.",
      },
      {
        label: "Decline politely and protect your prep time",
        blurb: "Reply: \"can't take this on, here's why\" — guard your roadmap.",
        deltas: { impact: 0, risk: +1, effort: -1, time: -1, focus: 0, goodwill: -1 },
        consequence:
          "Your own prep is solid Monday morning, but the status report goes up rough. Your manager remembers you said no — a small goodwill cost for a clear boundary.",
      },
    ],
  },
  {
    stakes: "Round 2 · Medium Stakes · Competing Priorities",
    setup:
      "Tuesday morning. Two senior PMs ping you within an hour: one needs data validation for a customer demo tomorrow; the other wants help shaping next quarter's roadmap. Your own deliverable is due Thursday.",
    options: [
      {
        label: "Validate the demo data first (urgent, clear scope)",
        blurb: "Tight, defined work that unblocks a customer-facing moment.",
        deltas: { impact: +1, risk: -1, effort: +1, time: -2, focus: -1, goodwill: +1 },
        consequence:
          "The demo lands well. The roadmap PM waits a day, but they understand — urgent customer work usually earns that grace.",
      },
      {
        label: "Draft a roadmap input doc (high visibility, fuzzier)",
        blurb: "Higher upside but ambiguous — could expand on you fast.",
        deltas: { impact: +2, risk: +1, effort: +2, time: -2, focus: -2, goodwill: +1 },
        consequence:
          "Your roadmap thinking gets noticed by leadership. The demo hits a snag the next day though, and you're now behind on your own Thursday deliverable.",
      },
      {
        label: "Reply with clarifying questions to both; protect your deliverable",
        blurb: "Ask for scope/timing before committing; keep your own work on track.",
        deltas: { impact: 0, risk: 0, effort: -1, time: -1, focus: 0, goodwill: 0 },
        consequence:
          "You buy yourself room to think. Neither PM gets immediate help, but you avoid overpromising — and your Thursday work stays on track.",
      },
    ],
  },
  {
    stakes: "Round 3 · High Stakes · Down to the Wire",
    setup:
      "Thursday 8pm. A live customer issue surfaces; leadership wants an options memo by 8am tomorrow. Your skip-level also expects a brief at 7am, and the picture is still ambiguous.",
    options: [
      {
        label: "Pull a late night to deliver a polished memo",
        blurb: "Full deck, multiple options, executive-ready.",
        deltas: { impact: +2, risk: +1, effort: +2, time: -3, focus: -3, goodwill: +1 },
        consequence:
          "You ship a strong memo, but you walk into the 7am brief running on fumes. Quality is high; sustainability is not.",
      },
      {
        label: "Send a 1-page draft with tradeoffs + propose a 9am sync",
        blurb: "Crisp framing, name the unknowns, ask for a decision live.",
        deltas: { impact: +2, risk: -1, effort: +1, time: -2, focus: -1, goodwill: +1 },
        consequence:
          "Leadership appreciates the clear framing of unknowns. The 9am sync converges quickly — high impact for moderate effort. This is what \"down to the wire\" looks like done well.",
      },
      {
        label: "Delegate parts to a peer; focus on the 7am skip-level brief",
        blurb: "Trade ownership for sleep — keep the most visible commitment.",
        deltas: { impact: +1, risk: 0, effort: 0, time: -1, focus: -1, goodwill: 0 },
        consequence:
          "Your skip-level brief is sharp. The memo is okay but uneven in places — partners notice the handoff seams.",
      },
    ],
  },
];

/* All upgrades; intermissions show a fixed pair (deterministic). */
/** @type {Upgrade[]} */
const ALL_UPGRADES = [
  {
    id: "automation",
    name: "Automation Shortcut",
    desc: "Templates + scripts buy you back time. Next round's Effort delta is reduced by 1 (min 0).",
    cost: 2,
    apply: (s) => { s.buffs.effortReduction += 1; },
  },
  {
    id: "deepwork",
    name: "Deep Work Block",
    desc: "Calendar a focused block right now. +1 Focus immediately.",
    cost: 1,
    apply: (s) => { s.focus = clamp(s.focus + 1, 0, 9); },
  },
  {
    id: "stakeholder",
    name: "Stakeholder Sync",
    desc: "Quick alignment call surfaces risks early. Next round's Risk delta is reduced by 1 (min 0).",
    cost: 2,
    apply: (s) => { s.buffs.riskReduction += 1; },
  },
];

/** Which two upgrades to show at each intermission (after round index 0 and 1). */
const INTERMISSION_OPTIONS = [
  ["automation", "deepwork"],
  ["stakeholder", "automation"],
];

/* ------------------------------- Engine -------------------------------- */

/** @returns {GameState} */
function freshState() {
  return {
    round: 0,
    time: 6, focus: 5, goodwill: 3, momentum: 0,
    impact: 2, risk: 2, effort: 2,
    buffs: { effortReduction: 0, riskReduction: 0 },
    log: [],
  };
}

/** @type {GameState} */
let state = freshState();

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/**
 * Apply an option's deltas + any pending buffs + Round 3 focus penalty.
 * Mutates state. Returns the effective deltas actually applied (for display).
 * @param {Option} opt
 * @returns {Deltas & { momentumGained: number, focusPenaltyApplied: boolean }}
 */
function applyChoice(opt) {
  const d = { ...opt.deltas };

  // Buffs: cap reductions to not flip a negative effort delta into a positive one, etc.
  if (state.buffs.effortReduction > 0 && d.effort > 0) {
    const cut = Math.min(state.buffs.effortReduction, d.effort);
    d.effort -= cut;
  }
  if (state.buffs.riskReduction > 0 && d.risk > 0) {
    const cut = Math.min(state.buffs.riskReduction, d.risk);
    d.risk -= cut;
  }
  // Buffs are one-shot per round
  state.buffs = { effortReduction: 0, riskReduction: 0 };

  // Round 3 escalation: low focus increases risk
  let focusPenaltyApplied = false;
  if (state.round === 2 && state.focus < 2) {
    d.risk += 1;
    focusPenaltyApplied = true;
  }

  // Score updates (clamped 0..5)
  state.impact = clamp(state.impact + d.impact, 0, 5);
  state.risk   = clamp(state.risk   + d.risk,   0, 5);
  state.effort = clamp(state.effort + d.effort, 0, 5);

  // Resources
  state.time     = clamp(state.time     + d.time,     0, 99);
  state.focus    = clamp(state.focus    + d.focus,    0, 9);
  state.goodwill = clamp(state.goodwill + d.goodwill, 0, 9);

  // Momentum: earned from positive Impact deltas
  const momentumGained = Math.max(0, d.impact);
  state.momentum += momentumGained;

  return { ...d, momentumGained, focusPenaltyApplied };
}

/* ------------------------------- Rendering ------------------------------ */

const $ = (sel) => /** @type {HTMLElement} */ (document.querySelector(sel));
const stage = $("#stage");
const roundLabel = $("#round-label");

function renderHUD() {
  setText("#r-time", state.time);
  setText("#r-focus", state.focus);
  setText("#r-goodwill", state.goodwill);
  setText("#r-momentum", state.momentum);
  setText("#v-impact", state.impact);
  setText("#v-risk", state.risk);
  setText("#v-effort", state.effort);
  setBar("#b-impact", state.impact);
  setBar("#b-risk", state.risk);
  setBar("#b-effort", state.effort);
}
function setText(sel, v) { const el = $(sel); if (el) el.textContent = String(v); }
function setBar(sel, v) { const el = $(sel); if (el) el.style.width = `${(v / 5) * 100}%`; }
function flashHUD() {
  document.querySelectorAll(".chip, .bar .track").forEach((n) => {
    n.classList.remove("flash"); void n.clientWidth; n.classList.add("flash");
  });
}

function renderStart() {
  roundLabel.textContent = "Welcome";
  stage.innerHTML = `
    <h2 style="margin:0 0 6px">Down to the Wire 🚦</h2>
    <p class="scenario">
      You're an Aspirer at Microsoft. Over the next 2–4 minutes, you'll face three escalating workplace moments where you must
      <b>prioritize under time pressure</b> — balancing Impact vs Effort while managing Risk and stakeholders.
    </p>
    <p class="scenario" style="color:var(--muted)">
      Pick A, B, or C each round. Between rounds, spend Momentum on one small upgrade. There are no shameful answers — only tradeoffs.
    </p>
    <div class="row">
      <button class="btn" id="start-btn">Start Round 1 →</button>
    </div>
  `;
  $("#start-btn").addEventListener("click", () => renderRound());
}

function renderRound() {
  const r = ROUNDS[state.round];
  roundLabel.textContent = r.stakes;
  const buffNote = (state.buffs.effortReduction || state.buffs.riskReduction)
    ? `<div class="delta neutral" style="margin-bottom:10px;display:inline-block">Active buff this round:
        ${state.buffs.effortReduction ? "Effort −1 " : ""}${state.buffs.riskReduction ? "Risk −1" : ""}</div>` : "";

  stage.innerHTML = `
    <span class="stakes">${r.stakes}</span>
    <p class="scenario">${r.setup}</p>
    ${buffNote}
    <div class="options">
      ${r.options.map((o, i) => `
        <button class="option" data-i="${i}">
          <span class="letter">${"ABC"[i]}</span>
          <b>${o.label}</b><br/>
          <span style="color:var(--muted)">${o.blurb}</span>
        </button>`).join("")}
    </div>
  `;
  stage.querySelectorAll(".option").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = Number(btn.getAttribute("data-i"));
      onChoose(i);
    });
  });
}

/** @param {number} i */
function onChoose(i) {
  const r = ROUNDS[state.round];
  const opt = r.options[i];
  const applied = applyChoice(opt);
  renderHUD(); flashHUD();
  renderConsequence(opt, applied);
}

/**
 * @param {Option} opt
 * @param {Deltas & { momentumGained:number, focusPenaltyApplied:boolean }} d
 */
function renderConsequence(opt, d) {
  const isLast = state.round === ROUNDS.length - 1;
  stage.innerHTML = `
    <span class="stakes">Consequence</span>
    <h3 style="margin:6px 0 8px">${opt.label}</h3>
    <div class="consequence">
      <p>${opt.consequence}</p>
      ${d.focusPenaltyApplied ? `<p style="color:var(--warn)">Low focus tonight → +1 Risk applied (mistakes creep in when you're spent).</p>` : ""}
      <div class="deltas">
        ${deltaPill("Impact", d.impact)}
        ${deltaPill("Risk", d.risk, true)}
        ${deltaPill("Effort", d.effort, true)}
        ${deltaPill("Time", d.time)}
        ${deltaPill("Focus", d.focus)}
        ${deltaPill("Goodwill", d.goodwill)}
        ${d.momentumGained ? `<span class="delta up">+${d.momentumGained} Momentum ⚡</span>` : ""}
      </div>
    </div>
    <div class="row">
      <button class="btn" id="next-btn">${isLast ? "See Results →" : "Next →"}</button>
    </div>
  `;
  $("#next-btn").addEventListener("click", () => {
    if (isLast) { renderEnd(); return; }
    state.round += 1;
    renderIntermission();
  });
}

/** Pill where some metrics treat positive as bad (Risk, Effort, Time spent). */
function deltaPill(label, n, positiveIsBad = false) {
  if (n === 0) return `<span class="delta neutral">${label} ±0</span>`;
  const goodUp = !positiveIsBad;
  const isGood = (n > 0 && goodUp) || (n < 0 && !goodUp);
  const cls = isGood ? "up" : "down";
  const sign = n > 0 ? "+" : "";
  return `<span class="delta ${cls}">${label} ${sign}${n}</span>`;
}

/* ------------------------------ Intermission ---------------------------- */

function renderIntermission() {
  const pairIds = INTERMISSION_OPTIONS[state.round - 1];
  const pair = pairIds.map((id) => /** @type {Upgrade} */ (ALL_UPGRADES.find((u) => u.id === id)));
  roundLabel.textContent = `Between rounds · ${state.momentum} ⚡ available`;

  stage.innerHTML = `
    <span class="stakes">Intermission · Spend Momentum (optional)</span>
    <p class="scenario">Pick up to one small upgrade before Round ${state.round + 1}. Choose Skip to bank Momentum.</p>
    <div class="upgrades">
      ${pair.map((u) => `
        <div class="upgrade">
          <h3>${u.name}</h3>
          <div class="cost">Cost: ${u.cost} ⚡  ·  You have ${state.momentum} ⚡</div>
          <p>${u.desc}</p>
          <button class="btn" data-id="${u.id}" ${state.momentum < u.cost ? "disabled" : ""}>Buy</button>
        </div>`).join("")}
    </div>
    <div class="row">
      <button class="btn secondary" id="skip-btn">Skip — start Round ${state.round + 1}</button>
    </div>
  `;

  stage.querySelectorAll(".upgrade .btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const u = ALL_UPGRADES.find((x) => x.id === id);
      if (!u || state.momentum < u.cost) return;
      state.momentum -= u.cost;
      u.apply(state);
      renderHUD(); flashHUD();
      renderRound();
    });
  });
  $("#skip-btn").addEventListener("click", () => renderRound());
}

/* --------------------------------- End --------------------------------- */

/** Final label rubric — documented here for transparency. */
function computeLabel() {
  const { impact, risk, effort, goodwill } = state;
  if (impact >= 4 && risk <= 2) return "High Impact Operator";
  if (risk >= 4)               return "Crisis Juggler";
  if (impact >= 3 && risk >= 3) return "Fast but Fragile";
  if (impact >= 3 && effort <= 3 && goodwill >= 3) return "Steady Ship";
  if (impact <= 2 && risk <= 2) return "Careful Builder";
  return "Steady Ship";
}

function strengthsAndGrowth() {
  /** @type {string[]} */ const strengths = [];
  /** @type {string[]} */ const growth = [];
  const { impact, risk, effort, focus, goodwill, momentum } = state;

  if (impact >= 4) strengths.push("You went after high-leverage work — leadership saw it.");
  if (risk <= 2) strengths.push("You kept risk in check by naming tradeoffs early.");
  if (goodwill >= 4) strengths.push("Stakeholders trust you more after this week.");
  if (effort <= 3 && impact >= 3) strengths.push("Strong leverage: meaningful impact without burning out.");
  if (momentum >= 3) strengths.push("You earned and managed Momentum well between rounds.");

  if (risk >= 4) growth.push("Slow down to surface unknowns earlier — a 1-page draft beats a polished guess.");
  if (effort >= 4) growth.push("Watch for over-investment; try delegating or scoping a smaller cut next time.");
  if (focus <= 1) growth.push("Protect a Deep Work block — fatigue silently raises risk.");
  if (goodwill <= 2) growth.push("Re-balance: a short async update keeps partners warm without big effort.");
  if (impact <= 2) growth.push("Aim for one visible, leadership-relevant move per week.");

  // Ensure exactly 2 of each (pad with general supportive tips)
  while (strengths.length < 2) strengths.push("You made deliberate choices instead of defaulting — that's the muscle.");
  while (growth.length < 2)    growth.push("Practice naming the tradeoff out loud before you commit.");
  return { strengths: strengths.slice(0, 2), growth: growth.slice(0, 2) };
}

const REFLECTIONS = [
  "Which choice today most reflects how you really show up under pressure?",
  "When you re-read your Round 3 pick, what did your future self thank you for — or wish you'd done differently?",
  "What's one ritual (e.g., a Deep Work block, a stakeholder sync) you could schedule this week?",
];

function renderEnd() {
  roundLabel.textContent = "Results";
  const label = computeLabel();
  const { strengths, growth } = strengthsAndGrowth();
  const reflect = REFLECTIONS[state.round % REFLECTIONS.length];

  stage.innerHTML = `
    <div class="end">
      <span class="stakes">Final Read</span>
      <h2>Nice run — you made it down the wire.</h2>
      <div class="label-badge">${label}</div>
      <div class="grid">
        <div class="card">
          <b>Final Scores</b>
          <ul>
            <li>Impact: <b>${state.impact}</b> / 5</li>
            <li>Risk: <b>${state.risk}</b> / 5</li>
            <li>Effort: <b>${state.effort}</b> / 5</li>
          </ul>
        </div>
        <div class="card">
          <b>Resources Remaining</b>
          <ul>
            <li>⏱ Time: <b>${state.time}</b></li>
            <li>🧠 Focus: <b>${state.focus}</b></li>
            <li>🤝 Goodwill: <b>${state.goodwill}</b></li>
            <li>⚡ Momentum: <b>${state.momentum}</b></li>
          </ul>
        </div>
        <div class="card">
          <b>What you did well</b>
          <ul>${strengths.map((s) => `<li>${s}</li>`).join("")}</ul>
        </div>
        <div class="card">
          <b>Grow next time</b>
          <ul>${growth.map((s) => `<li>${s}</li>`).join("")}</ul>
        </div>
      </div>
      <div class="reflect"><b>Reflection:</b> ${reflect}</div>
      <div class="row">
        <button class="btn" id="again-btn">Play Again ↻</button>
      </div>
    </div>
  `;
  $("#again-btn").addEventListener("click", () => {
    state = freshState();
    renderHUD();
    renderStart();
  });
}

/* ---------------------------- Keyboard input ---------------------------- */

document.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  if (["a", "b", "c"].includes(key)) {
    const idx = { a: 0, b: 1, c: 2 }[key];
    const btn = /** @type {HTMLButtonElement|null} */ (
      document.querySelector(`.option[data-i="${idx}"]`)
    );
    if (btn) btn.click();
  } else if (key === "enter") {
    const next = /** @type {HTMLButtonElement|null} */ (
      document.querySelector("#next-btn, #start-btn, #again-btn, #skip-btn")
    );
    if (next) next.click();
  }
});

/* --------------------------------- Boot --------------------------------- */
renderHUD();
renderStart();
