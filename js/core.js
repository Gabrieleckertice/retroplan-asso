
/* ---------- Données de base ---------- */
const DAY = 86400000;
const RANGE_MIN = -90, RANGE_MAX = 7;
const STATUS = { todo: 'À faire', doing: 'En cours', done: 'Fait' };

const DEFAULT_POLES = [
  { id: 'admin', name: 'Administratif', color: '#6B5BD6' },
  { id: 'logi', name: 'Logistique', color: '#2E86C1' },
  { id: 'com', name: 'Com', color: '#D2457A' },
  { id: 'treso', name: 'Trésorerie', color: '#1E9468' },
  { id: 'parte', name: 'Partenariats', color: '#D97A1B' },
  { id: 'benev', name: 'Bénévoles', color: '#7F8C3A' },
];

// t: [intitulé, J, durée en jours, pôle, note]
const BUILTIN_TEMPLATES = {
  soiree: { name: 'Soirée', tasks: [
    ['Fixer le thème et le budget prévisionnel', -75, 3, 'treso', 'À valider en réunion de bureau.'],
    ['Réserver la salle et signer la convention', -60, 7, 'logi', ''],
    ['Démarcher les partenaires (bars, sponsors)', -50, 15, 'parte', ''],
    ['Demander l’autorisation de buvette temporaire en mairie', -45, 1, 'admin', 'Au moins 15 jours avant, mieux vaut s’y prendre tôt.'],
    ['Vérifier l’assurance responsabilité civile', -40, 1, 'admin', ''],
    ['Réserver DJ, sono et éclairage', -40, 5, 'logi', ''],
    ['Déclarer la diffusion musicale à la SACEM', -30, 1, 'admin', ''],
    ['Ouvrir la billetterie en ligne', -30, 1, 'treso', ''],
    ['Publier l’affiche et l’événement sur les réseaux', -28, 21, 'com', ''],
    ['Recruter les bénévoles et faire le planning des créneaux', -21, 7, 'benev', ''],
    ['Prévoir la sécurité et la prévention (agents, Sam)', -21, 3, 'logi', ''],
    ['Commander boissons et consommables de la buvette', -10, 2, 'logi', ''],
    ['Relance réseaux sociaux', -7, 1, 'com', ''],
    ['Brief bénévoles et fiche d’urgence', -2, 1, 'benev', ''],
    ['Retirer le fond de caisse', -1, 1, 'treso', ''],
    ['Rangement et état des lieux de sortie', 1, 1, 'logi', ''],
    ['Bilan financier et remerciements partenaires', 7, 3, 'treso', ''],
  ]},
  gala: { name: 'Gala', tasks: [
    ['Choisir le lieu et signer le contrat', -90, 10, 'logi', ''],
    ['Valider le budget en bureau', -85, 1, 'treso', ''],
    ['Demander trois devis traiteur', -75, 10, 'logi', ''],
    ['Démarcher les sponsors', -70, 25, 'parte', ''],
    ['Choisir le traiteur et verser l’acompte', -60, 1, 'treso', ''],
    ['Réserver le photographe', -50, 1, 'com', ''],
    ['Ouvrir la billetterie', -45, 1, 'treso', ''],
    ['Souscrire l’assurance événement', -45, 1, 'admin', ''],
    ['Teaser et affiches', -40, 30, 'com', ''],
    ['Déclarer la diffusion musicale à la SACEM', -30, 1, 'admin', ''],
    ['Réserver les navettes', -30, 3, 'logi', ''],
    ['Plan de table et décoration', -14, 7, 'logi', ''],
    ['Planning des bénévoles', -14, 3, 'benev', ''],
    ['Confirmer le nombre de couverts au traiteur', -7, 1, 'logi', ''],
    ['Imprimer les listes d’entrée et badges', -3, 1, 'com', ''],
    ['Montage de la déco', -1, 1, 'logi', ''],
    ['Démontage et rangement', 1, 1, 'logi', ''],
    ['Bilan et envoi des photos', 7, 3, 'com', ''],
  ]},
  tournoi: { name: 'Tournoi', tasks: [
    ['Réserver le gymnase ou les terrains', -75, 5, 'logi', ''],
    ['Rédiger le règlement du tournoi', -60, 7, 'admin', ''],
    ['Déclarer la manifestation (mairie, fédération)', -50, 1, 'admin', ''],
    ['Ouvrir les inscriptions des équipes', -45, 35, 'com', ''],
    ['Trouver des lots auprès des sponsors', -40, 20, 'parte', ''],
    ['Vérifier l’assurance', -40, 1, 'admin', ''],
    ['Commander trophées et médailles', -30, 1, 'treso', ''],
    ['Trouver les arbitres', -30, 10, 'benev', ''],
    ['Prévoir un poste de secours', -30, 3, 'logi', ''],
    ['Demander l’autorisation de buvette', -30, 1, 'admin', ''],
    ['Clôturer les inscriptions et tirer les poules', -10, 1, 'com', ''],
    ['Courses pour la buvette', -3, 1, 'logi', ''],
    ['Afficher le planning des matchs', -2, 1, 'com', ''],
    ['Rangement du gymnase', 1, 1, 'logi', ''],
    ['Publier les résultats et photos', 2, 1, 'com', ''],
  ]},
  conference: { name: 'Conférence', tasks: [
    ['Définir le thème et la liste d’intervenants', -90, 7, 'admin', ''],
    ['Inviter les intervenants', -75, 15, 'parte', ''],
    ['Réserver l’amphithéâtre', -60, 1, 'logi', ''],
    ['Réserver le matériel audiovisuel', -30, 1, 'logi', ''],
    ['Ouvrir les inscriptions', -30, 1, 'com', ''],
    ['Campagne de communication', -28, 25, 'com', ''],
    ['Organiser la venue des intervenants (train, hôtel)', -21, 5, 'logi', ''],
    ['Commander le pot de fin', -14, 1, 'treso', ''],
    ['Préparer badges et signalétique', -5, 2, 'com', ''],
    ['Relancer les inscrits', -3, 1, 'com', ''],
    ['Accueillir les intervenants', 0, 1, 'benev', ''],
    ['Remerciements et mise en ligne du replay', 3, 3, 'com', ''],
  ]},
  weekend: { name: 'Week-end', tasks: [
    ['Réserver l’hébergement et verser l’acompte', -90, 7, 'logi', ''],
    ['Réserver le car', -75, 5, 'logi', ''],
    ['Ouvrir les inscriptions et le paiement', -60, 30, 'treso', ''],
    ['Collecter les autorisations et fiches sanitaires', -45, 30, 'admin', ''],
    ['Construire le planning des activités', -40, 10, 'benev', ''],
    ['Recruter les encadrants', -30, 10, 'benev', ''],
    ['Faire les courses des repas', -5, 2, 'logi', ''],
    ['Préparer la fiche des contacts d’urgence', -3, 1, 'admin', ''],
    ['État des lieux et retour', 2, 1, 'logi', ''],
    ['Bilan financier', 7, 3, 'treso', ''],
  ]},
};

