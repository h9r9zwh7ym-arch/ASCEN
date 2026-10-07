// ================= CARTE DES MUSCLES (v3.6) =================
// Deux silhouettes stylisées (face, dos) ; chaque muscle est une zone qui prend la couleur de sa
// région (poussée, tirage, jambes, gainage) avec une intensité de 0 à 1. Utilisée dans la fiche
// d'un exercice (principal plein, secondaires atténués) et dans Progrès (séries de la semaine).
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
  return `<svg class="mm ${opts.cls||""}" viewBox="0 0 120 ${opts.caps===false ? 102 : 107}" role="img" aria-label="${esc(opts.label||"Carte des muscles")}">
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
  rows.forEach(r=>{ lv[r.id] = mmLevel(r.sets); tips[r.id] = `${r.n} : ${fmtDec(r.sets)} série${r.sets>=2?"s":""}${r.freq ? ` · ${nb(r.freq, "jour")}` : ""}`; });
  const legend = Object.keys(REGIONS).map(r=>`<span class="r-${r}"><i></i>${r==="core" ? "Gainage" : REGIONS[r].n}</span>`).join("");
  const scale = [0, 1, 4, STIM.high].map(v=>`<i style="--o:${mmLevel(v).toFixed(2)}"></i>`).join("");
  const max = Math.max(STIM.high*1.4, ...rows.map(r=>r.sets)), avg = id=>round1(month.find(m=>m.id===id).sets/4);
  const pos = v=>(v/max*100).toFixed(1);
  const zones = { none:0, low:0, ok:0, high:0 }; rows.forEach(r=>zones[stimZone(r.sets)]++);
  return `<div class="chart-card mm-card stagger" style="--i:1">
    <div class="cc-h"><div class="cc-t">Muscles de la semaine</div><div class="cc-s">7 derniers jours · touche un muscle pour le détail</div></div>
    ${muscleMapSVG(lv, tips, { cls:"mm-week", label:"Muscles travaillés cette semaine" })}
    <div class="mm-legend">${legend}</div>
    <div class="mm-scale"><span>Rien</span><span class="sc">${scale}</span><span>${STIM.high}+ séries</span></div>
  </div>
  <div class="chart-card stim-card stagger" style="--i:2">
    <div class="cc-h tr-h"><div><div class="cc-t">Stimulus par muscle</div><div class="cc-s">Séries de la semaine face aux repères de progrès</div></div>
      <button class="tr-how" data-a="stimHow" aria-label="À propos du stimulus par muscle">i</button></div>
    <div class="stim-sum">
      <span class="sz-ok"><b>${zones.ok+zones.high}</b> en zone de progrès</span>
      <span class="sz-low"><b>${zones.low+zones.none}</b> sous le seuil</span>
    </div>
    <div class="wv-head" aria-hidden="true"><span></span><span class="wv-ticks"><em style="left:${pos(STIM.min)}%">${STIM.min}</em><em class="hi" style="left:${pos(STIM.high)}%">${STIM.high}</em></span><span>Sem.</span><span>Moy.</span></div>
    <div class="wv-list">${rows.map((r,i)=>`<div class="wv-row z-${stimZone(r.sets)}" style="--i:${i}">
      <span class="wv-n">${esc(r.n)}</span>
      <span class="wv-track"><i class="r-${r.region} z-${stimZone(r.sets)}" style="width:${Math.min(100, r.sets/max*100).toFixed(1)}%"></i><b style="left:${pos(STIM.min)}%"></b><b class="hi" style="left:${pos(STIM.high)}%"></b></span>
      <span class="wv-v">${fmtDec(r.sets)}</span><span class="wv-f">${fmtDec(avg(r.id))}</span>
    </div>`).join("")}</div>
    <dl class="stim-key">
      <div><dt>Sem.</dt><dd>séries des 7 derniers jours</dd></div>
      <div><dt>Moy.</dt><dd>moyenne par semaine sur 4 semaines</dd></div>
      <div><dt><i class="tk"></i>${STIM.min}</dt><dd>seuil de progrès</dd></div>
      <div><dt><i class="tk hi"></i>${STIM.high}</dt><dd>zone haute</dd></div>
    </dl>
  </div>`;
}
Object.assign(ACT, {
  stimHow(){
    const rows = weekVolume(), under = rows.filter(r=>r.sets<STIM.min).map(r=>r.n), twice = rows.filter(r=>r.freq>=2).length;
    openSheet(`<div class="sheet-hd"><span class="t">Stimulus par muscle</span><button class="icon-btn" data-a="closesheet" aria-label="Fermer">${icon("close")}</button></div><div class="sheet-body how-body">
      <h3>Ce qui est compté</h3>
      <p>Chaque série terminée compte pour <b>1</b> pour le muscle principal de l'exercice et pour <b>½</b> pour chaque muscle qui aide (par exemple les triceps au développé couché). Les étirements ne comptent pas.</p>
      <h3>Les repères</h3>
      <p><b>${STIM.min} séries</b> par semaine : le seuil à partir duquel un gain de muscle devient mesurable. <b>${STIM.high} séries</b> et plus : le gain continue, mais de plus en plus lentement. Pour gagner seulement en force, environ 3 séries par semaine suffisent.</p>
      <h3>Ta semaine</h3>
      <p>${under.length && under.length<rows.length ? `À renforcer : ${under.slice(0,4).map(esc).join(", ")}. ` : ""}${twice}/${rows.length} muscles travaillés au moins 2 jours sur 7 : répartir les séries sur 2 jours aide un peu plus qu'une seule grosse séance.</p>
      <h3>Sources</h3>
      <ul class="how-src">
        <li><a href="https://sportrxiv.org/index.php/server/preprint/view/460" target="_blank" rel="noopener">Pelland et al. 2024 : volume, fréquence et gains de force et de muscle (méta-régression, 67 études)</a></li>
        <li><a href="https://pubmed.ncbi.nlm.nih.gov/15947721/" target="_blank" rel="noopener">Hubal et al. 2005, Med Sci Sports Exerc : la réponse à l'entraînement varie beaucoup d'une personne à l'autre</a></li>
      </ul>
      <p class="hr-note">Ce sont des tendances moyennes, pas des règles : ta réponse peut être plus forte ou plus faible.</p>
    </div>`, { tall:true });
  },
});
