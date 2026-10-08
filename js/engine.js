/* WorkMate – Demo Engine
 * A transparent, rule-based engine so the app works with NO API key.
 * It is deliberately simple (templates + keyword/frequency heuristics) and is
 * NOT an LLM. Live AI mode (see ai.js) replaces it with real model output.
 * Every function returns { md, plain? } – markdown for display, optional plain text for copying.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Engine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- shared helpers ---------- */
  const STOP = new Set(('a an the and or but if then else of to in on at by for with from as is are was were be been being ' +
    'this that these those it its we you they he she i our your their his her not no so do does did have has had will would ' +
    'can could should may might must shall about into over after before than also just very more most some any each other ' +
    'such there here which who whom what when where why how').split(' '));
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const stripBullet = (l) => l.replace(/^\s*(?:[-*•–]|\d+[.)])\s+/, '').trim();

  function sentences(text) {
    return String(text || '')
      .split(/\n+/)
      .map(stripBullet)
      .filter(Boolean)
      .flatMap((l) => l.split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])/))
      .map(clean)
      .filter(Boolean);
  }
  function words(s) {
    return (s.toLowerCase().match(/[a-z][a-z'-]{2,}/g) || []).filter((w) => !STOP.has(w));
  }
  function freq(ss) {
    const f = {};
    ss.forEach((s) => words(s).forEach((w) => (f[w] = (f[w] || 0) + 1)));
    return f;
  }
  function scoreSentence(s, f, i) {
    const w = words(s);
    if (!w.length) return 0;
    let sc = w.reduce((a, x) => a + (f[x] || 0), 0) / Math.sqrt(w.length);
    if (/\d/.test(s)) sc *= 1.15;
    if (i < 2) sc *= 1.2;
    return sc;
  }
  function topN(ss, n, exclude) {
    exclude = exclude || new Set();
    const f = freq(ss);
    return ss
      .map((s, i) => ({ s, i, sc: scoreSentence(s, f, i) }))
      .filter((o) => !exclude.has(o.s) && o.s.length > 20)
      .sort((a, b) => b.sc - a.sc)
      .slice(0, n)
      .sort((a, b) => a.i - b.i)
      .map((o) => o.s);
  }
  function topKeywords(text, n) {
    const f = {};
    words(text).forEach((w) => (f[w] = (f[w] || 0) + 1));
    return Object.entries(f).sort((a, b) => b[1] - a[1]).slice(0, n).map((e) => e[0]);
  }
  const bullets = (arr) => arr.map((x) => '- ' + x).join('\n');

  /* ---------- 1. Smart Email Generator ---------- */
  const OPEN = {
    formal: {
      followup: 'I am writing to follow up on {t}.',
      request: 'I am writing to request your assistance with {t}.',
      update: 'I would like to provide an update on {t}.',
      meeting: 'I would like to arrange a meeting to discuss {t}.',
      apology: 'Please accept my sincere apologies regarding {t}.',
      intro: 'I would like to introduce myself and discuss {t}.',
      thanks: 'Thank you for your support with {t}.',
    },
    informal: {
      followup: 'Just following up on {t}.',
      request: 'Could you help me out with {t}?',
      update: 'Quick update on {t}.',
      meeting: 'Can we grab some time to chat about {t}?',
      apology: 'Sorry about {t} – I want to put it right.',
      intro: 'Hope you are well! I wanted to reach out about {t}.',
      thanks: 'Thanks so much for helping with {t}!',
    },
    persuasive: {
      followup: 'I wanted to revisit {t}, because the timing could work very well in your favour.',
      request: 'I would value your support on {t} – I believe it will pay off for everyone involved.',
      update: 'Here is where {t} stands, and why it is worth backing.',
      meeting: 'I would like to propose a short conversation about {t}, as it could unlock real value.',
      apology: 'I apologise for {t}, and I would like to show you how we are making it right.',
      intro: 'I would like to introduce an opportunity around {t} that I think you will find valuable.',
      thanks: 'Thank you for {t} – your support is making a measurable difference.',
    },
  };
  const SUBJECT = {
    followup: 'Following up: {t}', request: 'Request: {t}', update: 'Update: {t}', meeting: 'Meeting request: {t}',
    apology: 'Apology regarding {t}', intro: 'Introduction: {t}', thanks: 'Thank you: {t}',
  };
  const AUD_LINE = {
    client: 'We value our working relationship and want to make this as smooth as possible for you.',
    manager: 'I wanted to keep you informed so that you can guide priorities where needed.',
    team: 'Sharing this so that we are all aligned.',
  };
  const BENEFIT = {
    client: 'Acting on this will help us deliver better results for your business.',
    manager: 'Acting on this will protect our timelines and deliver a stronger outcome for the team.',
    team: 'If we align on this now, we will all save time later.',
  };
  const CLOSE = { formal: 'Kind regards,', informal: 'Thanks,', persuasive: 'Warm regards,' };

  function email(o) {
    const tone = OPEN[o.tone] ? o.tone : 'formal';
    const aud = AUD_LINE[o.audience] ? o.audience : 'client';
    const purpose = OPEN.formal[o.purpose] ? o.purpose : 'followup';
    const name = clean(o.recipient);
    const me = clean(o.sender) || '[Your name]';
    const topic = clean(o.subject) || '[topic]';
    const lines = String(o.details || '').split(/\n+/).map(stripBullet).filter(Boolean);

    let greet;
    if (aud === 'team' && !name) greet = tone === 'informal' ? 'Hi team,' : 'Dear colleagues,';
    else greet = (tone === 'informal' ? 'Hi ' : 'Dear ') + (name || '[Name]') + ',';

    const parts = [greet, '', OPEN[tone][purpose].replace('{t}', topic)];
    if (o.length !== 'short') parts.push(AUD_LINE[aud]);
    if (lines.length === 1) parts.push('', cap(lines[0]).replace(/([^.!?])$/, '$1.'));
    else if (lines.length > 1) parts.push('', 'Key points:', bullets(lines.map(cap)));
    if (tone === 'persuasive' && o.length !== 'short') parts.push('', BENEFIT[aud]);

    const dl = clean(o.deadline);
    const cta = {
      formal: dl ? `I would appreciate your response by ${dl}.` : 'I would appreciate your response at your earliest convenience.',
      informal: dl ? `Let me know by ${dl} if that works?` : 'Let me know what you think?',
      persuasive: dl ? `To make the most of this, could we confirm by ${dl}?` : 'Could we confirm next steps this week?',
    }[tone];
    parts.push('', cta, '', CLOSE[tone], me);

    const subject = SUBJECT[purpose].replace('{t}', topic);
    const plain = 'Subject: ' + subject + '\n\n' + parts.join('\n');
    return { md: '**Subject:** ' + subject + '\n\n' + parts.join('\n\n').replace(/\n\n- /g, '\n- ').replace(/\n\n\n/g, '\n\n'), plain };
  }

  /* ---------- 2. Meeting Notes Summarizer ---------- */
  const MONTH = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
  const DATE_RE = new RegExp(
    '\\b((?:next |this )?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|tomorrow|today|' +
      'end of (?:the )?(?:day|week|month|quarter|year)|eod|eow|cob|next week|next month|' +
      '\\d{1,2}(?:st|nd|rd|th)?\\s+(?:of\\s+)?' + MONTH + '(?:\\s+\\d{4})?|' + MONTH + '\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+\\d{4})?|' +
      '\\d{4}-\\d{2}-\\d{2}|\\d{1,2}\\/\\d{1,2}(?:\\/\\d{2,4})?)\\b', 'i');
  const NOT_NAMES = new Set(['The', 'We', 'Team', 'Everyone', 'All', 'This', 'That', 'It', 'They', 'Action', 'Please', 'Meeting', 'Decision', 'Next', 'Also', 'Then', 'And', 'But', 'Agenda', 'Someone', 'Somebody', 'Anyone', 'Nobody', 'Who']);

  function findOwner(s) {
    let m = s.match(/^(?:action(?: item)?s?\s*[:\-]\s*)?([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+(?:will|to|needs? to|must|should|is going to|has to|agreed to|volunteered to|is responsible)/);
    if (m && !NOT_NAMES.has(m[1].split(' ')[0])) return m[1];
    m = s.match(/(?:assigned to|owner\s*[:\-]|responsible\s*[:\-]?)\s*([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/);
    if (m) return m[1];
    m = s.match(/([A-Z][a-z]+)\s+(?:is )?responsible/);
    if (m && !NOT_NAMES.has(m[1])) return m[1];
    if (/^(?:we|everyone|all|team)\b/i.test(s)) return 'Team';
    return 'Unassigned';
  }

  function meeting(o) {
    const raw = String(o.notes || '');
    const lines = raw.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    let title = 'Meeting summary', date = '', attendees = '';
    const body = [];
    lines.forEach((l, i) => {
      let m;
      if ((m = l.match(/^(?:attendees|present|participants)\s*:\s*(.+)/i))) attendees = clean(m[1]);
      else if ((m = l.match(/^date\s*:\s*(.+)/i))) date = clean(m[1]);
      else if ((m = l.match(/^(?:title|subject|meeting)\s*:\s*(.+)/i))) title = clean(m[1]);
      else if (i === 0 && l.length < 80 && !/[.!?]$/.test(l) && !/\b(will|agreed|decided)\b/i.test(l)) title = l;
      else body.push(l);
    });
    const ss = sentences(body.join('\n'));
    const decisions = [], actions = [], questions = [], used = new Set();

    ss.forEach((s) => {
      const isDecision = /\b(decided|agreed|approved|resolved|confirmed|signed off|will go with|concluded)\b/i.test(s);
      const nameTo = /^[A-Z][a-z]+(?:\s[A-Z][a-z]+)?\s+to\s+[a-z]+/.test(s) && findOwner(s) !== 'Unassigned';
      const isAction = nameTo || /\b(will|needs? to|must|should|to be (?:done|completed|sent)|action(?: item)?s?\s*[:\-]|todo|to-do|follow[- ]?up|assigned|responsible|take (?:the )?lead|owner)\b/i.test(s);
      const strongAction = nameTo || /\b(will|needs? to|must|should|action(?: item)?s?\s*[:\-]|assigned|responsible|to-?do)\b/i.test(s);
      if (/\?$/.test(s)) { questions.push(s); used.add(s); return; }
      if (isDecision && !(isAction && strongAction && findOwner(s) !== 'Unassigned' && !/\b(agreed|decided|approved|resolved)\b/i.test(s))) {
        decisions.push(s); used.add(s);
        if (isAction && strongAction && /\bwill\b/i.test(s) && findOwner(s) !== 'Unassigned') {
          const dm = s.match(DATE_RE);
          actions.push({ task: s, owner: findOwner(s), deadline: dm ? dm[1] : '—' });
        }
        return;
      }
      if (isAction) {
        const dm = s.match(DATE_RE);
        actions.push({ task: s.replace(/^action(?: item)?s?\s*[:\-]\s*/i, ''), owner: findOwner(s), deadline: dm ? dm[1] : '—' });
        used.add(s);
      }
    });

    const keyPoints = topN(ss, 4, used);
    const tldr = topN(ss, 2).join(' ') || 'Not enough text to summarise.';
    const deadlines = actions.filter((a) => a.deadline !== '—');

    const out = [];
    out.push('## ' + title);
    const meta = [date && '**Date:** ' + date, attendees && '**Attendees:** ' + attendees].filter(Boolean).join(' · ');
    if (meta) out.push(meta);
    out.push('### In short', tldr);
    out.push('### Key points', keyPoints.length ? bullets(keyPoints) : '_None detected._');
    out.push('### Decisions', decisions.length ? bullets(decisions) : '_No explicit decisions detected – check the notes._');
    if (actions.length) {
      out.push('### Action items', '| # | Task | Owner | Deadline |\n|---|------|-------|----------|\n' +
        actions.map((a, i) => `| ${i + 1} | ${a.task.replace(/\|/g, '/')} | ${a.owner} | ${a.deadline} |`).join('\n'));
    } else out.push('### Action items', '_No action items detected._');
    if (deadlines.length) out.push('### Deadlines at a glance', bullets(deadlines.map((a) => `**${a.deadline}** – ${a.owner}: ${a.task}`)));
    if (questions.length) out.push('### Open questions', bullets(questions));
    const unassigned = actions.filter((a) => a.owner === 'Unassigned').length;
    if (unassigned) out.push(`> ⚠ ${unassigned} action item(s) have no clear owner – assign one before sending.`);
    const md = out.join('\n\n').replace(/\n\n(- )/g, '\n$1');
    return { md, plain: md.replace(/[#>*|]/g, '').replace(/\n{3,}/g, '\n\n') };
  }

  /* ---------- 3. AI Task Planner / Scheduler ---------- */
  const toMin = (hhmm) => { const [h, m] = String(hhmm).split(':').map(Number); return h * 60 + (m || 0); };
  const fmt = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  const QUAD = { 1: 'Do first (urgent + important)', 2: 'Schedule (important, not urgent)', 3: 'Delegate / batch (urgent, less important)', 4: 'Park or drop (neither)' };

  function parseTasks(text) {
    return String(text || '').split(/\n+/).map(stripBullet).filter(Boolean).map((line) => {
      let t = line, dur = 45;
      const d = t.match(/\(?\b(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)\b\)?/i);
      if (d) { const v = parseFloat(d[1]); dur = /^h/i.test(d[2]) ? Math.round(v * 60) : Math.round(v); t = t.replace(d[0], ' '); }
      dur = Math.max(5, Math.min(dur, 480));
      let urgent = /\b(urgent|asap|today|tonight|immediately|overdue|due (?:today|tomorrow)|by (?:eod|cob|tomorrow|today)|tomorrow)\b/i.test(line) || /!urgent/i.test(line);
      const high = /\b(important|critical|client|boss|manager|deadline|presentation|report|proposal|launch|budget|compliance|audit|review|interview|exam|submit|invoice|payroll)\b/i.test(line) || /!important/i.test(line);
      const lowValue = /\b(admin|emails?|reply|replies|tidy|filing|inbox|expenses|social media|routine)\b/i.test(line);
      // Unmarked tasks default to "important" so nothing is silently dropped; only explicit low-value wording demotes.
      let important = high || !lowValue;
      if (/!low|\b(maybe|someday|optional|nice to have)\b/i.test(line)) { urgent = false; important = false; }
      t = t.replace(/![a-z]+/gi, '').replace(/[()]/g, ' ');
      for (let k = 0; k < 3; k++) t = clean(t).replace(/\s+(?:urgent|asap|important|maybe|optional|someday)\s*$/i, '').replace(/^(?:urgent|asap|important)[:\s]+/i, '');
      t = clean(t.replace(/[-–,;:]\s*$/, ''));
      return { title: cap(t) || 'Untitled task', dur, urgent, important, q: urgent && important ? 1 : important ? 2 : urgent ? 3 : 4 };
    });
  }
  function nthWorkday(start, n) {
    const d = new Date(start || Date.now());
    let added = -1;
    while (added < n) { if (d.getDay() !== 0 && d.getDay() !== 6) added++; if (added < n) d.setDate(d.getDate() + 1); }
    return d;
  }

  function planner(o) {
    const tasks = parseTasks(o.tasks);
    if (!tasks.length) return { md: '_Add at least one task (one per line)._' };
    const start = toMin(o.start || '08:00'), end = toMin(o.end || '16:30');
    const brk = o.breakMins == null ? 10 : Number(o.breakMins);
    const lunch = o.lunch === false ? null : [toMin('12:30'), toMin('13:00')];
    const nDays = o.mode === 'weekly' ? 5 : 1;
    const days = [...Array(nDays)].map((_, i) => ({ date: nthWorkday(o.startDate, i), cursor: start, blocks: [], lunchDone: false }));
    const dayLen = end - start;
    tasks.forEach((t) => { t.dur = Math.min(t.dur, dayLen); });
    const order = tasks.slice().sort((a, b) => a.q - b.q || (a.q <= 2 ? b.dur - a.dur : a.dur - b.dur));
    const carry = [];

    order.forEach((t) => {
      let placed = false;
      for (const day of days) {
        let c = day.cursor;
        if (lunch && c < lunch[1] && c + t.dur > lunch[0]) {
          c = lunch[1];
          if (c + t.dur <= end && !day.lunchDone) { day.blocks.push({ s: lunch[0], e: lunch[1], lunch: true }); day.lunchDone = true; }
        }
        if (c + t.dur <= end) {
          day.blocks.push({ s: c, e: c + t.dur, t });
          day.cursor = c + t.dur + brk;
          placed = true; break;
        }
      }
      if (!placed) carry.push(t);
    });

    const total = tasks.reduce((a, t) => a + t.dur, 0);
    const capacity = nDays * (dayLen - (lunch ? 30 : 0));
    const out = [`## ${o.mode === 'weekly' ? 'Weekly' : 'Daily'} plan`,
      `**${tasks.length} tasks · ${(total / 60).toFixed(1)} h of work · ${(capacity / 60).toFixed(1)} h available** (${fmt(start)}–${fmt(end)}, ${brk}-min buffers)`];

    days.forEach((day) => {
      if (!day.blocks.length) return;
      day.blocks.sort((a, b) => a.s - b.s);
      const label = day.date.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'short' });
      out.push('### ' + label,
        '| Time | Task | Priority |\n|------|------|----------|\n' +
        day.blocks.map((b) => b.lunch ? `| ${fmt(b.s)}–${fmt(b.e)} | 🍽 Lunch break | – |` : `| ${fmt(b.s)}–${fmt(b.e)} | ${b.t.title} | Q${b.t.q} |`).join('\n'));
    });
    if (carry.length) out.push('### Could not fit – reschedule or delegate', bullets(carry.map((t) => `${t.title} (${t.dur} min, Q${t.q})`)));

    out.push('### Priority matrix (Eisenhower)');
    [1, 2, 3, 4].forEach((q) => {
      const items = tasks.filter((t) => t.q === q);
      out.push(`**Q${q} – ${QUAD[q]}**\n` + (items.length ? bullets(items.map((t) => t.title)) : '- _none_'));
    });

    const tips = [];
    if (total > capacity) tips.push(`You have ${(total / 60).toFixed(1)} h of work but only ${(capacity / 60).toFixed(1)} h available – negotiate deadlines or delegate Q3 items.`);
    if (tasks.some((t) => t.q === 3)) tips.push('Batch the Q3 (urgent, less important) items into one 30-minute slot, or delegate them.');
    if (tasks.some((t) => t.q === 4)) tips.push('Q4 items add little value – drop them or park them for a quiet day.');
    if (tasks.some((t) => t.dur > 90)) tips.push('Split tasks longer than 90 minutes into 50-minute focus blocks with short breaks.');
    tips.push('Protect your first block for the most important task – energy and focus are highest early.', 'Check email and chat at set times (e.g. 10:00 and 15:00) instead of continuously.');
    out.push('### Time-optimisation tips', bullets(tips));
    const md = out.join('\n\n').replace(/\n\n(- )/g, '\n$1');
    return { md, plain: md.replace(/[#*|>]/g, '') };
  }

  /* ---------- 4. AI Research Assistant ---------- */
  const SIMPLE = [
    ['in order to', 'to'], ['due to the fact that', 'because'], ['a number of', 'several'], ['utilize', 'use'], ['utilise', 'use'],
    ['approximately', 'about'], ['implement', 'put in place'], ['leverage', 'use'], ['facilitate', 'help'], ['subsequently', 'then'],
    ['commence', 'start'], ['demonstrate', 'show'], ['significant', 'big'], ['numerous', 'many'], ['additional', 'more'],
    ['therefore', 'so'], ['however', 'but'], ['methodology', 'method'], ['optimal', 'best'], ['prior to', 'before'],
    ['regarding', 'about'], ['endeavour', 'try'], ['ascertain', 'find out'], ['sufficient', 'enough'], ['require', 'need'],
    ['furthermore', 'also'], ['consequently', 'as a result'], ['obtain', 'get'], ['purchase', 'buy'], ['assistance', 'help'],
  ];
  function simplify(s) {
    let out = s;
    SIMPLE.forEach(([a, b]) => {
      out = out.replace(new RegExp('\\b' + a + '(s|d|ing)?\\b', 'gi'), (m, suf, off) => {
        let r = b + (suf === 's' ? 's' : '');
        if (suf === 'ing' && /e$/.test(b)) r = b.slice(0, -1) + 'ing'; else if (suf === 'ing') r = b + 'ing';
        if (suf === 'd') r = b + (/e$/.test(b) ? 'd' : 'ed');
        return /^[A-Z]/.test(m) ? cap(r) : r;
      });
    });
    return out;
  }

  function research(o) {
    const text = String(o.text || '').trim();
    const topic = clean(o.topic);
    const wc = text.split(/\s+/).filter(Boolean).length;
    if (wc < 40) {
      const t = topic || text || '[your topic]';
      const md = [`## Research plan: ${t}`,
        '> The demo engine cannot look things up. Here is a structured plan; switch to **Live AI** mode (or paste an article) for content.',
        '### Questions to answer', bullets([`What is ${t}, in one sentence?`, `What is the current state of ${t} (data, trends, key players)?`,
          `What is driving change in ${t}?`, `What are the main risks, limits or criticisms?`, `Who is affected, and how?`, `What would a practical next step look like?`]),
        '### Where to look', bullets(['Official reports and statistics (government, industry bodies)', 'Peer-reviewed or professionally edited sources', 'Two independent news sources for recent events']),
        '### Search queries to try', bullets([`"${t}" overview`, `"${t}" statistics ${new Date().getFullYear()}`, `"${t}" risks OR challenges`, `"${t}" case study South Africa`]),
        '### Verify before you rely on it', bullets(['Is the source recent and named?', 'Do two independent sources agree on the key numbers?', 'Is anyone selling something?'])].join('\n\n').replace(/\n\n(- )/g, '\n$1');
      return { md, plain: md.replace(/[#*>]/g, '') };
    }
    const ss = sentences(text);
    const nSum = Math.min(5, Math.max(2, Math.ceil(ss.length / 6)));
    const summary = topN(ss, nSum);
    const used = new Set(summary);
    const insightPool = ss.filter((s) => !used.has(s) && (/\d/.test(s) || /\b(because|therefore|result|increase|decrease|grow|decline|risk|benefit|cost|saving|improv|reduc)/i.test(s)));
    const insights = topN(insightPool.length >= 2 ? insightPool : ss, 4, used);
    let recs = ss.filter((s) => /\b(recommend|should|must|need to|ought to|advis|suggest)/i.test(s)).slice(0, 3);
    if (!recs.length) recs = ['Validate the main claims against at least one independent source.', 'Identify who is affected and what decision this information supports.', 'Note what the text does NOT cover before acting on it.'];
    const kw = topKeywords(text, 6);
    const oneLine = (summary[0] || ss[0]).split(' ').slice(0, 28).join(' ') + (summary[0] && summary[0].split(' ').length > 28 ? '…' : '');
    const md = [`## Research summary${topic ? ': ' + topic : ''}`,
      `**In one line:** ${oneLine}`, `**Main themes:** ${kw.join(', ')}`,
      '### Summary', summary.join(' '),
      '### Key insights', bullets(insights),
      '### Recommendations / next steps', bullets(recs),
      '### In plain language', simplify(summary.join(' ')),
      `> Extracted from the text you supplied (${wc} words, ${ss.length} sentences). The demo engine selects existing sentences; it does not check facts.`].join('\n\n').replace(/\n\n(- )/g, '\n$1');
    return { md, plain: md.replace(/[#*>]/g, '') };
  }

  /* ---------- 5. Chatbot (demo router) ---------- */
  function chat(message, history) {
    const m = String(message || '').trim();
    const lower = m.toLowerCase();
    const wc = m.split(/\s+/).filter(Boolean).length;
    const multiLine = m.split(/\n/).filter((l) => l.trim()).length >= 3;

    if (/^(hi|hello|hey|howzit|good (morning|afternoon|evening))\b/.test(lower) && wc < 8)
      return { intent: 'greet', md: 'Hello! I am **WorkMate**. I can **draft emails**, **summarise meeting notes**, **plan your day or week**, and **help with research**. Try: _"Write a formal email to a client about a delayed delivery"_ or paste your notes or task list.' };
    if (/what can you do|\bhelp\b|capabilit/.test(lower) && wc < 12)
      return { intent: 'help', md: '**What I can do**\n- ✉️ Draft emails (tone: formal / informal / persuasive; audience: client / manager / team)\n- 📝 Summarise meeting notes into key points, decisions and action items (paste the notes)\n- ✅ Build a prioritised daily or weekly plan (paste one task per line, e.g. `Prepare client report 2h`)\n- 🔎 Summarise an article or outline a research plan (paste text or give a topic)' };
    if (/bias|limitation|trust|accurate|hallucinat|responsible|privacy|safe/.test(lower) && wc < 25)
      return { intent: 'responsible', md: '**Use me responsibly**\n- I can be wrong or miss context – always review before sending.\n- Do not paste passwords, ID numbers, bank details or confidential client data.\n- I may reflect bias in training data; check tone and assumptions about people.\n- In demo mode I use simple rules, not a language model. Live AI mode uses the provider you choose, and your text is sent to them.' };

    if (/\b(email|e-mail|draft|write (?:a|an|to)|message to)\b/.test(lower)) {
      const tone = /persuad|persuasive|convince|sell/.test(lower) ? 'persuasive' : /informal|casual|friendly|relaxed/.test(lower) ? 'informal' : 'formal';
      const audience = /client|customer/.test(lower) ? 'client' : /manager|boss|supervisor/.test(lower) ? 'manager' : /team|colleague|staff/.test(lower) ? 'team' : 'client';
      const purpose = /follow.?up/.test(lower) ? 'followup' : /apolog|sorry|delay/.test(lower) ? 'apology' : /thank/.test(lower) ? 'thanks' : /meeting|schedule a call|catch up/.test(lower) ? 'meeting' : /introduc/.test(lower) ? 'intro' : /updat|progress/.test(lower) ? 'update' : /request|ask|need/.test(lower) ? 'request' : 'followup';
      const tm = m.match(/\b(?:about|regarding|on|re:)\s+(.+?)(?:[.?!]|$)/i);
      const nm = m.match(/\bto\s+(?:my\s+|our\s+|the\s+)?(?:client|manager|boss|team|colleague)?\s*([A-Z][a-z]+)\b/);
      const r = email({ tone, audience, purpose, subject: tm ? tm[1] : '', recipient: nm && !NOT_NAMES.has(nm[1]) ? nm[1] : '', details: '' });
      return { intent: 'email', md: `Here is a **${tone}** draft for a **${audience}** (edit the placeholders):\n\n---\n\n${r.md}`, plain: r.plain };
    }
    if (/summari[sz]e|summary|minutes|meeting notes|action items/.test(lower) || (wc > 60 && /\b(attendees|agreed|decided|action)\b/i.test(m))) {
      if (wc < 25) return { intent: 'ask', md: 'Please paste the full meeting notes in your next message and I will extract key points, decisions and action items.' };
      return { intent: 'meeting', ...meeting({ notes: m.replace(/^[^:\n]{0,40}(summari[sz]e|summary)[^:\n]*:\s*/i, '') }) };
    }
    if (/\b(plan|schedule|prioriti[sz]e|to-?do|tasks?)\b/.test(lower)) {
      if (!multiLine) return { intent: 'ask', md: 'Send your tasks **one per line**, optionally with a duration and priority hint. Example:\n```\nPrepare client report 2h urgent\nTeam stand-up 15m\nReview budget 1h important\n```' };
      const body = m.split('\n').slice(/^[^\n]*:\s*$/.test(m.split('\n')[0]) || /\b(plan|schedule|prioriti[sz]e)\b/i.test(m.split('\n')[0]) ? 1 : 0).join('\n');
      return { intent: 'plan', ...planner({ tasks: body, mode: /week/.test(lower) ? 'weekly' : 'daily' }) };
    }
    if (/research|explain|what is|what are|simplif|insight|article/.test(lower)) {
      if (wc >= 60) return { intent: 'research', ...research({ text: m }) };
      const topic = m.replace(/^(please\s+)?(research|explain|what is|what are|simplify)\s*/i, '').replace(/[?.!]+$/, '');
      return { intent: 'research', ...research({ topic, text: '' }) };
    }
    return { intent: 'fallback', md: 'I am not sure what you need yet. I can **draft an email**, **summarise meeting notes**, **plan your tasks**, or **outline research**. Which would you like? Type _help_ for examples.' };
  }

  /* ---------- Responsible-AI helper: simple PII detector ---------- */
  function detectPII(text) {
    const t = String(text || ''), found = [];
    if (/\b\d{13}\b/.test(t)) found.push('a 13-digit number (could be an ID number)');
    if (/\b(?:\d[ -]?){15,16}\b/.test(t)) found.push('a long number (could be a card number)');
    if (/\b0\d{2}[ -]?\d{3}[ -]?\d{4}\b|\+27[ -]?\d{2}[ -]?\d{3}[ -]?\d{4}\b/.test(t)) found.push('a phone number');
    if (/[\w.+-]+@[\w-]+\.[\w.-]+/.test(t)) found.push('an email address');
    if (/\b(password|passwd|pin code|cvv)\b\s*[:=]/i.test(t)) found.push('what looks like a password/PIN');
    return found;
  }

  return { email, meeting, planner, research, chat, detectPII, _internals: { parseTasks, sentences, simplify } };
});
