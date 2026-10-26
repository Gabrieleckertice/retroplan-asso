function viewEvent(ev) {
  const c = countdown(ev), tpl = templateList().find(t => t.id === ev.type);
  const nc = commentsOf(ev).length, nr = retexOf(ev).length;
  const tabs = [['dash', 'Résumé', 'resume'], ['list', 'Tâches', 'taches'], ['gantt', 'Frise', 'frise'], ['talk', 'Échanges' + (nc ? ` (${nc})` : ''), 'echanges'], ['budget', 'Budget', 'budget'], ['retex', 'Bilan' + (nr ? ` (${nr})` : ''), 'bilan'], ['hist', 'Historique', 'historique'], ['edit', 'Réglages', 'reglages']];
  const VIEWS = { gantt: viewGantt, list: viewList, edit: viewEventSettings, talk: viewTalk, retex: viewRetex, budget: viewBudget, hist: viewHist };
  const body = (VIEWS[S.tab] || viewDash)(ev);
  return `<div class="evhead"><div>
      <button class="btn ghost sm" data-act="home" style="margin-left:-10px">← Tous les événements</button>
      <span class="eyebrow" style="display:block;margin-top:6px">${esc(tpl ? tpl.name : 'Événement')}</span>
      <h1>${esc(ev.name)}</h1>
      ${ev._noDate ? '<p class="state bad" style="margin-top:10px"><span class="ic" aria-hidden="true"></span><span><strong>Date manquante</strong>Les échéances sont calculées à partir d’aujourd’hui. Fixe le jour J dans l’onglet Réglages.</span></p>' : ''}
      <div class="meta"><span>${esc(fmtLong.format(parseD(ev.date)))}</span>${ev.lieu ? `<span>${esc(ev.lieu)}</span>` : ''}${ev.budget ? `<span>Budget ${fmtEur.format(ev.budget)}</span>` : ''}<button class="btn ghost sm" data-act="ics-event" style="margin-left:-10px">Ajouter à mon agenda</button></div>
    </div><div class="count"><div class="n">${c.mark ? `<mark>${c.text}</mark>` : esc(c.text)}</div><div class="small muted">${esc(c.sub)}</div></div></div>
    <nav class="tabs" role="tablist">${tabs.map(([k, l, ic]) => `<button class="tab" role="tab" aria-selected="${S.tab === k}" data-act="tab" data-tab="${k}" ${k === 'edit' ? 'data-edit' : ''}>${icon(ic)}<span>${l}</span></button>`).join('')}</nav>
    ${body}`;
}

/* ---------- Budget ---------- */
function viewBudget(ev) {
  const { rows, planned, actual } = budgetTotals(ev), env = ev.budget || 0, ro = S.readOnly, over = env > 0 && planned > env;
  const kpi = (lbl, val, cls, sub) => `<div class="kpi ${cls}"><span class="lbl">${lbl}</span><span class="val">${val}</span>${sub ? `<span class="hint">${sub}</span>` : ''}</div>`;
  const cell = (r, f) => ro ? `<td class="num">${eur(r[f])}</td>`
    : `<td class="num"><input type="text" class="money" id="bg-${f}-${esc(r.id)}" inputmode="decimal" autocomplete="off" value="${r[f] ? String(r[f]).replace('.', ',') : ''}" placeholder="0" data-act="money" data-pole="${esc(r.id)}" data-f="${f}" aria-label="${f === 'planned' ? 'Prévu' : 'Réel'} pour ${esc(r.pole.name)}"></td>`;
  const gapCls = (a, p) => a > p ? 'over' : a < p && a ? 'under' : '';
  return `<div class="kpis">
      ${kpi('Enveloppe', env ? eur(env) : '—', '', env ? 'fixée dans l’onglet Réglages' : 'à fixer dans l’onglet Réglages')}
      ${kpi('Prévu par pôle', eur(planned), over ? 'bad' : '', env ? (over ? `${eur(planned - env)} au-dessus de l’enveloppe` : `${eur(env - planned)} encore libres`) : '')}
      ${kpi('Dépensé', eur(actual), planned && actual > planned ? 'bad' : '', planned ? `${Math.round(actual / planned * 100)} % du prévu` : '')}
    </div>
    <section class="card"><div class="cardhead"><h2>Par pôle</h2></div>
    <div class="tablewrap"><table class="budget"><thead><tr><th>Pôle</th><th class="num">Prévu</th><th class="num">Réel</th><th class="num gapcol">Écart</th></tr></thead><tbody>
    ${rows.map(r => { const g = r.planned || r.actual ? signedEur(r.actual - r.planned) : '—', c = gapCls(r.actual, r.planned);
      // Sur téléphone, l'écart passe sous le nom du pôle (.gapline) au lieu d'une 4e colonne
      return `<tr><td><span class="dot" style="background:${esc(r.pole.color)}"></span> ${esc(r.pole.name)}${r.planned || r.actual ? `<span class="gapline gap ${c}">Écart ${g}</span>` : ''}</td>${cell(r, 'planned')}${cell(r, 'actual')}
      <td class="num gap gapcol ${c}">${g}</td></tr>`; }).join('')}
    <tr class="total"><td>Total<span class="gapline gap ${gapCls(actual, planned)}">Écart ${signedEur(actual - planned)}</span></td><td class="num">${eur(planned)}</td><td class="num">${eur(actual)}</td><td class="num gap gapcol ${gapCls(actual, planned)}">${signedEur(actual - planned)}</td></tr>
    </tbody></table></div>
    <p class="hint">Montants en euros${ro ? '' : ', enregistrés dès que tu quittes la case'}. Tout le bureau voit les mêmes chiffres. Un écart positif, en rouge, signale une dépense au-dessus du prévu.</p></section>`;
}

