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
// Progrès : une seule carte « Muscles de la semaine » = silhouette + barres par muscle.
// La couleur dit la région (même code partout dans l'app), l'intensité dit le volume :
// une seule légende, celle des régions ; l'intensité est expliquée en une phrase.
function weekMuscleMapHTML(){
  const rows = weekVolume(), goal = S.goals.overall==="force" ? 6 : 10, max = Math.max(goal*1.6, ...rows.map(r=>r.sets));
  const lv = {}, tips = {};
  rows.forEach(r=>{ lv[r.id] = r.sets ? .18 + .82*Math.min(1, r.sets/goal) : 0; tips[r.id] = `${r.n} : ${fmtDec(r.sets)} série${r.sets>=2?"s":""}${r.freq ? ` · ${nb(r.freq, "jour")}` : ""}`; });
  const ok = rows.filter(r=>r.sets>=goal).length, low = rows.filter(r=>r.sets<goal/2).map(r=>r.n);
  const legend = Object.keys(REGIONS).map(r=>`<span class="r-${r}"><i></i>${r==="core" ? "Gainage" : REGIONS[r].n}</span>`).join("");
  return `<div class="chart-card mm-card stagger" style="--i:5">
    <div class="cc-h"><div class="cc-t">Muscles de la semaine</div><div class="cc-s">7 derniers jours · plus la couleur est pleine, plus le muscle a travaillé</div></div>
    ${muscleMapSVG(lv, tips, { cls:"mm-week", label:"Muscles travaillés cette semaine" })}
    <div class="mm-legend">${legend}</div>
    <div class="wv-head"><span>séries</span><span>jours</span></div>
    <div class="wv-list">${rows.map((r,i)=>`<div class="wv-row" style="--i:${i}">
      <span class="wv-n">${esc(r.n)}</span>
      <span class="wv-track"><i class="r-${r.region} ${r.sets>=goal?"ok":""}" style="width:${Math.min(100, r.sets/max*100).toFixed(1)}%"></i><b style="left:${(goal/max*100).toFixed(1)}%"></b></span>
      <span class="wv-v">${fmtDec(r.sets)}</span><span class="wv-f ${r.freq>=2?"ok":""}">${r.freq||"–"}</span>
    </div>`).join("")}</div>
    <div class="wv-foot">${ok}/${rows.length} groupes au repère (le trait, ≈ ${goal} séries)${low.length && low.length<rows.length ? ` · à renforcer : ${low.slice(0,3).map(esc).join(", ")}` : ""}. Idéal : chaque muscle au moins 2 jours par semaine.</div>
  </div>`;
}
