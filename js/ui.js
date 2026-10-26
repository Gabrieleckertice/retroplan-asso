/* ---------- Pages ---------- */
// Une page = un fichier HTML ; chacun déclare la sienne dans <body data-page="…">
const PAGE = document.body.dataset.page;
const FILES = { 'mes-taches': 'index.html', evenements: 'evenements.html', retours: 'retours.html', parametres: 'parametres.html' };
const NAV_OF = { mine: 'mes-taches', home: 'evenements', event: 'evenements', retex: 'retours', settings: 'parametres' };
function readUrl() {
  S.view = PAGE;
  const q = new URLSearchParams(location.search);
  if (PAGE === 'event') { S.current = q.get('id'); const tab = q.get('tab'); if (tab) S.tab = tab; }
}
// Vers une page (« evenements »…) ou un événement (son identifiant), avec un onglet éventuel
function go(token, tab) {
  closeModal(); modalTask = null;
  location.href = FILES[token] || 'evenement.html?id=' + encodeURIComponent(token) + (tab && tab !== 'dash' ? '&tab=' + tab : '');
}
// Changer d'onglet ne recharge pas la page, mais l'adresse le garde (retour arrière, favori, rechargement)
function setTab(t) {
  S.tab = t;
  try { history.replaceState(null, '', 'evenement.html?id=' + encodeURIComponent(S.current) + (t !== 'dash' ? '&tab=' + t : '')); } catch (e) {}
  render();
}
const loadingCard = msg => `<div class="card loading"><span class="spinner" aria-hidden="true"></span><span>${esc(msg)}</span></div>`;