/* ---------- Utilitaires ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const clone = o => JSON.parse(JSON.stringify(o));
const parseD = s => { const [y, m, d] = String(s).split('-').map(Number); return Date.UTC(y, m - 1, d); };
const isoOf = t => new Date(t).toISOString().slice(0, 10);
const today = () => { const n = new Date(); return Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()); };
// Une date invalide affiche « — » au lieu de faire planter toute la page
const mkFmt = o => { const f = new Intl.DateTimeFormat('fr-FR', o); return { format: t => { try { return f.format(t); } catch (e) { return '—'; } } }; };
const fmtShort = mkFmt({ weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const fmtLong = mkFmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const fmtDay = mkFmt({ day: 'numeric', month: 'short', timeZone: 'UTC' });
const fmtEur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const jLabel = o => o === 0 ? 'J' : (o < 0 ? 'J' + o : 'J+' + o);
const dueOf = (ev, t) => parseD(ev.date) + t.offset * DAY;
const isLate = (ev, t) => t.status !== 'done' && dueOf(ev, t) < today();
const thisWeek = (ev, t) => { const d = dueOf(ev, t), n = today(); return t.status !== 'done' && d >= n && d < n + 7 * DAY; };
const tasksOf = ev => Object.values(ev.tasks || {}).filter(t => !t.deleted).sort((a, b) => a.offset - b.offset || a.title.localeCompare(b.title));
// Sécurité : clés qui modifieraient le prototype d'un objet (« pollution de prototype »)
const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
// Sécurité : un identifiant est inséré tel quel dans la page (data-id="…") ; il doit donc être inoffensif.
// Même règle que le serveur : lettres, chiffres et _ - . ~ : @ +, premier caractère alphanumérique.
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_\-.~:@+]{0,199}$/;
const safeId = id => typeof id === 'string' && SAFE_ID.test(id) && !BAD_KEYS.has(id);
// Référence vers un autre élément : vide si elle n'est pas inoffensive
const refId = v => (safeId(v) ? v : '');
const deepMerge = (a, b) => { for (const k of Object.keys(b)) { if (BAD_KEYS.has(k)) continue; const v = b[k]; a[k] = (v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object') ? deepMerge({ ...a[k] }, v) : v; } return a; };

function countdown(ev) {
  const d = Math.round((parseD(ev.date) - today()) / DAY);
  if (d > 0) return { text: 'J-' + d, sub: d === 1 ? 'demain' : `dans ${d} jours` };
  if (d === 0) return { text: 'Jour J', sub: 'c’est aujourd’hui', mark: true };
  return { text: 'J+' + (-d), sub: 'événement passé' };
}
function stats(ev) {
  const ts = tasksOf(ev), done = ts.filter(t => t.status === 'done').length, doing = ts.filter(t => t.status === 'doing').length;
  return { ts, total: ts.length, done, doing, late: ts.filter(t => isLate(ev, t)).length, pct: ts.length ? Math.round(done / ts.length * 100) : 0 };
}
function templateList() {
  const b = Object.entries(BUILTIN_TEMPLATES).map(([id, t]) => ({ id, name: t.name, builtin: true, tasks: t.tasks.map(([title, offset, duration, pole, note]) => ({ title, offset, duration, pole, note })) }));
  const c = Object.values(S.templates).map(t => ({ ...t, builtin: false }));
  return [...b, ...c];
}
function tasksFromTemplate(tplId) {
  const tpl = templateList().find(t => t.id === tplId);
  const out = {};
  (tpl ? tpl.tasks : []).forEach(t => { const id = uid(); out[id] = { id, title: t.title, offset: t.offset, duration: t.duration || 1, pole: t.pole || '', who: '', status: 'todo', note: t.note || '' }; });
  return out;
}
const SEV = { 1: 'Gênant', 2: 'Sérieux', 3: 'Bloquant' };
// Les anciens commentaires et bilans sont dans l'événement (format 1), les nouveaux dans leur collection (format 2)
const commentsOf = ev => [...Object.values(ev.comments || {}), ...Object.values(S.comments).filter(c => c.eventId === ev.id)].filter(c => !c.deleted).sort((a, b) => b.at - a.at);
const retexOf = ev => [...Object.values(ev.retex || {}), ...Object.values(S.retex).filter(r => r.eventId === ev.id)].filter(r => !r.deleted).sort((a, b) => b.sev - a.sev || b.at - a.at);
// Problèmes notés sur les autres événements, du même type d'abord
function pastRetex(ev, sameTypeOnly) {
  return Object.values(S.events).filter(e => e.id !== ev.id && (!sameTypeOnly || e.type === ev.type))
    .flatMap(e => retexOf(e).map(r => ({ ...r, ev: e })))
    .sort((a, b) => (b.ev.id === ev.prevId) - (a.ev.id === ev.prevId) || (b.ev.type === ev.type) - (a.ev.type === ev.type) || b.sev - a.sev || parseD(b.ev.date) - parseD(a.ev.date));
}
const fmtWhen = mkFmt({ day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const getName = () => { try { return localStorage.getItem('retroplan-name') || ''; } catch (e) { return ''; } };
const setName = n => { try { localStorage.setItem('retroplan-name', n); } catch (e) {} };
const poleOf = id =>S.poles.find(p => p.id === id) || { id: '', name: 'Sans pôle', color: '#8A93A6' };

/* ---------- Format des données ---------- */
// Tout ce qui est lu (base partagée, appareil, sauvegarde) passe par ces fonctions :
// un champ manquant ou d'un mauvais type reçoit une valeur sûre au lieu de faire planter l'affichage.
// Les clés commençant par « _ » sont calculées à la lecture et ne sont jamais enregistrées.
const SCHEMA = 2;
const str = (v, d = '') => typeof v === 'string' ? v : (v == null || typeof v === 'object' ? d : String(v));
const num = (v, d) => { const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v; return typeof n === 'number' && Number.isFinite(n) ? n : d; };
const clampInt = (v, d, lo, hi) => Math.min(hi, Math.max(lo, Math.round(num(v, d))));
const isISODate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(parseD(s)) && isoOf(parseD(s)) === s;
const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
const strip = o => { const r = {}; for (const k in o) if (k[0] !== '_') r[k] = o[k]; return r; };

