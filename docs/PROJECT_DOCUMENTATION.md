# WorkMate – Project Documentation

**Author:** Aphelele Khambule · **Programme:** CAPACITI AI Skill Accelerator Programme

## 1. Problem statement
Professionals spend a large share of their week on repetitive work: drafting similar emails, rewriting scrappy meeting notes, deciding what to do first, and digging through long documents. This work is slow, inconsistent under pressure, and error-prone: owners and deadlines get lost, and plans over-book the day. The challenge is to automate the routine parts while keeping a human responsible for correctness.

## 2. Solution overview
WorkMate is a browser-based assistant with five tools: **Smart Email Generator, Meeting Notes Summarizer, AI Task Planner, AI Research Assistant, Chatbot**. It has two engines behind one interface:

- **Demo engine**: a transparent, rule-based engine that works instantly without an API key (and is unit-tested).
- **Live AI**: the same interface calling a real LLM (Gemini, OpenAI or Claude) using the user's own key.

Flow: *Input → PII safety scan → Prompt builder (R-C-T-F-C) → Engine → Labelled output + validation checklist.*

## 3. Tools used
Claude (AI-assisted design, coding and prompt refinement); Google Gemini / OpenAI / Anthropic APIs (Live mode); HTML, CSS, vanilla JavaScript; Node and Playwright (testing); GitHub and GitHub Pages (version control and hosting).

## 4. Prompt strategy and samples
Every prompt uses **Role · Context · Task · Format · Constraints**. Techniques: role prompting, delimiters (`<notes>`), exact output schemas, a one-shot example, negative constraints ("never assign an owner not in the notes"), temperature tuning (0.2 meetings, 0.3 research, 0.4 planning, 0.6 email), and a "Check before use" line.

**Sample – Email (abridged)**
```
ROLE: You are an expert business-writing coach.
CONTEXT: Audience: client (Thabo). Tone: formal. Purpose: follow up. Key points: ... Reply-by: Friday.
TASK: Write one ready-to-send email that achieves the purpose for this audience.
FORMAT: Subject (≤ 9 words) / greeting / purpose sentence / body / one call to action / sign-off.
CONSTRAINTS: Formal = no contractions. Do not invent facts, numbers or deadlines.
             End with "Check before use: ..." listing what to verify.
```
**Sample – Meeting summary (abridged)**
```
ROLE: You are a meticulous executive assistant who writes meeting minutes.
CONTEXT: <notes> ... </notes>
FORMAT: ## Summary / ## Key points / ## Decisions made / ## Action items (# | Action | Owner | Deadline) / ## Open questions
CONSTRAINTS: Never assign an owner or deadline not in the notes: write "Not stated".
```
**Prompt iteration (meeting summary):** v1 "Summarise these notes" → loose paragraph, buried actions. v2 added headings → still guessed missing owners. v3 added the "Not stated" rule, a decision-vs-discussion rule, an example and low temperature → faithful to the notes, gaps flagged. All five prompts' v1→v3 history is in the **Prompt Lab** tab.

## 5. Responsible AI
Labelled AI output; validation checklists; PII scanner with confirmation before sending in Live mode; anti-fabrication rules; inclusive-language rule; honest statement of limits (demo engine is not an LLM; models can hallucinate and reflect bias); no server or stored user content; API key in session storage only.

## 6. Challenges and solutions
| Challenge | Solution |
|---|---|
| Summaries guess missing owners/deadlines | "Not stated" prompt rule; engine flags unassigned actions |
| Plans over-book the day | Capacity calculation, priority scheduling, "could not fit" list |
| Tasks with no priority wording were dropped to "low" | Unmarked tasks default to important; only explicit low-value wording demotes (found by unit tests) |
| API keys can't be hidden in a static site | Bring-your-own-key in session storage + no-key demo mode; server proxy recommended for production |
| Must work without a key or connection | Rule-based engine with 13 automated tests |

## 7. Impact
Planning assumptions (not measured): email 10→2 min, meeting minutes 20→8, daily plan 20→5, article brief 25→10. Measured timings from testing are recorded in `docs/TEST_LOG.md`.