/* ---------- Historique ---------- */
function viewHist(ev) {
  const items = Object.values(S.history).filter(h => h.eventId === ev.id).sort((a, b) => b.at - a.at).slice(0, 200);
  if (!items.length) return `<div class="card empty"><h2>Aucune modification notée</h2>
    <p class="muted">À partir de maintenant, chaque tâche cochée, déplacée, confiée, ajoutée ou supprimée est notée ici, avec qui l’a fait et quand.</p></div>`;
  const dayFmt = mkFmt({ weekday: 'long', day: 'numeric', month: 'long' }), timeFmt = mkFmt({ hour: '2-digit', minute: '2-digit' });
  const days = [];
  items.forEach(h => { const k = new Date(h.at).toDateString(); let d = days[days.length - 1]; if (!d || d.k !== k) days.push(d = { k, at: h.at, items: [] }); d.items.push(h); });
  return `<section class="card"><div class="cardhead"><h2>Qui a changé quoi</h2><span class="n">${items.length}</span></div>
    <div class="hist">${days.map(d => `<div class="hist-day"><h3>${esc(dayFmt.format(d.at))}</h3>
      ${d.items.map(h => `<div class="hist-item"><span class="hist-time">${esc(timeFmt.format(h.at))}</span><span class="hist-text"><strong>${esc(whoName(h))}</strong> ${esc(histLine(h))}</span></div>`).join('')}</div>`).join('')}</div>
    <p class="hint" style="margin-top:12px">Le nom affiché est celui du compte claude.ai, sinon le prénom choisi dans « Mes tâches ».</p></section>`;
}