// Accepte un objet {id: élément} ou un ancien tableau, et ignore ce qui n'est pas un objet.
// Sécurité : un élément dont l'identifiant n'est pas inoffensif (code HTML, __proto__…) est écarté.
function toMap(v, norm) {
  const entries = Array.isArray(v) ? v.map((x, i) => [isObj(x) && typeof x.id === 'string' && x.id ? x.id : 'item' + i, x]) : isObj(v) ? Object.entries(v) : [];
  const out = {};
  for (const [id, x] of entries) if (safeId(id) && isObj(x)) { const n = norm(x, id); if (n) out[id] = n; }
  return out;
}
function normTask(t, id) {
  const status = Object.hasOwn(STATUS, t.status) ? t.status : t.done === true ? 'done' : 'todo';
  return { ...t, id, title: str(t.title).trim() || 'Tâche sans titre', offset: clampInt(t.offset, 0, -3650, 3650), duration: clampInt(t.duration, 1, 1, 365),
    pole: refId(t.pole), who: str(t.who).trim(), status, note: str(t.note), after: refId(t.after), checklist: toMap(t.checklist, normStep), deleted: t.deleted === true };
}
// Une étape de la checklist d'une tâche
function normStep(c, id) {
  const text = str(c.text).trim();
  if (!text && c.deleted !== true) return null;
  return { ...c, id, text, done: c.done === true, at: num(c.at, 0), deleted: c.deleted === true };
}
function normComment(c, id) {
  const text = str(c.text).trim();
  if (!text && c.deleted !== true) return null;
  return { ...c, id, eventId: refId(c.eventId), author: str(c.author).trim() || 'Anonyme', text, taskId: refId(c.taskId), at: num(c.at, 0), deleted: c.deleted === true };
}
function normRetex(r, id) {
  return { ...r, id, eventId: refId(r.eventId), title: str(r.title).trim() || 'Problème sans titre', sev: clampInt(r.sev, 2, 1, 3), pole: refId(r.pole),
    what: str(r.what), fix: str(r.fix), author: str(r.author).trim(), at: num(r.at, 0), deleted: r.deleted === true };
}
function normEvent(e, id) {
  const okDate = isISODate(e.date);
  const ev = { ...e, id, name: str(e.name).trim() || 'Événement sans nom', type: str(e.type).trim() || 'autre', date: okDate ? e.date : isoOf(today()),
    lieu: str(e.lieu), budget: Math.max(0, num(e.budget, 0)), createdAt: num(e.createdAt, 0),
    prevId: refId(e.prevId), budgetByPole: normBudget(e.budgetByPole), tasks: toMap(e.tasks, normTask), comments: toMap(e.comments, normComment), retex: toMap(e.retex, normRetex) };
  if (okDate && !e._noDate) delete ev._noDate; else ev._noDate = true;
  return ev;
}
// Budget par pôle : { idPôle: { planned, actual } } en euros, jamais négatifs
function normBudget(b) {
  const out = {};
  if (isObj(b)) for (const [k, v] of Object.entries(b)) if (safeId(k) && isObj(v)) out[k] = { planned: Math.max(0, num(v.planned, 0)), actual: Math.max(0, num(v.actual, 0)) };
  return out;
}
// Une ligne d'historique : qui (uid du compte, sinon prénom saisi), quoi, quand
function normHist(h, id) {
  const val = v => typeof v === 'string' || typeof v === 'number' ? v : '';
  return { ...h, id, eventId: refId(h.eventId), taskId: refId(h.taskId), kind: str(h.kind), task: str(h.task), from: val(h.from), to: val(h.to),
    n: Math.max(0, num(h.n, 0)), uid: str(h.uid), byName: str(h.byName), at: num(h.at, 0) };
}
function normTemplate(t, id) {
  const tasks = (Array.isArray(t.tasks) ? t.tasks : []).filter(isObj).map(x => ({ title: str(x.title).trim() || 'Tâche sans titre', offset: clampInt(x.offset, 0, -3650, 3650), duration: clampInt(x.duration, 1, 1, 365), pole: refId(x.pole), note: str(x.note) }));
  return { ...t, id, name: str(t.name).trim() || 'Modèle sans nom', tasks };
}
function normPoles(list) {
  const seen = new Set(), out = [];
  (Array.isArray(list) ? list : []).filter(isObj).forEach(p => {
    let id = str(p.id).trim(); if (!safeId(id)) id = uid(); if (seen.has(id)) return; seen.add(id);
    out.push({ id, name: str(p.name).trim() || 'Pôle sans nom', color: /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : '#8A93A6' });
  });
  return out.length ? out : clone(DEFAULT_POLES);
}

