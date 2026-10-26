function viewHome() {
  const evs = Object.values(S.events).sort((a, b) => parseD(a.date) - parseD(b.date));
  if (!evs.length) return `<div class="card empty"><h1>Aucun événement pour l’instant</h1>
    <p class="muted">Crée ton premier événement : choisis un modèle (soirée, gala, tournoi…), fixe le jour J, et toutes les échéances se calculent à rebours.</p>
    <div class="row" style="justify-content:center"><button class="btn primary" data-act="new-event" data-edit>Créer un événement</button></div></div>`;
  const upcoming = evs.filter(e => parseD(e.date) >= today() - 7 * DAY), past = evs.filter(e => parseD(e.date) < today() - 7 * DAY);
  const card = ev => {
    const s = stats(ev), c = countdown(ev), tpl = templateList().find(t => t.id === ev.type);
    return `<button class="card evcard" data-act="open" data-id="${ev.id}">
      <div class="top"><div><span class="eyebrow">${esc(tpl ? tpl.name : 'Événement')}</span><h2>${esc(ev.name)}</h2></div><span class="jbig">${esc(c.text)}</span></div>
      <div class="small muted">${esc(fmtLong.format(parseD(ev.date)))}${ev.lieu ? ' · ' + esc(ev.lieu) : ''}</div>
      <div class="bar"><span style="width:${s.pct}%;background:var(--done)"></span></div>
      <div class="row small"><span class="mono">${s.done}/${s.total} faites</span>${s.late ? `<span class="chip late">${s.late} en retard</span>` : '<span class="chip done">À jour</span>'}${ev._noDate ? '<span class="chip late">Date manquante</span>' : ''}</div>
    </button>`;
  };
  return `<div class="home-head"><div><span class="eyebrow">Rétroplannings de l’asso</span><h1>Événements</h1></div>
    <button class="btn primary" data-act="new-event" data-edit>+ Nouvel événement</button></div>
    ${viewLoad()}
    <div class="evgrid">${upcoming.map(card).join('') || '<p class="muted">Aucun événement à venir.</p>'}</div>
    ${past.length ? `<h2 style="margin:28px 0 12px">Passés</h2><div class="evgrid">${past.map(card).join('')}</div>` : ''}`;
}

/* ---------- Vue d'ensemble : charge par semaine ---------- */
// Tâches à faire de tous les événements, regroupées par semaine (du lundi), de cette semaine au dernier jour J + 7
function weekLoad(maxWeeks = 30) {
  const t0 = today(), start = t0 - ((new Date(t0).getUTCDay() + 6) % 7) * DAY, W = 7 * DAY;
  const evs = Object.values(S.events).filter(e => parseD(e.date) + W >= start);
  if (!evs.length) return null;
  const end = Math.min(Math.max(...evs.map(e => parseD(e.date) + W)), start + (maxWeeks - 1) * W);
  const weeks = [];
  for (let w = start; w <= end; w += W) weeks.push({ start: w, n: 0, byEv: new Map(), jours: [], tasks: [] });
  let late = 0;
  for (const ev of evs) {
    const wj = weeks[Math.floor((parseD(ev.date) - start) / W)]; if (wj) wj.jours.push(ev);
    for (const t of tasksOf(ev)) {
      if (t.status === 'done') continue;
      const d = dueOf(ev, t); if (d < t0) { late++; continue; }
      const w = weeks[Math.floor((d - start) / W)]; if (!w) continue;
      w.n++; w.byEv.set(ev, (w.byEv.get(ev) || 0) + 1); w.tasks.push({ ev, t, due: d });
    }
  }
  // Semaine chargée : au moins 6 tâches et 1,5 fois la moyenne des semaines qui en ont
  const nz = weeks.filter(w => w.n).map(w => w.n), mean = nz.length ? nz.reduce((a, b) => a + b, 0) / nz.length : 0;
  const limit = Math.max(6, Math.ceil(mean * 1.5));
  weeks.forEach(w => { w.over = w.n >= limit; });
  return { weeks, late, limit, max: Math.max(1, ...weeks.map(w => w.n)) };
}
function viewLoad() {
  const L = weekLoad(); if (!L || !L.weeks.some(w => w.n || w.jours.length)) return '';
  const shown = S.loadAll ? L.weeks : L.weeks.slice(0, 12);
  const row = w => {
    const open = S.loadOpen === w.start, label = fmtDay.format(w.start);
    const parts = [...w.byEv.entries()].sort((a, b) => b[1] - a[1]).map(([e, n]) => `${e.name} ${n}`);
    const meta = (w.over ? '<span class="chip late">Semaine chargée</span>' : '') + w.jours.map(e => `<span class="jtag">Jour J · ${esc(e.name)}</span>`).join('')
      + ((w.over || open) && parts.length ? `<span>${esc(parts.join(' · '))}</span>` : '');
    return `<div class="load-row ${w.over ? 'over' : ''}">
      <button class="load-head" data-act="load-week" data-w="${w.start}" aria-expanded="${open}" title="${esc(parts.join(' · ') || 'Aucune tâche')}"
        aria-label="Semaine du ${esc(label)} : ${w.n} tâche${w.n > 1 ? 's' : ''} à faire${w.over ? ', semaine chargée' : ''}">
        <span class="load-week">${esc(label)}</span><span class="load-bar"><span style="width:${w.n / L.max * 100}%"></span></span><span class="load-n">${w.n}</span></button>
      ${meta ? `<div class="load-meta">${meta}</div>` : ''}
      ${open && w.tasks.length ? `<div class="load-tasks"><div class="tasks">${w.tasks.sort((a, b) => a.due - b.due).map(x => taskRow(x.ev, x.t, true)).join('')}</div></div>` : ''}</div>`;
  };
  return `<section class="card" style="margin-bottom:18px"><div class="cardhead"><h2>Charge des prochaines semaines</h2></div>
    <p class="hint" style="margin:-4px 0 6px">Nombre de tâches à faire, par semaine (à partir du lundi indiqué).</p>
    ${L.late ? `<p class="hint warn" style="margin-bottom:6px">${L.late} tâche${L.late > 1 ? 's' : ''} déjà en retard, non comptée${L.late > 1 ? 's' : ''} ci-dessous.</p>` : ''}
    <div class="load">${shown.map(row).join('')}</div>
    ${L.weeks.length > 12 ? `<button class="btn ghost sm" data-act="load-all">${S.loadAll ? 'Afficher moins de semaines' : `Afficher les ${L.weeks.length - 12} semaines suivantes`}</button>` : ''}
    <p class="hint" style="margin-top:6px">Une semaine est signalée chargée à partir de ${L.limit} tâches à faire. Touche une semaine pour voir ses tâches.</p></section>`;
}
