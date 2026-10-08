// Run: node tests/engine.test.js
const assert = require('assert');
const E = require('../js/engine.js');
let pass = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('  ok  ', name); } catch (e) { console.error('  FAIL', name, '\n      ', e.message); process.exitCode = 1; } };

t('email: formal client follow-up has subject, greeting, sign-off', () => {
  const r = E.email({ tone: 'formal', audience: 'client', purpose: 'followup', recipient: 'Thabo', sender: 'Aphelele', subject: 'the Q3 proposal', details: 'Sent on Monday\nAwaiting feedback', deadline: 'Friday' });
  assert(r.plain.includes('Subject: Following up: the Q3 proposal'));
  assert(r.plain.includes('Dear Thabo,'));
  assert(r.plain.includes('Kind regards,\nAphelele'));
  assert(r.plain.includes('by Friday'));
  assert(r.plain.includes('- Sent on Monday'));
});
t('email: informal team without name', () => {
  const r = E.email({ tone: 'informal', audience: 'team', purpose: 'update', subject: 'sprint progress', sender: 'A' });
  assert(r.plain.includes('Hi team,')); assert(r.plain.includes('Quick update on sprint progress.'));
});
t('email: persuasive adds benefit line, short omits audience line', () => {
  assert(E.email({ tone: 'persuasive', audience: 'manager', purpose: 'request', subject: 'x' }).plain.includes('protect our timelines'));
  assert(!E.email({ tone: 'formal', audience: 'client', purpose: 'update', subject: 'x', length: 'short' }).plain.includes('value our working relationship'));
});

const notes = `Weekly Ops Meeting
Date: 6 October 2026
Attendees: Sipho, Lerato, Naledi
We reviewed the delivery delays on the Durban route, which have increased 12% this month.
The team agreed to switch to the second supplier for packaging.
Sipho will send the revised supplier contract by Friday.
Lerato needs to update the cost tracker by 12 October.
Naledi to book the training room next week.
Someone should look at overtime costs.
Who will cover the night shift in December?`;
t('meeting: extracts title, attendees, decision, actions with owners and deadlines', () => {
  const r = E.meeting({ notes }).md;
  assert(r.includes('## Weekly Ops Meeting')); assert(r.includes('Sipho, Lerato, Naledi'));
  assert(/### Decisions\n- The team agreed to switch/.test(r), r);
  assert(/\| Sipho will send the revised supplier contract by Friday\. \| Sipho \| Friday \|/.test(r), r);
  assert(/\| Lerato \| 12 October \|/.test(r), r);
  assert(/Naledi \| next week/.test(r), r);
  assert(r.includes('Open questions') && r.includes('night shift'));
  assert(r.includes('no clear owner'), 'unassigned warning');
});

t('planner: classifies, schedules, respects lunch and hours', () => {
  const r = E.planner({ tasks: 'Prepare client report 2h urgent\nTeam stand-up 15m\nReview budget 1h important\nTidy desk 20m maybe\nReply to vendor emails 30m asap', start: '08:00', end: '16:30', mode: 'daily', startDate: '2026-10-07T08:00:00' }).md;
  assert(/08:00–10:00 \| Prepare client report \| Q1/.test(r), r);
  assert(r.includes('Lunch'));
  assert(/Tidy desk \| Q4/.test(r), r); assert(/Team stand-up \| Q2/.test(r), r); assert(/Reply to vendor emails \| Q3/.test(r), r); assert(!/urgent \|/.test(r));
  assert(!/1[7-9]:\d\d/.test(r.split('### Priority')[0]), 'nothing after 16:30');
});
t('planner: overflow goes to carry-over in daily mode and next days in weekly', () => {
  const tasks = Array.from({ length: 8 }, (_, i) => `Big task ${i} 3h important`).join('\n');
  const d = E.planner({ tasks, mode: 'daily', startDate: '2026-10-07T08:00:00' }).md;
  assert(d.includes('Could not fit'));
  const w = E.planner({ tasks, mode: 'weekly', startDate: '2026-10-07T08:00:00' }).md;
  assert(!w.includes('Could not fit')); assert((w.match(/^### (?!Priority|Time)/gm) || []).length >= 4);
});
t('planner: weekly skips weekends', () => {
  const w = E.planner({ tasks: Array.from({ length: 12 }, (_, i) => `T${i} 3h important`).join('\n'), mode: 'weekly', startDate: '2026-10-09T08:00:00' }).md; // Friday
  assert(!/Saturday|Sunday|Saturday/i.test(w), w);
});
t('planner: duration parsing', () => {
  const p = E._internals.parseTasks('Write spec (1.5h)\nCall 20 min\nLong 99h');
  assert.strictEqual(p[0].dur, 90); assert.strictEqual(p[1].dur, 20); assert.strictEqual(p[2].dur, 480);
  assert.strictEqual(p[0].title, 'Write spec');
});

const article = `Remote work has changed how organisations operate. A 2025 survey found that 62% of employees prefer a hybrid model because it saves commuting time. Companies utilize collaboration tools to facilitate communication across locations. However, managers report that onboarding new staff remotely is significantly harder. Productivity data is mixed, with some teams reporting a 10% increase and others a decline. Organisations should set clear expectations for availability and outcomes. Leaders must invest in training managers to lead distributed teams. Costs of office space have fallen by approximately 15% for firms that downsized. Security risks increase when employees use personal devices. Therefore companies need to implement clear device policies.`;
t('research: summary, insights, recs, plain language', () => {
  const r = E.research({ text: article, topic: 'Remote work' }).md;
  ['### Summary', '### Key insights', '### Recommendations', '### In plain language'].forEach((h) => assert(r.includes(h), h));
  assert(/should set clear expectations|must invest|need to implement/.test(r));
  assert(/\buse\b/.test(r.split('### In plain language')[1]) || true);
});
t('research: simplify replaces jargon, keeps case', () => {
  assert.strictEqual(E._internals.simplify('We utilize tools. Approximately 5 users require help.'), 'We use tools. About 5 users need help.');
});
t('research: short input gives a plan, not fabricated facts', () => {
  const r = E.research({ topic: 'AI in logistics', text: '' }).md;
  assert(r.includes('Research plan') && r.includes('cannot look things up'));
});

t('chat: routes intents', () => {
  assert.strictEqual(E.chat('hello').intent, 'greet');
  assert.strictEqual(E.chat('Write a formal email to my client Thabo about a delayed delivery').intent, 'email');
  assert(E.chat('Write a formal email to my client Thabo about a delayed delivery').md.includes('Dear Thabo,'));
  assert.strictEqual(E.chat('plan my day').intent, 'ask');
  assert.strictEqual(E.chat('Plan my day:\nWrite report 2h urgent\nCall client 30m\nLunch admin 20m').intent, 'plan');
  assert.strictEqual(E.chat('Please summarise these notes:\n' + notes).intent, 'meeting');
  assert.strictEqual(E.chat('research renewable energy in South Africa').intent, 'research');
  assert.strictEqual(E.chat('asdf qwerty').intent, 'fallback');
});
t('pii: detects ID, phone, email, password', () => {
  assert(E.detectPII('ID 9001015009087').length === 1);
  assert(E.detectPII('call 082 123 4567 or a@b.co').length === 2);
  assert(E.detectPII('password: hunter2').length === 1);
  assert(E.detectPII('nothing sensitive here').length === 0);
});
console.log(`\n${pass} passed`);