// Modifications simultanées : on compare la tâche à l'ouverture (orig), sa version actuelle (cur) et la saisie (next).
// Seuls les champs modifiés sont envoyés ; un champ changé des deux côtés est un conflit à trancher.
const TASK_FIELDS = { title: 'Intitulé', offset: 'Échéance', duration: 'Durée', pole: 'Pôle', who: 'Responsable', status: 'Statut', note: 'Note', after: 'À faire après' };
function taskSavePlan(orig, cur, next) {
  const changed = {}, clashes = [];
  for (const k in TASK_FIELDS) if (next[k] !== orig[k]) changed[k] = next[k];
  if (!cur || cur.deleted) return { changed, clashes, gone: true };
  for (const k in changed) if (cur[k] !== orig[k] && cur[k] !== next[k]) clashes.push(k);
  return { changed, clashes, gone: false };
}
const fieldText = (k, v) => k === 'offset' ? jLabel(v) : k === 'pole' ? poleOf(v).name : k === 'status' ? STATUS[v] : k === 'duration' ? v + ' j'
  : k === 'after' ? (v && S.events[modalTask?.evId]?.tasks?.[v]?.title || '(aucune)') : (str(v).trim() || '(vide)');

// Phrase d'historique (fonction rédigée par Gemini 3.8 Flash, relue et testée)
function histPhrase(e, h) {
  if (!e) return '';
  const task = e.task;
  const t = task ? '« ' + task + ' »' : 'une tâche';
  const getStatus = v => (h && typeof h.status === 'function' ? h.status(v) : (v != null ? v : ''));
  const getJ = v => (h && typeof h.j === 'function' ? h.j(v) : (v != null ? v : ''));
  const getDay = v => (h && typeof h.day === 'function' ? h.day(v) : (v != null ? v : ''));

  switch (e.kind) {
    case 'status':
      if (e.to === 'done') {
        return 'a marqué ' + t + ' comme faite';
      }
      return 'a passé ' + t + ' de ' + getStatus(e.from) + ' à ' + getStatus(e.to);

    case 'offset':
      return 'a déplacé ' + t + ' de ' + getJ(e.from) + ' à ' + getJ(e.to);

    case 'who': {
      const from = e.from != null ? String(e.from) : '';
      const to = e.to != null ? String(e.to) : '';
      if (!to) {
        return 'a retiré le responsable de ' + t;
      }
      if (!from) {
        return 'a confié ' + t + ' à ' + to;
      }
      return 'a confié ' + t + ' à ' + to + ' (avant : ' + from + ')';
    }

    case 'created':
      return 'a ajouté ' + t;

    case 'deleted':
      return 'a supprimé ' + t;

    case 'title':
      return 'a renommé « ' + (e.from != null ? e.from : '') + ' » en « ' + (e.to != null ? e.to : '') + ' »';

    case 'date':
      return 'a déplacé le jour J du ' + getDay(e.from) + ' au ' + getDay(e.to);

    default:
      return task ? 'a modifié « ' + task + ' »' : 'a modifié l’événement';
  }
}

