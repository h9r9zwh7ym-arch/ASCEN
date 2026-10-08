// ================= CARTE DES MUSCLES (v3.6) =================
// Deux silhouettes stylisées (face, dos) ; chaque muscle est une zone qui prend la couleur de sa
// région (poussée, tirage, jambes, gainage) avec une intensité de 0 à 1. Utilisée dans la fiche
// d'un exercice (principal plein, secondaires atténués) et dans Progrès (séries de la semaine,
// en une seule teinte : l'intensité dit combien, sans légende qui mêle mouvements et muscles).
// Chaque zone porte data-tip : touchée, elle affiche son nom et sa valeur (bulle des graphiques).
const MM_SHAPES = (()=>{
  const e = (cx, cy, rx, ry, a)=>`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"${a ? ` transform="rotate(${a} ${cx} ${cy})"` : ""}/>`;
  const pair = (cx, dx, cy, rx, ry, a)=>e(cx-dx, cy, rx, ry, a ? -a : 0)+e(cx+dx, cy, rx, ry, a||0);
  const F = 30, B = 90; // centres des deux silhouettes
  return {
    // parties neutres (tête, cou, bassin, mains, pieds, genoux)
    base: [
      e(F,8.6,5.4,6), `<rect x="${F-2.4}" y="13.6" width="4.8" height="4" rx="1.6"/>`, `<path d="M${F-6} 50 H${F+6} L${F+7.6} 57 H${F-7.6} Z"/>`,
      pair(F,16.4,54.6,2.1,2.6), pair(F,4.8,78.6,3,2.4), pair(F,4.6,98.4,3,1.7), pair(F,4.6,88.4,2.7,8.2),
      e(B,8.6,5.4,6), `<rect x="${B-2.4}" y="13.6" width="4.8" height="4" rx="1.6"/>`,
      pair(B,16.4,54.6,2.1,2.6), pair(B,4.8,78.4,3,2.2), pair(B,4.6,98.4,3,1.7),
    ].join(""),
    front: {
      epaules:    pair(F,10.4,21.6,4.2,4.6),
      pect:       `<path d="M${F-.6} 20.4C${F-4} 19 ${F-8.6} 19.6 ${F-9} 23.4C${F-9.2} 28 ${F-5} 30.6 ${F-.6} 29.4Z"/><path d="M${F+.6} 20.4C${F+4} 19 ${F+8.6} 19.6 ${F+9} 23.4C${F+9.2} 28 ${F+5} 30.6 ${F+.6} 29.4Z"/>`,
      biceps:     pair(F,12.8,32,3,6.4,-10),
      avantbras:  pair(F,14.8,44.4,2.6,6.6,-12),
      abdos:      `<rect x="${F-5.2}" y="31" width="10.4" height="18.4" rx="3.4"/>`,
      quadriceps: pair(F,4.8,66,4.4,11,4),
      mollets:    "",
    },
    back: {
      dos:        `<path d="M${B} 15.8C${B-5.4} 16.4 ${B-9.6} 19.2 ${B-9.6} 24C${B-9.6} 32 ${B-5.8} 41 ${B} 45.6C${B+5.8} 41 ${B+9.6} 32 ${B+9.6} 24C${B+9.6} 19.2 ${B+5.4} 16.4 ${B} 15.8Z"/>`,
      epaules:    pair(B,10.8,21.8,4,4.4),
      triceps:    pair(B,12.8,32,3,6.4,-10),
      avantbras:  pair(B,14.8,44.4,2.6,6.6,-12),
      fessiers:   pair(B,4.6,53.4,4.8,5.2),
      ischios:    pair(B,4.8,67.4,4.2,9.6,4),
      mollets:    pair(B,4.8,88,3.2,8,3),
    },
  };
})();
// intensités : { muscleId: 0..1 } ; tips : { muscleId: texte de la bulle } (facultatif)
function muscleMapSVG(levels, tips, opts){
  opts = opts||{};
  const zone = (id, shape)=>{
    if(!shape) return "";
    const v = Math.max(0, Math.min(1, levels[id]||0)), r = REGION_OF_MUSCLE[id] || "core";
    const tip = tips && tips[id] ? ` data-tip="${esc(tips[id])}"` : "";
    return `<g class="mm-z r-${r} ${v>0 ? "on" : ""}" style="--v:${v.toFixed(2)}"${tip}>${shape}</g>`;
  };
  const side = (k)=>Object.keys(MM_SHAPES[k]).map(id=>zone(id, MM_SHAPES[k][id])).join("");
  return `<svg class="mm ${opts.mono ? "mono" : ""} ${opts.cls||""}" viewBox="0 0 120 ${opts.caps===false ? 102 : 107}" role="img" aria-label="${esc(opts.label||"Carte des muscles")}">
    <g class="mm-base">${MM_SHAPES.base}</g>${side("front")}${side("back")}
    ${opts.caps===false ? "" : `<text x="30" y="106" class="mm-cap">face</text><text x="90" y="106" class="mm-cap">dos</text>`}
  </svg>`;
}
// fiche d'un exercice : muscle principal plein, secondaires atténués
function exoMuscleMap(def){
  const lv = {}; def.muscles.forEach((m,i)=>{ if(m!=="cardio") lv[m] = Math.max(lv[m]||0, i===0 ? 1 : .42); });
  const tips = {}; def.muscles.forEach((m,i)=>{ if(MUSCLE_MAP[m]) tips[m] = MUSCLE_MAP[m].n + (i===0 ? " · principal" : " · secondaire"); });
  return muscleMapSVG(lv, tips, { cls:"mm-exo", label:"Muscles travaillés : "+def.muscles.map(m=>MUSCLE_MAP[m] ? MUSCLE_MAP[m].n : m).join(", ") });
}
// Progrès > Muscles : la carte de la semaine (couleur = région, intensité = séries de la semaine,
// pleine à 10 séries pondérées ; tout muscle travaillé reste bien visible), puis le stimulus de chaque
// muscle face aux repères sourcés. Les explications détaillées sont dans « À propos » (ACT.stimHow).
function mmLevel(sets){ return sets>0 ? .4 + .6*Math.min(1, sets/STIM.high) : 0; }
function weekMuscleMapHTML(){
  const rows = weekVolume(), month = muscleVolume(28), lv = {}, tips = {};
  // moyenne sur 4 semaines, ou depuis la 1re séance si elle est plus récente (sinon on sous-estime)
  const first = S.sessions.length ? S.sessions[0].date : todayISO(), avgWeeks = Math.max(1, Math.min(28, daysBetween(first, todayISO())+1)/7);
  rows.forEach(r=>{ lv[r.id] = mmLevel(r.sets); tips[r.id] = `${r.n} : ${fmtDec(r.sets)} série${r.sets>=2?"s":""}${r.freq ? ` · ${nb(r.freq, "jour")}` : ""}`; });
  // une seule couleur : l'intensité dit combien chaque muscle a travaillé (le nom s'affiche au toucher)
  const scale = [0, 1, 4, STIM.high].map(v=>`<i style="--o:${mmLevel(v).toFixed(2)}"></i>`).join("");
  const top = rows.filter(r=>r.sets>0).sort((a,b)=>b.sets-a.sets).slice(0,3);
  const max = Math.max(STIM.high*1.4, ...rows.map(r=>r.sets)), avg = id=>round1(month.find(m=>m.id===id).sets/avgWeeks);
  const pos = v=>(v/max*100).toFixed(1);
  const zones = { none:0, low:0, ok:0, high:0 }; rows.forEach(r=>zones[stimZone(r.sets)]++);
  return `<div class="chart-card mm-card stagger" style="--i:1">
    <div class="cc-h"><div class="cc-t">Muscles de la semaine</div><div class="cc-s">7 derniers jours · touche un muscle pour le détail</div></div>
    ${muscleMapSVG(lv, tips, { cls:"mm-week", mono:true, label:"Muscles travaillés cette semaine" })}
    <div class="mm-scale"><span>0</span><span class="sc">${scale}</span><span>${STIM.high}+ séries</span></div>
    ${top.length ? `<div class="mm-top">Le plus travaillé : ${top.map(r=>`<span><b>${esc(r.n)}</b>&nbsp;${fmtDec(r.sets)}</span>`).join(" · ")}</div>` : `<div class="mm-top">Aucun muscle travaillé ces 7 derniers jours.</div>`}
  </div>
  <div class="chart-card stim-card stagger" style="--i:2">
    <div class="cc-h tr-h"><div><div class="cc-t">Stimulus par muscle</div><div class="cc-s">Séries des 7 derniers jours, par muscle</div></div>
      <button class="tr-how" data-a="stimHow" aria-label="À propos du stimulus par muscle">i</button></div>
    <div class="stim-sum">
      <span class="sz-ok"><b>${zones.ok+zones.high}</b> en zone de progrès</span>
      <span class="sz-low"><b>${zones.low+zones.none}</b> sous le seuil</span>
    </div>
    <div class="wv-list" style="--a:${pos(STIM.min)}%;--b:${pos(STIM.high)}%">${rows.map((r,i)=>{ const z = stimZone(r.sets), a = avg(r.id);
      return `<div class="wv-row z-${z}" style="--i:${i}" tabindex="0" data-tip="${esc(r.n)} : ${fmtDec(r.sets)} série${r.sets>=2?"s":""} en 7 jours · moyenne ${fmtDec(a)} par semaine sur 4 semaines">
      <span class="wv-n">${esc(r.n)}</span>
      <span class="wv-track"><i style="width:${Math.min(100, r.sets/max*100).toFixed(1)}%"></i></span>
      <span class="wv-v">${fmtDec(r.sets)}</span>
    </div>`; }).join("")}</div>
    <div class="wv-axis" aria-hidden="true" style="--a:${pos(STIM.min)}%;--b:${pos(STIM.high)}%"><span></span><span class="wv-ticks"><em>0</em><em style="left:var(--a)">${STIM.min}</em><em style="left:var(--b)">${STIM.high}</em></span><span>séries</span></div>
    <div class="stim-key">
      <span><i class="k-low"></i>Sous le seuil (moins de ${STIM.min})</span>
      <span><i class="k-ok"></i>Zone de progrès</span>
    </div>
    ${stimLagging().length && appPicksOn() ? `<button class="btn secondary sm stim-go" data-a="stimSession"><svg class="spk" viewBox="0 0 24 24">${ICONS.sparkle}</svg> Composer une séance pour ${stimLagging().length>1 ? "ces muscles" : "ce muscle"}</button>` : ""}
  </div>`;
}
// muscles en retard cette semaine (sous le seuil, sans les « rien fait depuis 7 jours » généralisés)
function stimLagging(){
  if(!S.sessions.length) return [];
  const rows = weekVolume(), low = rows.filter(r=>r.sets<STIM.min);
  return low.length===rows.length ? [] : low;
}
Object.assign(ACT, {
  // « Composer une séance pour ces muscles » : des exercices pour les muscles en retard qui ont
  // récupéré (pas travaillés hier ou aujourd'hui), ajoutés à Ma séance, puis direction l'accueil
  stimSession(){
    const lag = stimLagging(), ready = lag.filter(r=>daysSinceTrained(r.id)>=2);
    if(!ready.length){ toast(lag.length ? "Ces muscles récupèrent encore : reviens demain" : "Tous tes muscles sont dans la zone de progrès", "check"); return; }
    const ids = new Set(ready.map(r=>r.id)), have = S.custom.exos.map(e=>e.exoId);
    const pool = engineExos().filter(e=>ids.has(e.muscles[0]) && !have.includes(e.id));
    // un exercice par muscle d'abord (le mieux noté), puis un second pour les plus en retard
    const pick = [], byScore = pool.slice().sort((a,b)=>scoreExo(b)-scoreExo(a));
    // les plus en retard d'abord, autant de muscles que d'exercices dans une séance
    ready.sort((a,b)=>a.sets-b.sets).splice(sessionSize());
    ready.forEach(r=>{ const e = byScore.find(x=>x.muscles[0]===r.id && !pick.includes(x)); if(e) pick.push(e); });
    for(const r of ready){ if(pick.length>=Math.min(sessionSize(), 6)) break; const e = byScore.find(x=>x.muscles[0]===r.id && !pick.includes(x) && exoFamily(x)!==exoFamily(pick.find(p=>p.muscles[0]===r.id)||x)); if(e) pick.push(e); }
    if(!pick.length){ toast("Aucun exercice disponible avec ton matériel pour ces muscles"); return; }
    pick.forEach(e=>{ S.custom.exos.push({ exoId:e.id, sets:e.sets, app:true }); freshIds.add(e.id); });
    S.settings.todayTab = "custom"; save();
    switchTab("today"); changed();
    toast(`${nb(pick.length, "exercice")} pour ${ready.slice(0,3).map(r=>r.n.toLowerCase()).join(", ")} dans Ma séance`, "sparkle");
  },
  stimHow(){
    const rows = weekVolume(), under = rows.filter(r=>r.sets<STIM.min).map(r=>r.n), twice = rows.filter(r=>r.freq>=2).length;
    openSheet(`<div class="sheet-hd"><span class="t">Stimulus par muscle</span><button class="icon-btn" data-a="closesheet" aria-label="Fermer">${icon("close")}</button></div><div class="sheet-body how-body">
      <h3>Ce qui est compté</h3>
      <p>Chaque série terminée compte pour <b>1</b> pour le muscle principal de l'exercice et pour <b>½</b> pour chaque muscle qui aide (par exemple les triceps au développé couché). Une série facile (3 répétitions ou plus en réserve) compte moitié moins : loin de l'échec, elle stimule moins. Les étirements ne comptent pas. Touche un muscle pour voir aussi ta moyenne par semaine sur les 4 dernières semaines.</p>
      <h3>Les repères</h3>
      <p><b>${STIM.min} séries</b> par semaine : le seuil à partir duquel un gain de muscle devient mesurable. <b>${STIM.high} séries</b> et plus : le gain continue, mais de plus en plus lentement. Pour gagner seulement en force, environ 3 séries par semaine suffisent.</p>
      <h3>Ta semaine</h3>
      <p>${under.length && under.length<rows.length ? `À renforcer : ${under.slice(0,4).map(esc).join(", ")}. ` : ""}${twice}/${rows.length} muscles travaillés au moins 2 jours sur 7 : répartir les séries sur 2 jours aide un peu plus qu'une seule grosse séance.</p>
      <h3>Sources</h3>
      <ul class="how-src">
        <li><a href="https://sportrxiv.org/index.php/server/preprint/view/460" target="_blank" rel="noopener">Pelland et al. 2024 : volume, fréquence et gains de force et de muscle (méta-régression, 67 études)</a></li>
        <li><a href="https://rke.abertay.ac.uk/en/publications/exploring-the-dose-response-relationship-between-estimated-resist/" target="_blank" rel="noopener">Robinson et al. 2024, Sports Medicine : plus on s'arrête loin de l'échec, moins le muscle grossit (méta-régression)</a></li>
        <li><a href="https://pubmed.ncbi.nlm.nih.gov/15947721/" target="_blank" rel="noopener">Hubal et al. 2005, Med Sci Sports Exerc : la réponse à l'entraînement varie beaucoup d'une personne à l'autre</a></li>
      </ul>
      <p class="hr-note">Ce sont des tendances moyennes, pas des règles : ta réponse peut être plus forte ou plus faible.</p>
    </div>`, { tall:true });
  },
});
