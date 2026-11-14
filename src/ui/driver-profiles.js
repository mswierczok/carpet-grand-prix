(() => {
 'use strict';
 let roster=[],teams=[];
 function configure(drivers,currentTeams){roster=drivers;teams=currentTeams;}
 function open(id){
  const d=roster.find(d=>d.id===id);if(!d)return;
  const api=globalThis.CGPDriverPortraits,t=teams.find(t=>t.id===d.team),esc=api.escape;
  let dialog=document.getElementById('driverProfile');if(!dialog){dialog=document.createElement('dialog');dialog.id='driverProfile';dialog.className='driver-profile';document.body.append(dialog);dialog.addEventListener('click',e=>{if(e.target===dialog||e.target.closest('[data-profile-close]'))dialog.close();});}
  dialog.innerHTML=`<button type="button" data-profile-close aria-label="Fahrerprofil schließen">×</button><div class="driver-profile-art">${api.svg(d,t)}</div><div class="driver-profile-copy"><p>FAHRERPROFIL · ${esc(d.id)} · ${esc(api.code(d.name))}</p><h2>${esc(d.name)}</h2><p>${esc(d.nationality)} · ${esc(d.age)} Jahre</p><p>${esc(t?.name||'Vertragsfrei')}</p><dl><dt>Tempo</dt><dd>${esc(d.skill)}</dd><dt>Konstanz</dt><dd>${esc(d.consistency)}</dd><dt>Potenzial</dt><dd>${esc(d.potential)}</dd><dt>Siege / Titel</dt><dd>${esc(d.wins||0)} / ${esc(d.titles||0)}</dd></dl><p>${api.uploaded(d.id)?'Das Porträt bleibt bei Teamwechseln erhalten.':'Persönlicher Helm und Gesicht bleiben bei Teamwechseln erhalten.'}</p></div>`;
  dialog.showModal();
 }
 document.addEventListener('click',e=>{const target=e.target.closest('[data-portrait-id]');if(target)open(target.dataset.portraitId);});
 document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-portrait-id]')){e.preventDefault();open(e.target.dataset.portraitId);}});
 globalThis.CGPDriverProfiles=Object.freeze({configure,open});
})();