/* ---------- Personnes, étapes, dépendances ---------- */
// « Camille », « camille » et « Camille  » désignent la même personne
const whoKey = s => str(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const MINE_FROM = () => today() - 30 * DAY;
function knownPeople() {
  const m = new Map(), from = MINE_FROM();
  for (const ev of Object.values(S.events)) for (const t of tasksOf(ev)) {
    const k = whoKey(t.who); if (!k) continue;
    const e = m.get(k) || { key: k, spell: {}, open: 0 };
    // « x à faire » compte comme la page Mes tâches : événements récents ou à venir
    e.spell[t.who] = (e.spell[t.who] || 0) + 1; if (t.status !== 'done' && parseD(ev.date) >= from) e.open++;
    m.set(k, e);
  }
  // Orthographe affichée : la plus fréquente
  return [...m.values()].map(e => ({ key: e.key, name: Object.entries(e.spell).sort((a, b) => b[1] - a[1])[0][0], open: e.open })).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}
const canonWho = s => (knownPeople().find(p => p.key === whoKey(s)) || {}).name || str(s).trim();
// Les tâches d'une personne sur tous les événements récents ou à venir, rangées par urgence
function myTasks(name) {
  const k = whoKey(name), out = { late: [], week: [], later: [], done: [] };
  if (!k) return out;
  const from = MINE_FROM();
  for (const ev of Object.values(S.events)) {
    if (parseD(ev.date) < from) continue;
    for (const t of tasksOf(ev)) if (whoKey(t.who) === k) {
      const x = { ev, t, due: dueOf(ev, t) };
      (t.status === 'done' ? out.done : isLate(ev, t) ? out.late : thisWeek(ev, t) ? out.week : out.later).push(x);
    }
  }
  const by = (a, b) => a.due - b.due || a.t.title.localeCompare(b.t.title);
  out.late.sort(by); out.week.sort(by); out.later.sort(by); out.done.sort((a, b) => b.due - a.due);
  return out;
}
const stepsOf = t => Object.values(t.checklist || {}).filter(c => !c.deleted).sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
const predOf = (ev, t) => { const p = t.after && ev.tasks && ev.tasks[t.after]; return p && !p.deleted && p.id !== t.id ? p : null; };
// Ordre incohérent : la tâche est prévue avant celle dont elle dépend
const orderIssue = (ev, t) => { const p = predOf(ev, t); return p && t.offset < p.offset ? p : null; };
// Vrai si t (ou une tâche dont elle dépend, de proche en proche) est la tâche id : la choisir créerait une boucle
function chainHas(ev, t, id) { let cur = t, n = 0; while (cur && n++ < 500) { if (cur.id === id) return true; cur = predOf(ev, cur); } return false; }

/* ---------- Édition suivante ---------- */
function suggestNextName(name) {
  let n = str(name).replace(/\s*\(exemple\)\s*$/i, '');
  const season = n.replace(/\b(\d{2})\/(\d{2})\b/, (m, a, b) => +b === (+a + 1) % 100 ? `${String(+b).padStart(2, '0')}/${String((+b + 1) % 100).padStart(2, '0')}` : m);
  if (season !== n) return season;
  const year = n.replace(/\b(20\d{2})\b/g, y => String(+y + 1));
  return year !== n ? year : n + ' (édition suivante)';
}
function nextYearDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return isoOf(Date.UTC(y + 1, m - 1, m === 2 && d === 29 ? 28 : d));
}
// Copie d'un événement pour l'année suivante : tâches remises à zéro, dépendances conservées, retours transformés en points de vigilance
function nextEdition(src, opts) {
  const idMap = {}, tasks = {};
  tasksOf(src).forEach(t => { idMap[t.id] = uid(); });
  for (const t of tasksOf(src)) {
    const id = idMap[t.id], checklist = {};
    stepsOf(t).forEach(c => { const cid = uid(); checklist[cid] = { id: cid, text: c.text, done: false, at: c.at }; });
    tasks[id] = { id, title: t.title, offset: t.offset, duration: t.duration, pole: t.pole, who: opts.keepWho ? t.who : '', status: 'todo', note: t.note, after: idMap[t.after] || '', checklist };
  }
  if (opts.retexTasks) retexOf(src).forEach(r => {
    const id = uid();
    tasks[id] = { id, title: (r.fix || 'Éviter : ' + r.title).slice(0, 140), offset: -30, duration: 1, pole: r.pole, who: '', status: 'todo', vigil: true,
      note: `Point de vigilance de « ${src.name} » : ${r.title}${r.what ? ' — ' + r.what : ''}` };
  });
  return { id: uid(), name: opts.name, type: src.type, date: opts.date, lieu: src.lieu, budget: src.budget, createdAt: Date.now(), prevId: src.id, tasks, comments: {}, retex: {} };
}

