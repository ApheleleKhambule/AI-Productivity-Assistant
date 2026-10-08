# WorkMate – AI-Powered Workplace Productivity Assistant

**Author:** Aphelele Khambule · **Programme:** CAPACITI AI Skill Accelerator · Capstone project

WorkMate automates everyday workplace tasks with carefully engineered prompts and responsible-AI safeguards. It runs entirely in the browser: no build step, no server.

**Live site:** `https://YOUR-GITHUB-USERNAME.github.io/AI-Productivity-Assistant/` (replace after deploying)
**Assistant:** `/app.html` · **Slides:** `presentation/WorkMate-Presentation.pptx` · **Docs:** `docs/PROJECT_DOCUMENTATION.md`

## Features (brief requires 3; WorkMate has 5)

| # | Feature | What it does |
|---|---------|--------------|
| 1 | Smart Email Generator | Audience (client / manager / team) × tone (formal / informal / persuasive) × purpose |
| 2 | Meeting Notes Summarizer | Key points, decisions, action table (owner, deadline), open questions, unassigned-owner warning |
| 3 | AI Task Planner | Eisenhower prioritisation, time-blocked daily/weekly plan, overflow list, optimisation tips |
| 4 | AI Research Assistant | Summary, insights, recommendations, plain-language rewrite; research plan if only a topic is given |
| 5 | Chatbot | Multi-turn assistant; routes to the tools above; clarifying questions; refusal of unsafe requests |
| + | Prompt Lab | Shows each prompt's v1 → v3 evolution and the technique used |

## Two modes

- **Demo engine (default, no key):** transparent rule-based logic in `js/engine.js` (templates, regex, word-frequency summarisation). It is *not* an LLM and says so in the UI.
- **Live AI:** open **Settings**, choose Gemini / OpenAI / Claude, paste your own API key. Prompts from `js/prompts.js` are sent directly from your browser to the provider. The key is kept in `sessionStorage` (cleared when the tab closes).

## Project structure

```
index.html            Portfolio website
app.html              The assistant (tabs: Email, Meeting, Planner, Research, Chat, Prompt Lab)
css/style.css         Shared styles (responsive, accessible)
js/engine.js          Demo engine (pure functions, unit-tested)
js/prompts.js         Prompt library (R-C-T-F-C) + prompt evolution data
js/ai.js              Live provider connector (Gemini / OpenAI / Anthropic)
js/app.js             UI logic, markdown renderer, PII warning, validation checklists
tests/engine.test.js  Unit tests (node tests/engine.test.js)
docs/                 Project documentation (1–2 pages) and test log
presentation/         PowerPoint deck
```

## Run locally

Open `index.html` in a browser, or serve the folder: `python3 -m http.server 8000` then visit http://localhost:8000.
Run the tests: `node tests/engine.test.js` (Node 18+).

## Prompt engineering

All prompts follow **Role · Context · Task · Format · Constraints**, with extras where they help: a one-shot example (meetings), delimiters around user data, explicit "Not stated" fallbacks, low temperature for accuracy tasks (0.2) and higher for writing (0.6), and a "Check before use" line. See the Prompt Lab tab and `docs/PROJECT_DOCUMENTATION.md`.

## Responsible AI

- Every output is labelled AI-generated, with the engine/model that produced it.
- Validation checklist on every result; the human decides.
- PII scanner warns about IDs, card numbers, phones, emails, passwords before sending (and asks for confirmation in Live mode).
- Prompts forbid invented facts; missing data becomes `[PLACEHOLDER]` or "Not stated".
- Neutral, inclusive-language rule; bias and limitation reminders in the UI.
- No server, no analytics, no stored user content. Only a "minutes saved" counter is kept in `localStorage`.

## Limitations & going further

- Demo engine uses heuristics: it can misread unusual note formats. Always review.
- Browser-held API keys are suitable for personal use. For a shared product, call the provider from a server (e.g. a serverless function) so the key is never exposed, and add rate limiting.
- "Minutes saved" uses planning assumptions, not measured data; record real timings in `docs/TEST_LOG.md`.

## Deploy (GitHub Pages)

Repo → **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)` → Save.** The site appears at `https://<username>.github.io/<repo>/` after about a minute.

## Tools used

Claude (AI-assisted design, coding and prompt refinement), HTML/CSS/vanilla JavaScript, Playwright (browser testing), Node (unit tests), GitHub / GitHub Pages. Live mode supports Google Gemini, OpenAI and Anthropic models.
