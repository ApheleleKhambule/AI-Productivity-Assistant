/* WorkMate – Prompt library
 * Every prompt uses the same R-C-T-F-C structure:
 *   ROLE · CONTEXT · TASK · FORMAT · CONSTRAINTS
 * plus (where it helps) a few-shot EXAMPLE. Prompt versions v1 -> v3 are kept in
 * `lab` so the Prompt Lab tab can show how each prompt was refined and why.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Prompts = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SYSTEM = `You are "WorkMate", a careful workplace productivity assistant.
Rules that always apply:
1. ACCURACY: Use only information the user supplied. Never invent names, dates, figures, quotes or sources. If something is missing, write [PLACEHOLDER] or "Not stated".
2. CLARITY: Plain, professional English (South African spelling: organise, programme). Short sentences. No filler.
3. FAIRNESS: Neutral, inclusive wording. Do not make assumptions about a person's gender, race, age or ability.
4. PRIVACY: If the input contains passwords, ID numbers or bank details, do not repeat them; remind the user to remove them.
5. HUMAN IN THE LOOP: You draft; the human decides. End high-stakes outputs with one line starting "Check before use:" listing what the human should verify.`;

  const T = { email: 0.6, meeting: 0.2, planner: 0.4, research: 0.3, chat: 0.5 };

  function email(i) {
    return {
      temperature: T.email,
      user: `ROLE: You are an expert business-writing coach.

CONTEXT:
- Audience: ${i.audience} (${i.recipient || 'name not given'})
- Tone: ${i.tone}
- Purpose: ${i.purpose}
- Subject / topic: ${i.subject || 'not given'}
- Key points to include:
${i.details || '(none given)'}
- Reply-by date: ${i.deadline || 'none'}
- Sender: ${i.sender || '[Your name]'}
- Length: ${i.length === 'short' ? 'short (under 90 words)' : 'standard (120-180 words)'}

TASK: Write one ready-to-send email that achieves the purpose for this audience.

FORMAT:
Subject: <specific subject line under 9 words>
<greeting>
<opening sentence stating the purpose>
<body – short paragraphs or max 4 bullets>
<one clear call to action, with the date if given>
<sign-off + sender name>

CONSTRAINTS:
- Match the tone exactly: formal = no contractions; informal = friendly, contractions allowed; persuasive = lead with the benefit to the reader, one concrete reason to act, no pressure or exaggeration.
- Adapt vocabulary to the audience (client = relationship and value; manager = brevity, status and decisions needed; team = clarity and next steps).
- Do not invent facts, numbers, promises or deadlines.
- After the email add one line: "Check before use: ..." (facts, names, dates to verify).`,
    };
  }

  function meeting(i) {
    return {
      temperature: T.meeting,
      user: `ROLE: You are a meticulous executive assistant who writes meeting minutes.

CONTEXT: The raw notes below may be messy, informal or out of order.
<notes>
${i.notes}
</notes>

TASK: Turn the notes into concise, accurate minutes.

FORMAT (use exactly these headings):
## Summary  (max 3 sentences)
## Key points  (max 5 bullets)
## Decisions made  (bullets; each decision must be explicit in the notes)
## Action items  (table: # | Action | Owner | Deadline)
## Deadlines at a glance  (chronological list)
## Open questions / risks

CONSTRAINTS:
- Only list a decision if the notes clearly say it was agreed/decided. Otherwise put it under "Open questions".
- Never assign an owner or deadline that is not in the notes: write "Not stated" and flag it.
- Keep names exactly as written. Do not add information.
- If notes are too short or unclear, say what is missing instead of guessing.

EXAMPLE (input -> output, abridged):
Input: "Ops sync. Thandi will send the invoice list by Fri. We agreed to pause the Cape Town route. Not sure about overtime?"
Output: ## Summary ... ## Decisions made - Pause the Cape Town route. ## Action items | 1 | Send invoice list | Thandi | Friday | ## Open questions - Overtime approach unresolved.`,
    };
  }

  function planner(i) {
    return {
      temperature: T.planner,
      user: `ROLE: You are a productivity coach who uses the Eisenhower matrix and time-blocking.

CONTEXT:
- Planning mode: ${i.mode === 'weekly' ? 'weekly (Mon–Fri)' : 'single day'}
- Working hours: ${i.start || '08:00'} to ${i.end || '16:30'}; lunch 12:30–13:00 ${i.lunch === false ? '(ignore lunch)' : ''}
- Buffer between tasks: ${i.breakMins == null ? 10 : i.breakMins} minutes
- Tasks (one per line, with any duration/priority hints):
${i.tasks}

TASK: Create a realistic, prioritised plan.

FORMAT:
1. A table of tasks: Task | Urgent? | Important? | Quadrant (Q1–Q4)
2. A time-blocked schedule table: Time | Task | Why here
3. "Could not fit" list, if any
4. Three specific time-optimisation tips based on THESE tasks

CONSTRAINTS:
- Never schedule more work than the available hours. If it does not fit, say so and propose what to delegate, shorten or move.
- Put hard, important work (Q1/Q2) in the first part of the day; batch low-value tasks.
- If no duration is given, assume 45 minutes and state that assumption.
- Do not invent tasks or deadlines.`,
    };
  }

  function research(i) {
    const hasText = i.text && i.text.trim().split(/\s+/).length >= 40;
    return {
      temperature: T.research,
      user: `ROLE: You are a careful research analyst who explains complex material simply.

CONTEXT:
- Topic / question: ${i.topic || '(derive from the text)'}
- Reading level wanted: ${i.level === 'expert' ? 'professional' : 'plain language (Grade 8)'}
${hasText ? `- Source text:\n<text>\n${i.text}\n</text>` : '- No source text supplied: answer from general knowledge ONLY and say so clearly.'}

TASK: Produce a quick-understanding brief.

FORMAT:
## In one line
## Summary  (max 5 sentences)
## Key insights  (3–5 bullets, each tied to the text or a labelled general-knowledge claim)
## Recommendations / next steps  (3 bullets)
## In plain language  (explain as if to a smart colleague outside this field)
## Confidence & what to verify  (High / Medium / Low + 2–3 specific checks)

CONSTRAINTS:
- Separate FACTS (stated in the text) from INFERENCES (your reasoning) – label inferences.
- Do not fabricate citations, statistics, quotes or URLs. If you are unsure, say "I am not sure".
- If the topic is time-sensitive, warn that information may be out of date.`,
    };
  }

  const CHAT_SYSTEM = SYSTEM + `
You are chatting with a busy professional. You can: draft emails, summarise meeting notes, plan days/weeks, and explain or research topics.
- If the request is vague, ask ONE short clarifying question before producing long output.
- Keep replies under 200 words unless the user pastes material to process.
- If asked for something outside workplace productivity or unsafe/unethical (e.g. deceiving someone, discriminating, writing fake references), politely decline and offer a safe alternative.
- Remember the conversation so far and stay consistent with earlier choices (tone, names, dates).`;

  function build(feature, inputs) {
    const fn = { email, meeting, planner, research }[feature];
    const p = fn(inputs);
    return { system: SYSTEM, user: p.user, temperature: p.temperature };
  }

  /* Prompt Lab: how each prompt evolved. Observations describe the INTENDED effect of each change;
   * record your own real test results in docs/TEST_LOG.md. */
  const lab = [
    {
      feature: 'Smart Email Generator',
      versions: [
        { v: 'v1 – naive', prompt: 'Write an email to my client about the delay.', problem: 'No tone, audience or length control; output varies wildly and often invents reasons for the delay.' },
        { v: 'v2 – add role & format', prompt: 'You are a business writing expert. Write a formal email to a client about the delay. Include subject, greeting, body, sign-off.', problem: 'Better structure, but still may invent facts, and tone drifts on long outputs.' },
        { v: 'v3 – final (R-C-T-F-C)', prompt: 'ROLE + CONTEXT (audience, tone, purpose, key points, reply-by date, length) + TASK + FORMAT (subject ≤ 9 words, one call to action) + CONSTRAINTS (tone rules, no invented facts, "Check before use" line).', problem: 'Consistent structure, controlled tone, and a built-in human-verification step.' },
      ],
      techniques: ['Role prompting', 'Structured context block', 'Output format specification', 'Negative constraints (no invented facts)', 'Self-check line for human review'],
    },
    {
      feature: 'Meeting Notes Summarizer',
      versions: [
        { v: 'v1 – naive', prompt: 'Summarise these meeting notes.', problem: 'Returns a paragraph; action items and owners are buried or invented.' },
        { v: 'v2 – add headings', prompt: 'Summarise the notes under: Summary, Decisions, Action items with owner and deadline.', problem: 'Fills missing owners/deadlines with guesses ("hallucinated" accountability).' },
        { v: 'v3 – final', prompt: 'Role + exact headings + rule "Never assign an owner/deadline not in the notes – write Not stated" + decision-vs-discussion rule + a one-shot example + low temperature (0.2).', problem: 'More faithful to the notes, flags gaps instead of hiding them.' },
      ],
      techniques: ['Few-shot (one-shot) example', 'Explicit "Not stated" fallback', 'Low temperature for accuracy', 'Delimiters (<notes>) to separate data from instructions'],
    },
    {
      feature: 'AI Task Planner',
      versions: [
        { v: 'v1 – naive', prompt: 'Make me a schedule for these tasks.', problem: 'Over-books the day; no prioritisation logic.' },
        { v: 'v2 – add method', prompt: 'Prioritise with the Eisenhower matrix then make a schedule.', problem: 'Good logic but ignores working hours and breaks.' },
        { v: 'v3 – final', prompt: 'Method (Eisenhower + time-blocking) + working hours, lunch & buffer as context + rule "never schedule more than available hours" + assumptions stated + tips tied to these tasks.', problem: 'Realistic plans that admit when work does not fit.' },
      ],
      techniques: ['Framework prompting (Eisenhower matrix)', 'Constraint injection (hours, buffers)', 'Assumption disclosure', 'Personalised, not generic, tips'],
    },
    {
      feature: 'AI Research Assistant',
      versions: [
        { v: 'v1 – naive', prompt: 'Summarise this article / tell me about X.', problem: 'Mixes facts with opinion; may invent statistics or citations.' },
        { v: 'v2 – structure', prompt: 'Give a summary, key insights and recommendations.', problem: 'Clearer, but no signal of how reliable each claim is.' },
        { v: 'v3 – final', prompt: 'Role + reading level + source delimiters + "label facts vs inferences" + "no fabricated citations" + Confidence & what-to-verify section.', problem: 'Output is easier to trust and to check.' },
      ],
      techniques: ['Fact vs inference separation', 'Reading-level control (simplification)', 'Hallucination guardrail', 'Confidence calibration'],
    },
    {
      feature: 'Chatbot',
      versions: [
        { v: 'v1 – naive', prompt: 'You are a helpful assistant.', problem: 'Wanders off-topic; long replies; no safety behaviour.' },
        { v: 'v2 – persona', prompt: 'You are WorkMate, a workplace assistant. Be concise.', problem: 'On-topic, but over-confident when information is missing.' },
        { v: 'v3 – final', prompt: 'Persona + shared global rules + "ask ONE clarifying question when vague" + length cap + refusal policy + conversation memory instruction.', problem: 'Feels like a real assistant: asks, stays concise, and declines unsafe requests.' },
      ],
      techniques: ['System prompt persona', 'Clarifying-question policy', 'Refusal & safe-alternative behaviour', 'Multi-turn memory (history sent each call)'],
    },
  ];

  return { SYSTEM, CHAT_SYSTEM, build, lab, TEMPERATURE: T };
});