/* ---------- Calendrier (.ics) ---------- */
const icsEscape = s => str(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
// RFC 5545 : 75 octets maximum par ligne, suites précédées d'un espace, sans couper un caractère
function icsFold(line) {
  const enc = new TextEncoder(); if (enc.encode(line).length <= 75) return line;
  const out = []; let cur = '', size = 0, lim = 75;
  for (const ch of line) { const n = enc.encode(ch).length; if (size + n > lim) { out.push(cur); cur = ''; size = 0; lim = 74; } cur += ch; size += n; }
  out.push(cur); return out.join('\r\n ');
}
const icsDate = t => isoOf(t).replace(/-/g, '');
function buildICS(calName, items) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Retroplan Asso//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:' + icsEscape(calName)];
  for (const it of items) L.push('BEGIN:VEVENT', 'UID:' + it.uid + '@retroplan', 'DTSTAMP:' + stamp, 'DTSTART;VALUE=DATE:' + icsDate(it.start),
    'DTEND;VALUE=DATE:' + icsDate(it.start + Math.max(1, it.days || 1) * DAY), 'SUMMARY:' + icsEscape(it.summary),
    ...(it.description ? ['DESCRIPTION:' + icsEscape(it.description)] : []), 'TRANSP:TRANSPARENT', 'END:VEVENT');
  L.push('END:VCALENDAR');
  return L.map(icsFold).join('\r\n') + '\r\n';
}
function taskICSItem(ev, t) {
  const p = poleOf(t.pole);
  return { uid: ev.id + '-' + t.id, start: dueOf(ev, t), days: 1, summary: `${t.title} · ${ev.name}`,
    description: [`Échéance ${jLabel(t.offset)} de « ${ev.name} » (jour J : ${fmtLong.format(parseD(ev.date))})`, `Pôle : ${p.name}`, t.who && `Responsable : ${t.who}`, t.note].filter(Boolean).join('\n') };
}
const eventICSItems = ev => [{ uid: ev.id + '-jourj', start: parseD(ev.date), days: 1, summary: `Jour J · ${ev.name}`, description: ev.lieu ? 'Lieu : ' + ev.lieu : '' },
  ...tasksOf(ev).filter(t => t.status !== 'done').map(t => taskICSItem(ev, t))];
