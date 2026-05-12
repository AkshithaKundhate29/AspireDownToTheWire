# Aspire — Down the Wire

A 2–4 minute single-player learning micro-game for early-career professionals (Aspirers).
Practice prioritizing under time pressure using **Impact vs Effort** while managing **Risk** and **stakeholder goodwill**.

## Run locally

No build step. Pick one:

**Option A — open directly**
1. Double-click `index.html`.

**Option B — local static server (recommended for module scripts in some browsers)**
```powershell
# from the project folder
npx serve .
# or
python -m http.server 8000
```
Then open the URL it prints (e.g. `http://localhost:8000`).

## How to play

- Each round shows a workplace scenario and three options (A / B / C). Click a button or press the matching key.
- After each choice you'll see a workplace-real consequence and the deltas applied to your scores and resources.
- Between rounds, optionally spend **Momentum (⚡)** on **one** upgrade.
- After 3 rounds you'll see a result label, what you did well, where to grow, and a reflection question.

## Files

- `index.html` — markup + HUD.
- `styles.css` — visual styling.
- `game.js` — full game state, rounds, upgrades, rendering, scoring, end screen. JSDoc-typed.

## Scoring rubric (documented)

- `Impact / Risk / Effort` are clamped 0–5. Baseline `2 / 2 / 2`.
- Final label (`computeLabel` in `game.js`):
  - Impact ≥ 4 and Risk ≤ 2 → **High Impact Operator**
  - Risk ≥ 4 → **Crisis Juggler**
  - Impact ≥ 3 and Risk ≥ 3 → **Fast but Fragile**
  - Impact ≥ 3, Effort ≤ 3, Goodwill ≥ 3 → **Steady Ship**
  - Impact ≤ 2, Risk ≤ 2 → **Careful Builder**
  - Otherwise → **Steady Ship**
- Round 3 escalation: if Focus < 2 at the time of choosing, +1 Risk is added (low focus = mistakes).
- Momentum earned = positive Impact delta per choice.

## Per-task manual test steps

1. **Scaffold** — files exist, opening `index.html` shows the title and HUD with `Time 6 · Focus 5 · Goodwill 3 · Momentum 0`.
2. **Layout & HUD** — the three bars (Impact/Risk/Effort) all render at 40% width (value 2/5).
3. **Scoring engine** — pick Round 1 option A; verify Impact +2 → bar grows, Time goes 6→4, Focus 5→3, Goodwill 3→4, Momentum +2.
4. **Round flow** — consequence panel shows reasoning + delta pills, **Next** advances.
5. **Intermissions** — after Round 1, exactly 2 upgrade cards appear; if Momentum is too low the **Buy** button is disabled; **Skip** also works.
6. **Escalation** — drain focus low in Rounds 1–2; in Round 3 the consequence shows the "low focus → +1 Risk" warning.
7. **End screen** — final label, two strengths, two growth tips, reflection question, **Play Again** resets all state to baseline.
8. **Polish** — keyboard `A`/`B`/`C` chooses options, `Enter` advances Next/Start/Skip/Again.
