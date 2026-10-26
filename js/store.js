/* ---------- État et stockage ---------- */
// Les données vivent dans le Google Sheet de l'asso (script apps-script/Code.gs).
// Chaque appareil garde une copie (pour s'ouvrir instantanément et hors connexion) et une file
// des modifications pas encore envoyées, qui survit à la fermeture de l'app et au changement de page.
const S = { mode: 'loading', events: {}, comments: {}, retex: {}, history: {}, names: {}, me: '', templates: {}, poles: DEFAULT_POLES, current: null, tab: 'dash', view: 'home', filters: { pole: '', who: '', status: '' }, readOnly: false };
let holdRender = false;
const CFG_KEY = 'retroplan-connexion', CACHE_KEY = 'retroplan-copie', QUEUE_KEY = 'retroplan-envois';
const readJSON = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
let cfg = readJSON(CFG_KEY);          // { api, code, name } ; { local: true } = sans serveur (tests automatiques uniquement)
let rev = 0, queue = readJSON(QUEUE_KEY) || [];

/* ---------- États affichés à l'utilisateur ---------- */
// [titre, explication, ton] : une phrase qui dit ce qui se passe et quoi faire
const STATES = {
  badcode: ['Code d’accès refusé', 'Le code de l’asso a peut-être changé. Ouvre Paramètres pour saisir le nouveau.', 'bad'],
  server: ['Le serveur de l’asso a répondu par une erreur', 'Tes modifications sont gardées sur cet appareil et seront renvoyées automatiquement.', 'bad'],
  big: ['Événement trop volumineux', 'Supprime des tâches inutiles ou des notes très longues, puis refais ta modification.', 'bad'],
  offline: ['Hors connexion', 'Tu peux continuer : tes modifications partiront dès le retour du réseau.', 'warn'],
  slow: ['Le chargement prend plus de temps que prévu', 'Vérifie ta connexion internet. Si rien ne s’affiche, recharge la page.', 'warn'],
};
const active = new Set(), stateText = {};
function setState(k, on, text) {
  if (text) stateText[k] = text; else if (!on) delete stateText[k];
  if (on === active.has(k) && !text) return;
  on ? active.add(k) : active.delete(k);
  const box = $('#status'); if (!box) return;
  const keys = Object.keys(STATES).filter(x => active.has(x));
  box.hidden = !keys.length;
  box.innerHTML = keys.map(x => { const [t, d, tone] = STATES[x]; return `<div class="state ${tone}"><span class="ic" aria-hidden="true"></span><div><strong>${t}</strong>${esc(stateText[x] || d)}</div></div>`; }).join('');
}

/* ---------- Copie locale ---------- */
function persist() {
  if (!cfg) return;
  if (!writeJSON(CACHE_KEY, { api: cfg.local ? 'local' : cfg.api, rev, data: buildBackup() })) setState('server', true, 'Cet appareil n’a plus de place pour garder une copie des données.');
}
function applyData(d) {
  S.events = toMap(d.events, normEvent); S.comments = toMap(d.comments, normComment); S.retex = toMap(d.retex, normRetex);
  S.history = toMap(d.history, normHist); S.templates = toMap(d.templates, normTemplate); S.poles = normPoles(d.poles);
}
function loadCache() {
  const c = readJSON(CACHE_KEY);
  if (!c || !isObj(c.data) || c.api !== (cfg.local ? 'local' : cfg.api)) return false;
  applyData(c.data); rev = num(c.rev, 0); return true;
}