/* ---------- Rendu ---------- */
function render() {
  const app = $('#app'); if (!app) return;
  document.querySelectorAll('[data-to]').forEach(b => b.dataset.to === NAV_OF[PAGE] ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'));
  if (S.mode === 'connecting') { app.innerHTML = loadingCard('Connexion à ton asso…'); return; }
  if (S.mode === 'setup') { app.innerHTML = viewSetup(); return; }
  // Tant que les données de l'asso ne sont pas arrivées, on garde l'écran de chargement plutôt qu'un faux « aucun événement »
  if (S.mode === 'loading' || !S.loaded || holdRender) return;
  if (S.view === 'event' && !S.events[S.current] && modalTask && modalTask.evId === S.current) { toast('Cet événement a été supprimé par un autre membre.'); closeModal(); modalTask = null; }
  const draft = saveDrafts();
  let html;
  try {
    html = S.view === 'event' ? (S.events[S.current] ? viewEvent(S.events[S.current]) : viewMissing())
      : S.view === 'settings' ? viewSettings() : S.view === 'retex' ? viewAllRetex() : S.view === 'mine' ? viewMine() : viewHome();
  } catch (err) { console.error(err); html = viewCrash(); }
  app.innerHTML = html;
  restoreDrafts(draft);
  renderFab();
  const tabs = $('.tabs');
  if (tabs) { const a = tabs.querySelector('[aria-selected="true"]'); if (a && a.offsetLeft + a.offsetWidth > tabs.clientWidth) tabs.scrollLeft = a.offsetLeft - 16; markTabsOverflow(tabs); }
  if (modalTask && !modalTask.isNew) drawSteps();
  if (S.view === 'event' && S.tab === 'gantt') { try { bindGantt(); } catch (err) { console.error(err); } }
}
function viewMissing() {
  return `<div class="card empty"><h1>Événement introuvable</h1>
    <p class="muted">Il a peut-être été supprimé par un autre membre, ou le lien est incomplet.</p>
    <a class="btn primary" href="evenements.html">Voir tous les événements</a></div>`;
}
// Premier lancement : relier l'app au Google Sheet de l'asso (lien d'invitation, ou adresse + code)
function viewSetup() {
  const f = S.inviteFailed || {};
  return `<div class="card stack pick">
    <span class="eyebrow">Bienvenue</span><h1>Relier l’app à ton asso</h1>
    <p class="muted">Le plus simple : ouvre le <strong>lien d’invitation</strong> envoyé par le bureau, et c’est tout. Sinon, saisis l’adresse du serveur et le code d’accès de l’asso.</p>
    ${S.connectError ? `<div class="notice bad" role="alert">${esc(S.connectError)}</div>` : ''}
    <form id="connect-form" class="stack">
      <label class="f">Adresse du serveur de l’asso<input type="url" id="cx-api" required inputmode="url" autocomplete="off" placeholder="https://script.google.com/macros/s/…/exec" value="${esc(f.api || '')}"></label>
      <label class="f">Code d’accès<input type="text" id="cx-code" required autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="10 caractères, ex. K7P2Q-X4M9R" value="${esc(f.code || '')}"></label>
      <label class="f">Ton prénom<input type="text" id="cx-name" autocomplete="given-name" placeholder="Il signe tes modifications" value="${esc(getName())}"></label>
      <div><button class="btn primary" type="submit" id="cx-go">Se connecter</button></div>
    </form></div>`;
}
// Dernier filet de sécurité : si une vue plante malgré la normalisation, on garde une porte de sortie et la sauvegarde
function viewCrash() {
  return `<div class="card empty"><h1>Cette page ne peut pas s’afficher</h1>
    <p class="muted">Une donnée de cette page est illisible. Tes autres événements ne sont pas touchés. Exporte une sauvegarde par précaution, puis reviens à l’accueil.</p>
    <div class="row" style="justify-content:center">${S.view !== 'mine' ? '<button class="btn primary" data-act="go" data-to="mes-taches">Revenir à mes tâches</button>' : ''}<button class="btn" data-act="export">Exporter une sauvegarde</button></div></div>`;
}
// Un message en cours de frappe survit aux mises à jour en direct des autres membres
const DRAFT_IDS = ['cm-text', 'cm-task', 'rx-title', 'rx-what', 'rx-fix', 'rx-sev', 'rx-pole'];
function saveDrafts() {
  const d = {}; DRAFT_IDS.forEach(id => { const el = document.getElementById(id); if (el) d[id] = el.value; });
  const a = document.activeElement; d._focus = a && a.id;
  // Le champ en cours de saisie (montant, nom…) survit aussi à une mise à jour venue d'un autre membre
  if (a && a.id && a.closest && a.closest('#app') && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.type !== 'checkbox') d._live = a.value;
  try { d._sel = [a.selectionStart, a.selectionEnd]; } catch (e) {}
  return d;
}
function restoreDrafts(d) {
  DRAFT_IDS.forEach(id => { const el = document.getElementById(id); if (el && d[id] != null) el.value = d[id]; });
  if (d._live != null && d._focus && !DRAFT_IDS.includes(d._focus)) { const el = document.getElementById(d._focus); if (el) { el.value = d._live; el.focus(); try { el.setSelectionRange(d._sel[0], d._sel[1]); } catch (e) {} } }
  if (d._focus && DRAFT_IDS.includes(d._focus)) {
    const el = document.getElementById(d._focus); if (!el) return;
    el.focus(); try { if (d._sel && d._sel[0] != null) el.setSelectionRange(d._sel[0], d._sel[1]); } catch (e) {}
  }
}

function renderFab() {
  let fab = $('.fab');
  const want = S.view === 'event' && !S.readOnly && ['dash', 'gantt', 'list'].includes(S.tab);
  if (want && !fab) { fab = document.createElement('button'); fab.className = 'btn primary fab'; fab.dataset.act = 'new-task'; fab.dataset.edit = ''; fab.textContent = '+ Tâche'; document.body.appendChild(fab); }
  if (!want && fab) fab.remove();
}

function taskRow(ev, t, showEvent) {
  const p = poleOf(t.pole), late = isLate(ev, t), steps = stepsOf(t), pre = orderIssue(ev, t);
  const ref = `data-id="${t.id}" data-ev="${ev.id}"`;
  return `<div class="task ${t.status === 'done' ? 'isdone' : ''}">
    <input type="checkbox" class="check" id="chk-${ev.id}-${t.id}" aria-label="Marquer « ${esc(t.title)} » comme fait" data-act="toggle" ${ref} ${t.status === 'done' ? 'checked' : ''} ${S.readOnly ? 'disabled' : ''}>
    <div class="body" data-act="edit-task" ${ref}>
      <div class="title">${esc(t.title)}</div>
      <div class="sub">${showEvent ? `<span class="evtag">${esc(ev.name)}</span>` : ''}<span class="mono">${jLabel(t.offset)}</span><span class="${late ? 'late' : ''}">${esc(fmtShort.format(dueOf(ev, t)))}${late ? ' · en retard' : ''}</span>
      <span><span class="dot" style="background:${esc(p.color)}"></span> ${esc(p.name)}</span>${t.who && !showEvent ? `<span>${esc(t.who)}</span>` : ''}
      ${steps.length ? `<span class="mono">${steps.filter(c => c.done).length}/${steps.length} étapes</span>` : ''}${t.vigil ? '<span class="vigil">Vigilance</span>' : ''}
      ${pre ? `<span class="late" title="Prévue avant sa tâche préalable">Avant « ${esc(pre.title.length > 32 ? pre.title.slice(0, 32) + '…' : pre.title)} »</span>` : ''}</div>
    </div>
    <button class="chip stchip ${t.status}" data-act="cycle" ${ref} title="Changer le statut" ${S.readOnly ? 'disabled' : ''}>${STATUS[t.status]}</button>
  </div>`;
}

// Retours des éditions passées, affichés dans un événement à venir
function lessonsCard(ev, max) {
  if (parseD(ev.date) < today()) return '';
  const all = pastRetex(ev, true);
  if (!all.length) return '';
  const fromPrev = ev.prevId && all.some(r => r.ev.id === ev.prevId);
  return `<section class="card wide"><div class="cardhead"><h2>${fromPrev ? 'Points de vigilance de l’édition précédente' : 'À retenir des éditions passées'}</h2><span class="n">${all.length}</span></div>
    <div>${all.slice(0, max).map(r => rxItem(r, { from: r.ev, target: ev })).join('')}</div>
    ${all.length > max ? `<button class="btn ghost sm" data-act="tab" data-tab="retex">Voir les ${all.length} retours</button>` : ''}</section>`;
}
function rxItem(r, o = {}) {
  const p = poleOf(r.pole);
  return `<div class="rx"><div class="sev s${r.sev}"></div><div>
    <div class="row" style="justify-content:space-between"><strong>${esc(r.title)}</strong><span class="chip ${r.sev === 3 ? 'late' : r.sev === 2 ? 'doing' : 'todo'}">${SEV[r.sev]}</span></div>
    <div class="small muted"><span class="dot" style="background:${esc(p.color)}"></span> ${esc(p.name)}${o.from ? ` · ${esc(o.from.name)}, ${esc(fmtShort.format(parseD(o.from.date)))}` : ''}${r.author ? ` · noté par ${esc(r.author)}` : ''}</div>
    ${r.what ? `<div class="lbl">Ce qui s’est passé</div><p>${esc(r.what)}</p>` : ''}
    ${r.fix ? `<div class="lbl">La prochaine fois</div><div class="fix">${esc(r.fix)}</div>` : ''}
    <div class="row" style="margin-top:8px">
      ${o.target && r.fix ? `<button class="btn sm" data-act="rx-to-task" data-ev="${o.from.id}" data-id="${r.id}" data-edit>Ajouter comme tâche</button>` : ''}
      ${o.own ? `<span id="rxd-${r.id}"><button class="btn ghost sm" data-act="ask-del-rx" data-id="${r.id}" data-edit>Supprimer</button></span>` : ''}
    </div></div></div>`;
}

function nameField(id) { return `<input type="text" id="${id}" placeholder="Ton prénom" value="${esc(getName())}" aria-label="Ton prénom" required>`; }

/* ---------- Modales ---------- */
function closeModal() { $('#modal-root').innerHTML = ''; }
function modal(html) {
  $('#modal-root').innerHTML = `<div class="overlay" data-act="overlay"><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`;
  const f = $('#modal-root input[type=text]'); if (f) f.focus();
}

function openNewEvent() {
  const tpls = templateList();
  modal(`<form id="new-ev" class="stack"><h2>Nouvel événement</h2>
    <label class="f">Nom<input type="text" id="ne-name" required placeholder="Ex. Gala de fin d’année"></label>
    <div class="grid2">
      <label class="f">Modèle<select id="ne-type">${tpls.map(t => `<option value="${esc(t.id)}">${esc(t.name)} · ${t.tasks.length} tâches</option>`).join('')}<option value="autre">Vierge, sans tâche</option></select></label>
      <label class="f">Jour J<input type="date" id="ne-date" required value="${isoOf(today() + 60 * DAY)}"></label>
      <label class="f">Lieu<input type="text" id="ne-lieu" placeholder="Ex. Salle des fêtes"></label>
      <label class="f">Budget prévu (€)<input type="number" id="ne-budget" min="0" step="50" placeholder="1500"></label>
    </div>
    <div class="actions"><button type="button" class="btn ghost" data-act="close">Annuler</button><button class="btn primary" type="submit">Créer le rétroplanning</button></div></form>`);
}

let modalTask = null;
function openTask(ev, tid) {
  const isNew = !tid;
  const t = isNew ? { id: uid(), title: '', offset: -14, duration: 1, pole: S.poles[0]?.id || '', who: '', status: 'todo', note: '' } : clone(ev.tasks[tid]);
  // orig : la tâche telle qu'elle était à l'ouverture, pour repérer ce qu'un autre membre change pendant l'édition
  modalTask = { evId: ev.id, isNew, t, orig: clone(t), force: false };
  const whos = knownPeople().map(p => p.name);
  // Tâches préalables possibles : toutes sauf elle-même et celles qui dépendent déjà d'elle (pas de boucle)
  const cands = tasksOf(ev).filter(x => x.id !== t.id && !chainHas(ev, x, t.id));
  const ro = S.readOnly ? 'disabled' : '';
  modal(`<form id="task-form" class="stack"><h2>${isNew ? 'Nouvelle tâche' : 'Tâche'}</h2>
    <label class="f">Intitulé<input type="text" id="tf-title" required value="${esc(t.title)}" ${ro}></label>
    <div class="f" style="display:flex;flex-direction:column;gap:4px;font-weight:700;font-size:.85rem">Échéance par rapport au jour J
      <div class="offs"><button type="button" class="btn sm" data-act="off" data-d="-7" ${ro}>−7</button><button type="button" class="btn sm" data-act="off" data-d="-1" ${ro}>−1</button>
      <input type="number" id="tf-offset" value="${t.offset}" aria-label="Décalage en jours" ${ro}>
      <button type="button" class="btn sm" data-act="off" data-d="1" ${ro}>+1</button><button type="button" class="btn sm" data-act="off" data-d="7" ${ro}>+7</button></div>
      <span class="small muted" id="tf-due" style="font-weight:400"></span></div>
    <div class="grid2">
      <label class="f">Durée (jours)<input type="number" id="tf-dur" min="1" value="${t.duration || 1}" ${ro}></label>
      <label class="f">Pôle<select id="tf-pole" ${ro}>${S.poles.map(p => `<option value="${esc(p.id)}" ${p.id === t.pole ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}<option value="" ${!S.poles.some(p => p.id === t.pole) ? 'selected' : ''}>Sans pôle</option></select></label>
    </div>
    <label class="f">Responsable<input type="text" id="tf-who" list="who-list" value="${esc(t.who)}" placeholder="Prénom" ${ro}><datalist id="who-list">${whos.map(w => `<option value="${esc(w)}">`).join('')}</datalist></label>
    <div class="f" style="display:flex;flex-direction:column;gap:4px;font-weight:700;font-size:.85rem">Statut
      <div class="seg" id="tf-status">${Object.entries(STATUS).map(([k, l]) => `<button type="button" data-act="set-status" data-s="${k}" aria-pressed="${t.status === k}" ${ro}>${l}</button>`).join('')}</div></div>
    <label class="f">À faire après<select id="tf-after" ${ro}><option value="">Aucune tâche préalable</option>${cands.map(x => `<option value="${esc(x.id)}" ${x.id === t.after ? 'selected' : ''}>${esc(jLabel(x.offset) + ' · ' + x.title)}</option>`).join('')}</select></label>
    <p id="tf-order" class="hint" role="status"></p>
    <label class="f">Note<textarea id="tf-note" placeholder="Contacts, numéro de devis, lien du formulaire…" ${ro}>${esc(t.note)}</textarea></label>
    <div class="f" style="display:flex;flex-direction:column;gap:6px;font-weight:700;font-size:.85rem">Étapes<div id="tf-steps"></div></div>
    <div id="tf-conflict" role="alert"></div>
    <div id="tf-del"></div>
    <div class="actions">${!isNew && !S.readOnly ? '<button type="button" class="btn danger" data-act="ask-del-task">Supprimer</button>' : '<span></span>'}
      <div class="row"><button type="button" class="btn ghost" data-act="close">${S.readOnly ? 'Fermer' : 'Annuler'}</button>${S.readOnly ? '' : `<button class="btn primary" type="submit">${isNew ? 'Ajouter' : 'Enregistrer'}</button>`}</div></div>
  </form>`);
  updateDue(); drawSteps();
}
function openNextEdition(ev) {
  const nr = retexOf(ev).length;
  modal(`<form id="next-form" class="stack"><h2>Préparer l’édition suivante</h2>
    <p class="small muted">Une copie de « ${esc(ev.name)} » est créée avec toutes ses tâches remises à faire, ses étapes décochées et ses dépendances. L’original ne change pas.</p>
    <div class="grid2">
      <label class="f">Nom<input type="text" id="nx-name" required value="${esc(suggestNextName(ev.name))}"></label>
      <label class="f">Jour J<input type="date" id="nx-date" required value="${esc(nextYearDate(ev.date))}"></label>
    </div>
    <label class="row small"><input type="checkbox" id="nx-who"> Garder les responsables (décoche si l’équipe change)</label>
    ${nr ? `<label class="row small"><input type="checkbox" id="nx-rx" checked> Créer une tâche « point de vigilance » pour chacun des ${nr} problèmes notés dans le bilan</label>` : '<p class="hint">Aucun problème noté dans le bilan de cet événement.</p>'}
    <div class="actions"><button type="button" class="btn ghost" data-act="close">Annuler</button><button class="btn primary" type="submit">Créer l’édition suivante</button></div></form>`);
}
function showConflict(plan, cur, next) {
  const box = $('#tf-conflict');
  box.innerHTML = plan.gone
    ? `<div class="conflict"><strong>Un autre membre a supprimé cette tâche pendant que tu la modifiais.</strong>
        <div class="row"><button type="button" class="btn sm primary" data-act="cf-mine">La recréer avec ma version</button><button type="button" class="btn sm" data-act="close">Abandonner</button></div></div>`
    : `<div class="conflict"><strong>Un autre membre a modifié cette tâche pendant que tu l’éditais.</strong>
        <table><tr><th>Champ</th><th>Sa version</th><th>Ta version</th></tr>
        ${plan.clashes.map(k => `<tr><td>${TASK_FIELDS[k]}</td><td>${esc(fieldText(k, cur[k]))}</td><td>${esc(fieldText(k, next[k]))}</td></tr>`).join('')}</table>
        <div class="row"><button type="button" class="btn sm primary" data-act="cf-mine">Garder ma version</button><button type="button" class="btn sm" data-act="cf-theirs">Reprendre sa version</button></div></div>`;
  box.scrollIntoView({ block: 'nearest' });
}
// Remplit le formulaire avec la version de l'autre membre pour les champs en conflit
function takeTheirs() {
  const m = modalTask, cur = S.events[m.evId]?.tasks?.[m.t.id]; if (!cur) return;
  const ids = { title: 'tf-title', offset: 'tf-offset', duration: 'tf-dur', pole: 'tf-pole', who: 'tf-who', note: 'tf-note', after: 'tf-after' };
  const plan = taskSavePlan(m.orig, cur, readTaskForm());
  plan.clashes.forEach(k => {
    if (k === 'status') { m.t.status = cur.status; document.querySelectorAll('#tf-status button').forEach(b => b.setAttribute('aria-pressed', b.dataset.s === cur.status)); }
    else $('#' + ids[k]).value = cur[k];
  });
  m.orig = clone(cur); $('#tf-conflict').innerHTML = ''; updateDue();
  toast('Sa version est reprise dans le formulaire. Vérifie, puis enregistre.');
}
function readTaskForm() {
  return { title: $('#tf-title').value.trim(), offset: parseInt($('#tf-offset').value, 10) || 0, duration: Math.max(1, parseInt($('#tf-dur').value, 10) || 1),
    pole: $('#tf-pole').value, who: canonWho($('#tf-who').value), note: $('#tf-note').value, status: modalTask.t.status, after: $('#tf-after') ? $('#tf-after').value : '' };
}
function updateDue() {
  if (!modalTask) return;
  const ev = S.events[modalTask.evId]; if (!ev) return;
  const o = parseInt($('#tf-offset').value, 10) || 0;
  $('#tf-due').textContent = `${jLabel(o)} · ${fmtLong.format(parseD(ev.date) + o * DAY)}`;
  // Ordre des tâches : prévenir tout de suite si l'échéance tombe avant la tâche préalable
  const hint = $('#tf-order'), pre = $('#tf-after') && ev.tasks[$('#tf-after').value];
  if (!hint) return;
  if (!pre || pre.deleted) { hint.textContent = ''; hint.className = 'hint'; return; }
  const bad = o < pre.offset;
  hint.className = 'hint' + (bad ? ' warn' : '');
  hint.textContent = bad ? `Attention : cette tâche est prévue avant « ${pre.title} » (${jLabel(pre.offset)}). Décale-la au moins à ${jLabel(pre.offset)}.`
    : `Prévue après « ${pre.title} » (${jLabel(pre.offset)}).`;
}
// Étapes : écrites tout de suite pour une tâche existante, gardées dans le formulaire pour une nouvelle tâche
function stepWrite(id, patch) {
  const m = modalTask; if (!m) return;
  if (m.isNew) { m.t.checklist = m.t.checklist || {}; m.t.checklist[id] = { ...(m.t.checklist[id] || {}), ...patch }; drawSteps(); return; }
  patchEvent(m.evId, { tasks: { [m.t.id]: { checklist: { [id]: patch } } } });
  drawSteps();
}
function drawSteps() {
  const m = modalTask, box = $('#tf-steps'); if (!m || !box) return;
  const src = m.isNew ? normTask(m.t, m.t.id) : (S.events[m.evId]?.tasks?.[m.t.id] || m.t);
  const steps = stepsOf(src), ro = S.readOnly, input = $('#step-new'), typed = input ? input.value : '', focused = document.activeElement === input;
  const done = steps.filter(c => c.done).length;
  box.innerHTML = `<div class="steps">${steps.map(c => `<div class="step">
      <input type="checkbox" class="check" id="st-${c.id}" data-act="step-toggle" data-id="${c.id}" ${c.done ? 'checked' : ''} ${ro ? 'disabled' : ''}>
      <label for="st-${c.id}" class="${c.done ? 'isdone' : ''}">${esc(c.text)}</label>
      ${ro ? '<span></span>' : `<button type="button" class="btn ghost sm iconbtn" data-act="step-del" data-id="${c.id}" aria-label="Supprimer l’étape ${esc(c.text)}">✕</button>`}</div>`).join('')
      || '<p class="hint">Découpe la tâche en petites étapes à cocher.</p>'}</div>
    ${steps.length ? `<p class="hint">${done}/${steps.length} étapes faites</p>` : ''}
    ${ro ? '' : `<div class="row"><input type="text" id="step-new" placeholder="Nouvelle étape (ex. Appeler la mairie)" aria-label="Nouvelle étape" style="flex:1;min-width:0"><button type="button" class="btn sm" data-act="step-add">Ajouter l’étape</button></div>`}`;
  const i = $('#step-new'); if (i) { i.value = typed; if (focused) i.focus(); }
}

/* ---------- Export et import ---------- */
// Propose un fichier au visiteur. Renvoie 'saved' ou le code d'erreur de la plateforme.
async function saveFile(filename, data) {
  const blob = data instanceof Blob ? data : new Blob([data]);
  // Sur téléphone, le menu de partage permet d'enregistrer le fichier ou de l'ouvrir dans l'agenda
  try {
    const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
    if (navigator.canShare && navigator.canShare({ files: [file] }) && matchMedia('(pointer:coarse)').matches) {
      await navigator.share({ files: [file], title: filename }); return 'saved';
    }
  } catch (e) { if (e && e.name === 'AbortError') return 'declined'; }
  try {
    const a = document.createElement('a'), url = URL.createObjectURL(blob);
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000); return 'saved';
  } catch (e) { return 'unavailable'; }
}
// Dernier recours : le texte du fichier, à copier
function showCopy(title, filename, text) {
  modal(`<div class="stack"><h2>${esc(title)}</h2>
    <p class="small muted">Le téléchargement n’est pas disponible ici. Copie ce texte et colle-le dans un fichier nommé <strong>${esc(filename)}</strong>.</p>
    <textarea id="backup-text" class="copybox" readonly aria-label="Contenu du fichier">${esc(text)}</textarea>
    <div class="actions"><button type="button" class="btn ghost" data-act="close">Fermer</button><button type="button" class="btn primary" data-act="copy-backup">Copier</button></div></div>`);
}
async function exportBackup() {
  const json = JSON.stringify(buildBackup(), null, 2), filename = `retroplan-sauvegarde-${isoOf(today())}.json`;
  toast('Préparation de la sauvegarde…');
  const r = await saveFile(filename, json);
  if (r === 'saved') toast('Sauvegarde enregistrée');
  else if (r === 'declined') toast('Export annulé');
  else if (r === 'rate_limited') toast('Une fenêtre d’enregistrement est déjà ouverte.');
  else showCopy('Copier la sauvegarde', filename, json);
}
async function exportICS(calName, items) {
  if (!items.length) { toast('Aucune échéance à ajouter au calendrier.'); return; }
  const ics = buildICS(calName, items), base = 'retroplan-' + fileSlug(calName);
  toast('Préparation du calendrier…');
  let r = await saveFile(base + '.ics', ics);
  // Si l'extension .ics est refusée, on l'emballe dans un .zip
  if (r === 'rejected_extension' || r === 'extension_not_enabled') {
    r = await saveFile(base + '.zip', zipOne(base + '.ics', ics));
    if (r === 'saved') { toast('Calendrier enregistré dans un .zip : ouvre-le, puis ouvre le fichier .ics.'); return; }
  }
  if (r === 'saved') toast(`${items.length} échéance${items.length > 1 ? 's' : ''} prête${items.length > 1 ? 's' : ''} : ouvre le fichier pour les ajouter à ton agenda.`);
  else if (r === 'declined') toast('Export annulé');
  else if (r === 'rate_limited') toast('Une fenêtre d’enregistrement est déjà ouverte.');
  else showCopy('Copier le calendrier', base + '.ics', ics);
}
let pendingImport = null;
function showImport(name, text) {
  const zone = $('#imp-zone'); if (!zone) return;
  const r = text ? parseBackup(text) : { error: 'Ce fichier n’a pas pu être lu.' };
  if (r.error) { pendingImport = null; zone.innerHTML = `<div class="notice bad">${esc(r.error)}</div>`; return; }
  pendingImport = r.data;
  const add = planImport(r.data, 'add', S), rep = planImport(r.data, 'replace', S);
  const n = Object.keys(r.data.events).length, when = r.data.exportedAt ? fmtWhen.format(new Date(r.data.exportedAt)) : 'date inconnue';
  zone.innerHTML = `<div class="notice"><div><strong>${esc(name)}</strong> · sauvegarde du ${esc(when)}<br>${n} événement${n > 1 ? 's' : ''}, ${Object.keys(r.data.comments).length} messages, ${Object.keys(r.data.retex).length} retours, ${Object.keys(r.data.templates).length} modèles.</div>
    <div class="small">${add.added} événement${add.added > 1 ? 's' : ''} n’existe${add.added > 1 ? 'nt' : ''} pas encore dans l’app. ${rep.replaced ? `${rep.replaced} existe${rep.replaced > 1 ? 'nt' : ''} déjà : « Tout remplacer » les ramène à leur état de la sauvegarde, pour tout le bureau.` : ''}</div>
    <div class="row"><button class="btn primary" data-act="imp-add">Ajouter ce qui manque</button>${rep.replaced ? '<button class="btn danger" data-act="imp-replace">Tout remplacer par la sauvegarde</button>' : ''}<button class="btn ghost" data-act="imp-cancel">Annuler</button></div></div>`;
}
function runImport(mode) {
  if (!pendingImport) return;
  const plan = planImport(pendingImport, mode, S);
  holdRender = true;
  plan.ops.forEach(({ coll, doc }) => coll === 'events' ? putEvent(doc) : coll === 'poles' ? savePoles(doc) : putDoc(coll, doc));
  holdRender = false; pendingImport = null; render();
  toast(`Import terminé : ${plan.added} ajouté${plan.added > 1 ? 's' : ''}${plan.replaced ? `, ${plan.replaced} remplacé${plan.replaced > 1 ? 's' : ''}` : ''}`);
}

/* ---------- Interactions ---------- */
let toastTimer;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 3200); }

let downEl = null;
document.addEventListener('pointerdown', e => { downEl = e.target; });
// Installation sur l'écran d'accueil (Android, ordinateur) : le navigateur propose, on garde l'offre pour Paramètres
let installEvt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; if (PAGE === 'settings') render(); });
window.addEventListener('appinstalled', () => { installEvt = null; toast('Application installée'); });
function markTabsOverflow(tabs) { tabs.classList.toggle('more', tabs.scrollLeft + tabs.clientWidth < tabs.scrollWidth - 4); }
document.addEventListener('scroll', e => { if (e.target.classList && e.target.classList.contains('tabs')) markTabsOverflow(e.target); }, true);
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const act = el.dataset.act, ev = S.events[S.current];
  switch (act) {
    case 'go': go(el.dataset.to); break;
    case 'home': go('evenements'); break;
    case 'settings': go('parametres'); break;
    case 'open': go(el.dataset.id); break;
    case 'tab': setTab(el.dataset.tab); break;
    case 'install': if (installEvt) { installEvt.prompt(); installEvt.userChoice.finally(() => { installEvt = null; render(); }); } break;
    case 'copy-invite': {
      const i = $('#invite-link');
      const pick = () => { i.focus(); i.select(); toast('Lien sélectionné : copie-le avec ton clavier.'); };
      try { navigator.clipboard.writeText(i.value).then(() => toast('Lien d’invitation copié'), pick); } catch (_) { pick(); }
      break;
    }
    case 'share-invite': navigator.share({ title: 'Rétroplan de l’asso', text: 'Rejoins le rétroplanning de l’asso :', url: inviteLink() }).catch(() => {}); break;
    case 'ask-disconnect': $('#dc-zone').innerHTML = `<div class="confirm">${queue.length ? `${queue.length} modification(s) pas encore envoyée(s) seront perdues. ` : ''}Cet appareil ne verra plus les données de l’asso. <button class="btn danger solid sm" data-act="disconnect">Déconnecter</button><button class="btn sm" data-act="go" data-to="parametres">Annuler</button></div>`; break;
    case 'disconnect': disconnect(); location.href = 'index.html'; break;
    case 'sync-now': toast('Synchronisation…'); pull().then(() => toast('Données à jour')); break;
    case 'new-event': openNewEvent(); break;
    case 'export': exportBackup(); break;
    case 'imp-add': case 'imp-replace': runImport(act === 'imp-replace' ? 'replace' : 'add'); break;
    case 'imp-cancel': pendingImport = null; $('#imp-zone').innerHTML = ''; break;
    case 'copy-backup': {
      const ta = $('#backup-text');
      const pick = () => { ta.focus(); ta.select(); toast('Texte sélectionné : copie-le avec ton clavier.'); };
      try { navigator.clipboard.writeText(ta.value).then(() => toast('Sauvegarde copiée'), pick); } catch (_) { pick(); }
      break;
    }
    case 'cf-mine': modalTask.force = true; $('#task-form').requestSubmit(); break;
    case 'cf-theirs': takeTheirs(); break;
    case 'retex-page': go('retours'); break;
    case 'open-retex': go(el.dataset.id, 'retex'); break;
    case 'rx-to-task': {
      const src = S.events[el.dataset.ev], r = src && retexOf(src).find(x => x.id === el.dataset.id); if (!r) break;
      const id = uid();
      patchEvent(ev.id, { tasks: { [id]: { id, title: r.fix.length > 90 ? r.fix.slice(0, 90) + '…' : r.fix, offset: -30, duration: 1, pole: r.pole || '', who: '', status: 'todo', note: `Retour de « ${src.name} » : ${r.title}` } } });
      toast('Tâche ajoutée à J-30 : ajuste son échéance si besoin'); break;
    }
    case 'ask-del-cm': $('#cmd-' + el.dataset.id).innerHTML = `<span class="confirm">Supprimer ce message ? <button class="btn danger solid sm" data-act="del-cm" data-id="${el.dataset.id}">Supprimer</button><button class="btn sm" data-act="tab" data-tab="talk">Garder</button></span>`; break;
    case 'del-cm': S.comments[el.dataset.id] ? delDoc('comments', el.dataset.id) : patchEvent(ev.id, { comments: { [el.dataset.id]: { deleted: true, text: '' } } }); toast('Message supprimé'); break;
    case 'ask-del-rx': $('#rxd-' + el.dataset.id).innerHTML = `<span class="confirm">Supprimer ce retour ? <button class="btn danger solid sm" data-act="del-rx" data-id="${el.dataset.id}">Supprimer</button><button class="btn sm" data-act="tab" data-tab="retex">Garder</button></span>`; break;
    case 'del-rx': S.retex[el.dataset.id] ? delDoc('retex', el.dataset.id) : patchEvent(ev.id, { retex: { [el.dataset.id]: { deleted: true, what: '', fix: '' } } }); toast('Retour supprimé'); break;
    case 'new-task': openTask(ev, null); break;
    // Sur « Mes tâches », chaque ligne indique son événement (data-ev)
    case 'edit-task': { const tev = S.events[el.dataset.ev] || ev; if (tev) openTask(tev, el.dataset.id); break; }
    case 'toggle': { const tev = S.events[el.dataset.ev] || ev, t = tev && tev.tasks[el.dataset.id]; if (!t) break; patchEvent(tev.id, { tasks: { [t.id]: { status: el.checked ? 'done' : 'todo' } } }); break; }
    case 'cycle': { const tev = S.events[el.dataset.ev] || ev, t = tev && tev.tasks[el.dataset.id], order = ['todo', 'doing', 'done']; if (!t) break; patchEvent(tev.id, { tasks: { [t.id]: { status: order[(order.indexOf(t.status) + 1) % 3] } } }); break; }
    case 'load-week': S.loadOpen = S.loadOpen === +el.dataset.w ? null : +el.dataset.w; render(); break;
    case 'load-all': S.loadAll = !S.loadAll; render(); break;
    case 'pick-me': setName(el.dataset.name); render(); window.scrollTo(0, 0); break;
    case 'change-me': setName(''); render(); break;
    case 'ics-mine': exportICS('Mes tâches · ' + getName(), mineICSItems(getName())); break;
    case 'ics-event': exportICS(ev.name, eventICSItems(ev)); break;
    case 'next-edition': openNextEdition(ev); break;
    case 'step-add': { const i = $('#step-new'), v = i.value.trim(); if (!v) break; const id = uid(); i.value = ''; stepWrite(id, { id, text: v, done: false, at: Date.now() }); $('#step-new').focus(); break; }
    case 'step-toggle': stepWrite(el.dataset.id, { done: el.checked }); break;
    case 'step-del': stepWrite(el.dataset.id, { deleted: true, text: '' }); break;
    case 'clear-filters': S.filters = { pole: '', who: '', status: '' }; render(); break;
    case 'close': closeModal(); modalTask = null; break;
    case 'overlay': if (e.target === el && downEl === el) { closeModal(); modalTask = null; } break;
    case 'off': { const i = $('#tf-offset'); i.value = (parseInt(i.value, 10) || 0) + parseInt(el.dataset.d, 10); updateDue(); break; }
    case 'set-status': document.querySelectorAll('#tf-status button').forEach(b => b.setAttribute('aria-pressed', b === el)); modalTask.t.status = el.dataset.s; break;
    case 'ask-del-task': $('#tf-del').innerHTML = `<div class="confirm">Supprimer cette tâche ? <button type="button" class="btn danger solid sm" data-act="del-task">Supprimer</button><button type="button" class="btn sm" data-act="cancel-del-task">Garder</button></div>`; break;
    case 'cancel-del-task': $('#tf-del').innerHTML = ''; break;
    case 'del-task': patchEvent(modalTask.evId, { tasks: { [modalTask.t.id]: { deleted: true, note: '' } } }); closeModal(); modalTask = null; toast('Tâche supprimée'); break;
    case 'apply-tpl': { const add = tasksFromTemplate($('#apply-tpl').value); patchEvent(ev.id, { tasks: add }); toast(`${Object.keys(add).length} tâches ajoutées`); break; }
    case 'save-tpl': {
      const name = $('#tpl-name').value.trim(); if (!name) { toast('Donne un nom au modèle.'); break; }
      saveTemplate({ id: uid(), name, tasks: tasksOf(ev).map(t => ({ title: t.title, offset: t.offset, duration: t.duration || 1, pole: t.pole, note: t.note || '' })) });
      toast(`Modèle « ${name} » créé`); break;
    }
    case 'ask-del-event': $('#del-zone').innerHTML = `<div class="confirm">L’événement et ses ${stats(ev).total} tâches seront supprimés pour tout le bureau. <button class="btn danger solid sm" data-act="del-event">Supprimer définitivement</button><button class="btn sm" data-act="cancel-del-event">Annuler</button></div>`; break;
    case 'cancel-del-event': $('#del-zone').innerHTML = '<button class="btn danger" data-act="ask-del-event">Supprimer cet événement</button>'; break;
    case 'del-event': removeEvent(ev.id); toast('Événement supprimé'); break;
    case 'pole-add': { const n = $('#new-pole').value.trim(); if (!n) break; const palette = ['#2E86C1', '#D2457A', '#1E9468', '#D97A1B', '#6B5BD6', '#7F8C3A', '#B0413E', '#13838F']; savePoles([...S.poles, { id: uid(), name: n, color: palette[S.poles.length % palette.length] }]); break; }
    case 'pole-del': if (S.poles.length <= 1) { toast('Garde au moins un pôle.'); break; } savePoles(S.poles.filter(p => p.id !== el.dataset.id)); toast('Pôle supprimé. Ses tâches passent en « Sans pôle ».'); break;
    case 'ask-del-tpl': $('#tz-' + el.dataset.id).innerHTML = `<span class="row"><button class="btn danger solid sm" data-act="del-tpl" data-id="${el.dataset.id}">Confirmer</button><button class="btn sm" data-act="settings">Annuler</button></span>`; break;
    case 'del-tpl': removeTemplate(el.dataset.id); toast('Modèle supprimé'); break;
  }
});

document.addEventListener('change', e => {
  const el = e.target, act = el.dataset.act;
  if (act === 'filter') { S.filters[el.dataset.f] = el.value; render(); }
  if (act === 'rx-filter') { S.rxFilter = el.value; render(); }
  if (act === 'money') {
    const ev = S.events[S.current], pole = el.dataset.pole, f = el.dataset.f; if (!ev || !pole) return;
    // Accepte « 345,50 », « 345.50 » et « 1 200 » ; tout le reste compte pour 0
    const v = Math.max(0, Math.round((Number(String(el.value).replace(/[\s  €]/g, '').replace(',', '.')) || 0) * 100) / 100);
    const cur = ev.budgetByPole && ev.budgetByPole[pole] ? ev.budgetByPole[pole][f] : 0;
    if (v !== cur) patchEvent(ev.id, { budgetByPole: { [pole]: { [f]: v } } });
  }
  if (el.id === 'imp-file' && el.files && el.files[0]) {
    const f = el.files[0], reader = new FileReader();
    reader.onload = () => showImport(f.name, String(reader.result || ''));
    reader.onerror = () => showImport(f.name, '');
    reader.readAsText(f); el.value = '';
  }
  if (act === 'pole-color' || act === 'pole-name') {
    const v = el.value.trim(); if (!v) return;
    savePoles(S.poles.map(p => p.id === el.dataset.id ? { ...p, [act === 'pole-color' ? 'color' : 'name']: v } : p));
  }
});
document.addEventListener('input', e => { if (e.target.id === 'tf-offset') updateDue(); });
document.addEventListener('change', e => { if (e.target.id === 'tf-after') updateDue(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && $('#modal-root').innerHTML) { closeModal(); modalTask = null; }
  // Entrée dans « Nouvelle étape » ajoute l'étape au lieu d'enregistrer toute la tâche
  if (e.key === 'Enter' && e.target.id === 'step-new') { e.preventDefault(); $('[data-act="step-add"]').click(); }
});

document.addEventListener('submit', e => {
  e.preventDefault();
  const id = e.target.id;
  if (id === 'connect-form') {
    const btn = $('#cx-go'), name = $('#cx-name').value.trim();
    btn.disabled = true; btn.textContent = 'Connexion…';
    connect($('#cx-api').value, $('#cx-code').value).then(r => {
      if (r.ok) { if (name) setName(name); location.href = 'index.html'; return; }
      S.connectError = r.error; S.inviteFailed = { api: $('#cx-api').value, code: $('#cx-code').value }; render();
    });
    return;
  }
  if (id === 'new-ev') {
    const type = $('#ne-type').value;
    const ev = { id: uid(), name: $('#ne-name').value.trim(), type, date: $('#ne-date').value, lieu: $('#ne-lieu').value.trim(), budget: Number($('#ne-budget').value) || 0, createdAt: Date.now(), tasks: tasksFromTemplate(type) };
    if (!ev.name || !ev.date) return;
    S.tab = 'dash'; putEvent(ev); logChanges(ev.id, [{ kind: 'event' }]); go(ev.id);
    toast(`Rétroplanning créé avec ${Object.keys(ev.tasks).length} tâches`);
  }
  if (id === 'me-form') { const n = canonWho($('#me-name').value); if (!n) return; setName(n); render(); }
  if (id === 'next-form') {
    const src = S.events[S.current], date = $('#nx-date').value, name = $('#nx-name').value.trim();
    if (!src || !name || !isISODate(date)) { toast('Indique un nom et une date valide.'); return; }
    const ev = nextEdition(src, { name, date, keepWho: $('#nx-who').checked, retexTasks: !!($('#nx-rx') && $('#nx-rx').checked) });
    S.tab = 'dash'; putEvent(ev); logChanges(ev.id, [{ kind: 'event' }]); logChanges(src.id, [{ kind: 'next', task: name }]); go(ev.id);
    toast(`« ${name} » est prêt avec ${Object.keys(ev.tasks).length} tâches`);
  }
  if (id === 'task-form') {
    const m = modalTask, next = readTaskForm(); if (!next.title) return;
    const done = msg => { closeModal(); modalTask = null; toast(msg); };
    if (m.isNew) { patchEvent(m.evId, { tasks: { [m.t.id]: { ...m.t, ...next } } }); return done('Tâche ajoutée'); }
    const cur = S.events[m.evId]?.tasks?.[m.t.id];
    const plan = taskSavePlan(m.orig, cur, next);
    if (!m.force && (plan.gone || plan.clashes.length)) return showConflict(plan, cur, next);
    // On n'envoie que les champs modifiés : une coche faite entre-temps par un bénévole n'est plus écrasée
    const changes = plan.gone ? { ...m.t, ...next, deleted: false } : plan.changed;
    if (!Object.keys(changes).length) return done('Aucune modification');
    patchEvent(m.evId, { tasks: { [m.t.id]: changes } });
    done(plan.gone ? 'Tâche recréée' : 'Tâche enregistrée');
  }
  if (id === 'cm-form') {
    const ev = S.events[S.current], text = $('#cm-text').value.trim(), author = $('#cm-name').value.trim();
    if (!text || !author) return;
    setName(author); const cid = uid(), taskId = $('#cm-task').value;
    $('#cm-text').value = '';
    putDoc('comments', { id: cid, eventId: ev.id, author, text, taskId, at: Date.now() });
    $('#cm-text').value = ''; $('#cm-task').value = '';
    toast('Message publié');
  }
  if (id === 'rx-form') {
    const ev = S.events[S.current], title = $('#rx-title').value.trim(), author = $('#rx-name').value.trim();
    if (!title || !author) return;
    setName(author); const rid = uid();
    const r = { id: rid, title, sev: Number($('#rx-sev').value), pole: $('#rx-pole').value, what: $('#rx-what').value.trim(), fix: $('#rx-fix').value.trim(), author, at: Date.now() };
    ['rx-title', 'rx-what', 'rx-fix'].forEach(i => { $('#' + i).value = ''; });
    putDoc('retex', { ...r, eventId: ev.id });
    ['rx-title', 'rx-what', 'rx-fix'].forEach(i => { $('#' + i).value = ''; });
    toast('Retour enregistré : il s’affichera dans les prochains événements du même type');
  }
  if (id === 'ev-form') {
    const ev = S.events[S.current], date = $('#ev-date').value;
    if (!isISODate(date)) { toast('Indique une date valide pour le jour J.'); return; }
    const next = { name: $('#ev-name').value.trim() || ev.name, type: $('#ev-type').value, date, lieu: $('#ev-lieu').value.trim(), budget: Math.max(0, Number($('#ev-budget').value) || 0) };
    // Même règle que pour les tâches : seuls les champs réellement changés sont envoyés
    const changes = {}; for (const k in next) if (next[k] !== ev[k]) changes[k] = next[k];
    if (ev._noDate) changes.date = date;
    if (!Object.keys(changes).length) { toast('Aucune modification'); return; }
    patchEvent(ev.id, changes);
    toast('date' in changes && !ev._noDate ? `Jour J déplacé : ${stats(S.events[ev.id]).total} échéances recalculées` : 'Informations enregistrées');
  }
});

let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (S.tab === 'gantt' && S.view === 'event' && !$('.dragging')) render(); }, 200); });
