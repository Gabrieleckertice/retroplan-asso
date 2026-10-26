/* ---------- Page « Mes tâches » ---------- */
function viewMine() {
  const me = getName().trim();
  if (!me) return viewPickMe();
  const g = myTasks(me), open = g.late.length + g.week.length + g.later.length;
  const sec = (title, items, cls) => items.length ? `<section class="card minesec ${cls || ''}"><div class="cardhead"><h2>${title}</h2><span class="n">${items.length}</span></div>
    <div class="tasks">${items.map(x => taskRow(x.ev, x.t, true)).join('')}</div></section>` : '';
  const head = `<div class="home-head"><div><span class="eyebrow">Mes tâches</span><h1>${esc(me)}</h1></div>
    <div class="row"><button class="btn sm" data-act="ics-mine">Ajouter à mon agenda</button><button class="btn ghost sm" data-act="change-me">Ce n’est pas moi</button></div></div>`;
  if (!open && !g.done.length) return `${onboardCard()}${nextEventsStrip()}${head}<div class="card empty"><h2>Aucune tâche à ton nom</h2>
    <p class="muted">Le responsable de chaque tâche est indiqué dans la tâche. Demande au bureau de t’en confier une, ou ouvre un événement pour en choisir une.</p>
    <button class="btn primary" data-act="go" data-to="evenements">Voir les événements</button></div>`;
  return `${onboardCard()}${nextEventsStrip()}${head}
    <div class="mine-sum">${g.late.length ? `<span class="chip late">${g.late.length} en retard</span>` : ''}<span class="chip doing">${g.week.length} cette semaine</span><span class="chip todo">${g.later.length} plus tard</span><span class="chip done">${g.done.length} faites</span></div>
    ${!open ? '<div class="card empty minesec"><h2>Tout est fait</h2><p class="muted">Merci ! Aucune tâche ne t’attend pour l’instant.</p></div>' : ''}
    ${sec('En retard', g.late, 'alert')}${sec('Cette semaine', g.week)}${sec('Plus tard', g.later)}
    ${g.done.length ? `<details class="card minesec"><summary>Faites récemment (${Math.min(g.done.length, 10)})</summary><div class="tasks" style="margin-top:8px">${g.done.slice(0, 10).map(x => taskRow(x.ev, x.t, true)).join('')}</div></details>` : ''}`;
}
function viewPickMe() {
  const people = knownPeople();
  return `${onboardCard()}${nextEventsStrip()}<div class="card stack pick"><span class="eyebrow">Mes tâches</span><h1>Qui es-tu ?</h1>
    <p class="muted">Choisis ton prénom une seule fois : l’app retrouvera tes tâches sur tous les événements, sur cet appareil.</p>
    ${people.length ? `<div class="people">${people.map(p => `<button class="person" data-act="pick-me" data-name="${esc(p.name)}">${esc(p.name)}<span>${p.open} à faire</span></button>`).join('')}</div>` : ''}
    <form id="me-form" class="row"><input type="text" id="me-name" placeholder="${people.length ? 'Ou écris ton prénom' : 'Ton prénom'}" aria-label="Ton prénom" required style="flex:1;min-width:0"><button class="btn primary" type="submit">Voir mes tâches</button></form></div>`;
}