/* ---------- Échanges avec le serveur de l'asso ---------- */
// Tout passe en POST texte : le code d'accès n'apparaît jamais dans une adresse
async function api(payload, timeoutMs = 25000) {
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(cfg.api, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ ...payload, code: cfg.code }), signal: ctl.signal, redirect: 'follow' });
    return await r.json();
  } finally { clearTimeout(timer); }
}
const pendingFor = (coll, id) => queue.some(o => o.coll === coll && o.id === id);
const NORM = { comments: normComment, retex: normRetex, history: normHist, templates: normTemplate };
function applyDoc(d) {
  if (pendingFor(d.coll, d.id)) return;            // une modification locale pas encore envoyée a priorité
  if (d.coll === 'config') { if (d.id === 'poles' && !d.deleted && d.data) S.poles = normPoles(d.data.list); return; }
  if (!S[d.coll] || !(d.coll === 'events' || NORM[d.coll])) return;
  if (d.deleted || !isObj(d.data)) { delete S[d.coll][d.id]; return; }
  const n = (d.coll === 'events' ? normEvent : NORM[d.coll])(clone(d.data), d.id);
  if (n) S[d.coll][d.id] = n;
}
let flushing = false, pulling = false, retryTimer = null;
function updateQueueState() {
  if (!queue.length) { setState('offline', false); return; }
  if (active.has('offline')) setState('offline', true, `Tu peux continuer : ${queue.length > 1 ? `${queue.length} modifications partiront` : '1 modification partira'} dès le retour du réseau.`);
}
function scheduleRetry() { clearTimeout(retryTimer); retryTimer = setTimeout(() => flush(), 15000); }
async function flush() {
  if (!cfg || cfg.local || flushing || !queue.length) return;
  flushing = true;
  const batch = queue.slice(0, 50);
  let res;
  try { res = await api({ action: 'write', ops: batch }); }
  catch (e) { flushing = false; setState('offline', true); updateQueueState(); scheduleRetry(); return; }
  flushing = false;
  setState('offline', false);
  if (!res || !res.ok) {
    if (res && res.error === 'code') { setState('badcode', true); return; }
    setState('server', true, res && res.error === 'full' ? 'Le classeur de l’asso est plein : un responsable doit supprimer d’anciens événements.' : '');
    scheduleRetry(); return;
  }
  setState('server', false); setState('badcode', false);
  queue.splice(0, batch.length); writeJSON(QUEUE_KEY, queue);
  (res.results || []).forEach(r => {
    if (r.ok) return;
    if (r.error === 'too_big') { toast('Une modification a été refusée : document trop volumineux.'); setState('big', true); }
    else if (r.error === 'missing') toast('Une modification n’a pas pu s’appliquer : l’élément a été supprimé par un autre membre.');
  });
  (res.docs || []).forEach(applyDoc);
  persist(); render();
  if (queue.length) flush();
}
function send(op) {
  if (cfg && !cfg.local) { queue.push(op); writeJSON(QUEUE_KEY, queue); }
  persist();
  flush();
}
// Récupère ce que les autres ont changé depuis la dernière fois (tout, au premier appel)
async function pull() {
  if (!cfg || cfg.local || pulling) return;
  pulling = true;
  try {
    if (queue.length) await flush();
    const res = await api({ action: 'load', since: rev });
    setState('offline', false);
    if (!res || !res.ok) { if (res && res.error === 'code') setState('badcode', true); else setState('server', true); return; }
    setState('badcode', false); setState('server', false);
    if (rev === 0) { const keep = buildBackup(); applyData({ ...keep, events: {}, comments: {}, retex: {}, history: {}, templates: {} }); }
    (res.docs || []).forEach(applyDoc);
    rev = num(res.rev, rev);
    if (!S.loaded) { S.loaded = true; setState('slow', false); }
    persist(); render();
  } catch (e) { setState('offline', true); updateQueueState(); }
  finally { pulling = false; }
}

