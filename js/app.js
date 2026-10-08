/* WorkMate – UI logic */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  /* ---------- safe storage ---------- */
  const store = {
    get(area, k, d) { try { const v = window[area].getItem(k); return v == null ? d : v; } catch (e) { return d; } },
    set(area, k, v) { try { window[area].setItem(k, v); } catch (e) { /* storage unavailable */ } },
  };
  const cfg = {
    mode: store.get('localStorage', 'wm_mode', 'demo'),
    provider: store.get('localStorage', 'wm_provider', 'gemini'),
    model: store.get('localStorage', 'wm_model', ''),
    key: store.get('sessionStorage', 'wm_key', ''),
  };
  const isLive = () => cfg.mode === 'live';

  /* ---------- markdown (small, safe) ---------- */
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (s) => esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])_([^_]+)_(?=[\s).,:;!?]|$)/g, '$1<em>$2</em>')
    .replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<em>$2</em>');
  const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
  function md(src) {
    const lines = String(src).replace(/\r/g, '').split('\n');
    let html = '', i = 0;
    const isTable = (l) => /^\s*\|.*\|\s*$/.test(l || '');
    const isBlock = (l) => /^(#{1,4}\s|\s*[-*]\s+|\s*\d+[.)]\s+|>|```|---+\s*$)/.test(l) || isTable(l);
    while (i < lines.length) {
      const l = lines[i];
      let m;
      if (!l.trim()) { i++; continue; }
      if (/^```/.test(l)) { const b = []; i++; while (i < lines.length && !/^```/.test(lines[i])) b.push(lines[i++]); i++; html += '<pre>' + esc(b.join('\n')) + '</pre>'; continue; }
      if (isTable(l) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] || '')) {
        const head = cells(l); i += 2; const rows = [];
        while (i < lines.length && isTable(lines[i])) rows.push(cells(lines[i++]));
        html += '<div class="tablewrap"><table><thead><tr>' + head.map((c) => '<th>' + inline(c) + '</th>').join('') + '</tr></thead><tbody>' +
          rows.map((r) => '<tr>' + r.map((c) => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
        continue;
      }
      if ((m = l.match(/^(#{1,4})\s+(.*)/))) { const n = Math.min(m[1].length + 2, 5); html += `<h${n}>${inline(m[2])}</h${n}>`; i++; continue; }
      if (/^---+\s*$/.test(l)) { html += '<hr>'; i++; continue; }
      if (/^>/.test(l)) { const b = []; while (i < lines.length && /^>/.test(lines[i])) b.push(lines[i++].replace(/^>\s?/, '')); html += '<blockquote>' + inline(b.join(' ')) + '</blockquote>'; continue; }
      if (/^\s*[-*]\s+/.test(l)) { const b = []; while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) b.push(lines[i++].replace(/^\s*[-*]\s+/, '')); html += '<ul>' + b.map((x) => '<li>' + inline(x) + '</li>').join('') + '</ul>'; continue; }
      if (/^\s*\d+[.)]\s+/.test(l)) { const b = []; while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) b.push(lines[i++].replace(/^\s*\d+[.)]\s+/, '')); html += '<ol>' + b.map((x) => '<li>' + inline(x) + '</li>').join('') + '</ol>'; continue; }
      const p = [];
      while (i < lines.length && lines[i].trim() && !isBlock(lines[i])) p.push(lines[i++]);
      if (!p.length) { p.push(lines[i++]); }
      html += '<p>' + p.map(inline).join('<br>') + '</p>';
    }
    return html;
  }

  /* ---------- header chips ---------- */
  const SAVE_MIN = { email: 8, meeting: 12, planner: 15, research: 15, chat: 2 };
  function refreshChips() {
    const chip = $('#modeChip');
    chip.textContent = isLive() ? 'Live AI · ' + AI.PROVIDERS[cfg.provider].label.split(' (')[0] : 'Demo engine';
    chip.classList.toggle('live', isLive());
    $('#savedChip').textContent = '⏱ ' + (parseInt(store.get('localStorage', 'wm_saved', '0'), 10) || 0) + ' min saved (est.)';
  }
  function addSaved(feature) {
    const n = (parseInt(store.get('localStorage', 'wm_saved', '0'), 10) || 0) + (SAVE_MIN[feature] || 0);
    store.set('localStorage', 'wm_saved', String(n));
    refreshChips();
  }

  /* ---------- tabs ---------- */
  const tabs = $$('.tab');
  function selectTab(tab, focus) {
    tabs.forEach((t) => { const on = t === tab; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; $('#' + t.getAttribute('aria-controls')).hidden = !on; });
    if (focus) tab.focus();
    try { history.replaceState(null, '', '#' + tab.id.slice(2)); } catch (e) { /* file:// */ }
  }
  tabs.forEach((t, idx) => {
    t.addEventListener('click', () => selectTab(t));
    t.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') selectTab(tabs[(idx + 1) % tabs.length], true);
      if (e.key === 'ArrowLeft') selectTab(tabs[(idx - 1 + tabs.length) % tabs.length], true);
    });
  });
  const startTab = $('#t-' + location.hash.slice(1));
  if (startTab) selectTab(startTab);

  /* ---------- examples ---------- */
  const EXAMPLES = {
    email: { recipient: 'Thabo', audience: 'client', tone: 'formal', purpose: 'followup', subject: 'the Q3 service proposal', details: 'I sent the proposal on Monday\nPricing is valid until 31 October', deadline: 'Friday 16 October' },
    meeting: { notes: 'Weekly Ops Meeting\nDate: 6 October 2026\nAttendees: Sipho, Lerato, Naledi, Aphelele\nWe reviewed the delivery delays on the Durban route, which have increased 12% this month.\nThe team agreed to switch to the second supplier for packaging.\nSipho will send the revised supplier contract by Friday.\nLerato needs to update the cost tracker by 12 October.\nNaledi to book the training room next week.\nSomeone should look at overtime costs.\nWho will cover the night shift in December?' },
    planner: { tasks: 'Prepare client report 2h urgent\nTeam stand-up 15m\nReview budget 1h important\nReply to vendor emails 30m asap\nUpdate project tracker 30m\nTidy shared drive 45m maybe\nPlan next week 30m', mode: 'daily' },
    research: { topic: 'Hybrid work and productivity', level: 'plain', text: 'Remote work has changed how organisations operate. A 2025 survey found that 62% of employees prefer a hybrid model because it saves commuting time. Companies utilize collaboration tools to facilitate communication across locations. However, managers report that onboarding new staff remotely is significantly harder. Productivity data is mixed, with some teams reporting a 10% increase and others a decline. Organisations should set clear expectations for availability and outcomes. Leaders must invest in training managers to lead distributed teams. Costs of office space have fallen by approximately 15% for firms that downsized. Security risks increase when employees use personal devices. Therefore companies need to implement clear device policies.' },
  };
  $$('[data-example]').forEach((b) => b.addEventListener('click', () => {
    const f = b.closest('form'); const ex = EXAMPLES[b.dataset.example];
    Object.entries(ex).forEach(([k, v]) => { const el = f.elements[k]; if (el) el.value = v; });
  }));

  /* ---------- output card ---------- */
  const CHECKS = {
    email: ['Names, dates and facts are correct', 'The tone suits this recipient', 'Nothing confidential is included'],
    meeting: ['Decisions match what was actually agreed', 'Each action has the right owner and deadline', 'It is safe to share with everyone who will receive it'],
    planner: ['Durations are realistic for me', 'Fixed commitments and deadlines are respected', 'I have compared it with my calendar'],
    research: ['Key claims checked against a second source', 'Numbers and dates are correct and current', 'I will credit sources if I reuse this'],
  };
  function renderOutput(feature, result, source, promptShown) {
    const box = $('#out-' + feature);
    const checks = (CHECKS[feature] || []).map((c, i) => `<label class="checkrow"><input type="checkbox" data-chk> ${esc(c)}</label>`).join('');
    box.innerHTML = `
      <div class="out-head">
        <span class="pill ${source === 'live' ? '' : 'amber'}">${source === 'live' ? 'Live AI: ' + esc(cfg.provider) : 'Demo engine (rules, not an LLM)'}</span>
        <span><button class="btn small ghost" data-copy type="button">Copy</button> <button class="btn small ghost" data-dl type="button">Download .txt</button></span>
      </div>
      <div class="rendered">${md(result.md)}</div>
      <div class="check"><strong>Validate before use</strong> <span class="muted" data-count>(0/${(CHECKS[feature] || []).length})</span>${checks}</div>
      <p class="disclaimer">⚠ AI-generated draft. It may contain errors or bias. You are responsible for what you send or act on.</p>
      ${promptShown ? `<details class="disclaimer"><summary>Prompt used (Live mode)</summary><pre>${esc(promptShown)}</pre></details>` : ''}`;
    const text = result.plain || result.md;
    $('[data-copy]', box).onclick = async (e) => {
      try { await navigator.clipboard.writeText(text); e.target.textContent = 'Copied ✓'; }
      catch (err) { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); e.target.textContent = 'Copied ✓'; } catch (e2) { e.target.textContent = 'Press Ctrl+C'; } ta.remove(); }
      setTimeout(() => (e.target.textContent = 'Copy'), 1800);
    };
    $('[data-dl]', box).onclick = () => {
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
      a.download = 'workmate-' + feature + '.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };
    $$('[data-chk]', box).forEach((c) => c.addEventListener('change', () => { $('[data-count]', box).textContent = `(${$$('[data-chk]:checked', box).length}/${$$('[data-chk]', box).length})`; }));
  }
  const showError = (feature, msg) => { $('#out-' + feature).innerHTML = `<div class="err" role="alert"><strong>Something went wrong.</strong><br>${esc(msg)}<br><small>Tip: switch to the Demo engine in Settings to keep working.</small></div>`; };

  /* ---------- run a feature ---------- */
  function piiWarning(text) {
    const found = Engine.detectPII(text);
    return found.length ? `Your text appears to contain ${found.join(', ')}. ` : '';
  }
  async function run(feature, inputs, form) {
    const allText = Object.values(inputs).join('\n');
    const warn = piiWarning(allText);
    const box = $('#out-' + feature);
    const btn = $('button[type=submit]', form); const label = btn.textContent;
    if (isLive() && warn && !confirm(warn + '\n\nLive AI mode sends your text to ' + AI.PROVIDERS[cfg.provider].label + '. Remove sensitive details first. Send anyway?')) return;
    btn.disabled = true; btn.innerHTML = isLive() ? '<span class="spinner"></span> Thinking…' : label;
    try {
      let result, source = 'demo', promptShown = '';
      if (isLive()) {
        const p = Prompts.build(feature, inputs);
        promptShown = p.user;
        const text = await AI.call(cfg, p.system, [{ role: 'user', content: p.user }], p.temperature);
        result = { md: text, plain: text.replace(/[#*>|]/g, '') }; source = 'live';
      } else result = Engine[feature](inputs);
      renderOutput(feature, result, source, promptShown);
      if (warn && !isLive()) box.insertAdjacentHTML('afterbegin', `<div class="warn">🔒 ${esc(warn)}Consider removing it before sharing this output.</div>`);
      addSaved(feature);
      box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } catch (e) { showError(feature, e.message); }
    finally { btn.disabled = false; btn.textContent = label; }
  }
  $$('form[data-feature]').forEach((form) => form.addEventListener('submit', (e) => {
    e.preventDefault();
    const inputs = {};
    Array.from(form.elements).forEach((el) => { if (!el.name) return; inputs[el.name] = el.type === 'checkbox' ? el.checked : el.value; });
    if (inputs.breakMins !== undefined) inputs.breakMins = Number(inputs.breakMins);
    run(form.dataset.feature, inputs, form);
  }));

  /* ---------- chat ---------- */
  const msgs = $('#msgs'); let history = [];
  const SUGGEST = ['What can you do?', 'Write a persuasive email to my manager about a flexible-hours trial', 'Plan my day:\nPrepare client report 2h urgent\nTeam stand-up 15m\nReview budget 1h important', 'Explain what “hybrid work” is'];
  function addMsg(kind, html) { const d = document.createElement('div'); d.className = 'msg ' + kind; d.innerHTML = html; msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; return d; }
  function resetChat() {
    history = []; msgs.innerHTML = '';
    addMsg('bot', md('Hi, I’m **WorkMate**. Ask me to draft an email, summarise meeting notes, plan your day or explain a topic. Type _help_ for examples.'));
    $('#suggest').innerHTML = SUGGEST.map((s, i) => `<button type="button" data-s="${i}">${esc(s.split('\n')[0])}</button>`).join('');
    $$('#suggest button').forEach((b) => b.addEventListener('click', () => { $('#chatin').value = SUGGEST[b.dataset.s]; $('#chatform').requestSubmit(); }));
  }
  async function send(text) {
    addMsg('me', esc(text)); $('#suggest').innerHTML = '';
    const btn = $('#sendBtn'); btn.disabled = true;
    const typing = addMsg('bot', '<span class="muted">WorkMate is typing…</span>');
    try {
      let reply;
      if (isLive()) {
        history.push({ role: 'user', content: text });
        const warn = piiWarning(text);
        reply = await AI.call(cfg, Prompts.CHAT_SYSTEM, history.slice(-12), Prompts.TEMPERATURE.chat);
        history.push({ role: 'assistant', content: reply });
        typing.innerHTML = md(reply) + (warn ? `<div class="warn" style="margin-top:8px">🔒 ${esc(warn)}It was sent to the provider.</div>` : '');
      } else {
        await new Promise((r) => setTimeout(r, 350));
        const r = Engine.chat(text, history);
        history.push({ role: 'user', content: text }, { role: 'assistant', content: r.md });
        typing.innerHTML = md(r.md) + (['email', 'meeting', 'plan', 'research'].includes(r.intent) ? '<p class="disclaimer">⚠ AI-generated draft – review before use.</p>' : '');
      }
      addSaved('chat');
    } catch (e) { if (isLive()) history.pop(); typing.innerHTML = `<div class="err">${esc(e.message)}</div>`; }
    finally { btn.disabled = false; msgs.scrollTop = msgs.scrollHeight; }
  }
  $('#chatform').addEventListener('submit', (e) => { e.preventDefault(); const v = $('#chatin').value.trim(); if (!v) return; $('#chatin').value = ''; send(v); });
  $('#chatin').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#chatform').requestSubmit(); } });
  $('#clearChat').addEventListener('click', resetChat);
  resetChat();

  /* ---------- prompt lab ---------- */
  $('#lab').innerHTML = Prompts.lab.map((f) => `
    <article class="card"><h3>${esc(f.feature)}</h3>
      <div class="tablewrap"><table><thead><tr><th>Version</th><th>Prompt</th><th>Weakness / improvement</th></tr></thead><tbody>
      ${f.versions.map((v) => `<tr><td><strong>${esc(v.v)}</strong></td><td>${esc(v.prompt)}</td><td>${esc(v.problem)}</td></tr>`).join('')}
      </tbody></table></div>
      <p><strong>Techniques:</strong> ${f.techniques.map((t) => `<span class="pill">${esc(t)}</span>`).join(' ')}</p></article>`).join('');
  $('#sysprompt').textContent = Prompts.SYSTEM;

  /* ---------- settings ---------- */
  const dlg = $('#settings');
  $('#s-provider').innerHTML = Object.entries(AI.PROVIDERS).map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join('');
  function syncSettingsUI() {
    $('#liveFields').style.display = $('#s-mode').value === 'live' ? '' : 'none';
    const p = AI.PROVIDERS[$('#s-provider').value];
    $('#s-model').placeholder = p.model; $('#keyLink').href = p.keyUrl; $('#keyLink').textContent = p.keyUrl.replace('https://', '');
  }
  $('#openSettings').addEventListener('click', () => {
    $('#s-mode').value = cfg.mode; $('#s-provider').value = cfg.provider; $('#s-model').value = cfg.model; $('#s-key').value = cfg.key;
    syncSettingsUI(); if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  });
  $('#s-mode').addEventListener('change', syncSettingsUI); $('#s-provider').addEventListener('change', syncSettingsUI);
  $('#settingsForm').addEventListener('submit', (e) => {
    if (e.submitter && e.submitter.value !== 'save') return;
    cfg.mode = $('#s-mode').value; cfg.provider = $('#s-provider').value; cfg.model = $('#s-model').value.trim(); cfg.key = $('#s-key').value.trim();
    if (cfg.mode === 'live' && !cfg.key) { cfg.mode = 'demo'; alert('No API key entered, so staying in Demo mode.'); }
    store.set('localStorage', 'wm_mode', cfg.mode); store.set('localStorage', 'wm_provider', cfg.provider); store.set('localStorage', 'wm_model', cfg.model);
    store.set('sessionStorage', 'wm_key', cfg.key);
    refreshChips();
  });
  refreshChips();
})();