function viewDash(ev) {
  const s = stats(ev);
  if (!s.total) return `<div class="card empty"><h2>Pas encore de tâche</h2><p class="muted">Ajoute des tâches une par une, ou applique un modèle depuis l’onglet Réglages.</p><button class="btn primary" data-act="new-task" data-edit>Ajouter une tâche</button></div>`;
  const late = s.ts.filter(t => isLate(ev, t)), week = s.ts.filter(t => thisWeek(ev, t));
  const next = s.ts.filter(t => t.status !== 'done' && !isLate(ev, t) && !thisWeek(ev, t)).slice(0, 4);
  const todo = s.total - s.done - s.doing, order = s.ts.filter(t => t.status !== 'done' && orderIssue(ev, t));
  const byPole = S.poles.concat([{ id: '', name: 'Sans pôle', color: '#8A93A6' }]).map(p => {
    const ts = s.ts.filter(t => (t.pole || '') === p.id || (p.id === '' && !S.poles.some(q => q.id === t.pole)));
    return { p, n: ts.length, d: ts.filter(t => t.status === 'done').length };
  }).filter(x => x.n);
  return `<div class="dash">
    <section class="card wide"><div class="prog"><div class="pct">${s.pct}<span style="font-size:.5em">%</span></div>
      <div><div class="bar" style="height:12px"><span style="width:${s.done / s.total * 100}%;background:var(--done)"></span><span style="width:${s.doing / s.total * 100}%;background:var(--doing)"></span></div>
      <div class="legend"><span><span class="dot" style="background:var(--done)"></span> ${s.done} faites</span><span><span class="dot" style="background:var(--doing)"></span> ${s.doing} en cours</span><span><span class="dot" style="background:var(--sunk);border:1px solid var(--line)"></span> ${todo} à faire</span>${s.late ? `<span style="color:var(--late);font-weight:700">${s.late} en retard</span>` : ''}</div></div></div></section>
    <section class="card ${late.length ? 'alert' : ''}"><div class="cardhead"><h2>En retard</h2><span class="n">${late.length}</span></div>
      ${late.length ? `<div class="tasks">${late.map(t => taskRow(ev, t)).join('')}</div>` : '<p class="muted small">Aucune tâche en retard. Bravo au bureau.</p>'}</section>
    <section class="card"><div class="cardhead"><h2>Cette semaine</h2><span class="n">${week.length}</span></div>
      ${week.length ? `<div class="tasks">${week.map(t => taskRow(ev, t)).join('')}</div>` : `<p class="muted small">Rien à rendre d’ici 7 jours.</p>${next.length ? `<p class="eyebrow" style="margin-top:12px">Ensuite</p><div class="tasks">${next.map(t => taskRow(ev, t)).join('')}</div>` : ''}`}</section>
    ${order.length ? `<section class="card wide alert"><div class="cardhead"><h2>Ordre à vérifier</h2><span class="n">${order.length}</span></div>
      <p class="hint" style="margin-bottom:6px">Ces tâches sont prévues avant la tâche dont elles dépendent. Décale leur échéance ou change la tâche préalable.</p>
      <div class="tasks">${order.map(t => taskRow(ev, t)).join('')}</div></section>` : ''}
    <section class="card wide"><div class="cardhead"><h2>Avancement par pôle</h2></div>
      <div class="polebars">${byPole.map(x => `<span><span class="dot" style="background:${esc(x.p.color)}"></span> ${esc(x.p.name)}</span><div class="bar"><span style="width:${x.d / x.n * 100}%;background:${esc(x.p.color)}"></span></div><span class="mono small">${x.d}/${x.n}</span>`).join('')}</div></section>
    ${lessonsCard(ev, 3)}
  </div>`;
}

function viewTalk(ev) {
  const cs = commentsOf(ev), ts = tasksOf(ev);
  return `<div class="dash">
    <form class="card composer wide" id="cm-form" data-edit>
      <h2>Écrire au bureau</h2>
      <textarea id="cm-text" placeholder="Une question, une info, un point à trancher en réunion…" required></textarea>
      <div class="row">${nameField('cm-name')}
        <select id="cm-task" aria-label="Tâche concernée"><option value="">Message général</option>${ts.map(t => `<option value="${t.id}">${esc(jLabel(t.offset) + ' · ' + t.title)}</option>`).join('')}</select></div>
      <div><button class="btn primary" type="submit">Publier</button></div>
    </form>
    <section class="card wide"><div class="cardhead"><h2>Fil des échanges</h2><span class="n">${cs.length}</span></div>
      ${cs.length ? `<div class="msgs">${cs.map(c => {
        const t = c.taskId && ev.tasks && ev.tasks[c.taskId] && !ev.tasks[c.taskId].deleted ? ev.tasks[c.taskId] : null;
        return `<div class="msg"><div class="who"><strong>${esc(c.author || 'Anonyme')}</strong><span class="muted">${esc(fmtWhen.format(c.at))}</span>${t ? `<button class="chip j stchip" data-act="edit-task" data-id="${t.id}">${esc(jLabel(t.offset))} · ${esc(t.title.length > 40 ? t.title.slice(0, 40) + '…' : t.title)}</button>` : ''}</div>
          <div class="txt">${esc(c.text)}</div>
          <div class="tools" id="cmd-${c.id}"><button class="btn ghost sm" data-act="ask-del-cm" data-id="${c.id}" data-edit style="margin-left:-10px">Supprimer</button></div></div>`;
      }).join('')}</div>` : '<p class="muted small">Aucun message pour l’instant. Le premier qui écrit lance la discussion.</p>'}</section>
  </div>`;
}