/* ---------- Écritures ---------- */
// Une cellule Google Sheets contient au plus 50 000 caractères : on refuse avant
const MAX_EVENT_CHARS = 44000;
function tooBig(ev) {
  if (JSON.stringify(strip(ev)).length <= MAX_EVENT_CHARS) return false;
  toast('Modification refusée : cet événement est trop volumineux.'); setState('big', true); return true;
}
// Tout document écrit est d'abord normalisé : l'app, le Sheet et les sauvegardes ont toujours la même forme
function putEvent(ev) {
  ev = normEvent({ ...ev, v: SCHEMA }, ev.id);
  if (tooBig(ev)) return;
  S.events[ev.id] = ev; render();
  const { id, ...body } = strip(ev);
  send({ op: 'set', coll: 'events', id, data: body });
}
function patchEvent(id, partial) {
  if (!S.events[id]) { toast('Cet événement a été supprimé par un autre membre.'); return; }
  const prev = S.events[id], next = normEvent(deepMerge(clone(prev), partial), id);
  if ('date' in partial && isISODate(partial.date)) delete next._noDate;
  if (tooBig(next)) return;
  S.events[id] = next;
  logChanges(id, historyFor(prev, partial));
  render();
  send({ op: 'update', coll: 'events', id, data: partial });
}
// Ce qu'une modification change de visible : statut, échéance, responsable, intitulé, ajout, suppression, jour J
function historyFor(prev, partial) {
  const out = [];
  if ('date' in partial && partial.date !== prev.date && isISODate(partial.date)) out.push({ kind: 'date', from: prev.date, to: partial.date });
  const created = [];
  for (const [tid, ch] of Object.entries(partial.tasks || {})) {
    if (!isObj(ch)) continue;
    const before = prev.tasks && prev.tasks[tid];
    if (!before || before.deleted) { if (ch.deleted !== true && ch.title) created.push({ kind: 'created', taskId: tid, task: ch.title }); continue; }
    if (ch.deleted === true) { out.push({ kind: 'deleted', taskId: tid, task: before.title }); continue; }
    for (const k of ['status', 'offset', 'who', 'title']) if (k in ch && ch[k] !== before[k])
      out.push({ kind: k, taskId: tid, task: k === 'title' ? ch.title : before.title, from: before[k], to: ch[k] });
  }
  // Un modèle appliqué ajoute des dizaines de tâches : une seule ligne suffit
  return out.concat(created.length > 3 ? [{ kind: 'bulk', n: created.length }] : created);
}
function logChanges(eventId, entries) {
  if (!entries.length) return;
  const was = holdRender; holdRender = true;
  const at = Date.now();
  entries.forEach((e, i) => putDoc('history', { ...e, id: uid(), eventId, uid: '', byName: getName(), at: at + i }));
  holdRender = was;
}
function histLine(e) {
  if (e.kind === 'bulk') return `a ajouté ${e.n} tâches`;
  if (e.kind === 'event') return 'a créé l’événement';
  if (e.kind === 'next') return `a préparé l’édition suivante « ${e.task} »`;
  return histPhrase(e, { status: k => STATUS[k] || str(k), j: n => jLabel(num(n, 0)), day: iso => fmtShort.format(parseD(iso)) });
}
// Sans comptes : l'auteur est le prénom choisi sur l'appareil
const whoName = e => e.byName || 'Quelqu’un';
function removeEvent(id) {
  holdRender = true;
  for (const coll of ['comments', 'retex', 'history']) Object.values(S[coll]).filter(d => d.eventId === id).forEach(d => delDoc(coll, d.id));
  holdRender = false;
  delete S.events[id];
  send({ op: 'delete', coll: 'events', id });
  go('evenements');
}
// Commentaires, bilans, historique et modèles : un document par élément
function putDoc(coll, o) {
  o = NORM[coll](o, o.id); if (!o) return;
  S[coll][o.id] = o; render();
  const { id, ...body } = strip(o);
  send({ op: 'set', coll, id, data: body });
}
function delDoc(coll, id) {
  delete S[coll][id]; render();
  send({ op: 'delete', coll, id });
}
function savePoles(list) {
  S.poles = list; render();
  send({ op: 'set', coll: 'config', id: 'poles', data: { list } });
}
const saveTemplate = t => putDoc('templates', t);
const removeTemplate = id => delDoc('templates', id);

