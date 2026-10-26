function viewAllRetex() {
  const f = S.rxFilter || '';
  const evs = Object.values(S.events).sort((a, b) => parseD(b.date) - parseD(a.date));
  const items = evs.flatMap(e => retexOf(e).filter(r => !f || r.pole === f).map(r => ({ ...r, ev: e })));
  const bySev = [3, 2, 1].map(s => items.filter(r => r.sev === s).length);
  return `<div class="home-head"><div><span class="eyebrow" style="display:block">Mémoire de l’asso</span><h1>Retours d’expérience</h1></div>
    <select id="rxf" data-act="rx-filter" aria-label="Filtrer par pôle"><option value="">Tous les pôles</option>${S.poles.map(p => `<option value="${esc(p.id)}" ${p.id === f ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>
  <p class="muted" style="max-width:62ch;margin-top:-6px">Les problèmes notés dans l’onglet Bilan de chaque événement. Les bénévoles changent chaque année : c’est ici que l’équipe suivante retrouve ce qui a coincé.</p>
  <div class="row small" style="margin-bottom:14px"><span class="chip late">${bySev[0]} bloquants</span><span class="chip doing">${bySev[1]} sérieux</span><span class="chip todo">${bySev[2]} gênants</span></div>
  ${items.length ? evs.filter(e => items.some(r => r.ev.id === e.id)).map(e => `<section class="card" style="margin-bottom:14px">
      <div class="cardhead"><h2><button class="brand" style="font-size:1.1rem" data-act="open-retex" data-id="${e.id}">${esc(e.name)}</button></h2><span class="small muted">${esc(fmtShort.format(parseD(e.date)))}</span></div>
      ${items.filter(r => r.ev.id === e.id).map(r => rxItem(r)).join('')}</section>`).join('')
    : '<div class="card empty"><h2>Aucun retour pour l’instant</h2><p class="muted">Après un événement, ouvre son onglet Bilan pour noter ce qui a coincé et ce qu’il faudra faire autrement.</p></div>'}`;
}