function viewRetex(ev) {
  const mine = retexOf(ev), others = pastRetex(ev, false);
  const passed = parseD(ev.date) <= today();
  return `<div class="dash">
    <form class="card stack wide" id="rx-form" data-edit>
      <h2>Noter un problème</h2>
      <p class="small muted">${passed ? 'L’événement est passé : c’est le bon moment pour noter ce qui a coincé.' : 'Tu peux noter un problème dès maintenant, sans attendre le jour J.'} Ces retours s’afficheront dans les prochains événements du même type.</p>
      <label class="f">Problème<input type="text" id="rx-title" required placeholder="Ex. Rupture de gobelets à 23 h"></label>
      <div class="grid2">
        <label class="f">Gravité<select id="rx-sev"><option value="1">Gênant</option><option value="2" selected>Sérieux</option><option value="3">Bloquant</option></select></label>
        <label class="f">Pôle<select id="rx-pole">${S.poles.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}<option value="">Sans pôle</option></select></label>
      </div>
      <label class="f">Ce qui s’est passé<textarea id="rx-what" placeholder="Les faits, sans chercher de coupable."></textarea></label>
      <label class="f">Ce qu’on fera la prochaine fois<textarea id="rx-fix" placeholder="Ex. Prévoir 1,2 gobelet par entrée."></textarea></label>
      <div class="row"><label class="f" style="flex:1;min-width:140px">Noté par${nameField('rx-name')}</label></div>
      <div><button class="btn primary" type="submit">Enregistrer le retour</button></div>
    </form>
    <section class="card wide"><div class="cardhead"><h2>Bilan de cet événement</h2><span class="n">${mine.length}</span></div>
      ${mine.length ? mine.map(r => rxItem(r, { own: true })).join('') : '<p class="muted small">Aucun problème noté pour cet événement.</p>'}</section>
    ${others.length ? `<section class="card wide"><div class="cardhead"><h2>Retours des autres événements</h2><span class="n">${others.length}</span></div>
      ${others.map(r => rxItem(r, { from: r.ev, target: ev })).join('')}</section>` : ''}
  </div>`;
}