/* ---------- Connexion à l'asso ---------- */
// Lien d'invitation : index.html#rejoindre=<adresse et code encodés>. Lu une fois puis effacé de l'adresse.
const b64url = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64url = s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
function inviteLink() {
  if (!cfg || cfg.local) return '';
  const base = location.href.split('#')[0].split('?')[0].replace(/[^/]*$/, '');
  return base + 'index.html#rejoindre=' + b64url(JSON.stringify({ a: cfg.api, c: cfg.code }));
}
// Sécurité : seul un serveur Google Apps Script est accepté (plus le serveur de test, sur l'ordinateur du développeur).
// Un faux lien d'invitation ne peut donc pas relier l'app au serveur d'un pirate.
function validApi(u) {
  return /^https:\/\/script\.google\.com\/(?:a\/macros\/[A-Za-z0-9.-]+|macros)\/s\/[A-Za-z0-9_-]{10,}\/exec$/.test(u)
    || (/^(127\.0\.0\.1|localhost)$/.test(location.hostname) && /^http:\/\/(127\.0\.0\.1|localhost):\d+\/api$/.test(u));
}
const cleanCode = c => str(c).toUpperCase().replace(/[^A-Z0-9]/g, '');
function readInvite() {
  const m = /[#&]rejoindre=([A-Za-z0-9_-]+)/.exec(location.hash);
  if (!m) return null;
  // Le code d'accès quitte aussitôt la barre d'adresse (et l'historique de cette page)
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  try { const o = JSON.parse(unb64url(m[1])); return o && typeof o.a === 'string' && o.c ? { api: o.a, code: String(o.c) } : null; } catch (e) { return null; }
}
async function connect(apiUrl, code) {
  const prev = cfg;
  if (!validApi(str(apiUrl).trim())) return { ok: false, error: 'Cette adresse n’est pas celle d’un serveur Rétroplan : elle doit commencer par https://script.google.com/ et finir par /exec.' };
  cfg = { api: str(apiUrl).trim(), code: cleanCode(code) };
  try {
    const res = await api({ action: 'ping' }, 20000);
    if (res && res.ok && res.app === 'retroplan') {
      cfg.name = str(res.name);
      writeJSON(CFG_KEY, cfg); localStorage.removeItem(CACHE_KEY); writeJSON(QUEUE_KEY, []);
      return { ok: true };
    }
    cfg = prev;
    return { ok: false, error: res && res.error === 'code' ? 'Code d’accès refusé. Vérifie-le auprès du bureau.' : 'Cette adresse ne répond pas comme le serveur Rétroplan.' };
  } catch (e) { cfg = prev; return { ok: false, error: 'Impossible de joindre cette adresse. Vérifie le lien et ta connexion internet.' }; }
}
function disconnect() { localStorage.removeItem(CFG_KEY); localStorage.removeItem(CACHE_KEY); localStorage.removeItem(QUEUE_KEY); cfg = null; queue = []; }

/* ---------- Démarrage de chaque page ---------- */
async function boot() {
  // Sécurité : refuse de s'afficher à l'intérieur d'une autre page (détournement de clics)
  if (window.top !== window.self) { document.body.innerHTML = '<p style="padding:24px">Ouvre Rétroplan dans son propre onglet.</p>'; return; }
  const invite = readInvite();
  if (invite) {
    S.mode = 'connecting'; render();
    const r = await connect(invite.api, invite.code);
    if (r.ok) toast('Bienvenue : l’app est reliée à ton asso.'); else { S.connectError = r.error; S.inviteFailed = invite; }
  }
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === '127.0.0.1' || location.hostname === 'localhost'))
    navigator.serviceWorker.register('sw.js').catch(() => {});
  // Un appareil resté sur l'ancien mode d'essai (exemples) est ramené à l'écran de connexion
  if (cfg && (cfg.demo || cfg.local)) disconnect();
  if (!cfg) { S.mode = 'setup'; S.loaded = true; render(); return; }
  S.mode = 'sync';
  S.loaded = loadCache();
  readUrl(); render();
  const slow = setTimeout(() => { if (!S.loaded) setState('slow', true); }, 6000);
  await pull(); clearTimeout(slow);
  if (!S.loaded) render();
  // Les modifications des autres arrivent toutes les 30 secondes, et dès qu'on revient sur l'app
  setInterval(() => { if (!document.hidden) pull(); }, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) pull(); });
  window.addEventListener('online', () => { flush(); pull(); });
}