const mineICSItems = name => { const g = myTasks(name); return [...g.late, ...g.week, ...g.later].map(x => taskICSItem(x.ev, x.t)); };
// Archive .zip sans compression, au cas où l'app refuse l'extension .ics au téléchargement
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xFFFFFFFF; for (const x of b) c = CRC_TABLE[(c ^ x) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function zipOne(name, text) {
  const enc = new TextEncoder(), nb = enc.encode(name), data = enc.encode(text), crc = crc32(data);
  const head = (size, sig, central) => {
    const v = new DataView(new ArrayBuffer(size)); let o = 0;
    const u16 = x => { v.setUint16(o, x, true); o += 2; }, u32 = x => { v.setUint32(o, x, true); o += 4; };
    u32(sig); if (central) u16(20); u16(20); u16(0x0800); u16(0); u16(0); u16(0x21); u32(crc); u32(data.length); u32(data.length); u16(nb.length); u16(0);
    if (central) { u16(0); u16(0); u16(0); u32(0); u32(0); }
    return new Uint8Array(v.buffer);
  };
  const local = head(30, 0x04034b50, false), central = head(46, 0x02014b50, true);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, 1, true); end.setUint16(10, 1, true); end.setUint32(12, 46 + nb.length, true); end.setUint32(16, 30 + nb.length + data.length, true);
  return new Blob([local, nb, data, central, nb, new Uint8Array(end.buffer)], { type: 'application/zip' });
}
const fileSlug = s => str(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'calendrier';

/* ---------- Sauvegarde ---------- */
function buildBackup() {
  const pick = m => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, strip(v)]));
  return { app: 'retroplan', format: SCHEMA, exportedAt: new Date().toISOString(), events: pick(S.events), comments: pick(S.comments), retex: pick(S.retex), history: pick(S.history), templates: pick(S.templates), poles: S.poles.map(strip) };
}
function parseBackup(text) {
  let raw;
  try { raw = JSON.parse(text); } catch (e) { return { error: 'Ce fichier n’est pas lisible : ce n’est pas un fichier JSON valide.' }; }
  if (!isObj(raw) || raw.app !== 'retroplan' || !isObj(raw.events)) return { error: 'Ce fichier n’est pas une sauvegarde du Rétroplan.' };
  if (num(raw.format, 1) > SCHEMA) return { error: 'Cette sauvegarde vient d’une version plus récente de l’app. Mets l’app à jour avant de l’importer.' };
  return { data: { exportedAt: str(raw.exportedAt), events: toMap(raw.events, normEvent), comments: toMap(raw.comments, normComment), retex: toMap(raw.retex, normRetex), history: toMap(raw.history, normHist),
    templates: toMap(raw.templates, normTemplate), poles: Array.isArray(raw.poles) && raw.poles.length ? normPoles(raw.poles) : null } };
}
// mode « add » : n'ajoute que les éléments absents ; mode « replace » : la sauvegarde remplace aussi les éléments de même identifiant
function planImport(data, mode, cur) {
  const ops = []; let added = 0, replaced = 0, skipped = 0;
  for (const coll of ['events', 'comments', 'retex', 'history', 'templates']) for (const [id, doc] of Object.entries(data[coll] || {})) {
    const exists = !!cur[coll][id];
    if (exists && mode !== 'replace') { if (coll === 'events') skipped++; continue; }
    ops.push({ coll, doc });
    if (coll === 'events') exists ? replaced++ : added++;
  }
  if (mode === 'replace' && data.poles) ops.push({ coll: 'poles', doc: data.poles });
  return { ops, added, replaced, skipped };
}

/* ---------- Budget ---------- */
const fmtEurCents = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const eur = n => Number.isInteger(n) ? fmtEur.format(n) : fmtEurCents.format(n);
const signedEur = n => (n > 0 ? '+' : n < 0 ? '−' : '') + eur(Math.abs(Math.round(n * 100) / 100));
function budgetRows(ev) {
  const b = ev.budgetByPole || {};
  const ids = [...S.poles.map(p => p.id), ...Object.keys(b).filter(k => k && !S.poles.some(p => p.id === k))];
  return ids.map(id => ({ id, pole: S.poles.find(p => p.id === id) || { id, name: 'Pôle supprimé', color: '#8A93A6' }, planned: b[id] ? b[id].planned : 0, actual: b[id] ? b[id].actual : 0 }));
}
function budgetTotals(ev) {
  const rows = budgetRows(ev);
  return { rows, planned: rows.reduce((s, r) => s + r.planned, 0), actual: rows.reduce((s, r) => s + r.actual, 0) };
}