function viewList(ev) {
  const all = tasksOf(ev), f = S.filters;
  // Le filtre regroupe les orthographes d'un même prénom (« Camille », « camille »)
  const names = new Map(knownPeople().map(p => [p.key, p.name]));
  const whos = [...new Set(all.map(t => whoKey(t.who)).filter(Boolean))].map(k => [k, names.get(k) || k]).sort((a, b) => a[1].localeCompare(b[1], 'fr'));
  const ts = all.filter(t => (!f.pole || t.pole === f.pole) && (!f.who || whoKey(t.who) === f.who) &&(!f.status || (f.status === 'late' ? isLate(ev, t) : t.status === f.status)));
  const groups = [];
  ts.forEach(t => {
    const d = dueOf(ev, t), dow = (new Date(d).getUTCDay() + 6) % 7, monday = d - dow * DAY;
    let g = groups[groups.length - 1];
    if (!g || g.k !== monday) groups.push(g = { k: monday, items: [] });
    g.items.push(t);
  });
  const sel = (id, label, opts, val) => `<select id="${id}" data-act="filter" data-f="${id.slice(2)}" aria-label="${label}"><option value="">${label}</option>${opts.map(([v, l]) => `<option value="${esc(v)}" ${v === val ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  return `<div class="filters">
    ${sel('f-pole', 'Tous les pôles', S.poles.map(p => [p.id, p.name]), f.pole)}
    ${sel('f-who', 'Tous les responsables', whos, f.who)}
    ${sel('f-status', 'Tous les statuts', [['todo', 'À faire'], ['doing', 'En cours'], ['done', 'Fait'], ['late', 'En retard']], f.status)}
    <span class="small muted mono">${ts.length} tâche${ts.length > 1 ? 's' : ''}</span>
    ${f.pole || f.who || f.status ? '<button class="btn ghost sm" data-act="clear-filters">Effacer les filtres</button>' : ''}
  </div>
  ${groups.length ? groups.map(g => `<div class="group card" style="padding:6px 16px"><h3 style="padding-top:8px">Semaine du ${esc(fmtShort.format(g.k))} · <span class="mono">${jLabel(Math.round((g.k - parseD(ev.date)) / DAY))}</span></h3><div class="tasks">${g.items.map(t => taskRow(ev, t)).join('')}</div></div>`).join('')
    : '<div class="card empty"><p class="muted">Aucune tâche ne correspond à ces filtres.</p></div>'}`;
}

let G = { dw: 14, lw: 220 };
function viewGantt(ev) {
  const narrow = window.innerWidth < 640;
  G = { dw: narrow ? 11 : 14, lw: narrow ? 130 : 230 };
  const days = RANGE_MAX - RANGE_MIN + 1, W = days * G.dw, x = o => (o - RANGE_MIN) * G.dw;
  const ts = tasksOf(ev), j = parseD(ev.date), tOff = Math.round((today() - j) / DAY);
  let ticks = '';
  for (let o = -84; o <= RANGE_MAX; o += 7) ticks += `<div class="tick" style="left:${x(o)}px"></div>`;
  let labs = '';
  for (let o = -84; o <= RANGE_MAX; o += 7) labs += `<div class="ticklab" style="left:${x(o)}px"><b>${jLabel(o)}</b>${esc(fmtDay.format(j + o * DAY))}</div>`;
  const overlay = `<div class="jcol" style="left:${x(0)}px;width:${G.dw}px"></div>${tOff >= RANGE_MIN && tOff <= RANGE_MAX ? `<div class="today" style="left:${x(tOff) + G.dw / 2}px"></div>` : ''}`;
  const rows = ts.map(t => {
    const p = poleOf(t.pole), dur = Math.max(1, t.duration || 1);
    const e = Math.min(RANGE_MAX, Math.max(RANGE_MIN, t.offset)), s = Math.min(e, Math.max(RANGE_MIN, t.offset - dur + 1));
    const cls = (t.status === 'done' ? ' isdone' : '') + (isLate(ev, t) ? ' islate' : '');
    return `<div class="grow"><div class="glabel" style="width:${G.lw}px" data-act="edit-task" data-id="${t.id}" title="${esc(t.title)}"><span class="dot" style="background:${esc(p.color)}"></span><span class="t">${esc(t.title)}</span></div>
      <div class="gtrack" style="width:${W}px">${ticks}${overlay}<div class="gbar${cls}" data-id="${t.id}" style="left:${x(s)}px;width:${(e - s + 1) * G.dw}px;background:${esc(p.color)}">${(e - s + 1) * G.dw > 44 ? jLabel(t.offset) : ''}</div></div></div>`;
  }).join('');
  return `<div class="gwrap"><div class="gantt">
    <div class="ghead"><div class="glabel" style="width:${G.lw}px">Tâche</div><div class="gtrack" style="width:${W}px">${ticks}${overlay}${labs}${tOff >= RANGE_MIN && tOff <= RANGE_MAX ? `<div class="todaylab" style="left:${x(tOff) + G.dw / 2}px">aujourd’hui</div>` : ''}</div></div>
    ${rows || `<div class="grow"><div class="glabel" style="width:${G.lw}px">Aucune tâche</div><div class="gtrack" style="width:${W}px">${ticks}${overlay}</div></div>`}
  </div></div>
  <p class="ghint">De J-90 à J+7. La colonne jaune est le jour J, la ligne bleue aujourd’hui. ${S.readOnly ? '' : 'Fais glisser une barre pour décaler une tâche, touche-la pour la modifier.'}</p>`;
}
function bindGantt() {
  const ev = S.events[S.current];
  document.querySelectorAll('.gbar').forEach(bar => {
    let sx = 0, base = 0, moved = 0, active = false;
    bar.addEventListener('pointerdown', e => {
      if (S.readOnly) { openTask(ev, bar.dataset.id); return; }
      active = true; sx = e.clientX; moved = 0; base = parseFloat(bar.style.left); bar.setPointerCapture(e.pointerId); bar.classList.add('dragging');
    });
    bar.addEventListener('pointermove', e => {
      if (!active) return;
      moved = Math.round((e.clientX - sx) / G.dw);
      bar.style.left = (base + moved * G.dw) + 'px';
      const t = ev.tasks[bar.dataset.id]; bar.textContent = parseFloat(bar.style.width) > 44 ? jLabel(t.offset + moved) : '';
    });
    const end = () => {
      if (!active) return; active = false; bar.classList.remove('dragging');
      const t = ev.tasks[bar.dataset.id];
      if (moved) {
        const off = t.offset + moved; patchEvent(ev.id, { tasks: { [t.id]: { offset: off } } });
        const now = S.events[ev.id], moved1 = now && now.tasks[t.id], pre = moved1 && orderIssue(now, moved1);
        const after = now ? tasksOf(now).filter(x => x.after === t.id && orderIssue(now, x)) : [];
        toast(pre ? `Attention : « ${t.title} » est maintenant prévue avant « ${pre.title} »`
          : after.length ? `Attention : ${after.length} tâche${after.length > 1 ? 's' : ''} qui en dépend${after.length > 1 ? 'ent' : ''} tombe${after.length > 1 ? 'nt' : ''} maintenant avant elle`
          : `Échéance déplacée à ${jLabel(off)} (${fmtShort.format(parseD(ev.date) + off * DAY)})`);
      }
      else openTask(ev, t.id);
    };
    bar.addEventListener('pointerup', end);
    bar.addEventListener('pointercancel', () => { active = false; bar.classList.remove('dragging'); render(); });
  });
}

function viewEventSettings(ev) {
  const tpls = templateList();
  return `<div class="dash">
    <form class="card stack wide" id="ev-form">
      <h2>Informations</h2>
      <div class="grid2">
        <label class="f">Nom<input type="text" id="ev-name" value="${esc(ev.name)}" required></label>
        <label class="f">Type<select id="ev-type">${tpls.map(t => `<option value="${esc(t.id)}" ${t.id === ev.type ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}<option value="autre" ${ev.type === 'autre' ? 'selected' : ''}>Autre</option>${ev.type !== 'autre' && !tpls.some(t => t.id === ev.type) ? `<option value="${esc(ev.type)}" selected>Modèle supprimé</option>` : ''}</select></label>
        <label class="f">Date de l’événement (jour J)<input type="date" id="ev-date" value="${esc(ev.date)}" required></label>
        <label class="f">Lieu<input type="text" id="ev-lieu" value="${esc(ev.lieu || '')}"></label>
        <label class="f">Budget prévu (€)<input type="number" id="ev-budget" min="0" step="50" value="${ev.budget || ''}"></label>
      </div>
      <p class="small muted">Si tu changes la date, toutes les échéances se recalculent à partir du nouveau jour J.</p>
      <div><button class="btn primary" type="submit">Enregistrer</button></div>
    </form>
    <section class="card stack">
      <h2>Ajouter les tâches d’un modèle</h2>
      <p class="small muted">Les tâches du modèle s’ajoutent à celles déjà prévues.</p>
      <select id="apply-tpl">${tpls.map(t => `<option value="${esc(t.id)}">${esc(t.name)} · ${t.tasks.length} tâches</option>`).join('')}</select>
      <div><button class="btn" data-act="apply-tpl">Ajouter les tâches</button></div>
    </section>
    <section class="card stack">
      <h2>Préparer l’édition suivante</h2>
      <p class="small muted">Copie cet événement pour l’an prochain : tâches remises à faire, dépendances gardées, problèmes du bilan transformés en points de vigilance.</p>
      <div><button class="btn primary" data-act="next-edition">Préparer l’édition suivante</button></div>
    </section>
    <section class="card stack">
      <h2>Enregistrer comme modèle</h2>
      <p class="small muted">Réutilise ce rétroplanning l’année prochaine. Les responsables et statuts ne sont pas copiés.</p>
      <input type="text" id="tpl-name" placeholder="Ex. Gala de printemps" value="${esc(ev.name.replace(/\s*\(exemple\)$/, ''))}" aria-label="Nom du modèle">
      <div><button class="btn" data-act="save-tpl">Créer le modèle</button></div>
    </section>
    <section class="card stack wide">
      <h2>Supprimer l’événement</h2>
      <div id="del-zone"><button class="btn danger" data-act="ask-del-event">Supprimer cet événement</button></div>
    </section>
  </div>`;
}
