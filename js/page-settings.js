// iPhone et iPad n'affichent pas de bouton « Installer » : on explique le geste à la place
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isInstalled = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

function viewSettings() {
  const tpls = templateList(), link = inviteLink();
  const install = isInstalled() ? '<p class="hint">L’application est déjà installée sur cet appareil.</p>'
    : installEvt ? '<div><button class="btn primary" data-act="install">Installer l’application</button></div>'
    : isIOS ? '<p class="small">Sur iPhone ou iPad : ouvre ce lien dans <strong>Safari</strong>, touche le bouton <strong>Partager</strong>, puis <strong>Sur l’écran d’accueil</strong>.</p>'
    : '<p class="small">Sur Android : menu <strong>⋮</strong> de Chrome, puis <strong>Installer l’application</strong> (ou « Ajouter à l’écran d’accueil »). Sur ordinateur : icône d’installation à droite de la barre d’adresse de Chrome ou Edge.</p>';
  return `<div class="home-head"><div><span class="eyebrow">Réglages communs</span><h1>Paramètres de l’asso</h1></div></div>
  <div class="dash">
    ${cfg ? `<section class="card stack wide">
      <h2>Inviter des collègues</h2>
      <p class="small muted">Envoie ce lien aux membres du bureau et aux bénévoles (WhatsApp, e-mail…). En l’ouvrant, leur téléphone ou leur ordinateur est relié à l’asso, sans compte à créer. Ce lien contient le code d’accès : ne le publie pas sur un réseau social.</p>
      <input type="text" id="invite-link" readonly value="${esc(link)}" aria-label="Lien d’invitation">
      <div class="row"><button class="btn primary" data-act="copy-invite">Copier le lien</button>${navigator.share ? '<button class="btn" data-act="share-invite">Partager…</button>' : ''}</div>
    </section>` : ''}
    <section class="card stack">
      <h2>Installer sur cet appareil</h2>
      <p class="small muted">Une fois installée, l’app a son icône sur l’écran d’accueil et s’ouvre en plein écran, même sans réseau.</p>
      ${install}
    </section>
    <section class="card stack">
      <h2>Connexion</h2>
      ${cfg ? `<p class="small">Relié au classeur <strong>${esc(cfg.name || 'de l’asso')}</strong>. Les modifications des autres arrivent toutes les 30 secondes.</p>
        <p class="small">Tu signes tes modifications sous le prénom : <strong>${esc(getName() || 'non choisi')}</strong>${getName() ? '' : ' (choisis-le dans Mes tâches)'}.</p>
        ${queue.length ? `<p class="hint warn">${queue.length} modification(s) en attente d’envoi.</p>` : ''}
        <div class="row"><button class="btn" data-act="sync-now">Synchroniser maintenant</button></div>
        <div id="dc-zone"><button class="btn ghost sm" data-act="ask-disconnect">Déconnecter cet appareil</button></div>` : ''}
    </section>
    <section class="card stack wide">
      <h2>Sauvegarde</h2>
      <p class="small muted">Exporte une sauvegarde après chaque réunion de bureau. Le fichier contient tous les événements, échanges, bilans, modèles et pôles. Garde-le sur un drive de l’asso.</p>
      <div class="row">
        <button class="btn primary" data-act="export">Exporter une sauvegarde</button>
        <label class="btn" data-edit>Importer une sauvegarde<input type="file" id="imp-file" class="vh" accept=".json,application/json"></label>
      </div>
      <div id="imp-zone"></div>
    </section>
    <section class="card stack">
      <h2>Pôles</h2><p class="small muted">Chaque tâche appartient à un pôle. La couleur sert dans la frise et le tableau de bord.</p>
      <div class="stack" id="poles">${S.poles.map(p => `<div class="polerow">
        <input type="color" id="pc-${p.id}" value="${esc(p.color)}" data-act="pole-color" data-id="${p.id}" aria-label="Couleur du pôle ${esc(p.name)}" ${S.readOnly ? 'disabled' : ''}>
        <input type="text" id="pn-${p.id}" value="${esc(p.name)}" data-act="pole-name" data-id="${p.id}" aria-label="Nom du pôle" ${S.readOnly ? 'disabled' : ''}>
        <button class="btn ghost sm iconbtn" data-act="pole-del" data-id="${p.id}" aria-label="Supprimer le pôle ${esc(p.name)}" data-edit>✕</button></div>`).join('')}</div>
      <div class="row" data-edit><input type="text" id="new-pole" placeholder="Nouveau pôle (ex. Déco)" style="flex:1;min-width:0"><button class="btn" data-act="pole-add">Ajouter</button></div>
    </section>
    <section class="card">
      <h2 style="margin-bottom:8px">Modèles</h2>
      ${tpls.map(t => `<div class="tplrow"><div><strong>${esc(t.name)}</strong><div class="small muted">${t.tasks.length} tâches · ${t.builtin ? 'modèle fourni' : 'créé par l’asso'}</div></div>
        ${t.builtin ? '' : `<span id="tz-${t.id}"><button class="btn danger sm" data-act="ask-del-tpl" data-id="${t.id}" data-edit>Supprimer</button></span>`}</div>`).join('')}
      <p class="small muted" style="margin-top:10px">Pour créer un modèle, ouvre un événement, puis Réglages → Enregistrer comme modèle.</p>
    </section>
  </div>`;
}
