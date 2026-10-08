/* WorkMate – Live AI connector (bring-your-own-key).
 * Calls the provider directly from the browser. The key lives only in this tab's sessionStorage
 * and is never sent anywhere except the provider you pick. For a production app you would call
 * the provider from a server instead (see README "Going further").
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AI = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PROVIDERS = {
    gemini: { label: 'Google Gemini (free tier available)', model: 'gemini-2.5-flash', keyUrl: 'https://aistudio.google.com/apikey' },
    openai: { label: 'OpenAI', model: 'gpt-4o-mini', keyUrl: 'https://platform.openai.com/api-keys' },
    anthropic: { label: 'Anthropic Claude', model: 'claude-haiku-5-5', keyUrl: 'https://console.anthropic.com/settings/keys' },
  };

  async function readError(res) {
    let msg = '';
    try { const j = await res.json(); msg = (j.error && (j.error.message || j.error)) || JSON.stringify(j); } catch (e) { msg = res.statusText; }
    if (res.status === 400 || res.status === 401 || res.status === 403) msg += ' (check that your API key and model name are correct)';
    if (res.status === 429) msg += ' (rate limit or quota reached – wait a minute or check your plan)';
    throw new Error(`${res.status}: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
  }

  /** messages: [{role:'user'|'assistant', content:string}] */
  async function call(cfg, system, messages, temperature) {
    if (!cfg.key) throw new Error('Add your API key in Settings first.');
    const model = (cfg.model || PROVIDERS[cfg.provider].model).trim();
    const temp = temperature == null ? 0.5 : temperature;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 45000);
    try {
      if (cfg.provider === 'gemini') {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
          method: 'POST', signal: ctl.signal,
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.key },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
            generationConfig: { temperature: temp, maxOutputTokens: 2048 },
          }),
        });
        if (!res.ok) await readError(res);
        const j = await res.json();
        const t = j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts;
        if (!t) throw new Error('The model returned no text (it may have been blocked by a safety filter). Try rewording.');
        return t.map((p) => p.text || '').join('');
      }
      if (cfg.provider === 'openai') {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST', signal: ctl.signal,
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + cfg.key },
          body: JSON.stringify({ model, temperature: temp, messages: [{ role: 'system', content: system }, ...messages] }),
        });
        if (!res.ok) await readError(res);
        const j = await res.json();
        return j.choices[0].message.content;
      }
      if (cfg.provider === 'anthropic') {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST', signal: ctl.signal,
          headers: { 'Content-Type': 'application/json', 'x-api-key': cfg.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
          body: JSON.stringify({ model, max_tokens: 2048, temperature: temp, system, messages }),
        });
        if (!res.ok) await readError(res);
        const j = await res.json();
        return j.content.map((c) => c.text || '').join('');
      }
      throw new Error('Unknown provider');
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('The request timed out after 45 seconds. Please try again.');
      if (e instanceof TypeError) throw new Error('Network error – check your connection (or that the provider allows browser requests).');
      throw e;
    } finally { clearTimeout(timer); }
  }

  return { PROVIDERS, call };
});
